import { task } from "@trigger.dev/sdk";
import OpenAI from "openai";
import Parser from "rss-parser";

// RSS feeds de fontes confiáveis sobre IA
const AI_RSS_FEEDS = [
  "https://techcrunch.com/category/artificial-intelligence/feed/",
  "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
  "https://blog.google/technology/ai/rss/",
  "https://openai.com/blog/rss.xml",
  "https://huggingface.co/blog/feed.xml",
  "https://www.technologyreview.com/topic/artificial-intelligence/feed",
  "https://venturebeat.com/category/ai/feed/",
  "https://syncedreview.com/feed/",
];

interface RSSArticle {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  source: string;
}

export interface ResearchOutput {
  topic: string;
  headline: string;
  summary: string;
  keyFacts: string[];
  sources: { title: string; url: string }[];
  angle: string;
}

export const researchTask = task({
  id: "carrossel-research",
  retry: { maxAttempts: 2 },
  run: async (_payload: Record<string, never>): Promise<ResearchOutput> => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not set");

    console.log("🔍 Buscando notícias recentes de IA...");

    // 1. Coletar artigos de múltiplos RSS feeds
    const parser = new Parser({ timeout: 10000 });
    const articles: RSSArticle[] = [];

    const feedPromises = AI_RSS_FEEDS.map(async (feedUrl) => {
      try {
        const feed = await parser.parseURL(feedUrl);
        const feedName = feed.title || feedUrl;
        const recent = (feed.items || []).slice(0, 5); // 5 mais recentes de cada

        for (const item of recent) {
          if (item.title && item.link) {
            articles.push({
              title: item.title,
              link: item.link,
              pubDate: item.pubDate || item.isoDate || "",
              contentSnippet: (item.contentSnippet || item.content || "").slice(0, 300),
              source: feedName,
            });
          }
        }
      } catch (err) {
        console.warn(`⚠️ Falha ao buscar feed: ${feedUrl}`, err);
      }
    });

    await Promise.all(feedPromises);

    console.log(`📰 ${articles.length} artigos coletados de ${AI_RSS_FEEDS.length} feeds`);

    if (articles.length === 0) {
      throw new Error("Nenhum artigo encontrado nos feeds RSS. Verifique a conectividade.");
    }

    // 2. Filtrar artigos dos últimos 3 dias
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recentArticles = articles
      .filter((a) => {
        if (!a.pubDate) return true; // incluir se sem data
        return new Date(a.pubDate) >= threeDaysAgo;
      })
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    const articlesToAnalyze = recentArticles.slice(0, 20); // top 20 mais recentes

    // 3. Usar GPT-4o para selecionar o melhor tema e extrair fatos
    const openai = new OpenAI({ apiKey: openaiKey });

    const articleList = articlesToAnalyze
      .map(
        (a, i) =>
          `[${i + 1}] ${a.title}\nFonte: ${a.source}\nData: ${a.pubDate}\nResumo: ${a.contentSnippet}\nLink: ${a.link}`
      )
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `Você é um curador de conteúdo especializado em Inteligência Artificial para o perfil @arkhedigitall no Instagram.
O perfil fala sobre ferramentas de IA, comparativos, novidades do mercado e conteúdo educativo.

Sua tarefa: analisar os artigos abaixo e selecionar O MELHOR tema para um carrossel educativo do Instagram (7-10 slides).

Critérios de seleção:
- Relevância: notícia impactante ou tendência importante no mundo da IA
- Educativo: pode ser explicado de forma didática para público geral
- Engajamento: tema que gera curiosidade e compartilhamento
- Atualidade: preferir temas dos últimos 1-2 dias

IMPORTANTE: TUDO deve ser em Português do Brasil. Nunca use inglês nos campos de texto.

Responda em JSON com esta estrutura exata:
{
  "topic": "Tema resumido em poucas palavras",
  "headline": "Título chamativo para o carrossel (max 60 caracteres)",
  "summary": "Resumo de 3-4 frases explicando o tema de forma simples",
  "keyFacts": ["Fato 1", "Fato 2", "Fato 3", "Fato 4", "Fato 5"],
  "sourceIndices": [1, 3, 5],
  "angle": "Ângulo editorial: educativo | novidade | comparativo | tutorial | opinião"
}`,
        },
        {
          role: "user",
          content: `Artigos recentes sobre IA:\n\n${articleList}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    // Mapear sourceIndices para as fontes reais
    const sources = (result.sourceIndices || []).map((idx: number) => {
      const article = articlesToAnalyze[idx - 1];
      return article
        ? { title: article.title, url: article.link }
        : { title: "Fonte", url: "" };
    });

    const output: ResearchOutput = {
      topic: result.topic,
      headline: result.headline,
      summary: result.summary,
      keyFacts: result.keyFacts || [],
      sources,
      angle: result.angle || "novidade",
    };

    console.log(`✅ Tema selecionado: "${output.topic}" (${output.angle})`);
    console.log(`📝 Headline: ${output.headline}`);
    console.log(`🔗 ${output.sources.length} fontes utilizadas`);

    return output;
  },
});
