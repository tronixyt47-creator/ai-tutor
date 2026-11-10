"use client";

import { useEffect } from "react";
import { BookIcon, CloseIcon } from "./icons";

const PAPER_ARCHIVE = "https://www.cbse.gov.in/cbsenew/question-paper.html";
const MARKING_ARCHIVE = "https://www.cbse.gov.in/cbsenew/marking-scheme.html";

export default function PastPapers({ subject, onClose }: { subject: string; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="past-papers-title" className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-900 p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-accent-400/20 bg-accent-500/10 text-accent-300"><BookIcon className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-300">CBSE Class 10</p>
            <h2 id="past-papers-title" className="mt-1 font-display text-xl font-semibold text-white">Previous year papers</h2>
            <p className="mt-1 text-sm text-mist-400">Browse official papers and answer marking schemes for {subject}.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close past papers" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 text-mist-300 hover:bg-white/5 hover:text-white"><CloseIcon /></button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a href={PAPER_ARCHIVE} target="_blank" rel="noreferrer" className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-accent-400/40 hover:bg-accent-500/[0.08]">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-mist-500">Question papers</span>
            <span className="mt-2 block font-medium text-white">Open CBSE paper archive <span aria-hidden="true" className="text-accent-300">↗</span></span>
            <span className="mt-1 block text-xs leading-relaxed text-mist-400">Choose Class X, then the exam year and {subject}.</span>
          </a>
          <a href={MARKING_ARCHIVE} target="_blank" rel="noreferrer" className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-accent-400/40 hover:bg-accent-500/[0.08]">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-mist-500">Solutions & marking</span>
            <span className="mt-2 block font-medium text-white">Open marking schemes <span aria-hidden="true" className="text-accent-300">↗</span></span>
            <span className="mt-1 block text-xs leading-relaxed text-mist-400">Check the official answer scheme and marks distribution.</span>
          </a>
        </div>
        <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-xs leading-relaxed text-mist-400">CBSE adds papers by exam year, including separate supplementary or second-board sets where available. The files open on the official CBSE website.</div>
      </section>
    </div>
  );
}
