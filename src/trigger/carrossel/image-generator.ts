import { task } from "@trigger.dev/sdk";
import puppeteer from "puppeteer-core";
import * as fs from "fs";
import * as path from "path";
import type { SlideContent } from "./content-writer.js";

// Brand ArkheDigital
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

export interface ImageOutput {
  images: { slideNumber: number; base64: string; filename: string }[];
}

// Encontra o Chrome instalado no sistema
function findChromePath(): string {
  const paths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    "Chrome não encontrado. Instale o Google Chrome ou defina CHROME_PATH no .env"
  );
}

// Gera imagem de capa usando Gemini (NanoBanana Pro)
async function generateCoverWithGemini(
  topic: string,
  headline: string
): Promise<Buffer> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("GEMINI_API_KEY is not set");

  const prompt = `Create a museum-quality cover image for an Instagram carousel about AI technology.
Topic: "${topic}"
Title: "${headline}"

DESIGN PHILOSOPHY — "Geometric Silence meets Chromatic Language":
This image must look meticulously crafted, as if someone at the absolute top of their field labored over every detail with painstaking care. The composition should feel like an artifact from an imaginary discipline — treating AI with the reverence of scientific observation.

VISUAL REQUIREMENTS:
- Dark navy/deep blue background (#0B1622) with subtle depth gradients
- Futuristic, tech-forward aesthetic with Swiss formalism precision
- Abstract geometric shapes: neural network patterns, grid-based precision, organic clustering
- Glowing accents in cyan (#24D1E7) and blue (#045C90) with radial glow effects
- Dramatic negative space — let the composition breathe
- Dense accumulation of repeating elements that build meaning through patient repetition
- Color zones that create meaning: cyan for innovation, blue for trust, subtle orange (#F58118) sparks for energy
- Every element placed with the precision of a master craftsman
- NO TEXT in the image — text will be overlaid later
- 1080x1350 portrait format
- Editorial grade, museum quality — not AI-generic, but deeply intentional`;

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
    throw new Error(`Gemini API error: ${response.status} - ${err}`);
  }

  const data: any = await response.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData
  );

  if (!imagePart) {
    console.warn("⚠️ Gemini não retornou imagem, usando capa HTML como fallback");
    return Buffer.alloc(0); // fallback para HTML
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}

