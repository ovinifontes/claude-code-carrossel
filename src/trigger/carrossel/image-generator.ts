import { task } from "@trigger.dev/sdk";
import puppeteer from "puppeteer";
import type { SlideContent } from "./content-writer.js";
import {
  COLORS,
  BRAND_GRADIENT,
  TYPOGRAPHY,
  LAYOUT,
  SLIDE_SEQUENCE,
  type BgMode,
  wrapSlideHTML,
  logoLockup,
  tagLabel,
  featureListItem,
  numberedStep,
  ctaButton,
  promptBox,
  getTextColors,
} from "./design-system.js";

export interface ImageOutput {
  images: { slideNumber: number; base64: string; filename: string }[];
}

// ═══════════════════════════════════════════════════
// Gemini Cover Art Generation
// ═══════════════════════════════════════════════════

async function generateCoverWithGemini(
  topic: string,
  headline: string,
  attempt = 1
): Promise<Buffer> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("GEMINI_API_KEY is not set");

  const prompt = `Create a museum-quality abstract art image for an Instagram carousel about AI technology.
Topic: "${topic}"
Title: "${headline}"

DESIGN PHILOSOPHY — "Geometric Silence meets Chromatic Language":
This image will be used as a SUBTLE BACKGROUND with a light overlay on top, so it must work when faded to ~15% opacity over a warm off-white (#F8F6F3) background.

VISUAL REQUIREMENTS:
- HIGH CONTRAST abstract geometric shapes and patterns
- Neural network patterns, grid-based precision, organic clustering
- Bold color zones: cyan (#24D1E7) for innovation, blue (#045C90) for trust, orange (#F58118) sparks for energy
- Dramatic compositions with strong visual anchors
- Dense accumulation of repeating elements
- Swiss formalism precision with futuristic aesthetic
- The image should be visually striking even when heavily faded
- NO TEXT in the image — text will be overlaid later
- 1080x1350 portrait format
- Editorial grade, museum quality`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    const maxAttempts = 4;
    if (response.status === 503 && attempt < maxAttempts) {
      const delayMs = attempt * 15_000; // 15s, 30s, 45s
      console.warn(
        `\u26a0\ufe0f Gemini 503 (tentativa ${attempt}/${maxAttempts}), aguardando ${delayMs / 1000}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return generateCoverWithGemini(topic, headline, attempt + 1);
    }
    throw new Error(`Gemini API error: ${response.status} - ${err}`);
  }

  const data: any = await response.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData
  );

  if (!imagePart) {
    console.warn(
      "\u26a0\ufe0f Gemini n\u00e3o retornou imagem, usando fallback HTML"
    );
    return Buffer.alloc(0);
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}

// ═══════════════════════════════════════════════════
// DALL-E 3 Fallback Cover Art Generation
// ═══════════════════════════════════════════════════

async function generateCoverWithDallE(
  topic: string,
  headline: string
): Promise<Buffer> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("OPENAI_API_KEY is not set");

  const prompt = `Museum-quality abstract art image for an Instagram carousel about AI technology.
Topic: "${topic}"
Title: "${headline}"

VISUAL REQUIREMENTS:
- HIGH CONTRAST abstract geometric shapes and patterns
- Neural network patterns, grid-based precision, organic clustering
- Bold color zones: cyan (#24D1E7) for innovation, blue (#045C90) for trust, orange (#F58118) sparks for energy
- Dramatic compositions with strong visual anchors
- Swiss formalism precision with futuristic aesthetic
- Will be used as a subtle faded background (~15% opacity) over warm off-white
- NO TEXT in the image
- Editorial grade, museum quality`;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1792",
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DALL-E API error: ${response.status} - ${err}`);
  }

  const data: any = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("DALL-E não retornou imagem");

  return Buffer.from(b64, "base64");
}

// ═══════════════════════════════════════════════════
// Slide Builders (one per type)
// ═══════════════════════════════════════════════════

