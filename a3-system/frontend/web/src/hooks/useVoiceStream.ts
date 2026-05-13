"use client";

/**
 * useVoiceStream — real-time ASR via WebSocket
 * -------------------------------------------------
 * Streams microphone audio to /api/asr/stream and receives partial
 * transcripts as they are recognised.  Much lower latency than the
 * record-then-upload flow in useVoiceRecorder.
 *
 * Audio pipeline
 *   AudioWorklet (native rate, Float32) → Resampler → Int16 @ 16kHz
 *   → buffer into 1280-byte frames → WebSocket binary frames
 */
import { useCallback, useEffect, useRef, useState } from "react";

const TARGET_RATE = 16000;
const FRAME_BYTES = 1280; // 640 Int16 samples = 40 ms @ 16 kHz

const PROCESSOR_SOURCE = `
class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      this.port.postMessage(new Float32Array(input[0]));
    }
    return true;
  }
}
registerProcessor('capture-processor', CaptureProcessor);
`;

function getWorkletUrl(): string {
  const blob = new Blob([PROCESSOR_SOURCE], { type: "application/javascript" });
  return URL.createObjectURL(blob);
}

/** Stateful linear resampler with cross-chunk continuity. */
class Resampler {
  private leftover = new Float32Array(0);
  private readonly ratio: number;

  constructor(inputRate: number, outputRate: number) {
    this.ratio = inputRate / outputRate;
  }

  process(input: Float32Array): Int16Array {
    const combined = new Float32Array(this.leftover.length + input.length);
    combined.set(this.leftover);
    combined.set(input, this.leftover.length);

    const outLen = Math.floor(combined.length / this.ratio);
    const out = new Int16Array(outLen);

    for (let i = 0; i < outLen; i++) {
      const start = Math.floor(i * this.ratio);
      const end = Math.floor((i + 1) * this.ratio);
      let acc = 0;
      let cnt = 0;
      for (let j = start; j < end && j < combined.length; j++) {
        acc += combined[j];
        cnt++;
      }
      const avg = cnt > 0 ? acc / cnt : 0;
      out[i] = avg < 0 ? avg * 0x8000 : avg * 0x7fff;
    }

    const consumed = Math.floor(outLen * this.ratio);
    this.leftover = combined.slice(consumed);
    return out;
  }

