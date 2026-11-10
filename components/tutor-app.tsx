"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import AssistantMode from "./assistant-mode";
import PastPapers from "./past-papers";
import LessonVisual from "./lesson-visual";
import Markdown from "./markdown";
import Sidebar from "./sidebar";
import {
  AlertIcon,
  BookIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  CopyIcon,
  MenuIcon,
  MicIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  SpeakerIcon,
  SettingsIcon,
  StopIcon,
} from "./icons";
import { useDictation } from "@/hooks/use-voice";
import { useVoiceOut } from "@/hooks/use-voice-out";
import { findMode, LANGUAGES, MODES, type LanguageId, type TutorMode } from "@/lib/modes";
import { speechLocaleLabel } from "@/lib/speech";
import type { TtsProvider, Voice } from "@/lib/voices";
import { DEFAULT_CHAPTER, DEFAULT_SUBJECT, findChapter, findSubject, SUBJECTS } from "@/lib/syllabus";
import type { ChatMessage } from "@/lib/tutor-request";
import { useGeminiLive } from "@/hooks/use-gemini-live";

const STORAGE_KEY = "vidya.session.v1";
const API_KEY_STORAGE = "vidya.gemini-key.v1";
const LEGACY_API_KEY_STORAGE = "vidya.gemini-key.session.v1";

type Sessions = Record<string, ChatMessage[]>;
type Status = "idle" | "streaming";
type AiInfo = { configured: boolean; model: string };

const sessionKeyOf = (subjectId: string, chapterId: string) => `${subjectId}::${chapterId}`;

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (m.role === "user" || m.role === "assistant") && typeof m.content === "string";
}

