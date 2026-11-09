"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LiveState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
export type LiveLine = { role: "student" | "jarvis"; text: string };

const LIVE_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";
const b64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

export function useGeminiLive() {
  const [state, setState] = useState<LiveState>("idle");
  const [lines, setLines] = useState<LiveLine[]>([]);
  const [interim, setInterim] = useState("");
  const [assistantInterim, setAssistantInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextOutputTimeRef = useRef(0);
  const generationRef = useRef(0);
  const userLineRef = useRef("");
  const assistantLineRef = useRef("");
  const sessionHandleRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const modelRef = useRef<string | null>(null);
  const tokenExpiresRef = useRef(0);
  const mutedRef = useRef(false);
  const intentionalCloseRef = useRef(true);

  const stopAudio = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    for (const source of sourcesRef.current) { try { source.stop(); } catch { /* already ended */ } }
    sourcesRef.current = [];
    void inputContextRef.current?.close();
    void outputContextRef.current?.close();
    inputContextRef.current = null;
    outputContextRef.current = null;
    setInputLevel(0);
    setOutputLevel(0);
  }, []);

  const close = useCallback(() => {
    intentionalCloseRef.current = true;
    generationRef.current += 1;
    socketRef.current?.close(1000, "Session ended");
    socketRef.current = null;
    stopAudio();
    setConnected(false);
    setMuted(false);
    mutedRef.current = false;
    setInterim("");
    setAssistantInterim("");
    setState("idle");
    sessionHandleRef.current = null;
    tokenRef.current = null;
    modelRef.current = null;
    tokenExpiresRef.current = 0;
  }, [stopAudio]);

  useEffect(() => () => {
    intentionalCloseRef.current = true;
    generationRef.current += 1;
    socketRef.current?.close(1000, "Page closed");
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    for (const source of sourcesRef.current) { try { source.stop(); } catch { /* already ended */ } }
    void inputContextRef.current?.close();
    void outputContextRef.current?.close();
  }, []);

  const start = useCallback(async (args: { subject: string; subjectId: string; chapter: string; chapterId: string; topics: string[]; language: string; apiKey?: string }) => {
    if (state === "connecting" || connected) return;
    const generation = ++generationRef.current;
    intentionalCloseRef.current = false;
    setError(null);
    setState("connecting");
    setInterim("");
    setAssistantInterim("");
    userLineRef.current = "";
    assistantLineRef.current = "";
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser can't access a microphone. Open the app in a modern browser over HTTPS.");
      // Resume output immediately in the click gesture so browser autoplay policy
      // does not block streamed Gemini audio after the network handshake.
      const out = new AudioContext({ sampleRate: 24000 });
      outputContextRef.current = out;
      void out.resume();
      const input = new AudioContext({ sampleRate: 16000 });
      inputContextRef.current = input;
      void input.resume();
      const mic = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (generation !== generationRef.current) { mic.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = mic;
      let tokenResult: { token?: string; model?: string; error?: string };
      if (sessionHandleRef.current && tokenRef.current && Date.now() < tokenExpiresRef.current) {
        // Gemini permits the constrained token to resume its existing session.
        tokenResult = { token: tokenRef.current, model: modelRef.current ?? undefined };
      } else {
        sessionHandleRef.current = null;
        const response = await fetch("/api/live-token", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", ...(args.apiKey ? { "x-gemini-api-key": args.apiKey } : {}) }, body: JSON.stringify({ subjectId: args.subjectId, chapterId: args.chapterId, language: args.language }) });
        tokenResult = await response.json() as { token?: string; model?: string; error?: string };
        if (tokenResult.token && tokenResult.model) {
          tokenRef.current = tokenResult.token;
          modelRef.current = tokenResult.model;
          tokenExpiresRef.current = Date.now() + 29 * 60_000;
        }
      }
      if (!tokenResult.token || !tokenResult.model) throw new Error(tokenResult.error || "Gemini Live is unavailable.");
      if (generation !== generationRef.current) return;
      const socket = new WebSocket(`${LIVE_URL}?access_token=${encodeURIComponent(tokenResult.token)}`);
      socketRef.current = socket;
      socket.onopen = () => {
        if (generation !== generationRef.current) return;
        socket.send(JSON.stringify({ setup: {
          model: `models/${tokenResult.model}`,
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } } },
          inputAudioTranscription: {}, outputAudioTranscription: {}, sessionResumption: sessionHandleRef.current ? { handle: sessionHandleRef.current } : {},
        } }));
      };
      socket.onmessage = async (event) => {
        if (generation !== generationRef.current) return;
        let message: Record<string, any>;
        try {
          const raw: unknown = event.data;
          const text = typeof raw === "string" ? raw : raw instanceof Blob ? await raw.text() : new TextDecoder().decode(raw as ArrayBuffer);
          message = JSON.parse(text);
        } catch { return; }
        if (message.error?.message) { setError(message.error.message); return; }
        if (message.sessionResumptionUpdate?.newHandle) sessionHandleRef.current = message.sessionResumptionUpdate.newHandle;
        if (message.setupComplete) {
          setConnected(true);
          setState("listening");
          await out.resume();
          if (generation !== generationRef.current) return;
          let next = out.currentTime + 0.08;
          nextOutputTimeRef.current = next;
          await input.resume();
          if (generation !== generationRef.current) return;
          const source = input.createMediaStreamSource(mic);
          const processor = input.createScriptProcessor(2048, 1, 1);
          processorRef.current = processor;
          processor.onaudioprocess = (audioEvent) => {
            if (mutedRef.current || socket.readyState !== WebSocket.OPEN) return;
            const samples = audioEvent.inputBuffer.getChannelData(0);
            let energy = 0;
            const pcm = new Uint8Array(samples.length * 2);
            const view = new DataView(pcm.buffer);
            for (let i = 0; i < samples.length; i++) {
              const sample = Math.max(-1, Math.min(1, samples[i]));
              energy += sample * sample;
              view.setInt16(i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
            }
            setInputLevel(Math.min(1, Math.sqrt(energy / samples.length) * 7));
            socket.send(JSON.stringify({ realtimeInput: { audio: { data: b64(pcm), mimeType: "audio/pcm;rate=16000" } } }));
          };
          source.connect(processor);
          processor.connect(input.destination);
          return;
        }
        const content = message.serverContent;
        if (!content) return;
        if (content.interrupted) {
          for (const source of sourcesRef.current) { try { source.stop(); } catch { /* ended */ } }
          sourcesRef.current = [];
          outputContextRef.current && (nextOutputTimeRef.current = outputContextRef.current.currentTime);
          assistantLineRef.current = "";
          setState("listening");
          setOutputLevel(0);
        }
        const incoming = content.inputTranscription?.text;
        if (incoming) {
          userLineRef.current += incoming;
          setInterim(userLineRef.current);
        }
        const liveIncoming = content.interimInputTranscription?.text;
        if (liveIncoming) setInterim(`${userLineRef.current}${liveIncoming}`);
        const spoken = content.outputTranscription?.text;
        if (spoken) {
          assistantLineRef.current += spoken;
          setAssistantInterim(assistantLineRef.current);
        }
        if (content.turnComplete) {
          if (userLineRef.current.trim()) setLines((prev) => [...prev, { role: "student", text: userLineRef.current.trim() }]);
          if (assistantLineRef.current.trim()) setLines((prev) => [...prev, { role: "jarvis", text: assistantLineRef.current.trim() }]);
          userLineRef.current = "";
          assistantLineRef.current = "";
          setInterim("");
          setAssistantInterim("");
          setOutputLevel(0);
          setState("listening");
        }
        const parts = content.modelTurn?.parts ?? [];
        for (const part of parts) {
          const audio = part.inlineData?.data;
          if (!audio) continue;
          const out = outputContextRef.current;
          if (!out) continue;
          const raw = atob(audio);
          const samples = new Int16Array(raw.length / 2);
          for (let i = 0; i < samples.length; i++) samples[i] = (raw.charCodeAt(i * 2) & 255) | (raw.charCodeAt(i * 2 + 1) << 8);
          const buffer = out.createBuffer(1, samples.length, 24000);
          const channel = buffer.getChannelData(0);
          let energy = 0;
          for (let i = 0; i < samples.length; i++) { channel[i] = samples[i] / 32768; energy += channel[i] * channel[i]; }
          const node = out.createBufferSource();
          node.buffer = buffer;
          node.connect(out.destination);
          const when = Math.max(out.currentTime + 0.02, nextOutputTimeRef.current);
          nextOutputTimeRef.current = when + buffer.duration;
          node.start(when);
          sourcesRef.current.push(node);
          node.onended = () => { sourcesRef.current = sourcesRef.current.filter((sourceNode) => sourceNode !== node); };
          setOutputLevel(Math.min(1, Math.sqrt(energy / Math.max(1, samples.length)) * 5));
          setState("speaking");
        }
        if (content.modelTurn && !parts.some((part: any) => part.inlineData?.data)) setState("thinking");
      };
      socket.onerror = () => { if (generation === generationRef.current) setError("Gemini Live connection failed. Check your API key, model access, and network."); };
      socket.onclose = (event) => {
        if (generation !== generationRef.current || intentionalCloseRef.current) return;
        setConnected(false);
        stopAudio();
        setState("error");
        setError(event.reason || "The Live session disconnected. End the session and reconnect to continue.");
      };
    } catch (cause) {
      if (generation !== generationRef.current) return;
      stopAudio();
      setConnected(false);
      setState("error");
      setError(cause instanceof Error ? cause.message : "Could not start the Live session.");
    }
  }, [connected, state, stopAudio]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    if (mutedRef.current) setInputLevel(0);
  }, []);

  const interrupt = useCallback(() => {
    for (const source of sourcesRef.current) { try { source.stop(); } catch { /* ended */ } }
    sourcesRef.current = [];
    const out = outputContextRef.current;
    if (out) nextOutputTimeRef.current = out.currentTime;
    setOutputLevel(0);
    setState(connected ? "listening" : state);
  }, [connected, state]);

  return { state, lines, interim, assistantInterim, error, muted, connected, inputLevel, outputLevel, start, close, toggleMute, interrupt };
}
