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

TAREFA: Criar o roteiro completo de um carrossel educativo (7 slides) sobre o tema fornecido.

═══ IDENTIDADE VISUAL (PADRÃO ARKHEDIGITAL) ═══
- Cores: Arkhe Blue #045C90, Cyan #24D1E7, Energy Orange #F58118
- Fundo: #0B1622 (escuro) / #111D2E (secundário)
- Texto: #FFFFFF (principal) / #B8C5D3 (secundário)
- Fonte: Sora (Bold títulos, Regular corpo)
- Formato: 1080×1350px portrait Instagram (4:5 — máxima visibilidade no feed)

═══ FRAMEWORK DE 7 SLIDES (OBRIGATÓRIO) ═══
Use EXATAMENTE esta estrutura para maximizar engajamento e swipes:

SLIDE 1 — HOOK (type: "capa"):
- Função: Parar o scroll. Se esse slide falhar, ninguém desliza.
- Título: max 10 palavras. Use um destes ângulos de hook:
  • Afirmação ousada: "90% das empresas cometem esse erro com IA"
  • Pergunta: "Por que seus concorrentes já estão usando IA e você não?"
  • Número + promessa: "5 formas de usar IA que vão mudar seu trabalho"
  • Contrarian: "Pare de fazer X (faça isso no lugar)"
- Body: 1 frase provocativa curta como subtítulo (max 15 palavras)
- DEVE incluir indicador de swipe: "Deslize →"

SLIDE 2 — CONTEXTO (type: "conteudo"):
- Função: Estabelecer o problema ou situação. Por que isso importa AGORA.
- Título: max 8 palavras, direto ao ponto
- Body: 2-3 frases (30-40 palavras) explicando o cenário/problema

SLIDES 3-5 — VALOR (type: "conteudo"):
- Função: Entregar valor real. UM ponto por slide. Nunca amontoar ideias.
- Título: max 8 palavras, específico ao ponto daquele slide
- Body: 2-3 frases (30-40 palavras) com fatos, dados, exemplos concretos ou dicas práticas
- IMPORTANTE: O body deve ser SUBSTANCIAL — não apenas uma frase vaga. Inclua:
  • Números e dados específicos quando possível
  • Exemplos práticos e concretos
  • Comparações antes/depois
  • Dicas acionáveis que o leitor pode aplicar

SLIDE 6 — IMPACTO/CONCLUSÃO (type: "conteudo"):
- Função: O que muda na prática para o leitor. Melhor insight por último (recompensa quem chegou até aqui).
- Título: max 8 palavras
- Body: 2-3 frases (30-40 palavras) conectando ao dia a dia do leitor

SLIDE 7 — CTA (type: "cta"):
- Função: Converter engajamento.
- Título: "Gostou do conteúdo?" ou similar
- Body: Chamada para seguir ${instagramHandle}, salvar e compartilhar

═══ REGRAS DE CONTEÚDO POR SLIDE ═══
- Cada slide de conteúdo (2-6) DEVE ter entre 30-40 palavras no body
- NÃO escreva frases genéricas ou vagas como "A IA está mudando tudo"
- ESCREVA conteúdo específico e denso: dados, exemplos, comparações, dicas práticas
- Títulos devem ser específicos ("Reduz 75% do tempo") e NUNCA vagos ("IA é útil")
- Use voz ativa: "Automatize seus relatórios" > "Relatórios são automatizados"
- Inclua números sempre que possível: "3x mais rápido", "em 5 minutos", "75% das empresas"
- Cada slide deve fazer sentido sozinho E motivar o swipe para o próximo
- Use emojis com moderação (1 por slide, no máximo)
- TUDO em Português do Brasil. NUNCA use inglês.

═══ PSICOLOGIA DO SWIPE ═══
- Curiosidade: O hook promete valor que requer swipe para descobrir
- Progresso numerado: "3/7" cria impulso de completar
- Continuidade visual: Design consistente sinaliza "tem mais"
- Valor crescente: Melhor dica por último — recompensa quem completa
- Indicador de swipe: Seta ou "Deslize →" no slide 1

═══ CAPTION DO POST ═══
- PRIMEIRA LINHA: Gancho irresistível (aparece no preview do feed — decide se a pessoa lê)
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
      "title": "Título chamativo do hook",
      "body": "Frase provocativa curta como subtítulo",
      "emoji": "🤖"
    },
    {
      "slideNumber": 2,
      "type": "conteudo",
      "title": "Título do ponto",
      "body": "Texto substancial com 30-40 palavras: dados, exemplos concretos, comparações ou dicas práticas que o leitor pode aplicar.",
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
