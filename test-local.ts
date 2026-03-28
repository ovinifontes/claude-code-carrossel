/**
 * Teste local standalone — roda o pipeline completo SEM o Trigger.dev runtime
 * Importa as funções de cada agente e executa sequencialmente
 */
import "dotenv/config";
import OpenAI from "openai";
import Parser from "rss-parser";
import puppeteer from "puppeteer-core";
import * as fs from "fs";
import * as path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
} from "docx";

// ════════════════════════════════════════
// Config
// ════════════════════════════════════════
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const INSTAGRAM_HANDLE = process.env.INSTAGRAM_HANDLE || "@arkhedigitall";

if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set in .env");
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set in .env");

const BRAND = {
  arkheBlue: "#045C90",
  cyan: "#24D1E7",
  energyOrange: "#F58118",
  darkBg: "#0B1622",
  darkBg2: "#111D2E",
  white: "#FFFFFF",
  lightGray: "#B8C5D3",
  width: 1080,
  height: 1350,
};

const AI_RSS_FEEDS = [
  "https://techcrunch.com/category/artificial-intelligence/feed/",
  "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
  "https://blog.google/technology/ai/rss/",
  "https://openai.com/blog/rss.xml",
  "https://huggingface.co/blog/feed.xml",
  "https://www.technologyreview.com/topic/artificial-intelligence/feed",
  "https://venturebeat.com/category/ai/feed/",
];

// ════════════════════════════════════════
// PASSO 1: PESQUISA
// ════════════════════════════════════════
async function research() {
  console.log("\n━━━ PASSO 1/5: Pesquisa ━━━");
  const parser = new Parser({ timeout: 10000 });

  interface Article {
    title: string;
    link: string;
    pubDate: string;
    snippet: string;
    source: string;
  }

  const articles: Article[] = [];

  const feedPromises = AI_RSS_FEEDS.map(async (feedUrl) => {
    try {
      const feed = await parser.parseURL(feedUrl);
      const feedName = feed.title || feedUrl;
      for (const item of (feed.items || []).slice(0, 5)) {
        if (item.title && item.link) {
          articles.push({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate || item.isoDate || "",
            snippet: (item.contentSnippet || item.content || "").slice(0, 300),
            source: feedName,
          });
        }
      }
    } catch {
      console.warn(`⚠️ Falha no feed: ${feedUrl}`);
    }
  });
  await Promise.all(feedPromises);
  console.log(`📰 ${articles.length} artigos coletados`);

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const recent = articles
    .filter((a) => !a.pubDate || new Date(a.pubDate) >= threeDaysAgo)
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 20);

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const articleList = recent
    .map((a, i) => `[${i + 1}] ${a.title}\nFonte: ${a.source}\nData: ${a.pubDate}\nResumo: ${a.snippet}\nLink: ${a.link}`)
    .join("\n\n");

  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: `Você é um curador de conteúdo sobre IA para o perfil ${INSTAGRAM_HANDLE} no Instagram.
Analise os artigos e selecione O MELHOR tema para um carrossel educativo (7-10 slides).
Critérios: relevância, potencial educativo, engajamento, atualidade.
IMPORTANTE: TUDO deve ser em Português do Brasil. Nunca use inglês.
Responda em JSON:
{
  "topic": "Tema resumido",
  "headline": "Título chamativo (max 60 chars)",
  "summary": "Resumo de 3-4 frases",
  "keyFacts": ["Fato 1","Fato 2","Fato 3","Fato 4","Fato 5"],
  "sourceIndices": [1,3,5],
  "angle": "educativo|novidade|comparativo|tutorial"
}`,
      },
      { role: "user", content: `Artigos:\n\n${articleList}` },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(resp.choices[0].message.content || "{}");
  const sources = (result.sourceIndices || []).map((idx: number) => {
    const a = recent[idx - 1];
    return a ? { title: a.title, url: a.link } : { title: "Fonte", url: "" };
  });

  console.log(`✅ Tema: "${result.topic}" (${result.angle})`);
  return { topic: result.topic, headline: result.headline, summary: result.summary, keyFacts: result.keyFacts || [], sources, angle: result.angle };
}

// ════════════════════════════════════════
// PASSO 2: ROTEIRIZAÇÃO
// ════════════════════════════════════════
interface SlideContent {
  slideNumber: number;
  type: "capa" | "conteudo" | "cta";
  title: string;
  body: string;
  emoji?: string;
}

