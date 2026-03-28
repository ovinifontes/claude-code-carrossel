import { task } from "@trigger.dev/sdk";
import OpenAI from "openai";
import type { ContentOutput } from "./content-writer.js";

export interface ReviewOutput {
  approved: boolean;
  feedback: string;
  finalContent: ContentOutput;
}

export const reviewerTask = task({
  id: "carrossel-reviewer",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    content: ContentOutput;
    attempt: number;
  }): Promise<ReviewOutput> => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not set");

    const { content, attempt } = payload;
    console.log(`🔍 Revisando carrossel (tentativa ${attempt}/2): "${content.topic}"`);

    const openai = new OpenAI({ apiKey: openaiKey });

    const slidesText = content.slides
      .map(
        (s) =>
          `Slide ${s.slideNumber} (${s.type}): ${s.emoji || ""} ${s.title}\n${s.body}`
      )
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `Você é um editor sênior de conteúdo de Instagram sobre IA para o perfil @arkhedigitall (ArkheDigital).

TAREFA: Revisar o carrossel abaixo com base no PADRÃO ARKHEDIGITAL e decidir se está aprovado ou precisa de ajustes.

═══ FRAMEWORK DE 7 SLIDES (REFERÊNCIA OBRIGATÓRIA) ═══
- Slide 1 (HOOK/CAPA): Título max 10 palavras que PARA o scroll. Subtítulo provocativo. Indicador "Deslize →"
- Slide 2 (CONTEXTO): Estabelece o problema/situação. Por que importa AGORA.
- Slides 3-5 (VALOR): UM ponto por slide. Fatos, dados, exemplos concretos.
- Slide 6 (IMPACTO): O que muda na prática para o leitor.
- Slide 7 (CTA): Handle @arkhedigitall + botões 💾🔄❤️

═══ REGRAS DE CONTEÚDO ═══
- Títulos: max 8 palavras, específicos (números > genérico), voz ativa
- Body dos slides de conteúdo (2-6): ENTRE 30-40 palavras — OBRIGATÓRIO
  • Se um slide tem MENOS de 25 palavras no body, está REPROVADO
  • O body deve conter dados, exemplos concretos, comparações ou dicas práticas
  • NUNCA aceite frases vagas como "A IA está mudando tudo" ou "Isso é revolucionário"
- Emojis: max 1 por slide
- Tom: Profissional mas acessível
- TUDO em Português do Brasil

═══ CRITÉRIOS DE REVISÃO ═══
1. **Densidade de conteúdo**: Cada slide de conteúdo tem 30-40 palavras SUBSTANCIAIS no body? (CRÍTICO — principal motivo de reprovação)
2. **Especificidade**: Títulos e body usam números, dados e exemplos concretos? Nada vago?
3. **Precisão**: Informações corretas? Nada enganoso ou exagerado?
4. **Progressão lógica**: Hook → Contexto → Valor → Impacto → CTA?
5. **Engajamento**: Hook para o scroll? Cada slide motiva o swipe para o próximo?
6. **Português BR**: Gramática e ortografia corretas?
7. **CTA**: Último slide com call-to-action claro?
8. **Caption**: Gancho forte na 1ª linha, max 300 palavras, 8-15 hashtags?

SE APROVADO: Retorne o conteúdo exatamente como está.
SE REPROVADO: Retorne o conteúdo CORRIGIDO — especialmente enriquecendo slides com body text fraco.

IMPORTANTE: TUDO deve ser em Português do Brasil. NUNCA use inglês.

Responda em JSON com EXATAMENTE esta estrutura:
{
  "approved": true,
  "feedback": "Motivo da aprovação ou correções aplicadas",
  "slides": [
    {"slideNumber": 1, "type": "capa", "title": "Título", "body": "Texto do slide", "emoji": "🤖"},
    {"slideNumber": 2, "type": "conteudo", "title": "Título", "body": "Texto do slide", "emoji": "📊"}
  ],
  "caption": "legenda completa...",
  "hashtags": ["#IA", "#Tech"]
}`,
        },
        {
          role: "user",
          content: `CARROSSEL PARA REVISÃO:

TEMA: ${content.topic}
HEADLINE: ${content.headline}

SLIDES:
${slidesText}

CAPTION:
${content.caption}

HASHTAGS: ${content.hashtags.join(" ")}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    const finalContent: ContentOutput = {
      ...content,
      slides: result.slides || content.slides,
      caption: result.caption || content.caption,
      hashtags: result.hashtags || content.hashtags,
    };

    const output: ReviewOutput = {
      approved: result.approved ?? true,
      feedback: result.feedback || "Aprovado sem alterações",
      finalContent,
    };

    if (output.approved) {
      console.log(`✅ Carrossel APROVADO: ${output.feedback}`);
    } else {
      console.log(`🔄 Carrossel AJUSTADO: ${output.feedback}`);
    }

    return output;
  },
});
