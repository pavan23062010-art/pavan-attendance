import { openai } from "@workspace/integrations-openai-ai-server";
import { Router } from "express";

const router = Router();

router.post("/pavan/chat", async (req, res) => {
  const { messages, userName, context } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
    userName?: string;
    context?: {
      schoolName?: string;
      location?: string;
      academicYear?: string;
      userRole?: string;
      totalStudents?: number;
      below75?: number;
      classStats?: string;
      assignedClass?: number;
      assignedSection?: string;
    };
  };

  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const schoolLine = context?.schoolName
    ? `You are the AI assistant for **${context.schoolName}**, ${context.location ?? "Vinukonda"} (AY ${context.academicYear ?? "2026–2027"}).`
    : "You are the AI assistant for Pavan Group of Schools, Vinukonda (AY 2026–2027).";

  const dataLine = context ? [
    context.totalStudents !== undefined ? `• Total students enrolled: ${context.totalStudents}` : "",
    context.below75 !== undefined ? `• Students currently below 75% attendance: ${context.below75}` : "",
    context.classStats ? `• Class-wise: ${context.classStats}` : "",
    context.userRole === "teacher" && context.assignedClass
      ? `• This teacher manages Class ${context.assignedClass}${context.assignedSection ?? ""}`
      : "",
  ].filter(Boolean).join("\n") : "";

  const systemPrompt = `You are PAVAN — a friendly, knowledgeable AI assistant specialising in school attendance management.

${schoolLine}

**Live School Data (use this to answer specific questions):**
${dataLine || "No live data available."}

**Your Knowledge:**
- Attendance thresholds: ≥85% = Excellent (Regular), 75–84% = Acceptable (Regular), <75% = At Risk (Irregular)
- Academic months: July 2026 through June 2027 (12 months)
- Daily attendance marking per class and section
- Parents can be notified by SMS when students are absent
- PAVAN chatbot, admin and teacher dashboards, class-wise reports

**Personality:** warm, professional, supportive. Give concise, helpful answers (2–5 sentences unless a detailed explanation is truly needed). Use bullet points for lists. Use **bold** for key terms or numbers.

${userName ? `The current user's name is **${userName}** (${context?.userRole ?? "teacher"}). Address them by name occasionally.` : ""}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 600,
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