// Gera HTML para um slide de conteúdo (hierarquia visual baseada nas regras de carousel design)
function buildSlideHTML(slide: SlideContent, instagramHandle: string, totalSlides: number): string {
  const isCTA = slide.type === "cta";

  // Número do slide formatado com zero à esquerda (01, 02, etc.)
  const slideNum = String(slide.slideNumber).padStart(2, "0");

  if (isCTA) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${BRAND.width}px;
      height: ${BRAND.height}px;
      font-family: 'Sora', sans-serif;
      background: linear-gradient(160deg, ${BRAND.darkBg} 0%, ${BRAND.arkheBlue}33 50%, ${BRAND.darkBg} 100%);
      color: ${BRAND.white};
      overflow: hidden;
      position: relative;
    }
    .glow-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, ${BRAND.cyan}18 0%, transparent 70%);
      border-radius: 50%;
    }
    .content {
      position: relative;
      z-index: 2;
      padding: 80px;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    h1 {
      font-size: 52px;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 24px;
      background: linear-gradient(135deg, ${BRAND.white} 0%, ${BRAND.cyan} 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .body-text {
      font-size: 26px;
      font-weight: 400;
      line-height: 1.6;
      color: ${BRAND.lightGray};
      max-width: 800px;
      margin-bottom: 32px;
    }
    .cta-handle {
      font-size: 40px;
      font-weight: 800;
      color: ${BRAND.cyan};
      margin-bottom: 40px;
    }
    .cta-actions {
      display: flex;
      gap: 20px;
    }
    .cta-action {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 22px;
      font-weight: 600;
      color: ${BRAND.white};
      background: ${BRAND.arkheBlue}44;
      padding: 16px 28px;
      border-radius: 16px;
      border: 1px solid ${BRAND.cyan}44;
    }
    .footer {
      position: absolute;
      bottom: 50px;
      left: 80px;
      right: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      z-index: 2;
    }
    .footer-logo {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, ${BRAND.cyan}, ${BRAND.arkheBlue});
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
    }
    .footer-name {
      font-size: 16px;
      font-weight: 600;
      color: ${BRAND.lightGray};
    }
  </style>
</head>
<body>
  <div class="glow-center"></div>
  <div class="content">
    <h1>${slide.title}</h1>
    <p class="body-text">${slide.body}</p>
    <div class="cta-handle">${instagramHandle}</div>
    <div class="cta-actions">
      <div class="cta-action">💾 Salvar</div>
      <div class="cta-action">🔄 Compartilhar</div>
      <div class="cta-action">❤️ Curtir</div>
    </div>
  </div>
  <div class="footer">
    <div class="footer-logo">A</div>
    <span class="footer-name">ArkheDigital</span>
  </div>
</body>
</html>`;
  }

  // Slide de conteúdo com hierarquia visual forte
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${BRAND.width}px;
      height: ${BRAND.height}px;
      font-family: 'Sora', sans-serif;
      background: linear-gradient(160deg, ${BRAND.darkBg} 0%, ${BRAND.darkBg2} 50%, ${BRAND.darkBg} 100%);
      color: ${BRAND.white};
      overflow: hidden;
      position: relative;
    }

    /* Glow decorativo */
    .glow-top {
      position: absolute;
      top: -120px;
      right: -80px;
      width: 450px;
      height: 450px;
      background: radial-gradient(circle, ${BRAND.cyan}15 0%, transparent 70%);
      border-radius: 50%;
    }
    .glow-bottom {
      position: absolute;
      bottom: -150px;
      left: -100px;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, ${BRAND.arkheBlue}15 0%, transparent 70%);
      border-radius: 50%;
    }

    /* Conteúdo principal */
    .content {
      position: relative;
      z-index: 2;
      padding: 80px 80px 120px 80px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    /* Número grande do slide — hierarquia visual nível 1 */
    .slide-number {
      font-size: 108px;
      font-weight: 900;
      color: ${BRAND.cyan};
      opacity: 0.25;
      line-height: 1;
      margin-bottom: 8px;
    }

    /* Barra de acento */
    .accent-bar {
      width: 60px;
      height: 4px;
      background: linear-gradient(to right, ${BRAND.cyan}, ${BRAND.energyOrange});
      border-radius: 2px;
      margin-bottom: 28px;
    }

    /* Título — hierarquia visual nível 2 */
    h1 {
      font-size: 52px;
      font-weight: 800;
      line-height: 1.15;
      margin-bottom: 28px;
      background: linear-gradient(135deg, ${BRAND.white} 0%, ${BRAND.cyan} 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Body text — hierarquia visual nível 3 */
    .body-text {
      font-size: 28px;
      font-weight: 400;
      line-height: 1.6;
      color: ${BRAND.lightGray};
      max-width: 900px;
    }

    /* Footer com logo e paginação */
    .footer {
      position: absolute;
      bottom: 50px;
      left: 80px;
      right: 80px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 2;
    }
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .footer-logo {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, ${BRAND.cyan}, ${BRAND.arkheBlue});
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
    }
    .footer-name {
      font-size: 16px;
      font-weight: 600;
      color: ${BRAND.lightGray};
    }
    .footer-page {
      font-size: 16px;
      font-weight: 600;
      color: ${BRAND.lightGray}88;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="glow-top"></div>
  <div class="glow-bottom"></div>

  <div class="content">
    <div class="slide-number">${slideNum}</div>
    <div class="accent-bar"></div>
    <h1>${slide.title}</h1>
    <p class="body-text">${slide.body}</p>
  </div>

  <div class="footer">
    <div class="footer-brand">
      <div class="footer-logo">A</div>
      <span class="footer-name">ArkheDigital</span>
    </div>
    <span class="footer-page">${slide.slideNumber} / ${totalSlides}</span>
  </div>
</body>
</html>`;
}

// Renderiza HTML para imagem PNG usando Puppeteer
async function renderHTMLtoPNG(html: string, chromePath: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: BRAND.width, height: BRAND.height });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });

    // Esperar fonts carregarem
    await page.evaluate(() => (globalThis as any).document.fonts.ready);

    const screenshot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: BRAND.width, height: BRAND.height },
    });

    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}