async function writeContent(researchData: any) {
  console.log("\n━━━ PASSO 2/5: Roteirização ━━━");
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content: `Você é copywriter expert de Instagram sobre IA para ${INSTAGRAM_HANDLE} (ArkheDigital).
Crie o roteiro de um carrossel educativo (7-10 slides).

Regras:
- PT-BR, tom profissional mas acessível
- Cada slide: max 40 palavras no body
- Títulos: max 6 palavras
- Emojis: 1 por slide max

Estrutura:
- Slide 1 (capa): título chamativo + frase provocativa
- Slides 2-3: contexto
- Slides 4-6: detalhes/dados
- Slides 7-8: impacto prático
- Slide final (cta): CTA para seguir ${INSTAGRAM_HANDLE}

Responda em JSON:
{
  "slides": [{"slideNumber":1,"type":"capa","title":"...","body":"...","emoji":"🤖"},...],
  "caption": "Legenda completa...",
  "hashtags": ["#IA","#Tech"]
}`,
      },
      {
        role: "user",
        content: `TEMA: ${researchData.topic}\nHEADLINE: ${researchData.headline}\nRESUMO: ${researchData.summary}\nFATOS:\n${researchData.keyFacts.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")}\nÂNGULO: ${researchData.angle}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(resp.choices[0].message.content || "{}");

  // Normalizar slides — GPT pode retornar campos com nomes variados
  const normalizedSlides: SlideContent[] = (result.slides || []).map((s: any, idx: number) => ({
    slideNumber: s.slideNumber ?? s.slide_number ?? idx + 1,
    type: s.type || (idx === 0 ? "capa" : idx === (result.slides.length - 1) ? "cta" : "conteudo"),
    title: s.title || s.titulo || "",
    body: s.body || s.texto || s.content || "",
    emoji: s.emoji || undefined,
  }));

  console.log(`✅ ${normalizedSlides.length} slides criados`);
  for (const s of normalizedSlides) {
    console.log(`   Slide ${s.slideNumber} [${s.type}]: "${s.title}" | "${(s.body || "").slice(0, 50)}..."`);
  }
  return { ...researchData, slides: normalizedSlides, caption: result.caption, hashtags: result.hashtags };
}

// ════════════════════════════════════════
// PASSO 3: REVISÃO
// ════════════════════════════════════════
async function review(content: any) {
  console.log("\n━━━ PASSO 3/5: Revisão ━━━");
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const slidesText = content.slides
    .map((s: SlideContent) => `Slide ${s.slideNumber} (${s.type}): ${s.emoji || ""} ${s.title}\n${s.body}`)
    .join("\n\n");

  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `Você é editor sênior de conteúdo de Instagram sobre IA.
Revise: precisão, clareza, engajamento, PT-BR correto, max 40 palavras/slide, fluxo lógico, CTA claro.

IMPORTANTE: Retorne o JSON com EXATAMENTE esta estrutura (mesmos nomes de campos):
{
  "approved": true,
  "feedback": "motivo da aprovação ou correções aplicadas",
  "slides": [
    {"slideNumber": 1, "type": "capa", "title": "Título", "body": "Texto do slide", "emoji": "🤖"},
    {"slideNumber": 2, "type": "conteudo", "title": "Título", "body": "Texto do slide", "emoji": "📊"}
  ],
  "caption": "legenda completa...",
  "hashtags": ["#IA", "#Tech"]
}`,
      },
      { role: "user", content: `TEMA: ${content.topic}\n\nSLIDES:\n${slidesText}\n\nCAPTION:\n${content.caption}\n\nHASHTAGS: ${content.hashtags.join(" ")}` },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(resp.choices[0].message.content || "{}");
  console.log(`${result.approved ? "✅ Aprovado" : "🔄 Ajustado"}: ${result.feedback}`);

  // Normalizar slides da revisão
  const rawSlides = result.slides || content.slides;
  const reviewedSlides: SlideContent[] = rawSlides.map((s: any, idx: number) => ({
    slideNumber: s.slideNumber ?? s.slide_number ?? idx + 1,
    type: s.type || (idx === 0 ? "capa" : idx === (rawSlides.length - 1) ? "cta" : "conteudo"),
    title: s.title || s.titulo || "Sem título",
    body: s.body || s.texto || s.description || "Sem conteúdo",
    emoji: s.emoji || undefined,
  }));

  // Debug: verificar que os slides têm conteúdo
  for (const s of reviewedSlides) {
    console.log(`   Slide ${s.slideNumber}: "${s.title}" | "${(s.body || "").slice(0, 40)}..."`);
  }

  return {
    ...content,
    slides: reviewedSlides,
    caption: result.caption || content.caption,
    hashtags: result.hashtags || content.hashtags,
  };
}

// ════════════════════════════════════════
// PASSO 4: GERAÇÃO DE IMAGENS
// ════════════════════════════════════════
function findChromePath(): string {
  const paths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Chrome não encontrado!");
}

function buildSlideHTML(slide: SlideContent): string {
  const isCover = slide.type === "capa";
  const isCTA = slide.type === "cta";
  const titleSize = isCover ? "52px" : isCTA ? "44px" : "38px";
  const bodySize = isCover ? "24px" : "22px";

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${BRAND.width}px;height:${BRAND.height}px;font-family:'Sora',sans-serif;background:linear-gradient(160deg,${BRAND.darkBg} 0%,${BRAND.darkBg2} 50%,${BRAND.darkBg} 100%);color:${BRAND.white};overflow:hidden;position:relative}
.glow-top{position:absolute;top:-100px;right:-100px;width:400px;height:400px;background:radial-gradient(circle,${BRAND.cyan}22 0%,transparent 70%);border-radius:50%}
.glow-bottom{position:absolute;bottom:-150px;left:-100px;width:500px;height:500px;background:radial-gradient(circle,${BRAND.arkheBlue}22 0%,transparent 70%);border-radius:50%}
.side-line{position:absolute;left:60px;top:180px;bottom:200px;width:3px;background:linear-gradient(to bottom,${BRAND.cyan},${BRAND.arkheBlue},transparent);border-radius:2px}
.content{position:relative;z-index:2;padding:${isCover?"120px 80px 80px":isCTA?"100px 80px 80px":"100px 80px 80px 100px"};height:100%;display:flex;flex-direction:column;justify-content:${isCover?"center":isCTA?"center":"flex-start"}}
.slide-number{font-size:14px;font-weight:600;color:${BRAND.cyan};letter-spacing:3px;text-transform:uppercase;margin-bottom:20px}
.emoji{font-size:48px;margin-bottom:24px}
h1{font-size:${titleSize};font-weight:700;line-height:1.2;margin-bottom:32px;background:linear-gradient(135deg,${BRAND.white} 0%,${BRAND.cyan} 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.body-text{font-size:${bodySize};font-weight:400;line-height:1.7;color:${BRAND.lightGray};max-width:850px}
.accent-bar{width:60px;height:4px;background:linear-gradient(to right,${BRAND.cyan},${BRAND.energyOrange});border-radius:2px;margin-bottom:32px}
.cta-handle{font-size:36px;font-weight:700;color:${BRAND.cyan};margin-top:24px}
.cta-actions{display:flex;gap:24px;margin-top:40px}
.cta-action{display:flex;align-items:center;gap:10px;font-size:20px;color:${BRAND.lightGray};background:${BRAND.arkheBlue}33;padding:12px 24px;border-radius:12px;border:1px solid ${BRAND.cyan}33}
.footer{position:absolute;bottom:50px;left:80px;right:80px;display:flex;align-items:center;justify-content:space-between;z-index:2}
.footer-brand{display:flex;align-items:center;gap:12px}
.footer-logo{width:36px;height:36px;background:linear-gradient(135deg,${BRAND.cyan},${BRAND.arkheBlue});border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px}
.footer-name{font-size:16px;font-weight:600;color:${BRAND.lightGray}}
.footer-page{font-size:14px;color:${BRAND.lightGray}88}
</style></head><body>
<div class="glow-top"></div><div class="glow-bottom"></div>
${!isCover && !isCTA ? '<div class="side-line"></div>' : ""}
<div class="content">
${!isCover && !isCTA ? `<div class="slide-number">ARKHEDIGITAL • SLIDE ${slide.slideNumber}</div>` : ""}
${slide.emoji ? `<div class="emoji">${slide.emoji}</div>` : ""}
${!isCTA ? '<div class="accent-bar"></div>' : ""}
<h1>${slide.title}</h1>
${isCTA ? `<p class="body-text">${slide.body}</p><div class="cta-handle">${INSTAGRAM_HANDLE}</div><div class="cta-actions"><div class="cta-action">💾 Salvar</div><div class="cta-action">🔄 Compartilhar</div><div class="cta-action">❤️ Curtir</div></div>` : `<p class="body-text">${slide.body}</p>`}
</div>
<div class="footer"><div class="footer-brand"><div class="footer-logo">A</div><span class="footer-name">ArkheDigital</span></div><span class="footer-page">${slide.slideNumber}</span></div>
</body></html>`;
}

