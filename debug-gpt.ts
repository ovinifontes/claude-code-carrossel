import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function main() {
  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content: `Você é copywriter expert de Instagram sobre IA para @arkhedigitall (ArkheDigital).
Crie o roteiro de um carrossel educativo com 8 slides.

Regras:
- PT-BR, tom profissional mas acessível
- Cada slide: max 40 palavras no body
- Títulos: max 6 palavras
- Emojis: 1 por slide max

Estrutura:
- Slide 1 (capa): título chamativo + frase provocativa
- Slides 2-7: conteúdo educativo
- Slide 8 (cta): CTA para seguir @arkhedigitall

IMPORTANTE: Responda em JSON com EXATAMENTE esta estrutura:
{
  "slides": [
    {
      "slideNumber": 1,
      "type": "capa",
      "title": "Título aqui",
      "body": "Texto do slide aqui",
      "emoji": "🤖"
    },
    {
      "slideNumber": 2,
      "type": "conteudo",
      "title": "Título aqui",
      "body": "Texto do slide aqui",
      "emoji": "📊"
    }
  ],
  "caption": "Legenda completa do post...",
  "hashtags": ["#IA", "#Tech"]
}`,
      },
      { role: "user", content: "TEMA: Como o ChatGPT mudou o mercado de trabalho em 2026\nÂNGULO: educativo" },
    ],
    response_format: { type: "json_object" },
  });

  const raw = resp.choices[0].message.content || "{}";
  const parsed = JSON.parse(raw);

  console.log("=== RAW KEYS dos slides ===");
  if (parsed.slides && parsed.slides[0]) {
    console.log("Keys do slide 0:", Object.keys(parsed.slides[0]));
    console.log("Slide 0 completo:", JSON.stringify(parsed.slides[0], null, 2));
    console.log("\nSlide 1 completo:", JSON.stringify(parsed.slides[1], null, 2));
    console.log("\nÚltimo slide:", JSON.stringify(parsed.slides[parsed.slides.length - 1], null, 2));
  }
  console.log("\n=== Todos os slides ===");
  for (const s of parsed.slides || []) {
    console.log(`#${s.slideNumber} [${s.type}] title="${s.title}" body="${(s.body || "").slice(0, 50)}..." emoji=${s.emoji}`);
  }
}

main().catch(console.error);
