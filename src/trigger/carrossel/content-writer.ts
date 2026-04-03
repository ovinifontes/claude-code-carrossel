import { task } from "@trigger.dev/sdk";
import OpenAI from "openai";
import type { ResearchOutput } from "./research.js";

export interface SlideContent {
  slideNumber: number;
  type:
    | "hero"
    | "problem"
    | "example"
    | "solution"
    | "visual"
    | "value"
    | "impact"
    | "cta";
  title: string;
  body: string;
  emoji?: string;
  features?: { icon: string; label: string; description: string }[];
  steps?: { title: string; description: string }[];
  quote?: string;
  visualDescription?: string;
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
  run: async (payload: {
    research: ResearchOutput;
  }): Promise<ContentOutput> => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not set");

    const instagramHandle =
      process.env.INSTAGRAM_HANDLE || "@arkhedigitall";
    const { research } = payload;

    console.log(`\u270d\ufe0f Criando roteiro para: "${research.topic}"`);

    const openai = new OpenAI({ apiKey: openaiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: `Voc\u00ea \u00e9 um copywriter expert em conte\u00fado de Instagram sobre Intelig\u00eancia Artificial para o perfil ${instagramHandle} (ArkheDigital).

TAREFA: Criar o roteiro completo de um carrossel educativo (10 slides) sobre o tema fornecido.

\u2550\u2550\u2550 IDENTIDADE VISUAL (PADR\u00c3O ARKHEDIGITAL) \u2550\u2550\u2550
- Cores: Arkhe Blue #045C90, Cyan #24D1E7, Energy Orange #F58118
- Paleta derivada: Light BG #F8F6F3 / Dark BG #0B1622
- Fonte: Plus Jakarta Sans (Bold t\u00edtulos, Regular corpo)
- Formato: 1080\u00d71350px portrait Instagram (4:5)
- Altern\u00e2ncia de slides claros e escuros para ritmo visual

\u2550\u2550\u2550 PRINC\u00cdPIOS DE DESIGN (OBRIGAT\u00d3RIO) \u2550\u2550\u2550
1. LEGIBILIDADE \u00e9 prioridade #1 \u2014 mais importante que beleza
2. Cada slide deve ser f\u00e1cil de ler RAPIDAMENTE enquanto a pessoa desliza
3. Hierarquia visual clara \u2014 guie o olhar do usu\u00e1rio
4. Alto contraste entre texto e fundo
5. Sequ\u00eancia l\u00f3gica que faz a pessoa QUERER continuar deslizando

\u2550\u2550\u2550 FRAMEWORK DE 10 SLIDES (OBRIGAT\u00d3RIO) \u2550\u2550\u2550
Use EXATAMENTE esta estrutura para maximizar engajamento e swipes:

SLIDE 1 \u2014 HERO/HOOK (type: "hero", fundo claro):
- Fun\u00e7\u00e3o: DETER o scroll. Se esse slide falhar, ningu\u00e9m desliza.
- T\u00edtulo: max 10 palavras. Use um destes \u00e2ngulos de hook:
  \u2022 Afirma\u00e7\u00e3o pol\u00eamica: "Voc\u00ea est\u00e1 usando IA errado"
  \u2022 N\u00famero + benef\u00edcio: "7 ferramentas que substituem seu designer"
  \u2022 Pergunta que d\u00f3i: "Por que seus carross\u00e9is t\u00eam 0 salvamentos?"
  \u2022 Resultado concreto: "Esse post gerou 4.200 seguidores em 3 dias"
  \u2022 Invers\u00e3o de expectativa: "Mais esfor\u00e7o no design = menos alcance"
- Body: 1 frase provocativa curta como subt\u00edtulo (max 15 palavras)
- NUNCA comece com o nome da marca como headline

SLIDE 2 \u2014 PROBLEMA (type: "problem", fundo escuro):
- Fun\u00e7\u00e3o: Gerar interesse mostrando a dor/problema.
- T\u00edtulo: max 8 palavras, direto ao ponto
- Body: 2-3 frases (30-40 palavras) explicando por que isso importa AGORA

SLIDE 3 \u2014 EXEMPLO (type: "example", fundo claro):
- Fun\u00e7\u00e3o: Ilustrar o problema com um exemplo concreto e tang\u00edvel.
- T\u00edtulo: max 8 palavras
- Body: 2-3 frases (30-40 palavras) com caso real, dado ou compara\u00e7\u00e3o

SLIDE 4 \u2014 SOLU\u00c7\u00c3O (type: "solution", fundo gradiente da marca):
- Fun\u00e7\u00e3o: Apresentar a resposta/solu\u00e7\u00e3o.
- T\u00edtulo: max 8 palavras
- Body: 2-3 frases (30-40 palavras) explicando a solu\u00e7\u00e3o
- OPCIONAL: campo "quote" com uma frase de impacto ou prompt relevante

SLIDE 5 \u2014 VISUAL (type: "visual", fundo escuro):
- Fun\u00e7\u00e3o: RETER aten\u00e7\u00e3o com elemento visual \u2014 diagrama, compara\u00e7\u00e3o, infogr\u00e1fico.
- T\u00edtulo: max 8 palavras
- Body: 1-2 frases curtas (max 20 palavras) \u2014 o visual \u00e9 o protagonista
- OBRIGAT\u00d3RIO: campo "visualDescription" descrevendo o que o diagrama deve mostrar
  Exemplos: "Fluxograma: Dado bruto \u2192 IA processa \u2192 Insight \u2192 A\u00e7\u00e3o"
            "Compara\u00e7\u00e3o lado a lado: Antes (manual, 4h) vs Depois (IA, 15min)"
            "3 c\u00edrculos conectados: Coleta \u2192 An\u00e1lise \u2192 Decis\u00e3o"

SLIDE 6 \u2014 VALOR PR\u00c1TICO 1 (type: "value", fundo claro):
- Fun\u00e7\u00e3o: Entregar conte\u00fado pr\u00e1tico \u2014 ferramentas, recursos, benef\u00edcios.
- T\u00edtulo: max 8 palavras
- Body: 1-2 frases introdut\u00f3rias
- OBRIGAT\u00d3RIO: campo "features" com 3-4 items, cada um com:
  { "icon": "emoji", "label": "Nome curto", "description": "1 frase descritiva" }

SLIDE 7 \u2014 VALOR PR\u00c1TICO 2 (type: "value", fundo escuro):
- Fun\u00e7\u00e3o: Entregar passo a passo ou processo.
- T\u00edtulo: max 8 palavras
- Body: 1-2 frases introdut\u00f3rias
- OBRIGAT\u00d3RIO: campo "steps" com 3-4 items, cada um com:
  { "title": "Nome do passo", "description": "1 frase descritiva" }

SLIDE 8 \u2014 VALOR PR\u00c1TICO 3 (type: "value", fundo claro):
- Fun\u00e7\u00e3o: Insight final, dica avan\u00e7ada ou diferen\u00e7a competitiva.
- T\u00edtulo: max 8 palavras
- Body: 2-3 frases (30-40 palavras) com a dica mais valiosa

SLIDE 9 \u2014 IMPACTO (type: "impact", fundo escuro):
- Fun\u00e7\u00e3o: O que muda na vida do leitor. Melhor insight por \u00faltimo.
- T\u00edtulo: max 8 palavras
- Body: 2-3 frases (30-40 palavras) conectando ao dia a dia do leitor

SLIDE 10 \u2014 CTA (type: "cta", fundo gradiente):
- Fun\u00e7\u00e3o: Converter engajamento.
- T\u00edtulo: "Gostou do conte\u00fado?" ou similar
- Body: Chamada para seguir ${instagramHandle}, salvar e compartilhar

\u2550\u2550\u2550 REGRAS DE CONTE\u00daDO POR SLIDE \u2550\u2550\u2550
- Slides de conte\u00fado (2-9) DEVEM ter entre 30-40 palavras no body (exceto slide 5 que pode ter menos)
- N\u00c3O escreva frases gen\u00e9ricas ou vagas como "A IA est\u00e1 mudando tudo"
- ESCREVA conte\u00fado espec\u00edfico e denso: dados, exemplos, compara\u00e7\u00f5es, dicas pr\u00e1ticas
- T\u00edtulos devem ser espec\u00edficos ("Reduz 75% do tempo") e NUNCA vagos ("IA \u00e9 \u00fatil")
- Use voz ativa: "Automatize seus relat\u00f3rios" > "Relat\u00f3rios s\u00e3o automatizados"
- Inclua n\u00fameros sempre que poss\u00edvel: "3x mais r\u00e1pido", "em 5 minutos", "75% das empresas"
- Cada slide deve fazer sentido sozinho E motivar o swipe para o pr\u00f3ximo
- Use emojis com modera\u00e7\u00e3o (1 por slide, no m\u00e1ximo)
- TUDO em Portugu\u00eas do Brasil. NUNCA use ingl\u00eas.

\u2550\u2550\u2550 PSICOLOGIA DO SWIPE \u2550\u2550\u2550
- Curiosidade: O hook promete valor que requer swipe para descobrir
- Barra de progresso: Vis\u00edvel em todos os slides, cria impulso de completar
- Altern\u00e2ncia visual: Slides claros e escuros criam ritmo e evitam monotonia
- Valor crescente: Melhor dica por \u00faltimo \u2014 recompensa quem completa
- Reten\u00e7\u00e3o visual: Slide 5 usa diagrama/visual para reter aten\u00e7\u00e3o no meio do carrossel

\u2550\u2550\u2550 CAPTION DO POST \u2550\u2550\u2550
- PRIMEIRA LINHA: Gancho irresist\u00edvel (aparece no preview do feed)
- 3-4 par\u00e1grafos curtos e escane\u00e1veis
- Inclua dados/n\u00fameros para credibilidade
- CTA final: "Salve esse post e compartilhe com quem precisa saber disso!"
- Max 300 palavras
- 8-15 hashtags relevantes

Responda em JSON com esta estrutura:
{
  "slides": [
    {
      "slideNumber": 1,
      "type": "hero",
      "title": "T\u00edtulo chamativo do hook",
      "body": "Frase provocativa curta como subt\u00edtulo",
      "emoji": "\ud83e\udd16"
    },
    {
      "slideNumber": 5,
      "type": "visual",
      "title": "Como funciona na pr\u00e1tica",
      "body": "Veja o fluxo completo",
      "visualDescription": "Fluxograma: Dado bruto \u2192 IA processa \u2192 Insight \u2192 A\u00e7\u00e3o"
    },
    {
      "slideNumber": 6,
      "type": "value",
      "title": "Ferramentas essenciais",
      "body": "As melhores op\u00e7\u00f5es dispon\u00edveis hoje:",
      "features": [
        { "icon": "\ud83d\ude80", "label": "ChatGPT", "description": "Gera textos e an\u00e1lises em segundos" },
        { "icon": "\ud83c\udfa8", "label": "Midjourney", "description": "Cria imagens profissionais com IA" }
      ]
    },
    {
      "slideNumber": 7,
      "type": "value",
      "title": "Como come\u00e7ar agora",
      "body": "Siga estes passos:",
      "steps": [
        { "title": "Escolha a ferramenta", "description": "Teste as op\u00e7\u00f5es gratuitas primeiro" },
        { "title": "Pratique di\u00e1rio", "description": "15 minutos por dia j\u00e1 geram resultados" }
      ]
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
\u00c2NGULO: ${research.angle}
FONTES: ${research.sources.map((s) => s.title).join(", ")}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(
      response.choices[0].message.content || "{}"
    );

    const output: ContentOutput = {
      topic: research.topic,
      headline: research.headline,
      slides: result.slides || [],
      caption: result.caption || "",
      hashtags: result.hashtags || [],
      sources: research.sources,
    };

    console.log(
      `\u2705 Roteiro criado: ${output.slides.length} slides`
    );
    console.log(
      `\ud83d\udcdd Caption: ${output.caption.slice(0, 80)}...`
    );
    console.log(
      `#\ufe0f\u20e3 Hashtags: ${output.hashtags.join(" ")}`
    );

    return output;
  },
});