function buildHeroContent(
  slide: SlideContent,
  coverImageBase64: string | null,
  logoBase64?: string
): string {
  const colors = getTextColors("light");

  const bgImage = coverImageBase64
    ? `<img src="data:image/png;base64,${coverImageBase64}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;" />
       <div style="position:absolute;inset:0;background:rgba(248,246,243,0.82);z-index:1;"></div>`
    : "";

  return `
    ${bgImage}
    <div style="position:relative;z-index:2;display:flex;flex-direction:column;height:100%;padding:${LAYOUT.PADDING_TOP}px ${LAYOUT.PADDING_H}px ${LAYOUT.PADDING_BOTTOM}px;">
      <div style="margin-bottom:auto;">
        ${logoLockup("light", logoBase64)}
      </div>
      <div style="margin-top:auto;">
        ${tagLabel("INTELIG\u00caNCIA ARTIFICIAL", "light")}
        <h1 style="font-family:${TYPOGRAPHY.HEADING_FONT};font-size:${TYPOGRAPHY.HEADING_SIZE};font-weight:${TYPOGRAPHY.HEADING_WEIGHT};line-height:${TYPOGRAPHY.HEADING_LINE_HEIGHT};letter-spacing:${TYPOGRAPHY.HEADING_LETTER_SPACING};color:${colors.heading};margin:20px 0 24px;">${slide.title}</h1>
        <p style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:${TYPOGRAPHY.BODY_SIZE};font-weight:${TYPOGRAPHY.BODY_WEIGHT};line-height:${TYPOGRAPHY.BODY_LINE_HEIGHT};color:${colors.body};max-width:900px;">${slide.body}</p>
      </div>
    </div>`;
}

function buildProblemContent(slide: SlideContent): string {
  const colors = getTextColors("dark");

  return `
    <div style="position:absolute;top:-120px;right:-80px;width:450px;height:450px;background:radial-gradient(circle,${COLORS.CYAN}12 0%,transparent 70%);border-radius:50%;z-index:0;"></div>
    <div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;height:100%;">
      ${tagLabel("O PROBLEMA", "dark")}
      <h1 style="font-family:${TYPOGRAPHY.HEADING_FONT};font-size:${TYPOGRAPHY.HEADING_SIZE};font-weight:${TYPOGRAPHY.HEADING_WEIGHT};line-height:${TYPOGRAPHY.HEADING_LINE_HEIGHT};letter-spacing:${TYPOGRAPHY.HEADING_LETTER_SPACING};color:${colors.heading};margin:20px 0 28px;">${slide.title}</h1>
      <p style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:${TYPOGRAPHY.BODY_SIZE};font-weight:${TYPOGRAPHY.BODY_WEIGHT};line-height:${TYPOGRAPHY.BODY_LINE_HEIGHT};color:${colors.body};max-width:900px;">${slide.body}</p>
    </div>`;
}

function buildExampleContent(slide: SlideContent): string {
  const colors = getTextColors("light");

  return `
    <div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;height:100%;">
      ${tagLabel("EXEMPLO", "light")}
      <h1 style="font-family:${TYPOGRAPHY.HEADING_FONT};font-size:${TYPOGRAPHY.HEADING_SIZE};font-weight:${TYPOGRAPHY.HEADING_WEIGHT};line-height:${TYPOGRAPHY.HEADING_LINE_HEIGHT};letter-spacing:${TYPOGRAPHY.HEADING_LETTER_SPACING};color:${colors.heading};margin:20px 0 28px;">${slide.title}</h1>
      <div style="padding:28px 32px;background:${COLORS.WHITE};border-radius:16px;border:1px solid ${COLORS.LIGHT_BORDER};margin-bottom:20px;">
        <p style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:${TYPOGRAPHY.BODY_SIZE};font-weight:${TYPOGRAPHY.BODY_WEIGHT};line-height:${TYPOGRAPHY.BODY_LINE_HEIGHT};color:${colors.body};">${slide.body}</p>
      </div>
    </div>`;
}