function buildCoverHTML(slide: SlideContent, coverBase64: string | null): string {
  const bgStyle = coverBase64
    ? `background-image:url(data:image/png;base64,${coverBase64});background-size:cover;background-position:center;`
    : `background:linear-gradient(160deg,${BRAND.darkBg} 0%,${BRAND.arkheBlue}44 40%,${BRAND.darkBg} 100%);`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${BRAND.width}px;height:${BRAND.height}px;font-family:'Sora',sans-serif;${bgStyle}color:${BRAND.white};overflow:hidden;position:relative}
.overlay{position:absolute;inset:0;background:linear-gradient(to bottom,${BRAND.darkBg}88 0%,${BRAND.darkBg}44 30%,${BRAND.darkBg}99 70%,${BRAND.darkBg}EE 100%)}
.content{position:relative;z-index:2;padding:100px 80px;height:100%;display:flex;flex-direction:column;justify-content:flex-end}
.tag{font-size:16px;font-weight:600;color:${BRAND.cyan};letter-spacing:4px;text-transform:uppercase;margin-bottom:24px}
h1{font-size:56px;font-weight:800;line-height:1.15;margin-bottom:24px;text-shadow:0 2px 20px ${BRAND.darkBg}88}
.subtitle{font-size:22px;font-weight:400;color:${BRAND.lightGray};line-height:1.6;max-width:800px;text-shadow:0 1px 10px ${BRAND.darkBg}88}
.swipe{margin-top:48px;display:flex;align-items:center;gap:12px;font-size:18px;color:${BRAND.cyan};font-weight:600}
.header{position:absolute;top:50px;left:80px;right:80px;display:flex;align-items:center;gap:12px;z-index:2}
.logo-mark{width:44px;height:44px;background:linear-gradient(135deg,${BRAND.cyan},${BRAND.arkheBlue});border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px}
.brand-name{font-size:20px;font-weight:600}
</style></head><body>
<div class="overlay"></div>
<div class="header"><div class="logo-mark">A</div><span class="brand-name">ArkheDigital</span></div>
<div class="content">
<div class="tag">Inteligência Artificial</div>
<h1>${slide.title}</h1>
<p class="subtitle">${slide.body}</p>
<div class="swipe">Deslize para saber mais <span>→</span></div>
</div>
</body></html>`;
}

async function generateImages(content: any) {
  console.log("\n━━━ PASSO 4/5: Geração de Imagens ━━━");
  const chromePath = findChromePath();
  const slides: SlideContent[] = content.slides;
  const images: { slideNumber: number; buffer: Buffer; filename: string }[] = [];

  for (const slide of slides) {
    const filename = `${String(slide.slideNumber).padStart(2, "0")}-${slide.type === "capa" ? "capa" : slide.type === "cta" ? "cta" : "slide"}.png`;

    let html: string;
    if (slide.type === "capa") {
      // Tentar gerar imagem com Gemini
      let coverBase64: string | null = null;
      try {
        console.log("🤖 Gerando capa com Gemini...");
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Create a stunning dark futuristic cover image about AI technology. Topic: "${content.topic}". Dark navy background (#0B1622), abstract geometric shapes, glowing cyan (#24D1E7) and blue (#045C90) accents, neural network patterns. NO TEXT in the image. Portrait orientation. Editorial quality.` }] }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
          }
        );
        if (geminiResp.ok) {
          const gData: any = await geminiResp.json();
          const imgPart = gData.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
          if (imgPart) {
            coverBase64 = imgPart.inlineData.data;
            console.log("✅ Capa Gemini gerada com sucesso!");
          } else {
            console.warn("⚠️ Gemini respondeu mas sem imagem, usando fallback HTML");
          }
        } else {
          const errText = await geminiResp.text();
          console.warn(`⚠️ Gemini HTTP ${geminiResp.status}: ${errText.slice(0, 200)}`);
        }
      } catch (err: any) {
        console.warn(`⚠️ Gemini falhou: ${err.message}, usando capa HTML pura`);
      }
      html = buildCoverHTML(slide, coverBase64);
    } else {
      html = buildSlideHTML(slide);
    }

    // Renderizar HTML → PNG
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: BRAND.width, height: BRAND.height });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });
    await page.evaluate(() => (document as any).fonts.ready);
    const screenshot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: BRAND.width, height: BRAND.height },
    });
    await browser.close();

    images.push({ slideNumber: slide.slideNumber, buffer: Buffer.from(screenshot), filename });
    console.log(`📸 Slide ${slide.slideNumber}/${slides.length} renderizado`);
  }

  console.log(`✅ ${images.length} imagens geradas`);
  return images;
}

