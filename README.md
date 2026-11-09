# 📚 Vidya — AI tutor for CBSE Class 10

A chapter-wise AI tutor: pick a subject and chapter, choose how you want to be taught,
and get streamed, exam-oriented answers with marking schemes, practice questions and
revision sheets — in English, Hindi or Hinglish.

Standalone Next.js app. It does not touch the GlimmerGift app at the repository root.

```
ai-tutor/
├── app/
│   ├── api/tutor/route.ts   # streaming chat endpoint (OpenAI-compatible)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── tutor-app.tsx        # main client shell: chat, modes, sessions, voice
│   ├── sidebar.tsx          # subjects + searchable chapter list
│   ├── markdown.tsx         # answer rendering
│   └── icons.tsx
├── hooks/
│   └── use-voice.ts         # dictation (STT) + spoken answers (TTS)
├── types/
│   └── web-speech.d.ts      # SpeechRecognition typings (missing from lib.dom)
├── lib/
│   ├── syllabus.ts          # CBSE Class 10 syllabus map
│   ├── modes.ts             # modes + reply languages (client-safe)
│   ├── prompt.ts            # system prompt builder (server only)
│   ├── tutor-request.ts     # validation + shared types
│   ├── speech.ts            # locales, markdown→speech, chunking, voice picker
│   └── rate-limit.ts        # in-memory per-IP limiter
└── scripts/mock-provider.mjs
```

## ✨ What it does

| Area | Detail |
| --- | --- |
| Syllabus map | Maths, Science, History, Geography, Civics, Economics, English (First Flight + Footprints) and IT 402 — chapter names follow the rationalised NCERT books |
| Teaching modes | **Explain** (analogy → definition → example → common mistake), **Solve** (given → formula → steps → marking scheme), **Practice** (one exam question at a time, marked X/N), **Revise** (revision sheet + likely board questions) |
| Language | English, Hinglish, हिंदी — one selector drives both the written explanation and the voice. Formulas and board wording stay in English |
| Voice | JARVIS voice mode streams microphone audio to Gemini Live over a bidirectional WebSocket, with live input/output transcript, interruption handling, mute/end controls and reconnect support. Text chat remains available as a fallback. |
| Streaming | Tokens render as they arrive, with a stop button; markdown, tables and lists styled for reading |
| Sessions | One conversation per chapter, restored from `localStorage`; switch chapters and come back to the same chat |
| Context | Every request carries subject, chapter, key topics and exam pattern, so answers stay grounded in the chapter |
| Guardrails | Zod-free hand validation (chapter/mode/language whitelists, 24 messages, 6 000 chars each), per-IP rate limit, server-only API key, friendly errors for missing key / bad key / busy provider |

## 🚀 Run it

```bash
cd ai-tutor
npm install
cp .env.example .env.local   # then paste your key
npm run dev                  # http://localhost:3010
```

### Get an API key

The tutor speaks the OpenAI-compatible chat-completions protocol, so any compatible
provider works. **Google Gemini** is the tested default:

1. Create a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
   New keys look like `AQ.Ab8RN6…` and are 53 characters — paste it exactly.
2. Put it in `ai-tutor/.env.local`:

```bash
TUTOR_API_KEY=your-key
TUTOR_API_BASE=https://generativelanguage.googleapis.com/v1beta/openai
TUTOR_MODEL=gemini-3.6-flash
TUTOR_FALLBACK_MODEL=gemini-3.5-flash
GEMINI_LIVE_MODEL=gemini-3.8-live
```

3. Restart `npm run dev`. The dot in the header turns green with the model name.

`TUTOR_FALLBACK_MODEL` is used automatically when the primary model is overloaded or
unavailable. Model names come and go — if you see "no longer available to new users",
list what your key can use:

```bash
curl "$TUTOR_API_BASE/models" -H "Authorization: Bearer $TUTOR_API_KEY"
```