function buildSolutionContent(slide: SlideContent): string {
  const colors = getTextColors("gradient");

  const quoteBox = slide.quote
    ? `<div style="margin-top:28px;">${promptBox("Insight", slide.quote)}</div>`
    : "";

  return `
    <div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;height:100%;">
      ${tagLabel("A SOLU\u00c7\u00c3O", "gradient")}
      <h1 style="font-family:${TYPOGRAPHY.HEADING_FONT};font-size:${TYPOGRAPHY.HEADING_SIZE};font-weight:${TYPOGRAPHY.HEADING_WEIGHT};line-height:${TYPOGRAPHY.HEADING_LINE_HEIGHT};letter-spacing:${TYPOGRAPHY.HEADING_LETTER_SPACING};color:${colors.heading};margin:20px 0 28px;">${slide.title}</h1>
      <p style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:${TYPOGRAPHY.BODY_SIZE};font-weight:${TYPOGRAPHY.BODY_WEIGHT};line-height:${TYPOGRAPHY.BODY_LINE_HEIGHT};color:${colors.body};max-width:900px;">${slide.body}</p>
      ${quoteBox}
    </div>`;
}

function buildVisualContent(slide: SlideContent): string {
  const colors = getTextColors("dark");
  const desc = slide.visualDescription || slide.body;

  // Parse visual description into diagram elements
  const items = desc
    .split(/\u2192|→|->/)
    .map((s: string) => s.trim())
    .filter(Boolean);

  let diagramHTML = "";
  if (items.length >= 2) {
    // Render as a flow diagram
    const flowItems = items
      .map(
        (item: string, i: number) => `
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="padding:20px 28px;background:rgba(255,255,255,0.08);border-radius:14px;border:1px solid rgba(255,255,255,0.12);">
          <span style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:30px;font-weight:600;color:${COLORS.WHITE};">${item}</span>
        </div>
        ${i < items.length - 1 ? `<span style="font-size:36px;color:${COLORS.CYAN};">\u2192</span>` : ""}
      </div>`
      )
      .join("");

    diagramHTML = `<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:28px;">${flowItems}</div>`;
  } else {
    // Fallback: render description as styled text block
    diagramHTML = `<div style="padding:28px;background:rgba(255,255,255,0.06);border-radius:16px;border:1px solid rgba(255,255,255,0.1);margin-top:28px;">
      <p style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:${TYPOGRAPHY.BODY_SIZE};color:${colors.body};line-height:1.5;">${desc}</p>
    </div>`;
  }

  return `
    <div style="position:absolute;bottom:-150px;left:-100px;width:500px;height:500px;background:radial-gradient(circle,${COLORS.BRAND_PRIMARY}15 0%,transparent 70%);border-radius:50%;z-index:0;"></div>
    <div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;height:100%;">
      ${tagLabel("COMO FUNCIONA", "dark")}
      <h1 style="font-family:${TYPOGRAPHY.HEADING_FONT};font-size:68px;font-weight:${TYPOGRAPHY.HEADING_WEIGHT};line-height:${TYPOGRAPHY.HEADING_LINE_HEIGHT};letter-spacing:${TYPOGRAPHY.HEADING_LETTER_SPACING};color:${colors.heading};margin:20px 0 8px;">${slide.title}</h1>
      <p style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:${TYPOGRAPHY.BODY_SIZE};color:${colors.muted};margin-bottom:8px;">${slide.body}</p>
      ${diagramHTML}
    </div>`;
}

