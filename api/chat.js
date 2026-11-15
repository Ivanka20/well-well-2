// Función serverless de Vercel: POST /api/chat
// Lupita explica términos médicos en palabras sencillas usando Claude.
// Requiere la variable de entorno ANTHROPIC_API_KEY en Vercel.
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import path from "node:path";

const client = new Anthropic();

// Instrucciones de Lupita (system prompt): se guardan en el repositorio en
// prompts/lupita-system-prompt.md y se leen de ahí, para que haya una sola versión.
// vercel.json incluye la carpeta prompts/ en esta función.
const SYSTEM = readFileSync(path.join(process.cwd(), "prompts", "lupita-system-prompt.md"), "utf8").trim();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const body = typeof req.body === "string" ? safeJson(req.body) : req.body || {};
  const question = String(body.question || "").trim().slice(0, 300);
  const mode = body.mode === "adulto" ? "adulto" : "nino";
  if (!question) return res.status(400).json({ error: "Falta la pregunta" });

  // Historial corto para preguntas de seguimiento ("¿y eso duele?")
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  const messages = [];
  for (const m of history) {
    if ((m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
      messages.push({ role: m.role, content: m.content.slice(0, 1200) });
    }
  }
  while (messages.length && messages[0].role !== "user") messages.shift();
  messages.push({ role: "user", content: `[modo: ${mode}] ${question}` });

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 1024,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages,
    });

    if (response.stop_reason === "refusal") {
      return res.status(200).json({ answer: "Esa pregunta mejor házsela a tu doctor o enfermera, ellos te pueden ayudar mejor que yo. ¿Quieres que te explique otra palabra?" });
    }
    const answer = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    return res.status(200).json({ answer });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("ANTHROPIC_API_KEY inválida o ausente");
      return res.status(500).json({ error: "Asistente sin configurar" });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Muchas preguntas a la vez, intenta en un momento" });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Error de API ${error.status}:`, error.message);
      return res.status(502).json({ error: "El asistente no respondió" });
    }
    console.error(error);
    return res.status(500).json({ error: "Error inesperado" });
  }
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