  flush(): Int16Array {
    if (this.leftover.length === 0) return new Int16Array(0);
    const out = new Int16Array(this.leftover.length);
    for (let i = 0; i < this.leftover.length; i++) {
      const s = this.leftover[i];
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    this.leftover = new Float32Array(0);
    return out;
  }
}

type Status = "idle" | "connecting" | "streaming" | "error";

interface Options {
  apiBaseUrl?: string;
  language?: "en_us" | "zh_cn";
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (msg: string) => void;
}

export function useVoiceStream(options: Options = {}) {
  const {
    apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    language = "en_us",
    onPartial,
    onFinal,
    onError,
  } = options;

  const [status, setStatus] = useState<Status>("idle");
  const statusRef = useRef<Status>("idle");
  const [partialText, setPartialText] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const resamplerRef = useRef<Resampler | null>(null);
  const int16BufferRef = useRef<Int16Array>(new Int16Array(0));
  const workletUrlRef = useRef<string | null>(null);
  const partialsRef = useRef<string[]>([]);
  const lastTextRef = useRef<string>("");
  const finalEmittedRef = useRef<boolean>(false);

  const cleanupAudio = useCallback(() => {
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
    resamplerRef.current = null;
    int16BufferRef.current = new Int16Array(0);
  }, []);

  const cleanupWs = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
      cleanupWs();
    };
  }, [cleanupAudio, cleanupWs]);

  const flushFrames = useCallback(
    (isLast: boolean) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      while (true) {
        const buf = int16BufferRef.current;
        const byteView = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        if (byteView.length < FRAME_BYTES) break;
        ws.send(byteView.slice(0, FRAME_BYTES));
        int16BufferRef.current = new Int16Array(
          byteView.slice(FRAME_BYTES).buffer
        );
      }

      if (isLast) {
        // send any trailing samples + empty terminator
        const tail = new Uint8Array(
          int16BufferRef.current.buffer,
          int16BufferRef.current.byteOffset,
          int16BufferRef.current.byteLength
        );
        if (tail.length > 0) {
          ws.send(tail);
        }
        ws.send(JSON.stringify({ event: "end" }));
      }
    },
    []
  );

  const start = useCallback(async () => {
    if (status === "connecting" || status === "streaming") return;
    statusRef.current = "connecting";
    setStatus("connecting");
    setPartialText("");
    partialsRef.current = [];
    lastTextRef.current = "";
    finalEmittedRef.current = false;

    // 1. Open WebSocket first so it’s ready when audio arrives.
    const wsUrl = `${apiBaseUrl.replace(/^http/, "ws")}/api/asr/stream?language=${language}&encoding=raw&audio_format=audio%2FL16%3Brate%3D16000`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      statusRef.current = "streaming";
      setStatus("streaming");
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.event === "partial") {
          console.log("[ASR Debug] partial:", msg.text);
          setPartialText(msg.text || "");
          onPartial?.(msg.text || "");
          if (msg.text) lastTextRef.current = msg.text;
        } else if (msg.event === "final") {
          console.log("[ASR Debug] final:", msg.text);
          // Only accept finals that are longer than 1 char (ignore "?" garbage)
          if (msg.text && msg.text.length > 1) {
            partialsRef.current.push(msg.text);
            setPartialText(msg.text);
            onPartial?.(msg.text);
            lastTextRef.current = msg.text;
          }
        } else if (msg.event === "complete") {
          // Filter out garbage single-char results, fallback to accumulated partials or last good text
          const msgText = msg.text && msg.text.length > 1 ? msg.text : "";
          const partialsText = partialsRef.current.filter(t => t.length > 1).join(" ");
          const full = msgText || partialsText || lastTextRef.current;
          console.log("[ASR Debug] complete event:", { msgText: msg.text, partials: partialsRef.current, lastText: lastTextRef.current, full });
          setPartialText(full);
          if (!finalEmittedRef.current) {
            finalEmittedRef.current = true;
            onFinal?.(full);
          }
          statusRef.current = "idle";
          setStatus("idle");
          cleanupAudio();
          ws.close();
        } else if (msg.event === "error") {
          statusRef.current = "error";
          setStatus("error");
          onError?.(msg.data || "ASR stream error");
          cleanupAudio();
          ws.close();
        }
      } catch {
        // ignore malformed
      }
    };

    ws.onerror = () => {
      statusRef.current = "error";
      setStatus("error");
      onError?.("WebSocket connection failed");
      cleanupAudio();
    };

    ws.onclose = () => {
      if (statusRef.current === "streaming") {
        // Connection closed unexpectedly — emit whatever we have
        // Filter out garbage single-char results
        const validPartials = partialsRef.current.filter(t => t.length > 1);
        const finalText = validPartials.join(" ") || lastTextRef.current;
        console.log("[ASR Debug] onclose emit:", { finalText, partials: partialsRef.current, lastText: lastTextRef.current });
        if (finalText && !finalEmittedRef.current) {
          finalEmittedRef.current = true;
          onFinal?.(finalText);
        }
        statusRef.current = "idle";
        setStatus("idle");
        cleanupAudio();
      }
      wsRef.current = null;
    };

    // 2. Request microphone.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx =
        // @ts-expect-error webkit prefix
        window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      resamplerRef.current = new Resampler(ctx.sampleRate, TARGET_RATE);

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

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
        const r = resamplerRef.current;
        if (!r) return;
        const int16 = r.process(e.data);
        if (int16.length === 0) return;

        // append to rolling buffer
        const prev = int16BufferRef.current;
        const merged = new Int16Array(prev.length + int16.length);
        merged.set(prev);
        merged.set(int16, prev.length);
        int16BufferRef.current = merged;

        flushFrames(false);
      };

      source.connect(workletNode);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Microphone access denied";
      statusRef.current = "error";
      setStatus("error");
      onError?.(msg);
      cleanupAudio();
      cleanupWs();
    }
  }, [status, apiBaseUrl, language, onPartial, onFinal, onError, flushFrames, cleanupAudio, cleanupWs]);

  const stop = useCallback(async () => {
    if (statusRef.current !== "streaming") return;
    flushFrames(true);
    cleanupAudio();
    // keep ws alive until "complete" or "error" arrives
  }, [flushFrames, cleanupAudio]);

  const toggle = useCallback(async () => {
    if (status === "streaming") {
      await stop();
    } else if (status === "idle" || status === "error") {
      await start();
    }
  }, [start, stop, status]);

  return {
    status,
    partialText,
    isStreaming: status === "streaming",
    isConnecting: status === "connecting",
    isIdle: status === "idle",
    isError: status === "error",
    start,
    stop,
    toggle,
  };
}
