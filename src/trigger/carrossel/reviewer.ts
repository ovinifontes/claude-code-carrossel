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

TAREFA: Revisar o carrossel abaixo e decidir se está aprovado ou precisa de ajustes.

CRITÉRIOS DE REVISÃO:
1. **Precisão**: Informações corretas e atualizadas? Nada enganoso?
2. **Clareza**: Linguagem acessível para público geral? Jargões explicados?
3. **Engajamento**: Títulos chamam atenção? Gera curiosidade para deslizar?
4. **Tom**: Profissional mas acessível? Sem ser formal demais nem informal demais?
5. **Português BR**: Gramática e ortografia corretas? Sem erros?
6. **Tamanho**: Body de cada slide tem no máximo 40 palavras?
7. **Estrutura**: Fluxo lógico entre slides? Progressão de contexto → detalhe → impacto?
8. **CTA**: Último slide tem call-to-action claro?
9. **Caption**: Gancho forte na primeira linha? CTA no final?

SE APROVADO: Retorne o conteúdo exatamente como está.
SE REPROVADO: Retorne o conteúdo CORRIGIDO com as melhorias aplicadas.

Responda em JSON:
{
  "approved": true/false,
  "feedback": "Motivo da aprovação ou lista de correções aplicadas",
  "slides": [...slides corrigidos se necessário...],
  "caption": "...caption corrigida se necessário...",
  "hashtags": ["...hashtags..."]
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