// ════════════════════════════════════════
// PASSO 5: SALVAR OUTPUT
// ════════════════════════════════════════
async function saveOutput(content: any, images: any[]) {
  console.log("\n━━━ PASSO 5/5: Salvando Output ━━━");
  const dateStr = new Date().toISOString().slice(0, 10);
  const topicSlug = content.topic
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40);

  const outputDir = path.resolve("output", "carrosseis", `${dateStr}-${topicSlug}`);
  fs.mkdirSync(outputDir, { recursive: true });

  for (const img of images) {
    fs.writeFileSync(path.join(outputDir, img.filename), img.buffer);
    console.log(`📸 Salvo: ${img.filename}`);
  }

  // DOCX
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: `Carrossel: ${content.headline}`, heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
        new Paragraph({ children: [new TextRun({ text: `Data: ${new Date().toLocaleDateString("pt-BR")}`, italics: true, color: "666666" })], spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: `Tema: ${content.topic}`, bold: true })], spacing: { after: 400 } }),
        new Paragraph({ border: { bottom: { color: "24D1E7", space: 1, style: BorderStyle.SINGLE, size: 6 } }, spacing: { after: 400 } }),
        new Paragraph({ text: "LEGENDA DO POST", heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
        ...content.caption.split("\n").map((line: string) => new Paragraph({ text: line, spacing: { after: 120 } })),
        new Paragraph({ spacing: { after: 300 } }),
        new Paragraph({ text: "HASHTAGS", heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
        new Paragraph({ text: content.hashtags.join(" "), spacing: { after: 400 } }),
        new Paragraph({ border: { bottom: { color: "24D1E7", space: 1, style: BorderStyle.SINGLE, size: 6 } }, spacing: { after: 400 } }),
        new Paragraph({ text: "DICAS DE PUBLICAÇÃO", heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: "Melhor horário: ", bold: true }), new TextRun({ text: "Entre 11h-13h ou 18h-20h" })], spacing: { after: 120 } }),
        new Paragraph({ children: [new TextRun({ text: "Formato: ", bold: true }), new TextRun({ text: `Carrossel com ${images.length} slides (1080x1350px)` })], spacing: { after: 400 } }),
        new Paragraph({ border: { bottom: { color: "24D1E7", space: 1, style: BorderStyle.SINGLE, size: 6 } }, spacing: { after: 400 } }),
        new Paragraph({ text: "FONTES", heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
        ...(content.sources || []).map((s: any) => new Paragraph({ children: [new TextRun({ text: `• ${s.title}` }), new TextRun({ text: s.url ? ` — ${s.url}` : "", color: "045C90" })], spacing: { after: 80 } })),
        new Paragraph({ spacing: { after: 400 } }),
        new Paragraph({ text: "ROTEIRO DOS SLIDES", heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
        ...content.slides.flatMap((s: SlideContent) => [
          new Paragraph({ children: [new TextRun({ text: `Slide ${s.slideNumber} — ${s.title}`, bold: true, color: "045C90" })], spacing: { before: 200, after: 80 } }),
          new Paragraph({ text: s.body, spacing: { after: 160 } }),
        ]),
      ],
    }],
  });

  const docxBuffer = await Packer.toBuffer(doc);
  const docxPath = path.join(outputDir, "legenda.docx");
  fs.writeFileSync(docxPath, docxBuffer);

  console.log(`📄 DOCX salvo: legenda.docx`);
  console.log(`\n🎉 ════════════════════════════════════════`);
  console.log(`   CARROSSEL PRONTO!`);
  console.log(`   Tema: ${content.topic}`);
  console.log(`   Slides: ${images.length}`);
  console.log(`   Pasta: ${outputDir}`);
  console.log(`   ════════════════════════════════════════\n`);

  return outputDir;
}

// ════════════════════════════════════════
// MAIN
// ════════════════════════════════════════
async function main() {
  const startTime = Date.now();
  console.log("🚀 TESTE COMPLETO — Pipeline do Carrossel Automático");
  console.log(`📅 ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}\n`);

  const researchData = await research();
  let content = await writeContent(researchData);
  content = await review(content);
  const images = await generateImages(content);
  const outputDir = await saveOutput(content, images);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`⏱️ Tempo total: ${elapsed}s`);
  console.log(`📂 Abra a pasta: open "${outputDir}"`);
}

main().catch((err) => {
  console.error("❌ ERRO:", err);
  process.exit(1);
});
