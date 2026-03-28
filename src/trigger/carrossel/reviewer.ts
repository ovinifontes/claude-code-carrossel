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

═══ PADRÃO ARKHEDIGITAL (REFERÊNCIA OBRIGATÓRIA) ═══
- Slide 1 (CAPA): Título max 8 palavras, subtítulo provocativo, tag "INTELIGÊNCIA ARTIFICIAL"
- Slides 2-3 (CONTEXTO): O que aconteceu / Por que importa
- Slides 4-6 (DETALHES): Fatos, dados, comparações
- Slides 7-8 (IMPACTO): O que muda na prática
- Slide final (CTA): Handle @arkhedigitall + botões 💾🔄❤️
- Títulos: max 6 palavras, impactantes
- Body: max 40 palavras por slide
- Emojis: max 1 por slide
- Tom: Profissional mas acessível — nunca formal demais
- Caption: gancho forte na 1ª linha, max 300 palavras, 8-15 hashtags

═══ CRITÉRIOS DE REVISÃO ═══
1. **Precisão**: Informações corretas e atualizadas? Nada enganoso ou exagerado?
2. **Clareza**: Linguagem acessível para público geral? Jargões explicados?
3. **Engajamento**: Títulos chamam atenção? Gera curiosidade para deslizar?
4. **Tom**: Profissional mas acessível? Sem ser formal demais nem informal demais?
5. **Português BR**: Gramática e ortografia corretas? Sem erros?
6. **Tamanho**: Body de cada slide tem no máximo 40 palavras? Título max 6 palavras?
7. **Estrutura**: Fluxo lógico entre slides? Progressão contexto → detalhe → impacto?
8. **CTA**: Último slide tem call-to-action claro com @arkhedigitall?
9. **Caption**: Gancho irresistível na primeira linha (decide se a pessoa lê)? CTA final? 8-15 hashtags?
10. **Headlines**: Usam números/dados quando possível? Benefícios > Features? Voz ativa?

SE APROVADO: Retorne o conteúdo exatamente como está.
SE REPROVADO: Retorne o conteúdo CORRIGIDO com as melhorias aplicadas.

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
