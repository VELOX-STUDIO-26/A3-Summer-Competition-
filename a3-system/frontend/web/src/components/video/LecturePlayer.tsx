"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  RotateCcw,
  Clock,
  Presentation,
  Loader2,
  ScrollText,
} from "lucide-react";
import { useVideoTracking } from "@/hooks/useTracking";
import { useAppStore } from "@/lib/store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ────────────────── Types ──────────────────
interface Slide {
  number: number;
  header: string;
  bullets: string[];
  script: string;
  highlight_terms: string[];
  duration_seconds: number;
  audio_url?: string;
  visual_hint?: string;
  pause_prompt?: string;
}

interface LectureData {
  title: string;
  slides: Slide[];
  total_duration_seconds: number;
}

interface Props {
  data: LectureData;
  topic: string;
}

// ────────────────── Highlight helper ──────────────────
function highlightTerms(
  text: string,
  terms: string[],
  activeTerms: Set<string>
): React.ReactNode[] {
  if (!terms || terms.length === 0) return [text];

  // Build regex from terms
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);

  return parts.map((part, i) => {
    const isMatch = terms.some((t) => t.toLowerCase() === part.toLowerCase());
    const isActive = activeTerms.has(part.toLowerCase());
    if (isMatch) {
      return (
        <span
          key={i}
          className={`font-semibold transition-all duration-500 ${
            isActive
              ? "text-gray-900 underline decoration-gray-400 decoration-2"
              : "text-gray-700"
          }`}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ────────────────── Main Component ──────────────────
export default function LecturePlayer({ data, topic }: Props) {
  const { studentId } = useAppStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [activeTerms, setActiveTerms] = useState<Set<string>>(new Set());
  const [slideProgress, setSlideProgress] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [kenBurnsPhase, setKenBurnsPhase] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const volumeRef = useRef<HTMLDivElement | null>(null);
  const [ttsProvider, setTtsProvider] = useState<"edge" | "iflytek" | "browser">("edge");

  const slides = data.slides || [];
  const slide = slides[currentSlide];
  const totalDuration = data.total_duration_seconds || 60;

  // Initialize video tracking
  const { trackProgress, trackPause, trackComplete } = useVideoTracking({
    studentId: studentId || "anonymous",
    milestoneId: topic.replace(/\s+/g, "_").toLowerCase(),
    resourceId: `video_${topic.replace(/\s+/g, "_").toLowerCase()}`,
    totalDuration,
    enabled: !!studentId,
  });

  // Track progress when slide changes or during playback
  useEffect(() => {
    if (isPlaying && slide) {
      const currentTime = slides.slice(0, currentSlide).reduce((acc, s) => acc + s.duration_seconds, 0);
      trackProgress(currentTime);
    }
  }, [currentSlide, isPlaying, slides, trackProgress]);

  // Track completion when video finishes
  useEffect(() => {
    if (!isPlaying && currentSlide === slides.length - 1 && slideProgress >= 0.99) {
      trackComplete();
    }
  }, [isPlaying, currentSlide, slideProgress, slides.length, trackComplete]);

  // ── Stop all playback ──
  const stopAllPlayback = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setIsPlaying(false);
    setSlideProgress(0);
    setActiveTerms(new Set());
  }, []);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      stopAllPlayback();
    };
  }, [stopAllPlayback]);

  // ── Stop playback when component is hidden (user clicks back / X) ──
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && isPlaying) {
            stopAllPlayback();
          }
        });
      },
      { threshold: 0.1 }
    );

    const container = containerRef.current;
    if (container) observer.observe(container);

    return () => {
      if (container) observer.unobserve(container);
    };
  }, [isPlaying, stopAllPlayback]);

  // ── Ken Burns animation cycle ──
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setKenBurnsPhase((p) => (p + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // ── Update audio volume when volume state changes ──
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // ── Close volume slider when clicking outside ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(e.target as Node)) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Handle volume change ──
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  // ── Fetch TTS audio on-demand ──
  const fetchTTSAudio = useCallback(async (text: string): Promise<string | null> => {
    if (ttsProvider === "browser") return null;
    try {
      const response = await fetch(`${API_BASE}/api/tts/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          provider: ttsProvider,
          voice: ttsProvider === "iflytek" ? "catherine" : "en-US-JennyNeural",
        }),
      });
      if (!response.ok) {
        console.warn("Backend TTS failed, falling back to browser");
        return null;
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn("Backend TTS error:", error);
      return null;
    }
  }, [ttsProvider]);

  // ── Speak slide + advance ──
  const speakSlide = useCallback(
    async (slideIdx: number) => {
      if (slideIdx >= slides.length) {
        setIsPlaying(false);
        return;
      }

      const s = slides[slideIdx];

      // Stop any current audio
      window.speechSynthesis?.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.src = "";
        audioRef.current = null;
      }

      setActiveTerms(new Set());
      setSlideProgress(0);

      // Progress bar ticker
      if (progressRef.current) clearInterval(progressRef.current);
      const duration = s.duration_seconds * 1000;
      const tick = 50;
      let elapsed = 0;
      progressRef.current = setInterval(() => {
        elapsed += tick;
        setSlideProgress(Math.min(elapsed / duration, 1));
        setTotalElapsed((prev) => prev + tick / 1000);
      }, tick);

      // Advance to next slide helper
      const advanceToNext = () => {
        if (progressRef.current) clearInterval(progressRef.current);
        setSlideProgress(1);
        timerRef.current = setTimeout(() => {
          if (slideIdx + 1 < slides.length) {
            setDirection("left");
            setTimeout(() => {
              setCurrentSlide(slideIdx + 1);
              setDirection(null);
              speakSlide(slideIdx + 1);
            }, 400);
          } else {
            setIsPlaying(false);
          }
        }, 500);
      };

      // ── TTS: use server-cached audio if available, else fallback ──
      if (!isMuted) {
        const serverAudioUrl = s.audio_url ? `${API_BASE}${s.audio_url}` : null;

        // Helper to try server audio, returns true if successful
        const tryServerAudio = async (): Promise<boolean> => {
          if (!serverAudioUrl) return false;

          try {
            const audio = new Audio();
            audioRef.current = audio;

            return new Promise((resolve) => {
              let resolved = false;
              let hasEnded = false;

              const handleEnd = () => {
                if (hasEnded) return;
                hasEnded = true;
                advanceToNext();
              };

              audio.onended = handleEnd;

              audio.onerror = () => {
                if (!resolved) {
                  resolved = true;
                  console.warn(`Server audio failed to load: ${serverAudioUrl}`);
                  resolve(false);
                }
              };

              // Use `canplay` (enough buffered to start) instead of
              // `canplaythrough` (entire file buffered). Cached server audio
              // can be slow to fully buffer, but once it starts playing the
              // browser will continue fetching in the background.
              const tryPlay = () => {
                if (resolved) return;
                audio.play()
                  .then(() => {
                    resolved = true;
                    resolve(true);
                  })
                  .catch((err) => {
                    if (!resolved) {
                      resolved = true;
                      console.warn("Server audio play failed:", err);
                      resolve(false);
                    }
                  });
              };
              audio.oncanplay = tryPlay;
              audio.oncanplaythrough = tryPlay;

              // Longer timeout (20s) — cached audio on slow connections /
              // busy backend can take a while before the first bytes arrive.
              setTimeout(() => {
                if (!resolved) {
                  resolved = true;
                  console.warn("Server audio load timeout, falling back");
                  resolve(false);
                }
              }, 20000);

              audio.src = serverAudioUrl;
              audio.load();
            });
          } catch (err) {
            console.warn("Server audio setup failed:", err);
            return false;
          }
        };

        // Try server audio first
        const serverAudioWorked = await tryServerAudio();

        if (serverAudioWorked) {
          // Server audio is playing, set up highlight terms
          const words = s.script.split(/\s+/);
          const wordDuration = duration / words.length;
          words.forEach((word, i) => {
            setTimeout(() => {
              const matchedTerm = s.highlight_terms?.find(
                (t) => t.toLowerCase() === word.toLowerCase().replace(/[.,!?]/g, "")
              );
              if (matchedTerm) {
                setActiveTerms((prev) => new Set([...prev, matchedTerm.toLowerCase()]));
              }
            }, i * wordDuration);
          });
        } else {
          // No server audio — try on-demand backend TTS first
          const onDemandUrl = await fetchTTSAudio(s.script);
          if (onDemandUrl) {
            const audio = new Audio(onDemandUrl);
            audioRef.current = audio;
            let hasEnded = false;
            const handleEnd = () => {
              if (hasEnded) return;
              hasEnded = true;
              URL.revokeObjectURL(onDemandUrl);
              advanceToNext();
            };
            audio.onended = handleEnd;
            audio.onerror = handleEnd;
            audio.play().catch((err) => {
              console.warn("On-demand audio play failed:", err);
              handleEnd();
            });
            // Highlight terms (estimate)
            const words = s.script.split(/\s+/);
            const wordDuration = duration / words.length;
            words.forEach((word, i) => {
              setTimeout(() => {
                const matchedTerm = s.highlight_terms?.find(
                  (t) => t.toLowerCase() === word.toLowerCase().replace(/[.,!?]/g, "")
                );
                if (matchedTerm) {
                  setActiveTerms((prev) => new Set([...prev, matchedTerm.toLowerCase()]));
                }
              }, i * wordDuration);
            });
          } else if ("speechSynthesis" in window) {
            // Fallback to browser TTS
            const utter = new SpeechSynthesisUtterance(s.script);
            utter.rate = 1.0;
            utter.pitch = 1.0;
            utter.volume = 1.0;

            const voices = window.speechSynthesis.getVoices();
            const preferred = voices.find(
              (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Google") ||
                  v.name.includes("Microsoft") ||
                  v.name.includes("Samantha") ||
                  v.name.includes("Jenny"))
            );
            if (preferred) utter.voice = preferred;

            utter.onboundary = (e) => {
              if (e.name === "word") {
                const word = s.script.substring(e.charIndex, e.charIndex + e.charLength);
                const matchedTerm = s.highlight_terms?.find(
                  (t) => t.toLowerCase() === word.toLowerCase()
                );
                if (matchedTerm) {
                  setActiveTerms((prev) => new Set([...prev, matchedTerm.toLowerCase()]));
                }
              }
            };

            utter.onend = advanceToNext;
            window.speechSynthesis.speak(utter);
          } else {
            // No TTS available — use timer
            timerRef.current = setTimeout(advanceToNext, duration);
          }
        }
      } else {
        // Muted — use timer based on duration_seconds
        timerRef.current = setTimeout(advanceToNext, duration);
      }
    },
    [slides, isMuted, fetchTTSAudio]
  );

  // ── Play / Pause ──
  const togglePlay = () => {
    const currentTime = slides.slice(0, currentSlide).reduce((acc, s) => acc + s.duration_seconds, 0);

    if (isPlaying) {
      setIsPlaying(false);
      window.speechSynthesis?.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      // Track pause event
      trackPause(currentTime);
    } else {
      setIsPlaying(true);
      speakSlide(currentSlide);
    }
  };

  // ── Navigate ──
  const goToSlide = (idx: number) => {
    if (idx < 0 || idx >= slides.length) return;
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    const dir = idx > currentSlide ? "left" : "right";
    setDirection(dir);
    setTimeout(() => {
      setCurrentSlide(idx);
      setDirection(null);
      setSlideProgress(0);
      setActiveTerms(new Set());
      if (isPlaying) speakSlide(idx);
    }, 400);
  };

  const restart = () => {
    setTotalElapsed(0);
    setCurrentSlide(0);
    setSlideProgress(0);
    setActiveTerms(new Set());
    setIsPlaying(false);
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
  };

  // Ken Burns transform
  const kenBurnsTransform = [
    "scale(1.02) translate(0%, 0%)",
    "scale(1.06) translate(-1%, -0.5%)",
    "scale(1.04) translate(0.5%, 0.5%)",
    "scale(1.03) translate(-0.5%, 0%)",
  ][kenBurnsPhase];

  if (!slide) {
    return (
      <div className="flex items-center justify-center h-full text-[#888] text-xs">
        No slides available
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full select-none">
      {/* ════════════════════════════════════════
          TOP HALF — Slide / Video Area
      ════════════════════════════════════════ */}
      <div className="h-[55%] min-h-0 relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 transition-transform duration-[3000ms] ease-in-out"
          style={{ transform: kenBurnsTransform }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(gray 1px, transparent 1px), linear-gradient(90deg, gray 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Slide content with lateral slide transition */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center px-8 py-6 transition-all duration-400 ease-out ${
            direction === "left"
              ? "-translate-x-full opacity-0"
              : direction === "right"
                ? "translate-x-full opacity-0"
                : "translate-x-0 opacity-100"
          }`}
        >
          {/* Slide number badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="text-[9px] font-mono text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200">
              {slide.number} / {slides.length}
            </span>
            {slide.audio_url && ttsProvider !== "browser" && (
              <span className="text-[9px] text-green-600 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                <Volume2 className="w-2.5 h-2.5" />
                Audio ready
              </span>
            )}
            {!slide.audio_url && ttsProvider !== "browser" && (
              <span className="text-[9px] text-amber-600 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                <VolumeX className="w-2.5 h-2.5" />
                Audio not cached
              </span>
            )}
          </div>

          {/* Header */}
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-5 leading-tight tracking-tight">
            {highlightTerms(slide.header, slide.highlight_terms || [], activeTerms)}
          </h2>

          {/* Bullets */}
          <div className="space-y-2 max-w-md w-full">
            {slide.bullets?.map((bullet, i) => (
              <div
                key={i}
                className="flex items-start gap-3 transition-all duration-300"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 shrink-0" />
                <span className="text-base text-gray-700 leading-relaxed">
                  {highlightTerms(bullet, slide.highlight_terms || [], activeTerms)}
                </span>
              </div>
            ))}
          </div>

          {/* Visual hint (if present) */}
          {slide.visual_hint && (
            <div className="mt-4 px-4 py-2.5 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-600 italic">
              <span className="font-semibold text-gray-500">Visual: </span>
              {slide.visual_hint}
            </div>
          )}

          {/* Pause prompt (if present) */}
          {slide.pause_prompt && isPlaying && (
            <div className="mt-3 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-center gap-2 animate-pulse">
              <span className="w-4 h-4 rounded-full bg-amber-200 flex items-center justify-center text-[8px]">⏸</span>
              {slide.pause_prompt}
            </div>
          )}
        </div>

        {/* Slide progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div
            className="h-full bg-gray-900 transition-all duration-100 ease-linear"
            style={{ width: `${slideProgress * 100}%` }}
          />
        </div>
      </div>

      {/* ════════════════════════════════════════
          BOTTOM HALF — Transcript Area
      ════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex flex-col mt-2">
        {/* Transcript header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-t-lg border border-gray-200 border-b-0">
          <div className="flex items-center gap-2">
            <ScrollText className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Transcript
            </span>
          </div>
          <span className="text-xs text-gray-400">
            Slide {currentSlide + 1} of {slides.length}
          </span>
        </div>

        {/* Transcript content */}
        <div
          className="flex-1 overflow-y-auto bg-white rounded-b-lg border border-gray-200 border-t-0 p-3 space-y-2 scrollbar-thin"
        >
          {slides.map((s, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                idx === currentSlide
                  ? "bg-gray-900 text-white border-gray-900"
                  : idx < currentSlide
                    ? "bg-gray-50 border-transparent hover:bg-gray-100"
                    : "bg-white border-transparent opacity-50 hover:opacity-70 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-sm font-bold px-2 py-1 rounded ${
                    idx === currentSlide
                      ? "bg-white text-gray-900"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {s.number}
                </span>
                <span className={`text-base font-medium truncate ${idx === currentSlide ? "text-white" : "text-gray-700"}`}>
                  {s.header}
                </span>
                {idx === currentSlide && isPlaying && (
                  <span className="ml-auto flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-white/60 animate-pulse" />
                    <span className="text-[9px] text-white/80">Playing</span>
                  </span>
                )}
              </div>
              <p className={`text-base leading-relaxed ${idx === currentSlide ? "text-white/80" : "text-gray-600"}`}>
                {highlightTerms(s.script, s.highlight_terms || [],
                  idx === currentSlide ? activeTerms : new Set()
                )}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════
          CONTROLS — Compact bar
      ════════════════════════════════════════ */}
      <div className="mt-2 space-y-2 shrink-0">
        {/* Slide dots / timeline */}
        <div className="flex items-center justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentSlide
                  ? "w-6 bg-gray-900"
                  : i < currentSlide
                    ? "w-1.5 bg-gray-400"
                    : "w-1.5 bg-gray-200 hover:bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Control bar */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1">
            <button
              onClick={restart}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              title="Restart"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => goToSlide(currentSlide - 1)}
              disabled={currentSlide === 0}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isPlaying
                ? "bg-gray-900 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToSlide(currentSlide + 1)}
              disabled={currentSlide === slides.length - 1}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            {/* Volume Control */}
            <div ref={volumeRef} className="relative">
              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                className={`p-1.5 rounded-lg transition-all ${
                  isMuted
                    ? "text-red-500 hover:text-red-600"
                    : "text-gray-400 hover:text-gray-600"
                } hover:bg-gray-100`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              {/* Volume Slider Popup */}
              {showVolumeSlider && (
                <div className="absolute bottom-full right-0 mb-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-900"
                    style={{
                      background: `linear-gradient(to right, #1f2937 0%, #1f2937 ${(isMuted ? 0 : volume) * 100}%, #e5e7eb ${(isMuted ? 0 : volume) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <span className="text-[10px] text-gray-500">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info bar */}
        <div className="flex items-center justify-between px-2 text-[9px] text-gray-400">
          <span className="flex items-center gap-1">
            <Presentation className="w-3 h-3" />
            {data.title}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            ~{totalDuration}s
          </span>
        </div>
      </div>
    </div>
  );
}
