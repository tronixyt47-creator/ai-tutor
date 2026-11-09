"use client";

import { useMemo, useState } from "react";
import { CloseIcon, SearchIcon, SparklesIcon } from "./icons";
import type { Subject } from "@/lib/syllabus";

type SidebarProps = {
  subjects: Subject[];
  subject: Subject;
  chapterId: string;
  onSelectSubject: (subjectId: string) => void;
  onSelectChapter: (chapterId: string) => void;
  onClose?: () => void;
};

export default function Sidebar({
  subjects,
  subject,
  chapterId,
  onSelectSubject,
  onSelectChapter,
  onClose,
}: SidebarProps) {
  const [query, setQuery] = useState("");

  const chapters = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subject.chapters;
    return subject.chapters.filter(
      (c) => c.name.toLowerCase().includes(q) || c.topics.some((t) => t.toLowerCase().includes(q)),
    );
  }, [query, subject]);

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-glow">
            <SparklesIcon className="h-[18px] w-[18px]" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-[15px] font-semibold tracking-tight text-white">Vidya</p>
            <p className="text-[11px] text-mist-400">CBSE Class 10 tutor</p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="grid h-8 w-8 place-items-center rounded-lg text-mist-300 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>

      <div>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500">Subjects</p>
        <div className="grid grid-cols-2 gap-1.5">
          {subjects.map((s) => {
            const active = s.id === subject.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSubject(s.id)}
                aria-pressed={active}
                className={`group rounded-xl border px-2.5 py-2 text-left transition ${
                  active
                    ? "border-accent-400/40 bg-gradient-to-br text-white " + s.accent
                    : "border-white/[0.07] bg-white/[0.02] text-mist-300 hover:border-white/15 hover:text-white"
                }`}
              >
                <span className="block text-[13px] font-medium leading-tight">{s.short}</span>
                <span className={`text-[10px] ${active ? "text-mist-200" : "text-mist-500"}`}>
                  {s.chapters.length} chapters
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-baseline justify-between px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500">
            {subject.short} chapters
          </p>
          <span className="text-[10px] text-mist-500">{chapters.length}</span>
        </div>

        <label className="relative mb-2 block">
          <span className="sr-only">Search chapters</span>
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mist-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a chapter or topic"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] py-1.5 pl-8 pr-2 text-[12.5px] text-mist-100 placeholder:text-mist-500 focus:border-accent-400/50 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
          />
        </label>

        <div className="-mr-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-2">
          {chapters.map((c) => {
            const active = c.id === chapterId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectChapter(c.id)}
                aria-current={active ? "true" : undefined}
                className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] leading-snug transition ${
                  active
                    ? "bg-accent-500/15 text-white ring-1 ring-inset ring-accent-400/30"
                    : "text-mist-300 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    active ? "bg-accent-300" : "bg-white/20"
                  }`}
                />
                {c.name}
              </button>
            );
          })}
          {chapters.length === 0 ? (
            <p className="px-2 py-4 text-[12.5px] text-mist-500">No chapter matches “{query}”.</p>
          ) : null}
        </div>
      </div>

      <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-[11px] leading-relaxed text-mist-500">
        Built on the rationalised NCERT syllabus. Verify exam patterns with your school.
      </p>
    </div>
  );
}
