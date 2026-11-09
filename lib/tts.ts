// Server-only speech synthesis. Sarvam AI is the primary engine (natively
// Indian female voices, code-mixed Hinglish); Gemini TTS is the fallback.
import { resolveVoice, SARVAM_MODEL, type TtsProvider } from "./voices";

export const TTS_MODEL = process.env.TUTOR_TTS_MODEL || "gemini-3.8-flash-tts";
export const TTS_SAMPLE_RATE = 24000;
/** One request's worth of speech. Sarvam caps at 2500 chars, Gemini at 4000 tokens. */
export const MAX_TTS_CHARS = 1500;

const NATIVE_BASE =
  process.env.TUTOR_NATIVE_BASE || "https://generativelanguage.googleapis.com/v1beta";
const SARVAM_URL = process.env.TUTOR_SARVAM_URL || "https://api.sarvam.ai/text-to-speech";

export type SpeechChunk = {
  mime: string;
  /** base64 audio — WAV for Sarvam, raw PCM (audio/l16) for Gemini */
  audio: string;
};

/** hi-IN also covers Hinglish: Sarvam handles English words inside Hindi text. */
export function sarvamLanguage(language: string): "hi-IN" | "en-IN" {
  return language === "en" ? "en-IN" : "hi-IN";
}

export async function synthesizeSarvam(args: {
  text: string;
  voice: string;
  language: string;
  signal: AbortSignal;
}): Promise<SpeechChunk> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new Error("missing_sarvam_key");

  const response = await fetch(SARVAM_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: args.text,
      language_code: sarvamLanguage(args.language),
      speaker: resolveVoice("sarvam", args.voice),
      model: SARVAM_MODEL,
      output_audio_codec: "wav",
      speech_sample_rate: TTS_SAMPLE_RATE,
      pace: 1,
      temperature: 0.65,
    }),
    signal: args.signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`sarvam_${response.status}:${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as { audios?: string[] };
  const audio = payload.audios?.[0];
  if (!audio) throw new Error("sarvam_empty_audio");
  return { mime: "audio/wav", audio };
}

type GeminiPart = {
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

function requestBody(text: string, voice: string) {
  return {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: resolveVoice("gemini", voice) } },
      },
    },
  };
}

/**
 * Streams speech for `text`. Gemini emits one base64 audio part per SSE frame,
 * so the browser can start playing while the rest is still being generated.
 */
export async function* streamGeminiSpeech(args: {
  text: string;
  voice: string;
  signal: AbortSignal;
}): AsyncGenerator<SpeechChunk> {
  const apiKey = process.env.TUTOR_API_KEY;
  if (!apiKey) throw new Error("missing_key");

  const response = await fetch(
    `${NATIVE_BASE}/models/${TTS_MODEL}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(requestBody(args.text, args.voice)),
      signal: args.signal,
    },
  );

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(`tts_${response.status}:${detail.slice(0, 200)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");

      const dataLine = frame
        .split("\n")
        .find((line) => line.startsWith("data:"))
        ?.slice(5)
        .trim();
      if (!dataLine || dataLine === "[DONE]") continue;

      let parsed: { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> };
      try {
        parsed = JSON.parse(dataLine);
      } catch {
        continue;
      }

      for (const candidate of parsed.candidates ?? []) {
        for (const part of candidate.content?.parts ?? []) {
          const inline = part.inlineData ?? part.inline_data;
          const data = inline?.data;
          if (!data) continue;
          yield {
            mime: (part.inlineData?.mimeType ??
              part.inline_data?.mime_type ??
              "audio/l16; rate=24000; channels=1") as string,
            audio: data,
          };
        }
      }
    }
  }
}

/** Human-readable reason a synthesis attempt failed, for the route's 502 body. */
export function describeTtsFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("sarvam_401") || message.startsWith("sarvam_403")) {
    return "Sarvam rejected the API key. Check SARVAM_API_KEY in ai-tutor/.env.local.";
  }
  if (message.startsWith("sarvam_429")) {
    return "The voice service is rate-limited right now. Try again in a moment.";
  }
  if (message.startsWith("sarvam_400")) {
    return "Sarvam rejected the request. Check TUTOR_SARVAM_MODEL and the selected voice.";
  }
  if (message.startsWith("tts_429")) {
    return "Gemini's speech quota is used up for now (the free tier allows very few clips per day).";
  }
  return "Speech synthesis failed. Check the voice provider key and model.";
}

export type { TtsProvider };
