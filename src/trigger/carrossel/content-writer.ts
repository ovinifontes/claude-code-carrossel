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

═══ IDENTIDADE VISUAL (PADRÃO ARKHEDIGITAL) ═══
- Cores: Arkhe Blue #045C90, Cyan #24D1E7, Energy Orange #F58118
- Fundo: #0B1622 (escuro) / #111D2E (secundário)
- Texto: #FFFFFF (principal) / #B8C5D3 (secundário)
- Fonte: Sora (Bold títulos, Regular corpo)
- Formato: 1080×1350px portrait Instagram

═══ DIRETRIZES DE ESCRITA ═══
- Linguagem: Português Brasil, tom profissional mas acessível — nunca formal demais
- Público: Profissionais e entusiastas de tecnologia e IA
- Objetivo: Educar e engajar — o leitor deve aprender algo e querer compartilhar
- Cada slide deve ter no MÁXIMO 40 palavras de body text (para caber no design)
- Títulos curtos e impactantes (max 6 palavras)
- Use emojis com moderação (1 por slide, no máximo)
- TUDO deve ser em Português do Brasil. NUNCA use inglês.

═══ ESTRUTURA DO CARROSSEL (OBRIGATÓRIA) ═══
- Slide 1 (CAPA): Título chamativo max 8 palavras. 1 frase provocativa como subtítulo. Tag "INTELIGÊNCIA ARTIFICIAL" no topo.
- Slides 2-3 (CONTEXTO): O que aconteceu / Por que importa
- Slides 4-6 (DETALHES): Fatos, dados, comparações, números concretos
- Slides 7-8 (IMPACTO): O que muda na prática para o leitor, conexão com o dia a dia
- Slide 9 (OPINIÃO — opcional): Visão/previsão da ArkheDigital sobre o tema
- Slide Final (CTA): Chamada para seguir ${instagramHandle}, salvar e compartilhar. Botões visuais: 💾 Salvar | 🔄 Compartilhar | ❤️ Curtir

═══ TÉCNICAS DE COPYWRITING (PERFORMANCE CREATIVE) ═══
Use estas técnicas para maximizar engajamento:

ÂNGULOS DE HOOK (escolha o melhor para o tema):
- Curiosidade: "O segredo que as big techs não contam sobre..."
- Dor/Problema: "Você ainda está fazendo X manualmente?"
- Resultado: "Como fazer Y em Z minutos com IA"
- Prova social: "Por que 10.000+ profissionais já estão usando..."
- Contrarian: "Por que [prática comum] não funciona mais"

HEADLINES QUE FUNCIONAM:
- Específico ("Reduz 75% do tempo") > Vago ("Economize tempo")
- Benefício ("Crie conteúdo 3x mais rápido") > Feature ("Usa GPT-4")
- Voz ativa ("Automatize seus relatórios") > Passiva ("Relatórios são automatizados")
- Inclua números quando possível ("3x mais rápido", "em 5 minutos")

═══ CAPTION DO POST ═══
- PRIMEIRA LINHA: Gancho irresistível (aparece no preview do feed — é o que decide se a pessoa lê)
- 3-4 parágrafos curtos e escaneáveis
- Inclua dados/números para credibilidade
- CTA final: "Salve esse post e compartilhe com quem precisa saber disso!"
- Max 300 palavras
- 8-15 hashtags relevantes

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