For Z.ai, set `TUTOR_API_BASE=https://api.z.ai/api/paas/v4` and `TUTOR_MODEL=glm-4-flash`.
The key stays server-side — it is only read in the route handler.

### Try it with no key

```bash
npm run mock        # terminal 1 — fake provider on 127.0.0.1:4010
# .env.local: TUTOR_API_KEY=mock, TUTOR_API_BASE=http://127.0.0.1:4010/v1
npm run dev         # terminal 2
```

The mock streams a fixed answer so you can test rendering, scrolling and the stop
button without spending credits. It never answers the real question.

## 🎙️ Voice

JARVIS voice mode uses Gemini Live, not browser speech recognition. Add a Gemini AI
Studio key as `GEMINI_API_KEY` (or use the Gemini `TUTOR_API_KEY` already configured
for chat; in that case `TUTOR_API_BASE` must point to Google's Gemini endpoint). The server requests
a short-lived, single-use Live token restricted to the selected Live model and the
audio session settings; the long-lived key is never sent to the browser. `GEMINI_LIVE_MODEL`
can be changed when Google retires or changes model availability. The default voice
is Gemini's `Aoede` prebuilt voice. Live API model and voice availability depends on
the Google project and current model support.

Click **Talk to JARVIS** and allow microphone access. Audio input is sent as PCM over
the Live session; Gemini handles speech activity and interruptions, while audio output
is scheduled from streamed response chunks. The UI shows connection state and live
transcripts, and releases the microphone when the session ends. If the connection drops,
start again to reconnect; recent transcript context is carried forward. Typed questions
in the panel use the existing server-side tutor endpoint.

Outside JARVIS mode, the original chat microphone and read-aloud controls still use
browser speech / configured TTS providers:

| Control | Where | What it does |
| --- | --- | --- |
| Mic button | composer | Dictates your doubt and sends it as soon as you stop talking |
| Speaker button | header | Reads every new answer aloud |
| **Listen** | under any answer | Speaks that answer only |

Speech follows the reply-language selector: `en` → `en-IN`, `hi` → `hi-IN`, and
`hinglish` → `hi-IN` (Indian recognisers handle code-mixed Hindi + English terms far
better than an English model does). Answers are cleaned before speaking — markdown,
tables and symbols are stripped and maths is read as words (`x² = 4` → "x squared
equals 4", `Ω` → "ohms", `√2` → "square root of 2"), split into short chunks because
Chrome truncates long utterances.

**Browser support:** dictation needs Chrome or Edge (desktop or Android) and a network
connection, since Chrome's recogniser is cloud-backed; the mic button hides itself
where the API is unavailable. Spoken answers work in Chrome, Edge and Safari. If the
mic never starts, allow microphone access for the site in the browser's address-bar
permissions.

## 🔌 API

`GET /api/tutor` → `{ configured: boolean, model: string }` — used by the UI for its status dot.

`POST /api/tutor` with:

```jsonc
{
  "subjectId": "maths",
  "chapterId": "applications-of-trigonometry",
  "mode": "solve",              // explain | solve | practice | revise
  "language": "en",             // en | hi | hinglish
  "messages": [{ "role": "user", "content": "Find the angle of elevation…" }]
}
```

Returns a `text/plain` stream of the answer, or JSON `{ error }` with 400 (bad request),
429 (rate limit / provider busy), 502 (provider failure) or 503 (no key).

## 🧪 Checks

```bash
npm run typecheck
npm run build
```

## 🧭 Extending it

- **New chapter**: add an entry to `lib/syllabus.ts` — the sidebar, prompts and starters pick it up automatically.
- **New teaching mode**: add it to `lib/modes.ts`, then add its rules to `MODE_RULES` in `lib/prompt.ts`.
- **Accounts, streaks, saved answers**: this app has no database; chapters are stored per browser. Add auth + a `answers` table if you want progress tracking across devices.