function buildValueContent(
  slide: SlideContent,
  mode: BgMode
): string {
  const colors = getTextColors(mode);

  let contentBlock = "";

  if (slide.features && slide.features.length > 0) {
    const featureItems = slide.features
      .map((f) => featureListItem(f.icon, f.label, f.description, mode))
      .join("");
    contentBlock = `<div style="margin-top:20px;">${featureItems}</div>`;
  } else if (slide.steps && slide.steps.length > 0) {
    const stepItems = slide.steps
      .map((s, i) => numberedStep(i + 1, s.title, s.description, mode))
      .join("");
    contentBlock = `<div style="margin-top:20px;">${stepItems}</div>`;
  } else {
    contentBlock = `<p style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:${TYPOGRAPHY.BODY_SIZE};font-weight:${TYPOGRAPHY.BODY_WEIGHT};line-height:${TYPOGRAPHY.BODY_LINE_HEIGHT};color:${colors.body};max-width:900px;">${slide.body}</p>`;
  }

  const tagText =
    slide.steps ? "PASSO A PASSO" : slide.features ? "RECURSOS" : "VALOR";

  // Add subtle glow on dark slides
  const glow =
    mode === "dark"
      ? `<div style="position:absolute;top:-120px;right:-80px;width:400px;height:400px;background:radial-gradient(circle,${COLORS.CYAN}10 0%,transparent 70%);border-radius:50%;z-index:0;"></div>`
      : "";

  return `
    ${glow}
    <div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;height:100%;">
      ${tagLabel(tagText, mode)}
      <h1 style="font-family:${TYPOGRAPHY.HEADING_FONT};font-size:68px;font-weight:${TYPOGRAPHY.HEADING_WEIGHT};line-height:${TYPOGRAPHY.HEADING_LINE_HEIGHT};letter-spacing:${TYPOGRAPHY.HEADING_LETTER_SPACING};color:${colors.heading};margin:20px 0 12px;">${slide.title}</h1>
      ${slide.features || slide.steps ? `<p style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:30px;color:${colors.muted};margin-bottom:8px;">${slide.body}</p>` : ""}
      ${contentBlock}
    </div>`;
}

function buildImpactContent(slide: SlideContent): string {
  const colors = getTextColors("dark");

  return `
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:600px;background:radial-gradient(circle,${COLORS.CYAN}10 0%,transparent 70%);border-radius:50%;z-index:0;"></div>
    <div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;height:100%;">
      ${tagLabel("IMPACTO", "dark")}
      <h1 style="font-family:${TYPOGRAPHY.HEADING_FONT};font-size:${TYPOGRAPHY.HEADING_SIZE};font-weight:${TYPOGRAPHY.HEADING_WEIGHT};line-height:${TYPOGRAPHY.HEADING_LINE_HEIGHT};letter-spacing:${TYPOGRAPHY.HEADING_LETTER_SPACING};color:${colors.heading};margin:20px 0 28px;">${slide.title}</h1>
      <p style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:${TYPOGRAPHY.BODY_SIZE};font-weight:${TYPOGRAPHY.BODY_WEIGHT};line-height:${TYPOGRAPHY.BODY_LINE_HEIGHT};color:${colors.body};max-width:900px;">${slide.body}</p>
    </div>`;
}

function buildCTAContent(
  slide: SlideContent,
  instagramHandle: string,
  logoBase64?: string
): string {
  return `
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:700px;background:radial-gradient(circle,rgba(255,255,255,0.08) 0%,transparent 70%);border-radius:50%;z-index:0;"></div>
    <div style="position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;">
      ${logoLockup("gradient", logoBase64)}
      <h1 style="font-family:${TYPOGRAPHY.HEADING_FONT};font-size:${TYPOGRAPHY.HEADING_SIZE};font-weight:${TYPOGRAPHY.HEADING_WEIGHT};line-height:${TYPOGRAPHY.HEADING_LINE_HEIGHT};letter-spacing:${TYPOGRAPHY.HEADING_LETTER_SPACING};color:${COLORS.WHITE};margin:48px 0 24px;">${slide.title}</h1>
      <p style="font-family:${TYPOGRAPHY.BODY_FONT};font-size:${TYPOGRAPHY.BODY_SIZE};color:rgba(255,255,255,0.9);margin-bottom:36px;max-width:800px;line-height:1.5;">${slide.body}</p>
      <div style="font-family:${TYPOGRAPHY.HEADING_FONT};font-size:44px;font-weight:800;color:${COLORS.CYAN};margin-bottom:44px;">${instagramHandle}</div>
      ${ctaButton("Seguir e Salvar")}
    </div>`;
}

// ═══════════════════════════════════════════════════
// Dispatcher: route slide to correct builder
// ═══════════════════════════════════════════════════

function buildSlideFullHTML(
  slide: SlideContent,
  slideIndex: number,
  totalSlides: number,
  instagramHandle: string,
  coverImageBase64: string | null,
  logoBase64?: string
): string {
  const config = SLIDE_SEQUENCE[slideIndex] || {
    type: slide.type,
    bgMode: "dark" as BgMode,
  };
  const mode = config.bgMode;
  const isLast = slideIndex === totalSlides - 1;

  let innerContent: string;

  switch (slide.type) {
    case "hero":
      innerContent = buildHeroContent(slide, coverImageBase64, logoBase64);
      // Hero has its own absolute positioning, bypass slide-content wrapper
      return wrapSlideHTML(innerContent, mode, slideIndex, totalSlides, isLast)
        .replace(
          '<div class="slide-content">',
          '<div class="slide-content" style="padding:0;">'
        );
    case "problem":
      innerContent = buildProblemContent(slide);
      break;
    case "example":
      innerContent = buildExampleContent(slide);
      break;
    case "solution":
      innerContent = buildSolutionContent(slide);
      break;
    case "visual":
      innerContent = buildVisualContent(slide);
      break;
    case "value":
      innerContent = buildValueContent(slide, mode);
      break;
    case "impact":
      innerContent = buildImpactContent(slide);
      break;
    case "cta":
      innerContent = buildCTAContent(slide, instagramHandle, logoBase64);
      break;
    default:
      // Fallback for any unrecognized type
      innerContent = buildValueContent(slide, mode);
      break;
  }

  return wrapSlideHTML(innerContent, mode, slideIndex, totalSlides, isLast);
}

// ═══════════════════════════════════════════════════
// Puppeteer Renderer
// ═══════════════════════════════════════════════════

async function renderHTMLtoPNG(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: LAYOUT.WIDTH,
      height: LAYOUT.HEIGHT,
    });
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for fonts to load
    await page.evaluate(
      () => (globalThis as any).document.fonts.ready
    );

    const screenshot = await page.screenshot({
      type: "png",
      clip: {
        x: 0,
        y: 0,
        width: LAYOUT.WIDTH,
        height: LAYOUT.HEIGHT,
      },
    });

    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}

// ═══════════════════════════════════════════════════
// Main Task
// ═══════════════════════════════════════════════════

export const imageGeneratorTask = task({
  id: "carrossel-image-generator",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    slides: SlideContent[];
    topic: string;
    headline: string;
  }): Promise<ImageOutput> => {
    const instagramHandle =
      process.env.INSTAGRAM_HANDLE || "@arkhedigitall";

    const { slides, topic, headline } = payload;
    const totalSlides = slides.length;
    console.log(
      `\ud83c\udfa8 Gerando ${totalSlides} imagens para: "${topic}"`
    );

    const images: ImageOutput["images"] = [];

    // Try to load logo as base64
    let logoBase64: string | undefined;
    try {
      const fs = await import("fs");
      const path = await import("path");
      const logoPath = path.resolve("imgs/logo_arkhedigital_maior.png");
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
        console.log("\u2705 Logo ArkheDigital carregada");
      }
    } catch {
      console.warn(
        "\u26a0\ufe0f Logo n\u00e3o encontrada, usando iniciais"
      );
    }

    // Generate cover art for hero slide (Gemini → DALL-E fallback)
    let coverImageBase64: string | null = null;
    try {
      console.log("\ud83e\udd16 Gerando arte de capa com Gemini...");
      const coverBuffer = await generateCoverWithGemini(topic, headline);
      if (coverBuffer.length > 0) {
        coverImageBase64 = coverBuffer.toString("base64");
        console.log("\u2705 Arte de capa Gemini gerada");
      }
    } catch (err) {
      console.warn("\u26a0\ufe0f Gemini falhou, tentando DALL-E 3...", err);
      try {
        const coverBuffer = await generateCoverWithDallE(topic, headline);
        coverImageBase64 = coverBuffer.toString("base64");
        console.log("\u2705 Arte de capa DALL-E 3 gerada");
      } catch (err2) {
        console.warn("\u26a0\ufe0f DALL-E tamb\u00e9m falhou, sem imagem de capa:", err2);
      }
    }

    // Render each slide
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const typeLabel =
        slide.type === "hero"
          ? "capa"
          : slide.type === "cta"
            ? "cta"
            : "slide";
      const filename = `${String(slide.slideNumber).padStart(2, "0")}-${typeLabel}.png`;

      const html = buildSlideFullHTML(
        slide,
        i,
        totalSlides,
        instagramHandle,
        slide.type === "hero" ? coverImageBase64 : null,
        logoBase64
      );

      const buffer = await renderHTMLtoPNG(html);
      images.push({
        slideNumber: slide.slideNumber,
        base64: buffer.toString("base64"),
        filename,
      });

      console.log(
        `\ud83d\udcf8 Slide ${slide.slideNumber}/${totalSlides} renderizado (${slide.type})`
      );
    }

    console.log(
      `\u2705 ${images.length} imagens geradas com sucesso`
    );
    return { images };
  },
});
