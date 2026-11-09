"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chunkForSpeech, markdownToSpeech } from "@/lib/speech";

type SpeechOptions = {
  language: string;
  voice: string;
  onEnded?: () => void;
};

const SAMPLE_RATE = 24000;
/** Sarvam accepts 2500 characters per call; 1200 keeps intonation intact. */
const CHUNK_CHARS = 1200;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pcmToBuffer(ctx: AudioContext, bytes: Uint8Array): AudioBuffer | null {
  const sampleCount = Math.floor(bytes.length / 2);
  if (!sampleCount) return null;

  const buffer = ctx.createBuffer(1, sampleCount, SAMPLE_RATE);
  const channel = buffer.getChannelData(0);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < sampleCount; i += 1) channel[i] = view.getInt16(i * 2, true) / 32768;
  return buffer;
}

/**
 * Speaks answers with the server's neural voices (Sarvam → Gemini) and plays
 * the audio through Web Audio.
 *
 * `speak` is fire-and-forget for read-aloud. `startStream` / `appendStream` /
 * `endStream` exist for the voice assistant: sentences are pushed as the model
 * writes them, so Vidya starts talking before the answer is finished.
 *
 * `speak` returns false when nothing could be played, letting the caller fall
 * back to the browser's built-in voices.
 */
export function useNeuralVoice({ language, voice, onEnded }: SpeechOptions) {
  const [speaking, setSpeaking] = useState(false);
  const [failed, setFailed] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const cursorRef = useRef(0);
  const runRef = useRef(0);
  const activeRef = useRef(false);
  const finishedRef = useRef(false);
  const endedRef = useRef(false);
  const pendingFetchRef = useRef(0);
  const pendingSourcesRef = useRef(0);
  const startedRef = useRef(false);
  const onEndedRef = useRef(onEnded);

  onEndedRef.current = onEnded;

  const ensureContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const maybeDone = useCallback((token: number) => {
    if (token !== runRef.current) return;
    if (!finishedRef.current) return;
    if (pendingFetchRef.current > 0 || pendingSourcesRef.current > 0) return;
    activeRef.current = false;
    setSpeaking(false);
    if (!endedRef.current) {
      endedRef.current = true;
      onEndedRef.current?.();
    }
  }, []);

  const stop = useCallback(() => {
    runRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    for (const source of sourcesRef.current) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    }
    sourcesRef.current.clear();
    pendingFetchRef.current = 0;
    pendingSourcesRef.current = 0;
    cursorRef.current = 0;
    activeRef.current = false;
    finishedRef.current = false;
    endedRef.current = false;
    startedRef.current = false;
    setSpeaking(false);
  }, []);

  /** Call from a click/tap so mobile browsers allow audio. */
  const unlock = useCallback(() => {
    const ctx = ensureContext();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }, [ensureContext]);

  const schedule = useCallback(
    (ctx: AudioContext, token: number, buffer: AudioBuffer) => {
      if (token !== runRef.current) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      const startAt = Math.max(ctx.currentTime + 0.06, cursorRef.current);
      source.start(startAt);
      cursorRef.current = startAt + buffer.duration;
      startedRef.current = true;
      sourcesRef.current.add(source);
      pendingSourcesRef.current += 1;
      source.onended = () => {
        sourcesRef.current.delete(source);
        pendingSourcesRef.current = Math.max(0, pendingSourcesRef.current - 1);
        maybeDone(token);
      };
    },
    [maybeDone],
  );

  /** Fetches and schedules one piece of speech. Resolves true if audio played. */
  const push = useCallback(
    async (token: number, markdown: string): Promise<boolean> => {
      const ctx = ensureContext();
      if (!ctx) return false;

      const pieces = chunkForSpeech(markdownToSpeech(markdown), CHUNK_CHARS);
      if (!pieces.length) return false;

      let started = false;

      for (const piece of pieces) {
        if (token !== runRef.current) break;

        const controller = new AbortController();
        abortRef.current = controller;
        pendingFetchRef.current += 1;

        try {
          const res = await fetch("/api/voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: piece, language, voice }),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            if (token === runRef.current) setFailed(true);
            break;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let boundary = buffer.indexOf("\n\n");
            while (boundary >= 0) {
              const frame = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              boundary = buffer.indexOf("\n\n");
              if (token !== runRef.current) return started;

              const line = frame.split("\n").find((l) => l.startsWith("data:"));
              if (!line) continue;
              const payload = line.slice(5).trim();
              if (!payload) continue;

              let parsed: { mime?: string; audio?: string; error?: string; done?: boolean };
              try {
                parsed = JSON.parse(payload);
              } catch {
                continue;
              }
              if (parsed.error) {
                if (token === runRef.current) setFailed(true);
                break;
              }
              if (!parsed.audio) continue;

              const bytes = base64ToBytes(parsed.audio);
              const audioBuffer = parsed.mime?.includes("wav")
                ? await ctx
                    .decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer)
                    .catch(() => null)
                : pcmToBuffer(ctx, bytes);

              if (audioBuffer) {
                schedule(ctx, token, audioBuffer);
                started = true;
              }
            }
          }
        } catch (error) {
          if ((error as Error).name === "AbortError") return started;
          if (token === runRef.current) setFailed(true);
          break;
        } finally {
          pendingFetchRef.current = Math.max(0, pendingFetchRef.current - 1);
          maybeDone(token);
        }
      }

      return started;
    },
    [ensureContext, language, maybeDone, schedule, voice],
  );

  /** Fresh, self-contained answer. Callers that stream should use startStream. */
  const speak = useCallback(
    async (markdown: string): Promise<boolean> => {
      stop();
      const token = runRef.current;
      activeRef.current = true;
      endedRef.current = false;
      setFailed(false);
      setSpeaking(true);

      const started = await push(token, markdown);

      if (token !== runRef.current) return started;
      finishedRef.current = true;
      if (!started && pendingSourcesRef.current === 0) {
        activeRef.current = false;
        setSpeaking(false);
        return false;
      }
      maybeDone(token);
      return true;
    },
    [maybeDone, push, stop],
  );

  /** Opens a run that more text can be appended to (voice assistant mode). */
  const startStream = useCallback(() => {
    stop();
    activeRef.current = true;
    endedRef.current = false;
    setFailed(false);
    setSpeaking(true);
  }, [stop]);

  const appendStream = useCallback(
    (markdown: string) => {
      if (!activeRef.current) {
        void speak(markdown);
        return;
      }
      void push(runRef.current, markdown);
    },
    [push, speak],
  );

  const endStream = useCallback(() => {
    if (!activeRef.current) return;
    finishedRef.current = true;
    maybeDone(runRef.current);
  }, [maybeDone]);

  useEffect(() => {
    return () => {
      runRef.current += 1;
      abortRef.current?.abort();
      for (const source of sourcesRef.current) {
        try {
          source.stop();
        } catch {
          /* noop */
        }
      }
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  return {
    speaking,
    failed,
    speak,
    startStream,
    appendStream,
    endStream,
    stop,
    unlock,
    hasStarted: () => startedRef.current,
  };
}
