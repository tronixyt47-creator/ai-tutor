import { LANGUAGES, type LanguageId, MODES, type TutorMode } from "./modes";
import { SUBJECTS } from "./syllabus";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  /** UI-only metadata; request parsing intentionally strips it before provider calls. */
  tutorMode?: TutorMode;
};

export type TutorRequest = {
  subjectId: string;
  chapterId: string;
  mode: TutorMode;
  language: LanguageId;
  messages: ChatMessage[];
  /** True when the student is talking to the tutor like a voice assistant. */
  assistant: boolean;
};

export type ParseResult = { ok: true; value: TutorRequest } | { ok: false; error: string };

export const LIMITS = {
  maxMessages: 24,
  maxMessageChars: 6000,
  maxTotalChars: 24000,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function parseTutorRequest(body: unknown): ParseResult {
  if (!isRecord(body)) return { ok: false, error: "Body must be a JSON object." };

  const subject = SUBJECTS.find((s) => s.id === body.subjectId);
  if (!subject) return { ok: false, error: "Unknown subject." };

  const chapter = subject.chapters.find((c) => c.id === body.chapterId);
  if (!chapter) return { ok: false, error: "Unknown chapter for this subject." };

  const mode = MODES.find((m) => m.id === body.mode)?.id;
  if (!mode) return { ok: false, error: "Unknown mode." };

  const language = LANGUAGES.find((l) => l.id === body.language)?.id;
  if (!language) return { ok: false, error: "Unknown language." };

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { ok: false, error: "Send at least one message." };
  }
  if (body.messages.length > LIMITS.maxMessages) {
    return { ok: false, error: `Too many messages (max ${LIMITS.maxMessages}).` };
  }

  const messages: ChatMessage[] = [];
  let total = 0;

  for (const raw of body.messages) {
    if (!isRecord(raw)) return { ok: false, error: "Each message needs a role and content." };
    const role = raw.role;
    const content = typeof raw.content === "string" ? raw.content.trim() : "";

    if (role !== "user" && role !== "assistant") {
      return { ok: false, error: "Message role must be user or assistant." };
    }
    if (!content) return { ok: false, error: "Message content cannot be empty." };
    if (content.length > LIMITS.maxMessageChars) {
      return { ok: false, error: `A message is too long (max ${LIMITS.maxMessageChars} characters).` };
    }

    total += content.length;
    messages.push({ role, content });
  }

  if (total > LIMITS.maxTotalChars) {
    return { ok: false, error: "Conversation is too long. Start a new chat." };
  }
  if (messages[messages.length - 1].role !== "user") {
    return { ok: false, error: "The last message must be from the student." };
  }

  return {
    ok: true,
    value: {
      subjectId: subject.id,
      chapterId: chapter.id,
      mode,
      language,
      messages,
      assistant: body.assistant === true,
    },
  };
}

