// A tiny OpenAI-compatible streaming server, for developing the tutor UI
// without spending API credits (or without a key at all).
//
//   node scripts/mock-provider.mjs          # listens on http://127.0.0.1:4010
//
// Then in ai-tutor/.env.local:
//   TUTOR_API_KEY=mock
//   TUTOR_API_BASE=http://127.0.0.1:4010/v1
//
// It streams a fixed, markdown-rich answer chunk by chunk so you can check
// rendering and the stop button. It never answers the real question.

import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 4010);

const ANSWER = `**This answer comes from the local mock provider** — not a real model. Add a \`TUTOR_API_KEY\` to get real answers.

## Step 1 — Understand the question
The angle of elevation θ of a tower of height h, seen from distance d, satisfies:

tan θ = h ÷ d

## Step 2 — Substitute the values
- h = 30 m
- d = 30√3 m

So tan θ = 30 ÷ 30√3 = 1 ÷ √3.

## Step 3 — Find the angle
tan 30° = 1 ÷ √3, therefore **θ = 30°**.

> Marking scheme: 1 mark for the correct ratio, 1 mark for substitution, 1 mark for the final angle.

**Common mistake:** forgetting to rationalise 30 ÷ 30√3 before matching it to a standard angle.

Try this: what is the angle if d = 30 m?`;

function sse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

const server = createServer(async (req, res) => {
  if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ object: "list", data: [{ id: "mock-model", object: "model" }] }));
    return;
  }

  let body = "";
  for await (const chunk of req) body += chunk;
  const parsed = JSON.parse(body || "{}");
  console.log(`[mock] model=${parsed.model} messages=${parsed.messages?.length ?? 0}`);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const id = `chatcmpl-mock-${Date.now()}`;
  const base = { id, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: parsed.model };

  // Send the answer in word-sized deltas, like a real provider.
  const words = ANSWER.split(/(?<=\s)/);
  for (const word of words) {
    sse(res, { ...base, choices: [{ index: 0, delta: { content: word }, finish_reason: null }] });
    await new Promise((resolve) => setTimeout(resolve, 18));
  }

  sse(res, { ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] });
  res.write("data: [DONE]\n\n");
  res.end();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock] OpenAI-compatible provider on http://127.0.0.1:${PORT}/v1`);
});
