import { rateLimit } from "@/lib/rate-limit";
import { LANGUAGES } from "@/lib/modes";
import { markdownToSpeech } from "@/lib/speech";
import {
  describeTtsFailure,
  MAX_TTS_CHARS,
  streamGeminiSpeech,
  synthesizeSarvam,
  TTS_MODEL,
} from "@/lib/tts";
import {
  activeProvider,
  defaultVoiceFor,
  resolveVoice,
  voicesFor,
} from "@/lib/voices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Tells the UI which female voice engine and presets are available. */
export async function GET() {
  const provider = activeProvider();
  return Response.json(
    {
      available: provider !== null,
      provider,
      model:
        provider === "sarvam"
          ? process.env.TUTOR_SARVAM_MODEL || "bulbul:v3"
          : provider === "gemini"
            ? TTS_MODEL
            : "",
      voices: voicesFor(provider),
      defaultVoice: defaultVoiceFor(provider),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const provider = activeProvider();
  if (!provider) {
    return jsonError(
      "Spoken answers need a voice key. Add SARVAM_API_KEY (Indian voices) to ai-tutor/.env.local.",
      503,
    );
  }

  const limit = rateLimit(`voice:${clientIp(req)}`, 40, 60_000);
  if (!limit.allowed) {
    return jsonError(`Too much speech at once — try again in ${limit.retryAfterSeconds}s.`, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  if (typeof body !== "object" || body === null) return jsonError("Invalid body.", 400);
  const payload = body as Record<string, unknown>;

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text) return jsonError("Nothing to say.", 400);
  if (text.length > MAX_TTS_CHARS) {
    return jsonError(`Text is too long to speak in one go (max ${MAX_TTS_CHARS} characters).`, 400);
  }

  const language = LANGUAGES.find((l) => l.id === payload.language)?.id;
  if (!language) return jsonError("Unknown language.", 400);
  // Widened to a plain string so nested generators keep the narrowed type.
  const languageCode: string = language;

  const voice = resolveVoice(provider, payload.voice);

  // Speak cleaned text: no markdown, maths read as words.
  const speakable = markdownToSpeech(text).slice(0, MAX_TTS_CHARS);
  if (!speakable) return jsonError("Nothing to say.", 400);

  const encoder = new TextEncoder();

  const sse = (frames: AsyncGenerator<{ mime?: string; audio?: string; done?: boolean; error?: string }>) => {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        const send = (frame: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
          } catch {
            closed = true;
          }
        };

        try {
          for await (const chunk of frames) send(chunk);
          send({ done: true });
        } catch (error) {
          if (!req.signal.aborted) {
            console.error("[voice] synthesis failed:", error);
            send({ error: describeTtsFailure(error) });
          }
        } finally {
          closed = true;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      },
      cancel() {
        // Aborting the request propagates to the upstream fetch via req.signal.
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  };

  try {
    if (provider === "sarvam") {
      // Sarvam returns one complete clip, so the whole answer is a single frame.
      async function* oneShot() {
        yield await synthesizeSarvam({
          text: speakable,
          voice,
          language: languageCode,
          signal: req.signal,
        });
      }
      return sse(oneShot());
    }

    return sse(streamGeminiSpeech({ text: speakable, voice, signal: req.signal }));
  } catch (error) {
    console.error("[voice] request failed:", error);
    return jsonError(describeTtsFailure(error), 502);
  }
}
