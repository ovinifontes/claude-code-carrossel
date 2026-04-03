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

═══ FRAMEWORK DE 10 SLIDES (REFERÊNCIA OBRIGATÓRIA) ═══
- Slide 1 (hero): Hook que PARA o scroll. Título max 10 palavras. Subtítulo provocativo.
- Slide 2 (problem): Problema/dor. Por que importa AGORA.
- Slide 3 (example): Exemplo concreto que ilustra o problema.
- Slide 4 (solution): A solução. Pode ter campo "quote" com frase de impacto.
- Slide 5 (visual): Slide visual com diagrama/infográfico. DEVE ter campo "visualDescription".
- Slide 6 (value): Valor prático 1. DEVE ter campo "features" com 3-4 items [{icon, label, description}].
- Slide 7 (value): Valor prático 2. DEVE ter campo "steps" com 3-4 items [{title, description}].
- Slide 8 (value): Valor prático 3. Insight ou dica avançada.
- Slide 9 (impact): O que muda na vida do leitor. Melhor insight por último.
- Slide 10 (cta): Handle @arkhedigitall + CTA claro.

═══ REGRAS DE CONTEÚDO ═══
- Títulos: max 8 palavras, específicos (números > genérico), voz ativa
- Body dos slides de conteúdo (2-9): ENTRE 30-40 palavras — OBRIGATÓRIO (exceto slide 5 que pode ter menos)
  • Se um slide tem MENOS de 25 palavras no body, está REPROVADO
  • O body deve conter dados, exemplos concretos, comparações ou dicas práticas
  • NUNCA aceite frases vagas como "A IA está mudando tudo" ou "Isso é revolucionário"
- LEGIBILIDADE é prioridade #1 — textos curtos, escaneáveis, fáceis de ler enquanto desliza
- Emojis: max 1 por slide
- Tom: Profissional mas acessível
- TUDO em Português do Brasil

═══ CRITÉRIOS DE REVISÃO ═══
1. **Densidade de conteúdo**: Slides 2-9 têm 30-40 palavras SUBSTANCIAIS no body? (CRÍTICO)
2. **Especificidade**: Títulos e body usam números, dados e exemplos concretos?
3. **Precisão**: Informações corretas? Nada enganoso ou exagerado?
4. **Progressão lógica**: Hook → Problema → Exemplo → Solução → Visual → Valor × 3 → Impacto → CTA?
5. **Dados estruturados**: Slide 5 tem "visualDescription"? Slide 6 tem "features"? Slide 7 tem "steps"?
6. **Engajamento**: Hook para o scroll? Cada slide motiva o swipe para o próximo?
7. **Legibilidade**: Textos são fáceis de ler rapidamente? Hierarquia visual clara?
8. **Português BR**: Gramática e ortografia corretas?
9. **Caption**: Gancho forte na 1ª linha, max 300 palavras, 8-15 hashtags?

SE APROVADO: Retorne o conteúdo exatamente como está.
SE REPROVADO: Retorne o conteúdo CORRIGIDO — especialmente enriquecendo slides com body text fraco e adicionando campos estruturados faltantes.

IMPORTANTE: TUDO deve ser em Português do Brasil. NUNCA use inglês.
IMPORTANTE: Mantenha os campos estruturados (features, steps, visualDescription, quote) quando presentes.

Responda em JSON com EXATAMENTE esta estrutura:
{
  "approved": true,
  "feedback": "Motivo da aprovação ou correções aplicadas",
  "slides": [
    {"slideNumber": 1, "type": "hero", "title": "Título", "body": "Texto do slide", "emoji": "🤖"},
    {"slideNumber": 5, "type": "visual", "title": "Título", "body": "Texto", "visualDescription": "Fluxo: A → B → C"},
    {"slideNumber": 6, "type": "value", "title": "Título", "body": "Intro", "features": [{"icon": "🚀", "label": "Nome", "description": "Desc"}]},
    {"slideNumber": 7, "type": "value", "title": "Título", "body": "Intro", "steps": [{"title": "Passo", "description": "Desc"}]}
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
