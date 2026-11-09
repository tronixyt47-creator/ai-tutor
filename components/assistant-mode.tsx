"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { CloseIcon, MicIcon, SpeakerIcon, SendIcon, StopIcon } from "./icons";
import { LANGUAGES, type LanguageId } from "@/lib/modes";
import type { LiveLine, LiveState } from "@/hooks/use-gemini-live";

type Props = {
  open: boolean; onClose: () => void; state: LiveState; connected: boolean; language: LanguageId;
  onLanguageChange: (language: LanguageId) => void; subject: string; chapter: string; topics: string[];
  lines: LiveLine[]; interim: string; assistantInterim: string; error: string | null; muted: boolean; inputLevel: number; outputLevel: number;
  onStart: () => void; onInterrupt: () => void; onMute: () => void; onEnd: () => void; onSend: (text: string) => void;
};

const STATUS: Record<LiveState, string> = {
  idle: "Ready when you are", connecting: "Connecting to Gemini Live…", listening: "Listening", thinking: "Thinking…",
  speaking: "Speaking", error: "Connection needs attention",
};

export default function AssistantMode(props: Props) {
  const [draft, setDraft] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  if (!props.open) return null;
  const { state, connected } = props;
  const active = connected;
  const level = Math.max(props.inputLevel, props.outputLevel);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message) return;
    props.onSend(message);
    setDraft("");
  };

  return (
    <div className="jarvis-shell fixed inset-0 z-[60] flex flex-col overflow-hidden text-white">
      <div className="jarvis-grid pointer-events-none absolute inset-0" />
      <header className="relative z-10 flex h-[68px] shrink-0 items-center justify-between border-b border-cyan-100/[0.08] px-4 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="jarvis-mark">J</div>
          <div><p className="font-display text-[14px] font-semibold tracking-[0.16em]">JARVIS</p><p className="mt-0.5 text-[10px] tracking-[0.12em] text-cyan-100/45">PERSONAL LEARNING SYSTEM</p></div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`hidden items-center gap-2 text-[11px] sm:flex ${connected ? "text-cyan-100/75" : "text-slate-400"}`}><i className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-cyan-300 shadow-[0_0_10px_#67e8f9]" : "bg-slate-600"}`} />{connected ? "LIVE SESSION" : "OFFLINE"}</span>
          <div className="relative"><button className="jarvis-icon-button" type="button" onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen} aria-label="Audio settings"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 1 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z"/></svg></button>
            {settingsOpen ? <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-cyan-100/10 bg-[#081321]/95 p-3 shadow-2xl backdrop-blur-xl"><p className="jarvis-kicker">SESSION SETTINGS</p><p className="mt-2 text-[11px] leading-relaxed text-slate-300">Input and response audio stream directly through your Gemini Live session.</p><p className="mt-2 text-[10px] text-cyan-100/55">Voice · Aoede</p><p className="mt-1 text-[10px] text-cyan-100/55">Language · {LANGUAGES.find((item) => item.id === props.language)?.label}</p></div> : null}
          </div>
          <button className="jarvis-icon-button" type="button" onClick={props.onClose} aria-label="Close assistant"><CloseIcon /></button>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 grid-cols-1 gap-5 overflow-y-auto px-4 py-5 sm:px-7 lg:grid-cols-[minmax(190px,0.75fr)_minmax(380px,1.3fr)_minmax(250px,0.9fr)] lg:items-center lg:overflow-hidden lg:py-7">
        <aside className="jarvis-panel hidden p-5 lg:block">
          <p className="jarvis-kicker">LEARNING CONTEXT</p><h2 className="mt-3 text-lg font-medium">{props.subject}</h2><p className="mt-1 text-sm text-slate-300">{props.chapter}</p>
          <div className="my-5 h-px bg-white/[0.08]" /><p className="jarvis-kicker">IN THIS CHAPTER</p>
          <ul className="mt-3 space-y-2.5">{props.topics.slice(0, 5).map((topic) => <li key={topic} className="flex gap-2 text-[12px] leading-relaxed text-slate-300"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-300/80" />{topic}</li>)}</ul>
          <p className="mt-6 rounded-xl border border-cyan-100/[0.09] bg-cyan-100/[0.035] p-3 text-[11px] leading-relaxed text-slate-400">CBSE Class 10 · Ask questions in your own words. JARVIS follows your language.</p>
        </aside>

        <section className="flex min-h-[450px] flex-col items-center justify-center lg:min-h-0">
          <p className="jarvis-kicker mb-5">VOICE LEARNING · GEMINI LIVE</p>
          <button type="button" onClick={active ? props.onInterrupt : props.onStart} disabled={state === "connecting"} className={`jarvis-orb-wrap state-${state}`} aria-label={active ? "Interrupt JARVIS" : "Start a voice session"}>
            <span className="jarvis-orbit orbit-one" /><span className="jarvis-orbit orbit-two" /><span className="jarvis-orbit orbit-three" />
            <span className="jarvis-orb-halo" style={{ "--audio-level": level } as CSSProperties} />
            <span className="jarvis-orb-core" style={{ "--audio-level": level } as CSSProperties}><span className="jarvis-orb-shine" /><span className="jarvis-orb-symbol">J</span><span className="jarvis-orb-caption">AI TUTOR</span></span>
            <span className="jarvis-orb-particle particle-a" /><span className="jarvis-orb-particle particle-b" /><span className="jarvis-orb-particle particle-c" />
          </button>
          <p className="mt-7 font-display text-[20px] font-medium tracking-wide">{STATUS[state]}</p>
          <p className="mt-2 max-w-sm text-center text-[12px] leading-relaxed text-slate-400">{active ? "Speak naturally. You can interrupt me at any time." : "Start a private, real-time voice conversation about your lesson."}</p>
          <div className="mt-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.17em] text-cyan-100/45"><span className={`h-1 w-1 rounded-full ${active ? "bg-cyan-300" : "bg-slate-600"}`} />{active ? "Microphone connected" : "Microphone starts when you connect"}</div>
          <div className="mt-6 flex items-center gap-2">
            <button className="jarvis-control" type="button" onClick={active ? props.onMute : props.onStart} aria-label={active ? (props.muted ? "Unmute microphone" : "Mute microphone") : "Start voice conversation"}>{active ? <MicIcon /> : <MicIcon />}{active ? (props.muted ? "Unmute" : "Mute mic") : "Start talking"}</button>
            {active ? <button className="jarvis-control jarvis-control-end" type="button" onClick={props.onEnd}><StopIcon />End session</button> : null}
          </div>
        </section>

        <aside className="jarvis-panel flex min-h-[285px] flex-col overflow-hidden lg:h-[min(68vh,600px)]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5"><div><p className="jarvis-kicker">CONVERSATION</p><p className="mt-1 text-[11px] text-slate-400">Live transcript</p></div><label className="sr-only" htmlFor="jarvis-language">Conversation language</label><select id="jarvis-language" value={props.language} onChange={(e) => props.onLanguageChange(e.target.value as LanguageId)} className="jarvis-select">{LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select></div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {!props.lines.length && !props.interim ? <div className="flex h-full min-h-32 flex-col items-center justify-center text-center"><span className="mb-3 text-cyan-200/50"><SpeakerIcon /></span><p className="text-[12px] text-slate-300">Your lesson conversation appears here</p><p className="mt-1 text-[10px] text-slate-500">English · Hindi · Hinglish</p></div> : null}
            {props.lines.slice(-12).map((line, index) => <div key={`${index}-${line.role}`} className={`jarvis-bubble ${line.role === "student" ? "jarvis-bubble-user" : "jarvis-bubble-ai"}`}><p className="mb-1 text-[9px] uppercase tracking-[0.13em] text-cyan-100/45">{line.role === "student" ? "YOU" : "JARVIS"}</p><p className="text-[12px] leading-relaxed text-slate-200">{line.text}</p></div>)}
            {props.interim ? <div className="jarvis-bubble jarvis-bubble-user"><p className="mb-1 text-[9px] uppercase tracking-[0.13em] text-cyan-100/45">YOU · LIVE</p><p className="text-[12px] leading-relaxed text-slate-300">{props.interim}</p></div> : null}
            {props.assistantInterim ? <div className="jarvis-bubble jarvis-bubble-ai"><p className="mb-1 text-[9px] uppercase tracking-[0.13em] text-cyan-100/45">JARVIS · SPEAKING</p><p className="text-[12px] leading-relaxed text-slate-200">{props.assistantInterim}</p></div> : null}
            {props.error ? <p className="rounded-xl border border-amber-200/15 bg-amber-200/[0.06] p-3 text-[11px] leading-relaxed text-amber-100/80">{props.error}</p> : null}
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t border-white/[0.07] p-3"><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type your question…" aria-label="Type a question" className="jarvis-input" /><button type="submit" className="jarvis-icon-button" aria-label="Send question" disabled={!draft.trim()}><SendIcon /></button></form>
        </aside>
      </main>
      <footer className="relative z-10 flex shrink-0 items-center justify-center border-t border-white/[0.07] px-4 py-2.5 text-[10px] text-slate-500">JARVIS · {props.subject} · {props.chapter}<span className="mx-2 text-slate-700">/</span>{connected ? "Connected directly to Gemini Live" : "Your API key stays on the server"}</footer>
    </div>
  );
}
