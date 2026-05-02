import { openai } from "@workspace/integrations-openai-ai-server";
import { Router } from "express";

const router = Router();

router.post("/pavan/chat", async (req, res) => {
  const { messages, userName } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
    userName?: string;
  };

  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const systemPrompt = `You are PAVAN, a friendly and knowledgeable AI assistant for Pavan Group of Schools, Vinukonda (Academic Year 2026–2027).
Your role is to help teachers and administrators with their school attendance management tasks.

You know about:
- The school's attendance tracking system covering Classes 1–10, Sections A/B/C
- Academic months from July 2026 to June 2027 (12 months)
- Attendance percentage thresholds: 85%+ is excellent (Regular), 75–84% is acceptable (Regular), below 75% is at risk (Irregular)
- How to interpret monthly attendance reports, daily marking, and student statistics
- Tips for improving attendance, handling irregular students, and communicating with parents

Personality: warm, professional, supportive. Keep responses concise (2–4 sentences unless a detailed explanation is needed). Use simple, clear language.

${userName ? `The user's name is ${userName}. Address them by name occasionally to make the conversation personal.` : ""}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    req.log.error({ err }, "PAVAN chat error");
    res.write(`data: ${JSON.stringify({ error: "Something went wrong. Please try again." })}\n\n`);
  }

  res.end();
});

export default router;
