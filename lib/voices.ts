/**
 * Female voice presets for the spoken tutor.
 *
 * Sarvam AI is the default engine because its voices are natively Indian and
 * handle code-mixed Hinglish ("quadratic formula se roots nikaalo") without
 * switching accent mid-sentence. Gemini's prebuilt voices are the fallback for
 * setups that only have a Google key.
 */
export type TtsProvider = "sarvam" | "gemini";

export type Voice = {
  id: string;
  label: string;
  hint: string;
  provider: TtsProvider;
};

export const SARVAM_MODEL = process.env.TUTOR_SARVAM_MODEL || "bulbul:v3";

export const SARVAM_VOICES: readonly Voice[] = [
  { id: "priya", label: "Priya", hint: "Warm Hindi — default", provider: "sarvam" },
  { id: "neha", label: "Neha", hint: "Bright, young", provider: "sarvam" },
  { id: "ritu", label: "Ritu", hint: "Calm and clear", provider: "sarvam" },
  { id: "simran", label: "Simran", hint: "Expressive, lively", provider: "sarvam" },
  { id: "ishita", label: "Ishita", hint: "Friendly teacher", provider: "sarvam" },
  { id: "kavya", label: "Kavya", hint: "Soft, gentle", provider: "sarvam" },
];

export const GEMINI_VOICES: readonly Voice[] = [
  { id: "Kore", label: "Kore", hint: "Warm and clear", provider: "gemini" },
  { id: "Leda", label: "Leda", hint: "Younger, brighter", provider: "gemini" },
  { id: "Aoede", label: "Aoede", hint: "Expressive, lively", provider: "gemini" },
  { id: "Achernar", label: "Achernar", hint: "Soft and gentle", provider: "gemini" },
  { id: "Sulafat", label: "Sulafat", hint: "Lower, calm", provider: "gemini" },
];

export type VoiceId = string;

export const DEFAULT_VOICES: Record<TtsProvider, VoiceId> = {
  sarvam: "priya",
  gemini: "Kore",
};

/** Which engine the server will actually use, based on configured keys. */
export function activeProvider(): TtsProvider | null {
  if (process.env.SARVAM_API_KEY) return "sarvam";
  if (process.env.TUTOR_TTS_PROVIDER === "browser") return null;
  if (process.env.TUTOR_API_KEY) return "gemini";
  return null;
}

export function voicesFor(provider: TtsProvider | null): readonly Voice[] {
  if (provider === "sarvam") return SARVAM_VOICES;
  if (provider === "gemini") return GEMINI_VOICES;
  return [];
}

export function defaultVoiceFor(provider: TtsProvider | null): VoiceId {
  return provider ? DEFAULT_VOICES[provider] : "";
}

/** Unknown or cross-provider ids fall back to the provider's default voice. */
export function resolveVoice(provider: TtsProvider, value: unknown): VoiceId {
  const match = voicesFor(provider).find((v) => v.id === value);
  return match?.id ?? DEFAULT_VOICES[provider];
}
