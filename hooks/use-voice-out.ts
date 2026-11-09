"use client";

import { useCallback, useRef, useState } from "react";
import { useNeuralVoice } from "./use-neural-voice";
import { useSpeech } from "./use-voice";

export type VoiceEngine = "neural" | "browser" | null;

/**
 * Speaks with the server's neural voice (Sarvam Indian voices, then Gemini) and
 * silently drops back to the browser's built-in voices when it can't.
 */
export function useVoiceOut({
  language,
  voice,
  onEnded,
}: {
  language: string;
  voice: string;
  onEnded?: () => void;
}) {
  const [engine, setEngine] = useState<VoiceEngine>(null);
  const neural = useNeuralVoice({ language, voice, onEnded });
  const browser = useSpeech(language, onEnded);
  const streamText = useRef("");
  const streaming = useRef(false);

  const speak = useCallback(
    async (markdown: string) => {
      streaming.current = false;
      const spoken = await neural.speak(markdown);
      if (spoken) {
        setEngine("neural");
        return true;
      }
      if (browser.supported) {
        setEngine("browser");
        browser.speak(markdown);
        return true;
      }
      return false;
    },
    [browser, neural],
  );

  /** Voice-assistant runs: text is appended sentence by sentence as it streams. */
  const startStream = useCallback(() => {
    streamText.current = "";
    streaming.current = true;
    neural.startStream();
  }, [neural]);

  const appendStream = useCallback(
    (markdown: string) => {
      if (!streaming.current) {
        void speak(markdown);
        return;
      }
      streamText.current += `${markdown} `;
      neural.appendStream(markdown);
    },
    [neural, speak],
  );

  const endStream = useCallback(() => {
    if (!streaming.current) return;
    streaming.current = false;
    neural.endStream();
    // Neural synthesis never produced audio (no key, quota, offline) — read the
    // whole answer with the browser's own voice instead of staying silent.
    if (!neural.hasStarted() && browser.supported && streamText.current.trim()) {
      setEngine("browser");
      const text = streamText.current;
      window.setTimeout(() => browser.speak(text), 0);
    }
    streamText.current = "";
  }, [browser, neural]);

  const stop = useCallback(() => {
    streaming.current = false;
    streamText.current = "";
    neural.stop();
    browser.stop();
  }, [browser, neural]);

  const unlock = useCallback(() => neural.unlock(), [neural]);

  return {
    speaking: neural.speaking || browser.speaking,
    engine,
    speak,
    startStream,
    appendStream,
    endStream,
    stop,
    unlock,
    browserSupported: browser.supported,
  };
}
