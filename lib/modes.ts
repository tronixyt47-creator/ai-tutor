// Client-safe metadata: labels and ids only, no prompt text.

export const MODES = [
  {
    id: "explain",
    label: "Explain",
    blurb: "A concept in plain words, with an example",
    starter: "Explain this topic simply, with one everyday example.",
  },
  {
    id: "solve",
    label: "Solve",
    blurb: "Full step-by-step solution with a marking scheme",
    starter: "Solve a typical board question from this chapter step by step.",
  },
  {
    id: "practice",
    label: "Practice",
    blurb: "Exam questions, marked like a strict teacher",
    starter: "Give me one board-style question to try. Don't show the answer yet.",
  },
  {
    id: "revise",
    label: "Revise",
    blurb: "Fast revision sheet before a test",
    starter: "Give me a 5-minute revision of this chapter with likely questions.",
  },
] as const;

export type TutorMode = (typeof MODES)[number]["id"];

export const LANGUAGES = [
  {
    id: "en",
    label: "English",
    instruction: "Reply in clear, simple English.",
  },
  {
    id: "hinglish",
    label: "Hinglish",
    instruction:
      "Reply in friendly Hinglish: Hindi words written in English letters, mixed with English technical terms (for example: 'Dekho, acceleration ka matlab hai velocity change ki rate'). Keep all formulas, definitions and board-answer wording in English.",
  },
  {
    id: "hi",
    label: "हिंदी",
    instruction:
      "Reply in simple, standard Hindi (Devanagari). Keep technical terms and formulas in English, with the Hindi meaning in brackets the first time.",
  },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]["id"];

export function findMode(id: string | null | undefined) {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}
