"use client";

/**
 * useVoiceRecorder (AudioWorklet version)
 * ----------------
 * Captures microphone audio as 16-kHz / 16-bit / mono PCM and POSTs it to
 * the backend `/api/asr/transcribe` endpoint.
 *
 * Uses AudioWorkletNode instead of the deprecated ScriptProcessorNode.
 * The worklet processor is inlined via a Blob URL so no separate file
 * needs to be served — this works in Next.js dev and production builds.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const TARGET_SAMPLE_RATE = 16000;

/** Inlined AudioWorklet processor source code. */
const PROCESSOR_SOURCE = `
class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      // input[0] is Float32Array for channel 0 (mono)
      this.port.postMessage(new Float32Array(input[0]));
    }
    return true; // keep alive
  }
}

registerProcessor('capture-processor', CaptureProcessor);
`;

type RecorderStatus = "idle" | "recording" | "processing" | "error";

export interface UseVoiceRecorderOptions {
  /** API base URL. Defaults to NEXT_PUBLIC_API_URL or localhost:8000. */
  apiBaseUrl?: string;
  /** iFlytek language code: "en_us" or "zh_cn". */
  language?: "en_us" | "zh_cn";
  /** Called with the final transcript when recording stops successfully. */
  onTranscript?: (text: string) => void;
  /** Called whenever an error occurs. */
  onError?: (message: string) => void;
}

export interface UseVoiceRecorderResult {
  status: RecorderStatus;
  error: string | null;
  isRecording: boolean;
  isProcessing: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  toggle: () => Promise<void>;
}

/** Create a Blob URL from the inlined processor source. */
function getWorkletUrl(): string {
  const blob = new Blob([PROCESSOR_SOURCE], { type: "application/javascript" });
  return URL.createObjectURL(blob);
}

export function useVoiceRecorder(
  options: UseVoiceRecorderOptions = {},
): UseVoiceRecorderResult {
  const {
    apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    language = "en_us",
    onTranscript,
    onError,
  } = options;

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Refs survive across renders without re-instantiating the audio graph.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const captureRateRef = useRef<number>(48000);
  const workletUrlRef = useRef<string | null>(null);

  /** Tear down the audio graph + media stream cleanly. */
  const cleanup = useCallback(() => {
    try {
      workletNodeRef.current?.disconnect();
      workletNodeRef.current?.port.close();
      sourceRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => undefined);
    } catch {
      // best-effort
    }
    workletNodeRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
  }, []);

  // Always release the mic if the component unmounts mid-record.
  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    if (status === "recording" || status === "processing") return;
    setError(null);
    chunksRef.current = [];

    try {
      // 1. Request mic.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // 2. Build the audio graph.
      const AudioCtx =
        // @ts-expect-error webkit prefix for older Safari
        window.AudioContext || window.webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      audioCtxRef.current = ctx;
      captureRateRef.current = ctx.sampleRate;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // 3. Load the inlined worklet processor.
      if (!workletUrlRef.current) {
        workletUrlRef.current = getWorkletUrl();
      }
      await ctx.audioWorklet.addModule(workletUrlRef.current);

      const workletNode = new AudioWorkletNode(ctx, "capture-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 1,
      });
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
        chunksRef.current.push(new Float32Array(e.data));
      };

      source.connect(workletNode);
      // Do NOT connect workletNode to ctx.destination — it has no outputs.

      setStatus("recording");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to access the microphone";
      setError(msg);
      setStatus("error");
      onError?.(msg);
      cleanup();
    }
  }, [cleanup, onError, status]);

  const stop = useCallback(async () => {
    if (status !== "recording") return;
    const captureRate = captureRateRef.current;
    const chunks = chunksRef.current;
    chunksRef.current = [];

    cleanup();
    setStatus("processing");

    try {
      const merged = mergeFloat32(chunks);
      if (merged.length === 0) {
        throw new Error("No audio captured");
      }
      const downsampled = downsampleBuffer(
        merged,
        captureRate,
        TARGET_SAMPLE_RATE,
      );
      const wav = encodeWav(downsampled, TARGET_SAMPLE_RATE);

      const form = new FormData();
      form.append(
        "file",
        new Blob([wav], { type: "audio/wav" }),
        "recording.wav",
      );
      form.append("language", language);

      const res = await fetch(`${apiBaseUrl}/api/asr/transcribe`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const detail = await safeReadDetail(res);
        throw new Error(detail || `Transcription failed (${res.status})`);
      }

      const data = (await res.json()) as { text?: string };
      const text = (data.text || "").trim();
      if (!text) {
        throw new Error("No speech detected");
      }
      onTranscript?.(text);
      setStatus("idle");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transcription failed";
      setError(msg);
      setStatus("error");
      onError?.(msg);
    }
  }, [apiBaseUrl, cleanup, language, onError, onTranscript, status]);

  const toggle = useCallback(async () => {
    if (status === "recording") {
      await stop();
    } else if (status === "idle" || status === "error") {
      await start();
    }
  }, [start, status, stop]);

  return {
    status,
    error,
    isRecording: status === "recording",
    isProcessing: status === "processing",
    start,
    stop,
    toggle,
  };
}

// ---------------------------------------------------------------------------
// Pure DSP helpers (no React, no DOM)
// ---------------------------------------------------------------------------

/** Concatenate every captured Float32 chunk into one contiguous buffer. */
function mergeFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Linear-interpolation downsampler. Browser AudioContext typically captures
 * at 48 kHz; iFlytek wants 16 kHz. We drop intermediate samples with simple
 * averaging which is good enough for speech (no anti-aliasing filter — the
 * mic path already low-passes well below the Nyquist of 16 kHz).
 */
function downsampleBuffer(
  input: Float32Array,
  inputRate: number,
  targetRate: number,
): Float32Array {
  if (targetRate === inputRate) return input;
  if (targetRate > inputRate) {
    throw new Error(
      `Cannot upsample (in=${inputRate} → out=${targetRate}); use a higher input rate`,
    );
  }
  const ratio = inputRate / targetRate;
  const newLength = Math.floor(input.length / ratio);
  const out = new Float32Array(newLength);
  let outIdx = 0;
  let inIdxExact = 0;
  while (outIdx < newLength) {
    const inIdxNext = Math.floor((outIdx + 1) * ratio);
    let acc = 0;
    let count = 0;
    for (
      let i = Math.floor(inIdxExact);
      i < inIdxNext && i < input.length;
      i++
    ) {
      acc += input[i];
      count++;
    }
    out[outIdx] = count > 0 ? acc / count : 0;
    outIdx++;
    inIdxExact = inIdxNext;
  }
  return out;
}

/** Encode Float32 PCM samples in [-1, 1] as a 16-bit mono WAV file. */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const numChannels = 1;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // PCM samples (Float32 → Int16 with clipping)
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

async function safeReadDetail(res: Response): Promise<string | null> {
  try {
    const body = await res.json();
    return typeof body?.detail === "string" ? body.detail : null;
  } catch {
    return null;
  }
}
