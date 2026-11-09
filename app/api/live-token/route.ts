import { rateLimit } from "@/lib/rate-limit";
import { findChapter, findSubject } from "@/lib/syllabus";
import { LANGUAGES } from "@/lib/modes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live";

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export async function POST(req: Request) {
  const dedicatedGeminiKey = process.env.GEMINI_API_KEY;
  const apiKey = dedicatedGeminiKey || process.env.TUTOR_API_KEY;
  const apiBase = process.env.TUTOR_API_BASE || "https://generativelanguage.googleapis.com/v1beta/openai";
  if (!apiKey || (!dedicatedGeminiKey && !apiBase.startsWith("https://generativelanguage.googleapis.com/"))) {
    return Response.json({ error: "Gemini Live is not configured. Add a Gemini AI Studio key to TUTOR_API_KEY or GEMINI_API_KEY." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  let request: { subjectId?: unknown; chapterId?: unknown; language?: unknown };
  try { request = await req.json(); } catch { return Response.json({ error: "Invalid Live session settings." }, { status: 400 }); }
  if (typeof request !== "object" || request === null) return Response.json({ error: "Invalid Live session settings." }, { status: 400 });
  const subject = findSubject(typeof request.subjectId === "string" ? request.subjectId : null);
  const chapter = findChapter(subject.id, typeof request.chapterId === "string" ? request.chapterId : null);
  if (subject.id !== request.subjectId || chapter.id !== request.chapterId || !LANGUAGES.some((language) => language.id === request.language)) {
    return Response.json({ error: "Unknown lesson or language." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const limit = rateLimit(`live-token:${clientIp(req)}`, 10, 60_000);
  if (!limit.allowed) return Response.json({ error: "Please wait a moment before reconnecting." }, { status: 429, headers: { "Cache-Control": "no-store" } });

  try {
    const now = Date.now();
    const selectedLanguage = LANGUAGES.find((language) => language.id === request.language)!;
    const instruction = `You are JARVIS, a warm, intelligent female personal teacher for CBSE Class 10. Speak in short natural turns, patient and clear, with a friendly Indian conversational rhythm. Default to Hinglish, but naturally follow the student's Hindi, Hinglish, or English. Never force one language. Teach ${subject.name}, currently ${chapter.name}; key topics: ${chapter.topics.join(", ")}. Explain simply with examples, ask one small check question, give time to answer, detect confusion and simplify, and correct mistakes kindly. Avoid long lectures and robotic announcements. Keep the response concise and speak as a real teacher. The student's selected preference is ${selectedLanguage.instruction}; follow it unless they switch languages. Do not claim an answer if uncertain.`;
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        uses: 1,
        expireTime: new Date(now + 30 * 60_000).toISOString(),
        newSessionExpireTime: new Date(now + 60_000).toISOString(),
        fieldMask: "model,generationConfig,systemInstruction,inputAudioTranscription,outputAudioTranscription",
        bidiGenerateContentSetup: {
          model: `models/${MODEL}`,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } },
          },
          systemInstruction: { parts: [{ text: instruction }] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      }),
      cache: "no-store",
      signal: req.signal,
    });
    const payload = await response.json().catch(() => ({})) as { name?: string; error?: { message?: string } };
    if (!response.ok || !payload.name) {
      console.error("[live-token] Gemini token provisioning failed:", response.status, payload.error?.message);
      return Response.json({ error: "Gemini could not start a Live session. Check the Live model and API key configuration." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ token: payload.name, model: MODEL }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    console.error("[live-token] Gemini connection failed:", error);
    return Response.json({ error: "Could not reach Gemini. Check your connection and try again." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
