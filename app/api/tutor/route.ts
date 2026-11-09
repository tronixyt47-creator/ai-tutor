import OpenAI from "openai";
import { buildSystemPrompt } from "@/lib/prompt";
import { rateLimit } from "@/lib/rate-limit";
import { parseTutorRequest, type ChatMessage } from "@/lib/tutor-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.TUTOR_MODEL || "glm-4-flash";
const FALLBACK_MODEL = process.env.TUTOR_FALLBACK_MODEL || "";

function getClient(): OpenAI | null {
  const apiKey = process.env.TUTOR_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.TUTOR_API_BASE || "https://api.z.ai/api/paas/v4",
    timeout: 60_000,
    maxRetries: 1,
  });
}

function jsonError(message: string, status: number, extraHeaders?: Record<string, string>) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store", ...extraHeaders } },
  );
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

/** Overload, rate limit or a dropped connection — worth one retry on another model. */
function isRetryable(error: unknown): boolean {
  if (error instanceof OpenAI.APIConnectionError) return true;
  if (error instanceof OpenAI.APIError) {
    return error.status === 429 || error.status === 503 || (error.status ?? 0) >= 500;
  }
  return false;
}

type Upstream = Awaited<ReturnType<OpenAI["chat"]["completions"]["create"]>>;

function startStream(args: {
  client: OpenAI;
  model: string;
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  signal: AbortSignal;
}) {
  return args.client.chat.completions.create(
    {
      model: args.model,
      stream: true,
      temperature: 0.6,
      max_tokens: args.maxTokens,
      messages: [
        { role: "system", content: args.system },
        ...args.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    },
    { signal: args.signal },
  );
}

/** Lets the UI know whether a key is configured, without exposing it. */
export async function GET() {
  return Response.json(
    { configured: Boolean(process.env.TUTOR_API_KEY), model: MODEL },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const client = getClient();
  if (!client) {
    return jsonError(
      "The tutor isn't connected to an AI model yet. Add TUTOR_API_KEY to ai-tutor/.env.local and restart the server.",
      503,
    );
  }

  const limit = rateLimit(`tutor:${clientIp(req)}`, 15, 60_000);
  if (!limit.allowed) {
    return jsonError(
      `That's a lot of questions at once — try again in ${limit.retryAfterSeconds}s.`,
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = parseTutorRequest(body);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const { subjectId, chapterId, mode, language, messages, assistant } = parsed.value;
  const system = buildSystemPrompt({ subjectId, chapterId, mode, language, assistant });
  // Spoken turns stay short; written answers can be long.
  const maxTokens = assistant ? 500 : 1600;

  try {
    let upstream: Upstream;
    try {
      upstream = await startStream({ client, model: MODEL, system, messages, maxTokens, signal: req.signal });
    } catch (error) {
      if (!FALLBACK_MODEL || req.signal.aborted || !isRetryable(error)) throw error;
      console.warn(`[tutor] ${MODEL} unavailable, retrying with ${FALLBACK_MODEL}`);
      upstream = await startStream({
        client,
        model: FALLBACK_MODEL,
        system,
        messages,
        maxTokens,
        signal: req.signal,
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        const push = (text: string) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(text));
          } catch {
            closed = true;
          }
        };

        try {
          for await (const chunk of upstream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) push(delta);
          }
        } catch (error) {
          if (!req.signal.aborted) {
            console.error("[tutor] stream failed:", error);
            push("\n\n_(The connection dropped. Please ask again.)_");
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
        upstream.controller?.abort();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[tutor] request failed:", error);

    if (req.signal.aborted) return jsonError("Request cancelled.", 499);

    if (error instanceof OpenAI.APIError) {
      // Providers disagree on the status for a bad key, and some (Gemini's
      // OpenAI-compatible endpoint) answer 400 with an unreadable body, so keep
      // the wording actionable rather than guessing which field was wrong.
      if (error.status === 401 || error.status === 403) {
        return jsonError(
          "The AI provider rejected the API key. Check TUTOR_API_KEY in ai-tutor/.env.local.",
          502,
        );
      }
      if (error.status === 400) {
        return jsonError(
          "The AI provider rejected the request. This usually means the API key or model name is wrong — check TUTOR_API_KEY and TUTOR_MODEL in ai-tutor/.env.local.",
          502,
        );
      }
      if (error.status === 429) {
        return jsonError("The AI provider is busy right now. Try again in a moment.", 429);
      }
      if (error.status === 404) {
        return jsonError(
          `The provider doesn't recognise the model "${MODEL}". Set TUTOR_MODEL to one your key can use.`,
          502,
        );
      }
      return jsonError("The AI provider returned an error. Try again shortly.", 502);
    }

    return jsonError("Could not reach the AI provider. Check your connection and try again.", 502);
  }
}
