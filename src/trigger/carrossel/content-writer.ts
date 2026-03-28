import { task } from "@trigger.dev/sdk";
import OpenAI from "openai";
import type { ResearchOutput } from "./research.js";

export interface SlideContent {
  slideNumber: number;
  type: "capa" | "conteudo" | "cta";
  title: string;
  body: string;
  emoji?: string;
}

export interface ContentOutput {
  topic: string;
  headline: string;
  slides: SlideContent[];
  caption: string;
  hashtags: string[];
  sources: { title: string; url: string }[];
}

export const contentWriterTask = task({
  id: "carrossel-content-writer",
  retry: { maxAttempts: 2 },
  run: async (payload: { research: ResearchOutput }): Promise<ContentOutput> => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not set");

    const instagramHandle = process.env.INSTAGRAM_HANDLE || "@arkhedigitall";
    const { research } = payload;

    console.log(`✍️ Criando roteiro para: "${research.topic}"`);

    const openai = new OpenAI({ apiKey: openaiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: `Você é um copywriter expert em conteúdo de Instagram sobre Inteligência Artificial para o perfil ${instagramHandle} (ArkheDigital).

TAREFA: Criar o roteiro completo de um carrossel educativo (7-10 slides) sobre o tema fornecido.

DIRETRIZES DE ESCRITA:
- Linguagem: Português Brasil, tom profissional mas acessível
- Público: Profissionais e entusiastas de tecnologia e IA
- Objetivo: Educar e engajar — o leitor deve aprender algo e querer compartilhar
- Cada slide deve ter no MÁXIMO 40 palavras de body text (para caber no design)
- Títulos curtos e impactantes (max 6 palavras)
- Use emojis com moderação (1 por slide, no máximo)

ESTRUTURA DO CARROSSEL:
- Slide 1 (capa): Título chamativo que gera curiosidade. Body curto (1 frase provocativa)
- Slides 2-3: Contexto — o que aconteceu / por que importa
- Slides 4-6: Detalhes — fatos, dados, comparações
- Slides 7-8: Impacto — o que muda na prática para o leitor
- Slide 9 (opcional): Opinião/previsão da ArkheDigital
- Slide final (CTA): Chamada para seguir ${instagramHandle}, salvar e compartilhar

CAPTION DO POST:
- Gancho forte na primeira linha (aparece no preview)
- 3-4 parágrafos curtos
- CTA final pedindo para salvar/compartilhar
- Max 300 palavras

Responda em JSON com esta estrutura:
{
  "slides": [
    {
      "slideNumber": 1,
      "type": "capa",
      "title": "Título da capa",
      "body": "Frase provocativa curta",
      "emoji": "🤖"
    },
    {
      "slideNumber": 2,
      "type": "conteudo",
      "title": "Título do slide",
      "body": "Texto do slide (max 40 palavras)",
      "emoji": "📌"
    }
  ],
  "caption": "Texto completo da legenda do post...",
  "hashtags": ["#IA", "#InteligenciaArtificial", "#Tech"]
}`,
        },
        {
          role: "user",
          content: `TEMA: ${research.topic}
HEADLINE: ${research.headline}
RESUMO: ${research.summary}
FATOS-CHAVE:
${research.keyFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}
ÂNGULO: ${research.angle}
FONTES: ${research.sources.map((s) => s.title).join(", ")}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    const output: ContentOutput = {
      topic: research.topic,
      headline: research.headline,
      slides: result.slides || [],
      caption: result.caption || "",
      hashtags: result.hashtags || [],
      sources: research.sources,
    };

    console.log(`✅ Roteiro criado: ${output.slides.length} slides`);
    console.log(`📝 Caption: ${output.caption.slice(0, 80)}...`);
    console.log(`#️⃣ Hashtags: ${output.hashtags.join(" ")}`);

    return output;
  },
});
