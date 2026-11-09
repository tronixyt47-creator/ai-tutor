"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chunkForSpeech, markdownToSpeech, pickVoice, speechLocale } from "@/lib/speech";

const getSynth = (): SpeechSynthesis | undefined =>
  typeof window === "undefined" ? undefined : window.speechSynthesis;

const getRecognitionConstructor = (): SpeechRecognitionConstructor | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
};

/** Reads tutor answers aloud, one short chunk at a time so Chrome doesn't truncate them. */
export function useSpeech(language: string, onEnded?: () => void) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const runRef = useRef(0);
  const onEndedRef = useRef(onEnded);

  onEndedRef.current = onEnded;

  useEffect(() => {
    const synth = getSynth();
    if (!synth) return;
    setSupported(true);
    // Warm the voice list; some browsers load it asynchronously.
    synth.getVoices();
    return () => {
      runRef.current += 1;
      synth.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    runRef.current += 1;
    getSynth()?.cancel();
    setSpeaking(false);
  }, []);

  // Switching reply language should not keep talking in the old one.
  useEffect(() => {
    return () => {
      runRef.current += 1;
      getSynth()?.cancel();
      setSpeaking(false);
    };
  }, [language]);

  const speak = useCallback(
    (markdown: string) => {
      const synth = getSynth();
      if (!synth) return;

      const chunks = chunkForSpeech(markdownToSpeech(markdown));
      if (!chunks.length) return;

      synth.cancel();
      const token = ++runRef.current;
      const voice = pickVoice(synth.getVoices(), language);
      const lang = voice?.lang ?? speechLocale(language);
      let index = 0;

      setSpeaking(true);

      const next = () => {
        if (runRef.current !== token) return;
        if (index >= chunks.length) {
          setSpeaking(false);
          onEndedRef.current?.();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index++]);
        if (voice) utterance.voice = voice;
        utterance.lang = lang;
        utterance.rate = 0.98;
        utterance.pitch = 1;
        utterance.onend = next;
        utterance.onerror = () => {
          if (runRef.current === token) setSpeaking(false);
        };
        synth.speak(utterance);
      };

      next();
    },
    [language],
  );

  return { supported, speaking, speak, stop };
}

/** Dictation via the browser's speech recogniser; auto-submits what it hears. */
export function useDictation(language: string, onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalRef = useRef("");
  const languageRef = useRef(language);
  const onFinalRef = useRef(onFinal);

  languageRef.current = language;
  onFinalRef.current = onFinal;

  useEffect(() => {
    setSupported(Boolean(getRecognitionConstructor()));
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Constructor = getRecognitionConstructor();
    if (!Constructor || recognitionRef.current) return;

    setError(null);
    setInterim("");
    finalRef.current = "";

    const recognition = new Constructor();
    recognition.lang = speechLocale(languageRef.current);
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalRef.current += `${result[0].transcript} `;
        else pending += result[0].transcript;
      }
      setInterim((pending || finalRef.current).trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError(
          "Microphone access is blocked. Allow the mic for this site in your browser settings, then try again.",
        );
      } else if (event.error === "no-speech") {
        setError("I didn't catch that — tap the mic and speak a little closer to the microphone.");
      } else if (event.error === "network") {
        setError("Speech recognition needs a network connection in this browser.");
      } else if (event.error !== "aborted") {
        setError("Voice input stopped unexpectedly. Please try again.");
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setInterim("");
      const text = finalRef.current.trim();
      finalRef.current = "";
      if (text) onFinalRef.current(text);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setError("Voice input could not start. Close other voice apps and try again.");
    }
  }, []);

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop();
    else start();
  }, [start, stop]);

  return {
    supported,
    listening,
    interim,
    error,
    start,
    stop,
    toggle,
    clearError: () => setError(null),
  };
}