export default function TutorApp() {
  const [subjectId, setSubjectId] = useState(DEFAULT_SUBJECT.id);
  const [chapterId, setChapterId] = useState(DEFAULT_CHAPTER.id);
  const [mode, setMode] = useState<TutorMode>("explain");
  const [language, setLanguage] = useState<LanguageId>("hinglish");
  const [sessions, setSessions] = useState<Sessions>({});
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<AiInfo | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [readAloud, setReadAloud] = useState(false);
  const [voice, setVoice] = useState("priya");
  const [voiceCatalog, setVoiceCatalog] = useState<{
    provider: TtsProvider | null;
    voices: readonly Voice[];
    defaultVoice: string;
  } | null>(null);
  const [handsFree, setHandsFree] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [pastPapersOpen, setPastPapersOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const subject = findSubject(subjectId);
  const chapter = findChapter(subjectId, chapterId);
  const modeMeta = findMode(mode);
  const sessionKey = sessionKeyOf(subjectId, chapterId);
  const messages = sessions[sessionKey] ?? [];
  const lastMessage = messages[messages.length - 1];
  const isEmpty = messages.length === 0;

  const lastQuestion = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const lastAnswer = lastMessage?.role === "assistant" ? lastMessage.content : "";

  const assistantOpenRef = useRef(false);

  const dictation = useDictation(language, (text) => {
    void send(text, { assistant: assistantOpenRef.current });
  });
  const voiceOut = useVoiceOut({ language, voice, onEnded: handleSpeechEnded });

  const live = useGeminiLive();
  const aiConfigured = Boolean(ai?.configured || apiKey);
  const canSpeak = voiceOut.browserSupported || (voiceCatalog?.provider ?? null) !== null;

  /** After the tutor finishes speaking in voice mode, hand the mic back. */
  function handleSpeechEnded() {
    if (!assistantOpenRef.current) return;
    if (handsFree) dictation.start();
  }

  // Restore the saved API key and previous session, then ask the server whether
  // a server-side key is configured. Migrate keys saved by the older tab-only UI.
  useEffect(() => {
    try {
      let savedKey = window.localStorage.getItem(API_KEY_STORAGE);
      if (!savedKey) {
        savedKey = window.sessionStorage.getItem(LEGACY_API_KEY_STORAGE);
        if (savedKey) window.localStorage.setItem(API_KEY_STORAGE, savedKey);
      }
      window.sessionStorage.removeItem(LEGACY_API_KEY_STORAGE);
      setApiKey(savedKey ?? "");
    } catch {
      // Session storage can be unavailable in strict private browsing modes.
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, unknown>;
        const nextSubject = findSubject(typeof saved.subjectId === "string" ? saved.subjectId : null);
        const nextChapter = findChapter(nextSubject.id, typeof saved.chapterId === "string" ? saved.chapterId : null);

        setSubjectId(nextSubject.id);
        setChapterId(nextChapter.id);
        if (MODES.some((m) => m.id === saved.mode)) setMode(saved.mode as TutorMode);
        if (LANGUAGES.some((l) => l.id === saved.language)) setLanguage(saved.language as LanguageId);
        if (saved.readAloud === true) setReadAloud(true);
        if (typeof saved.voice === "string") setVoice(saved.voice);
        if (saved.handsFree === false) setHandsFree(false);

        if (typeof saved.sessions === "object" && saved.sessions !== null) {
          const restored: Sessions = {};
          for (const [key, value] of Object.entries(saved.sessions as Record<string, unknown>)) {
            if (Array.isArray(value) && value.every(isChatMessage)) restored[key] = value;
          }
          setSessions(restored);
        }
      }
    } catch {
      // Corrupt storage is not worth surfacing — start fresh.
    }
    setHydrated(true);

    let cancelled = false;
    fetch("/api/voice")
      .then((res) => res.json() as Promise<{
        provider: TtsProvider | null;
        voices: Voice[];
        defaultVoice: string;
      }>)
      .then((info) => {
        if (cancelled) return;
        setVoiceCatalog({
          provider: info.provider ?? null,
          voices: info.voices ?? [],
          defaultVoice: info.defaultVoice ?? "",
        });
        // A saved voice from another engine (or a retired one) falls back.
        setVoice((current) =>
          info.voices?.some((v) => v.id === current) ? current : info.defaultVoice || current,
        );
      })
      .catch(() => {
        if (!cancelled) setVoiceCatalog({ provider: null, voices: [], defaultVoice: "" });
      });

    fetch("/api/tutor")
      .then((res) => res.json() as Promise<AiInfo>)
      .then((info) => {
        if (!cancelled) setAi({ configured: Boolean(info.configured), model: info.model ?? "" });
      })
      .catch(() => {
        if (!cancelled) setAi({ configured: false, model: "" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ subjectId, chapterId, mode, language, readAloud, voice, handsFree, sessions }),
      );
    } catch {
      // Private mode / quota — chat still works, it just won't survive a reload.
    }
  }, [hydrated, subjectId, chapterId, mode, language, readAloud, voice, handsFree, sessions]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, lastMessage?.content, sessionKey]);

  useEffect(() => {
    if (!voiceOut.speaking) setSpeakingKey(null);
  }, [voiceOut.speaking]);

  useEffect(() => {
    dictation.stop();
    // A new language means a new recogniser locale.
  }, [language, dictation.stop]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function withSession(key: string, updater: (prev: ChatMessage[]) => ChatMessage[]) {
    setSessions((prev) => ({ ...prev, [key]: updater(prev[key] ?? []) }));
  }

  function selectSubject(nextSubjectId: string) {
    if (nextSubjectId === subjectId) return;
    abortRef.current?.abort();
    voiceOut.stop();
    dictation.stop();
    setError(null);
    setSubjectId(nextSubjectId);
    setChapterId(findSubject(nextSubjectId).chapters[0].id);
  }

  function selectChapter(nextChapterId: string) {
    if (nextChapterId === chapterId) return;
    abortRef.current?.abort();
    voiceOut.stop();
    dictation.stop();
    setError(null);
    setChapterId(nextChapterId);
    setNavOpen(false);
  }

  function startNewChat() {
    abortRef.current?.abort();
    voiceOut.stop();
    dictation.stop();
    setError(null);
    withSession(sessionKey, () => []);
    setInput("");
    textareaRef.current?.focus();
  }

  function voiceGreeting() {
    if (language === "hi") {
      return `नमस्ते! मैं विद्या हूँ। ${chapter.name} से जुड़ा कोई भी सवाल पूछिए — मैं सुन रही हूँ।`;
    }
    if (language === "hinglish") {
      return `Namaste! Main Vidya hoon. ${chapter.name} se koi bhi sawaal puchiye — main sun rahi hoon.`;
    }
    return `Hi, I'm Vidya. Ask me anything from ${chapter.name} — I'm listening.`;
  }

  function openAssistant() {
    assistantOpenRef.current = true;
    setAssistantOpen(true);
    setError(null);
  }

  function openSettings() {
    setApiKeyDraft(apiKey);
    setShowApiKey(false);
    setSettingsOpen(true);
  }

  function saveApiKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextKey = apiKeyDraft.trim();
    if (!nextKey) {
      setError("Paste your Gemini AI Studio API key first.");
      return;
    }
    try {
      window.localStorage.setItem(API_KEY_STORAGE, nextKey);
    } catch {
      setError("This browser blocked local storage. Check its privacy settings and try again.");
      return;
    }
    live.close();
    setApiKey(nextKey);
    setApiKeyDraft("");
    setSettingsOpen(false);
    setError(null);
  }

  function removeApiKey() {
    try {
      window.localStorage.removeItem(API_KEY_STORAGE);
      window.sessionStorage.removeItem(LEGACY_API_KEY_STORAGE);
    } catch {
      // The in-memory copy is still cleared if storage is unavailable.
    }
    live.close();
    setApiKey("");
    setApiKeyDraft("");
    setSettingsOpen(false);
  }

  function closeAssistant() {
    assistantOpenRef.current = false;
    setAssistantOpen(false);
    live.close();
    dictation.stop();
    voiceOut.stop();
  }

  /** The orb: interrupt speech, stop dictation, or start talking. */
  function handleOrbTap() {
    if (!live.connected) void live.start({ subject: subject.name, subjectId: subject.id, chapter: chapter.name, chapterId: chapter.id, topics: chapter.topics, language, apiKey });
    else live.interrupt();
  }

  async function copyMessage(key: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1600);
    } catch {
      setError("Couldn't copy — your browser blocked clipboard access.");
    }
  }

  async function send(override?: string, options?: { assistant?: boolean }) {
    const text = (override ?? input).trim();
    if (!text || status === "streaming") return;

    const turnMode = mode;
    const assistantTurn = options?.assistant === true;
    const key = sessionKey;
    const history: ChatMessage[] = [...(sessions[key] ?? []), { role: "user", content: text }];

    setInput("");
    setError(null);
    voiceOut.stop();
    withSession(key, () => [...history, { role: "assistant", content: "", tutorMode: turnMode }]);
    setStatus("streaming");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(apiKey ? { "x-tutor-api-key": apiKey } : {}) },
        body: JSON.stringify({ subjectId, chapterId, mode: turnMode, language, messages: history, assistant: assistantTurn }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        withSession(key, () => history);
        setError(data?.error ?? "The tutor could not answer. Please try again.");
        voiceOut.stop();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      let spokenUpTo = 0;
      let streamingSpeech = false;

      // In voice mode Vidya starts talking as soon as a sentence is finished,
      // instead of waiting for the whole answer.
      const flushSpeech = (snapshot: string, final: boolean) => {
        if (!assistantTurn) return;
        const pending = snapshot.slice(spokenUpTo);
        if (!pending.trim()) {
          if (final && streamingSpeech) voiceOut.endStream();
          return;
        }
        if (!streamingSpeech) {
          voiceOut.startStream();
          streamingSpeech = true;
        }
        if (final) {
          voiceOut.appendStream(pending);
          spokenUpTo = snapshot.length;
          voiceOut.endStream();
          return;
        }
        const cut = Math.max(
          pending.lastIndexOf("."),
          pending.lastIndexOf("!"),
          pending.lastIndexOf("?"),
          pending.lastIndexOf("।"),
          pending.lastIndexOf("\n"),
        );
        if (cut < 0) return;
        const chunk = pending.slice(0, cut + 1).trim();
        if (!chunk) return;
        voiceOut.appendStream(chunk);
        spokenUpTo += cut + 1;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        const snapshot = answer;
        withSession(key, (prev) =>
          prev.length ? [...prev.slice(0, -1), { role: "assistant", content: snapshot, tutorMode: turnMode }] : prev,
        );
        flushSpeech(snapshot, false);
      }

      answer += decoder.decode();
      const finalAnswer = answer.trim();
      withSession(key, (prev) => {
        if (!prev.length) return prev;
        if (!finalAnswer) return prev.slice(0, -1);
        return [...prev.slice(0, -1), { role: "assistant", content: finalAnswer }];
      });

      if (assistantTurn) {
        if (finalAnswer) flushSpeech(finalAnswer, true);
        else if (streamingSpeech) voiceOut.endStream();
      } else if (finalAnswer && readAloud) {
        void voiceOut.speak(finalAnswer);
      }

      if (finalAnswer && (assistantTurn || readAloud)) {
        void voiceOut.speak(finalAnswer);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        voiceOut.stop();
        withSession(key, (prev) =>
          prev.length && prev[prev.length - 1].role === "assistant" && !prev[prev.length - 1].content
            ? prev.slice(0, -1)
            : prev,
        );
      } else {        withSession(key, (prev) =>
          prev.length && prev[prev.length - 1].role === "assistant" && !prev[prev.length - 1].content
            ? prev.slice(0, -1)
            : prev,
        );
        setError("Couldn't reach the tutor. Check your connection and try again.");
      }
    } finally {
      abortRef.current = null;
      setStatus("idle");
    }
  }

  const starters = useMemo(() => {
    const list = [
      {
        label: `${modeMeta.label} mode`,
        prompt: `${modeMeta.starter} Focus on ${chapter.name}.`,
      },
      ...chapter.topics.slice(0, 2).map((topic) => ({
        label: topic,
        prompt: `Explain "${topic}" from ${chapter.name} step by step, with one example.`,
      })),
      {
        label: "Common mistakes",
        prompt: `What mistakes do CBSE students make in ${chapter.name}? Show one example of each.`,
      },
    ];
    return list.slice(0, 4);
  }, [modeMeta, chapter]);

  const sidebar = (
    <Sidebar
      subjects={SUBJECTS}
      subject={subject}
      chapterId={chapterId}
      onSelectSubject={selectSubject}
      onSelectChapter={selectChapter}
      onClose={navOpen ? () => setNavOpen(false) : undefined}
    />
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <aside className="hidden w-[304px] shrink-0 border-r border-white/[0.07] bg-ink-950/50 backdrop-blur-xl lg:block">
        {sidebar}
      </aside>

      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-[304px] max-w-[86vw] border-r border-white/10 bg-ink-900/95 shadow-2xl">
            {sidebar}
          </div>
        </div>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-white/[0.07] bg-ink-950/40 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-3xl px-3 py-2.5 sm:px-5 lg:px-8">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label="Open subjects"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] text-mist-300 hover:border-white/20 hover:text-white lg:hidden"
              >
                <MenuIcon />
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[10.5px] font-medium uppercase tracking-[0.14em] text-mist-500">
                  {subject.name} · CBSE Class 10
                </p>
                <h1 className="truncate font-display text-[15px] font-semibold text-white">{chapter.name}</h1>
              </div>

              {canSpeak ? (
                <button
                  type="button"
                  onClick={() => {
                    if (readAloud) {
                      setReadAloud(false);
                      voiceOut.stop();
                    } else {
                      setReadAloud(true);
                    }
                  }}
                  aria-pressed={readAloud}
                  aria-label={readAloud ? "Turn off spoken answers" : "Read answers aloud"}
                  title={readAloud ? "Spoken answers are on" : "Read answers aloud"}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition ${
                    readAloud
                      ? "border-mint-400/40 bg-mint-400/15 text-mint-300"
                      : "border-white/[0.08] text-mist-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <SpeakerIcon muted={!readAloud} />
                </button>
              ) : null}

              <label className="relative shrink-0" title="Language for explanations and voice">
                <span className="sr-only">Language for explanations and voice</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageId)}
                  className="appearance-none rounded-lg border border-white/[0.08] bg-ink-850 py-1.5 pl-2.5 pr-7 text-[12px] text-mist-200 hover:border-white/20 focus:border-accent-400/50 focus:outline-none"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <ChevronRightIcon className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 rotate-90 text-mist-500" />
              </label>

              <button
                type="button"
                onClick={() => setPastPapersOpen(true)}
                aria-label="Open previous year papers"
                title="CBSE Class 10 previous year papers"
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 text-[12px] text-mist-300 transition hover:border-white/20 hover:text-white"
              >
                <BookIcon className="h-4 w-4" />
                <span className="hidden sm:inline">PYQs</span>
              </button>

              <button
                type="button"
                onClick={openSettings}
                aria-label="Settings and API key"
                title="Settings and API key"
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 text-[12px] text-mist-300 transition hover:border-white/20 hover:text-white"
              >
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>

              <button
                type="button"
                onClick={openAssistant}
                aria-label="Talk to JARVIS"
                title="Voice mode — talk to JARVIS"
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-accent-400/40 bg-accent-500/20 px-2.5 text-[12px] text-white transition hover:border-accent-300/60 hover:bg-accent-500/30"
              >
                <MicIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Talk</span>
              </button>

              <button
                type="button"
                onClick={startNewChat}
                disabled={isEmpty}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 text-[12px] text-mist-200 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New chat</span>
              </button>
            </div>

            <div className="mt-2 flex items-center gap-1 overflow-x-auto pb-0.5">
              {MODES.map((m) => {
                const active = m.id === mode;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    title={m.blurb}
                    aria-pressed={active}
                    className={`shrink-0 rounded-full border px-3 py-1 text-[12px] transition ${
                      active
                        ? "border-accent-400/40 bg-accent-500/20 text-white"
                        : "border-transparent text-mist-400 hover:bg-white/[0.05] hover:text-mist-100"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
              <span className="ml-auto hidden shrink-0 items-center gap-1.5 pl-3 text-[10.5px] text-mist-500 sm:flex">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    aiConfigured ? "bg-mint-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-amber-400"
                  }`}
                />
                {aiConfigured ? (apiKey ? "Gemini ready" : ai?.model || "AI ready") : ai ? "Add API key" : "Connecting…"}
              </span>
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-5 lg:px-8">
            {isEmpty ? (
              <div className="animate-rise">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
                  <div className="flex items-start gap-3.5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 font-display text-lg font-semibold text-white shadow-glow">
                      V
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-display text-lg font-semibold text-white">Namaste, I&apos;m Vidya 👋</h2>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-mist-300">
                        Your CBSE Class 10 {subject.short} tutor. We&apos;re on{" "}
                        <span className="font-medium text-white">{chapter.name}</span> — ask a doubt, paste a
                        homework question, or start with a card below.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {starters.map((starter) => (
                      <button
                        key={starter.label}
                        type="button"
                        onClick={() => void send(starter.prompt)}
                        className="group flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-ink-900/60 px-3 py-2.5 text-left text-[12.5px] text-mist-200 transition hover:border-accent-400/40 hover:bg-accent-500/10 hover:text-white"
                      >
                        <span className="min-w-0 truncate">{starter.label}</span>
                        <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-mist-500 transition group-hover:translate-x-0.5 group-hover:text-accent-300" />
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-3">
                    {chapter.topics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[10.5px] text-mist-500"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 px-1 text-[11.5px] text-mist-500">
                  <BookIcon className="h-3.5 w-3.5 shrink-0" />
                  <p>{subject.paper}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((message, index) =>
                  message.role === "user" ? (
                    <div key={index} className="flex animate-rise justify-end">
                      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md border border-accent-400/25 bg-accent-500/15 px-4 py-2.5 text-[14.5px] leading-relaxed text-white">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <div key={index} className="flex animate-rise gap-3">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 font-display text-[13px] font-semibold text-white">
                        V
                      </span>
                      <div className="min-w-0 flex-1">
                        {message.content ? (
                          <>
                          {(message.tutorMode ?? mode) === "explain" ? (
                            <LessonVisual
                              chapter={chapter}
                              prompt={messages.slice(0, index).reverse().find((item) => item.role === "user")?.content ?? chapter.name}
                            />
                          ) : null}
                          <Markdown>
                            {status === "streaming" && index === messages.length - 1
                              ? `${message.content} ▍`
                              : message.content}
                          </Markdown>
                          </>
                        ) : (
                          <p className="flex items-center gap-1.5 py-1 text-[13px] text-mist-400">
                            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent-300" />
                            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent-300 [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent-300 [animation-delay:300ms]" />
                            <span className="ml-1">Vidya is thinking…</span>
                          </p>
                        )}

                        {message.content && !(status === "streaming" && index === messages.length - 1) ? (
                          <div className="mt-1.5 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void copyMessage(`${sessionKey}-${index}`, message.content)}
                              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-mist-500 transition hover:bg-white/[0.05] hover:text-mist-200"
                            >
                              {copiedKey === `${sessionKey}-${index}` ? (
                                <>
                                  <CheckIcon className="h-3 w-3 text-mint-400" /> Copied
                                </>
                              ) : (
                                <>
                                  <CopyIcon className="h-3 w-3" /> Copy
                                </>
                              )}
                            </button>
                            {canSpeak ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const key = `${sessionKey}-${index}`;
                                  if (voiceOut.speaking && speakingKey === key) {
                                    voiceOut.stop();
                                    setSpeakingKey(null);
                                    return;
                                  }
                                  setSpeakingKey(key);
                                  void voiceOut.speak(message.content);
                                }}
                                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-mist-500 transition hover:bg-white/[0.05] hover:text-mist-200"
                              >
                                <SpeakerIcon
                                  className="h-3 w-3"
                                  muted={!(voiceOut.speaking && speakingKey === `${sessionKey}-${index}`)}
                                />
                                {voiceOut.speaking && speakingKey === `${sessionKey}-${index}` ? "Stop" : "Listen"}
                              </button>
                            ) : null}
                            <span className="text-[10.5px] text-mist-500">
                              {findMode(message.tutorMode ?? mode).label} · {chapter.name}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/[0.07] bg-ink-950/60 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-5 lg:px-8">
            {ai && !aiConfigured ? (
              <div className="mb-2 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[11.5px] leading-relaxed text-amber-100">
                <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                <p className="flex-1">No AI key yet. Add your Gemini AI Studio key in Settings to start tutoring.</p>
                <button type="button" onClick={openSettings} className="shrink-0 font-medium text-amber-200 underline decoration-amber-200/40 underline-offset-2 hover:text-white">Open Settings</button>
              </div>
            ) : null}

            {error || dictation.error ? (
              <div className="mb-2 flex items-start justify-between gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[11.5px] leading-relaxed text-rose-100">
                <span className="flex items-start gap-2">
                  <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
                  {error ?? dictation.error}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    dictation.clearError();
                  }}
                  className="shrink-0 text-[11px] text-rose-200/70 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            ) : null}

            {dictation.listening ? (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11.5px] text-rose-100">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
                </span>
                <span className="shrink-0 font-medium">Listening · {speechLocaleLabel(language)}</span>
                <span className="min-w-0 flex-1 truncate text-rose-200/80">
                  {dictation.interim || "Speak your doubt…"}
                </span>
                <button
                  type="button"
                  onClick={dictation.stop}
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-rose-200 hover:bg-white/10 hover:text-white"
                >
                  Stop
                </button>
              </div>
            ) : null}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="flex items-end gap-2 rounded-2xl border border-white/[0.09] bg-ink-850/80 p-2 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)] focus-within:border-accent-400/40 focus-within:ring-1 focus-within:ring-accent-500/20"
            >
              {dictation.supported ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!dictation.listening) voiceOut.stop();
                    dictation.toggle();
                  }}
                  aria-pressed={dictation.listening}
                  aria-label={dictation.listening ? "Stop voice input" : "Ask by voice"}
                  title={dictation.listening ? "Stop listening" : `Speak in ${speechLocaleLabel(language)}`}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition ${
                    dictation.listening
                      ? "border-rose-400/50 bg-rose-500/20 text-rose-200"
                      : "border-white/[0.08] text-mist-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <MicIcon />
                </button>
              ) : null}

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                placeholder={`Ask anything from ${chapter.name}…`}
                aria-label="Ask the tutor"
                className="max-h-[200px] min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 text-[14.5px] leading-relaxed text-mist-100 placeholder:text-mist-500 focus:outline-none"
              />
              {status === "streaming" ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  aria-label="Stop generating"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-white transition hover:bg-white/[0.12]"
                >
                  <StopIcon />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send question"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 text-white transition hover:from-accent-400 hover:to-accent-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <SendIcon />
                </button>
              )}
            </form>

            <p className="mt-1.5 text-center text-[10.5px] leading-relaxed text-mist-500">
              Vidya can make mistakes — cross-check with your NCERT textbook.{" "}
              {dictation.supported
                ? `Tap the mic to speak in ${speechLocaleLabel(language)}.`
                : "Voice needs Chrome or Edge."}{" "}
              Enter to send, Shift+Enter for a new line.
            </p>
          </div>
        </div>
      </main>
      {pastPapersOpen ? <PastPapers subject={subject.name} onClose={() => setPastPapersOpen(false)} /> : null}

      {settingsOpen ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="settings-title" className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-300">Personal setup</p>
                <h2 id="settings-title" className="mt-1 font-display text-lg font-semibold text-white">Settings</h2>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings" className="grid h-8 w-8 place-items-center rounded-lg text-mist-400 hover:bg-white/[0.06] hover:text-white"><CloseIcon /></button>
            </div>

            <form onSubmit={saveApiKey} className="mt-5">
              <label htmlFor="gemini-api-key" className="text-[12px] font-medium text-mist-200">Gemini AI Studio API key</label>
              <div className="mt-2 flex gap-2">
                <input
                  id="gemini-api-key"
                  type={showApiKey ? "text" : "password"}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={apiKeyDraft}
                  onChange={(event) => setApiKeyDraft(event.target.value)}
                  placeholder={apiKey ? "Saved on this device — enter a replacement" : "Paste your Gemini API key"}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-mist-600 focus:border-accent-400/50 focus:ring-1 focus:ring-accent-400/20"
                />
                <button type="button" onClick={() => setShowApiKey((show) => !show)} className="rounded-xl border border-white/10 px-3 text-[11px] text-mist-300 hover:text-white">{showApiKey ? "Hide" : "Show"}</button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-mist-500">The key is saved in this browser on this device, so it stays available after you close the tab. It is sent to Vidya only when you use chat or voice; it is not saved on the site or Vercel. Remove it here to clear it.</p>
              <p className="mt-2 text-[11px] leading-relaxed text-mist-500">Get a key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-accent-300 underline underline-offset-2 hover:text-white">Google AI Studio</a>. Google account usage and billing apply.</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                {apiKey ? <button type="button" onClick={removeApiKey} className="text-[12px] text-rose-300 hover:text-rose-200">Remove saved key</button> : <span className="text-[11px] text-mist-600">No key saved on this device</span>}
                <button type="submit" disabled={!apiKeyDraft.trim()} className="rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">Save on this device</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <AssistantMode
        open={assistantOpen}
        onClose={closeAssistant}
        state={live.state}
        connected={live.connected}
        language={language}
        onLanguageChange={setLanguage}
        subject={subject.name}
        chapter={chapter.name}
        topics={chapter.topics}
        lines={live.lines}
        interim={live.interim}
        assistantInterim={live.assistantInterim}
        error={live.error}
        muted={live.muted}
        inputLevel={live.inputLevel}
        outputLevel={live.outputLevel}
        onStart={handleOrbTap}
        onInterrupt={live.interrupt}
        onMute={live.toggleMute}
        onEnd={live.close}
        onSend={(text) => { live.close(); assistantOpenRef.current = false; void send(text, { assistant: true }); }}
      />
    </div>
  );
}