// Gera capa HTML (fallback quando Gemini falha ou para overlay de texto)
function buildCoverHTML(slide: SlideContent, coverImageBase64: string | null): string {
  const bgStyle = coverImageBase64
    ? `background-image: url(data:image/png;base64,${coverImageBase64}); background-size: cover; background-position: center;`
    : `background: linear-gradient(160deg, ${BRAND.darkBg} 0%, ${BRAND.arkheBlue}44 40%, ${BRAND.darkBg} 100%);`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${BRAND.width}px;
      height: ${BRAND.height}px;
      font-family: 'Sora', sans-serif;
      ${bgStyle}
      color: ${BRAND.white};
      overflow: hidden;
      position: relative;
    }
    .overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        ${BRAND.darkBg}88 0%,
        ${BRAND.darkBg}44 30%,
        ${BRAND.darkBg}99 70%,
        ${BRAND.darkBg}EE 100%
      );
    }
    .content {
      position: relative;
      z-index: 2;
      padding: 100px 80px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    .tag {
      font-size: 16px;
      font-weight: 600;
      color: ${BRAND.cyan};
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 56px;
      font-weight: 800;
      line-height: 1.15;
      margin-bottom: 24px;
      text-shadow: 0 2px 20px ${BRAND.darkBg}88;
    }
    .subtitle {
      font-size: 22px;
      font-weight: 400;
      color: ${BRAND.lightGray};
      line-height: 1.6;
      max-width: 800px;
      text-shadow: 0 1px 10px ${BRAND.darkBg}88;
    }
    .swipe {
      margin-top: 48px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      color: ${BRAND.cyan};
      font-weight: 600;
    }
    .swipe-arrow {
      font-size: 24px;
      animation: none;
    }
    .footer {
      position: absolute;
      top: 50px;
      left: 80px;
      right: 80px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 2;
    }
    .logo-mark {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, ${BRAND.cyan}, ${BRAND.arkheBlue});
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 22px;
    }
    .brand-name {
      font-size: 20px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="overlay"></div>
  <div class="footer">
    <div class="logo-mark">A</div>
    <span class="brand-name">ArkheDigital</span>
  </div>
  <div class="content">
    <div class="tag">Inteligência Artificial</div>
    <h1>${slide.title}</h1>
    <p class="subtitle">${slide.body}</p>
    <div class="swipe">
      Deslize para saber mais <span class="swipe-arrow">→</span>
    </div>
  </div>
</body>
</html>`;
}

export const imageGeneratorTask = task({
  id: "carrossel-image-generator",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    slides: SlideContent[];
    topic: string;
    headline: string;
  }): Promise<ImageOutput> => {
    const instagramHandle = process.env.INSTAGRAM_HANDLE || "@arkhedigitall";
    const chromePath = process.env.CHROME_PATH || findChromePath();

    const { slides, topic, headline } = payload;
    console.log(`🎨 Gerando ${slides.length} imagens para: "${topic}"`);

    const images: ImageOutput["images"] = [];
    const dateStr = new Date().toISOString().slice(0, 10);
    const topicSlug = topic
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40);

    for (const slide of slides) {
      const filename = `${String(slide.slideNumber).padStart(2, "0")}-${slide.type === "capa" ? "capa" : slide.type === "cta" ? "cta" : "slide"}.png`;

      if (slide.type === "capa") {
        // Tentar gerar capa com Gemini, fallback para HTML puro
        let coverBase64: string | null = null;
        try {
          console.log("🤖 Gerando capa com Gemini (NanoBanana Pro)...");
          const coverBuffer = await generateCoverWithGemini(topic, headline);
          if (coverBuffer.length > 0) {
            coverBase64 = coverBuffer.toString("base64");
            console.log("✅ Capa Gemini gerada com sucesso");
          }
        } catch (err) {
          console.warn("⚠️ Gemini falhou, usando capa HTML:", err);
        }

        // Renderizar capa HTML (com ou sem background do Gemini)
        const coverHTML = buildCoverHTML(slide, coverBase64);
        const buffer = await renderHTMLtoPNG(coverHTML, chromePath);
        images.push({
          slideNumber: slide.slideNumber,
          base64: buffer.toString("base64"),
          filename,
        });
      } else {
        // Slides de conteúdo e CTA: HTML/CSS puro
        const html = buildSlideHTML(slide, instagramHandle, slides.length);
        const buffer = await renderHTMLtoPNG(html, chromePath);
        images.push({
          slideNumber: slide.slideNumber,
          base64: buffer.toString("base64"),
          filename,
        });
      }

      console.log(`📸 Slide ${slide.slideNumber}/${slides.length} renderizado`);
    }

    console.log(`✅ ${images.length} imagens geradas com sucesso`);
    return { images };
  },
});
