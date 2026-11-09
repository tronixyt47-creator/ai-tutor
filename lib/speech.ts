import type { LanguageId } from "./modes";

/**
 * Speech locales. Hinglish is spoken and transcribed as Hindi — Indian
 * recognisers handle the code-mixed "Hindi sentence + English technical term"
 * pattern far better than an en-IN model does.
 */
const LOCALES: Record<LanguageId, string> = {
  en: "en-IN",
  hi: "hi-IN",
  hinglish: "hi-IN",
};

export function speechLocale(language: string): string {
  return LOCALES[language as LanguageId] ?? "en-IN";
}

export function speechLocaleLabel(language: string): string {
  if (language === "en") return "English (India)";
  if (language === "hi") return "हिंदी";
  return "Hindi / Hinglish";
}

/**
 * Indian female voices that ship with the common browsers/OSes. Naming is a
 * better signal than `lang` alone: Chrome reports its good Hindi voice as
 * "Google हिन्दी", Windows as "Microsoft Swara"/"Heera", macOS as "Lekha".
 */
const FEMALE_HINTS = [
  "google हिन्दी",
  "google hindi",
  "swara",
  "heera",
  "neerja",
  "kalpana",
  "lekha",
  "veena",
  "ananya",
  "aarohi",
  "ishita",
  "priya",
  "neha",
  "female",
];

const MALE_HINTS = ["ravi", "prabhat", "hemant", "rishi", "male", "david", "mark", "ravi "];

/** Prefer a female Indian voice in the right language, then any in that language. */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  language: string,
): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  const wanted = speechLocale(language).toLowerCase();
  const base = wanted.split("-")[0];

  const score = (voice: SpeechSynthesisVoice): number => {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.replace("_", "-").toLowerCase();
    let value = 0;

    if (lang === wanted) value += 6;
    else if (lang.startsWith(`${base}-in`)) value += 5;
    else if (lang.startsWith(base)) value += 2;
    else value -= 4;

    if (FEMALE_HINTS.some((hint) => name.includes(hint))) value += 5;
    if (MALE_HINTS.some((hint) => name.includes(hint))) value -= 6;
    // Chrome's networked voices are the best-sounding free option available.
    if (name.startsWith("google")) value += 2;
    if (!voice.localService) value += 1;
    if (voice.default) value += 1;

    return value;
  };

  return [...voices].sort((a, b) => score(b) - score(a))[0];
}

const MATH_WORDS: Array<[RegExp, string]> = [
  [/√/g, " square root of "],
  [/π/g, " pi "],
  [/±/g, " plus or minus "],
  [/≤/g, " less than or equal to "],
  [/≥/g, " greater than or equal to "],
  [/≠/g, " is not equal to "],
  [/≈/g, " is approximately "],
  [/∴/g, " therefore "],
  [/×/g, " times "],
  [/÷/g, " divided by "],
  [/Ω/g, " ohms "],
  [/°/g, " degrees "],
  [/½/g, " one half "],
  [/¼/g, " one quarter "],
  [/¾/g, " three quarters "],
  [/→/g, " gives "],
  [/%/g, " percent "],
  [/²/g, " squared "],
  [/³/g, " cubed "],
  [/⁻¹/g, " inverse "],
  [/θ/g, " theta "],
  [/α/g, " alpha "],
  [/β/g, " beta "],
  [/λ/g, " lambda "],
  [/μ/g, " mu "],
  [/Δ/g, " delta "],
  [/₀/g, " zero "],
  [/₁/g, " one "],
  [/₂/g, " two "],
  [/₃/g, " three "],
  [/₄/g, " four "],
  [/₅/g, " five "],
  [/₆/g, " six "],
  [/₇/g, " seven "],
  [/₈/g, " eight "],
  [/₉/g, " nine "],
  [/ₚ/g, " p "],
  [/ₙ/g, " n "],
  [/ₖ/g, " k "],
  [/(\d)\s*\/\s*(\d)/g, "$1 over $2"],
];

/**
 * Turn a markdown answer into something worth hearing: no asterisks, no
 * hashes, no table pipes, and maths symbols read as words.
 */
export function markdownToSpeech(markdown: string): string {
  let text = markdown;

  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  text = text.replace(/^\s{0,3}#{1,6}\s*/gm, "");
  text = text.replace(/^\s{0,3}>\s?/gm, "");
  text = text.replace(/^\s*[-*+•]\s+/gm, "");
  text = text.replace(/^\s*\d+[.)]\s+/gm, "");
  text = text.replace(/^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*$/gm, " ");
  text = text.replace(/\|/g, ", ");
  text = text.replace(/^\s*[-*_]{3,}\s*$/gm, " ");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2");
  text = text.replace(/(^|[^_])_([^_\n]+)_/g, "$1$2");

  for (const [pattern, replacement] of MATH_WORDS) text = text.replace(pattern, replacement);

  // "x = 5" reads as "x equals 5"; a slash inside a formula reads as "over".
  text = text.replace(/=/g, " equals ");
  text = text.replace(/\//g, " over ");

  text = text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/…/g, "...")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/\.{2,}(?!\.)/g, ".")
    .replace(/\.\s*\./g, ".")
    .replace(/([.!?।])(?:\s*[.!?।])+/g, "$1")
    .replace(/\s+([,.;:!?।])/g, "$1")
    .replace(/,\s*\./g, ".")
    .replace(/\.\s*,/g, ".")
    .replace(/(^|[.!?।]\s+),\s*/g, "$1")
    .replace(/,\s*,+/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s.,;:]+/, "")
    .trim();

  return text;
}

/**
 * Split into speakable chunks. Browsers (Chrome especially) cut long
 * utterances off, so keep each queue item short and follow sentence breaks.
 */
export function chunkForSpeech(text: string, maxChars = 180): string[] {
  if (!text) return [];

  const sentences = text
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const push = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      push();
      // Break long sentences on commas, then hard-wrap as a last resort.
      for (const part of sentence.split(/(?<=,)\s+/)) {
        if ((current + " " + part).trim().length <= maxChars) {
          current = `${current} ${part}`.trim();
        } else {
          push();
          if (part.length > maxChars) {
            for (let i = 0; i < part.length; i += maxChars) chunks.push(part.slice(i, i + maxChars).trim());
          } else {
            current = part;
          }
        }
      }
      push();
      continue;
    }

    if ((current + " " + sentence).trim().length <= maxChars) {
      current = `${current} ${sentence}`.trim();
    } else {
      push();
      current = sentence;
    }
  }

  push();
  return chunks.filter(Boolean);
}
