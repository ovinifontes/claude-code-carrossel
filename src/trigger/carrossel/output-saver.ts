import { task } from "@trigger.dev/sdk";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
} from "docx";
import type { ContentOutput } from "./content-writer.js";
import type { ImageOutput } from "./image-generator.js";

export interface OutputSaverResult {
  whatsappSent: boolean;
  imageCount: number;
  docxGenerated: boolean;
}

// ── WhatsApp via Evolution API ──
async function sendWhatsAppText(
  apiUrl: string,
  apiKey: string,
  instance: string,
  phone: string,
  text: string
): Promise<void> {
  const res = await fetch(`${apiUrl}/message/sendText/${instance}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({ number: phone, text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp text failed (${res.status}): ${err}`);
  }
}

async function sendWhatsAppImage(
  apiUrl: string,
  apiKey: string,
  instance: string,
  phone: string,
  base64: string,
  caption: string,
  fileName: string
): Promise<void> {
  const res = await fetch(`${apiUrl}/message/sendMedia/${instance}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: phone,
      mediatype: "image",
      media: base64,
      mimetype: "image/png",
      caption,
      fileName,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp image failed (${res.status}): ${err}`);
  }
}

async function sendWhatsAppDocument(
  apiUrl: string,
  apiKey: string,
  instance: string,
  phone: string,
  base64: string,
  fileName: string
): Promise<void> {
  const res = await fetch(`${apiUrl}/message/sendMedia/${instance}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: phone,
      mediatype: "document",
      media: base64,
      mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileName,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp document failed (${res.status}): ${err}`);
  }
}

// Pequena pausa entre mensagens para não ser bloqueado
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Gerar DOCX em memória ──
async function generateDocx(
  content: ContentOutput,
  images: ImageOutput
): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: `Carrossel: ${content.headline}`,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Data: ${new Date().toLocaleDateString("pt-BR")}`,
                italics: true,
                color: "666666",
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Tema: ${content.topic}`, bold: true })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            border: {
              bottom: { color: "24D1E7", space: 1, style: BorderStyle.SINGLE, size: 6 },
            },
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: "LEGENDA DO POST",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          }),
          ...content.caption.split("\n").map(
            (line) => new Paragraph({ text: line, spacing: { after: 120 } })
          ),
          new Paragraph({ spacing: { after: 300 } }),
          new Paragraph({
            text: "HASHTAGS",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: content.hashtags.join(" "),
            spacing: { after: 400 },
          }),
          new Paragraph({
            border: {
              bottom: { color: "24D1E7", space: 1, style: BorderStyle.SINGLE, size: 6 },
            },
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: "DICAS DE PUBLICAÇÃO",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Melhor horário: ", bold: true }),
              new TextRun({ text: "Entre 11h-13h ou 18h-20h (maior engajamento no Instagram)" }),
            ],
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Formato: ", bold: true }),
              new TextRun({ text: `Carrossel com ${images.images.length} slides (1080x1350px)` }),
            ],
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Ordem dos arquivos: ", bold: true }),
              new TextRun({ text: images.images.map((i) => i.filename).join(" → ") }),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            border: {
              bottom: { color: "24D1E7", space: 1, style: BorderStyle.SINGLE, size: 6 },
            },
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: "FONTES",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          }),
          ...content.sources.map(
            (source) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `• ${source.title}` }),
                  new TextRun({ text: source.url ? ` — ${source.url}` : "", color: "045C90" }),
                ],
                spacing: { after: 80 },
              })
          ),
          new Paragraph({ spacing: { after: 400 } }),
          new Paragraph({
            text: "ROTEIRO COMPLETO DOS SLIDES",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          }),
          ...content.slides.flatMap((slide) => {
            const typeLabels: Record<string, string> = {
              hero: "Hero/Hook",
              problem: "Problema",
              example: "Exemplo",
              solution: "Solução",
              visual: "Visual",
              value: "Valor",
              impact: "Impacto",
              cta: "CTA",
              capa: "Capa",
              conteudo: "Conteúdo",
            };
            const label = typeLabels[slide.type] || slide.type;
            return [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Slide ${slide.slideNumber} (${label}) — ${slide.title}`,
                    bold: true,
                    color: "045C90",
                  }),
                ],
                spacing: { before: 200, after: 80 },
              }),
              new Paragraph({ text: slide.body, spacing: { after: 160 } }),
            ];
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export const outputSaverTask = task({
  id: "carrossel-output-saver",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    content: ContentOutput;
    images: ImageOutput;
  }): Promise<OutputSaverResult> => {
    const { content, images } = payload;

    // Validar env vars do WhatsApp
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE;
    const phone = process.env.WHATSAPP_TO_PHONE;

    if (!apiUrl || !apiKey || !instance || !phone) {
      throw new Error(
        "Variáveis do WhatsApp não configuradas. Defina: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, WHATSAPP_TO_PHONE"
      );
    }

    console.log(`📱 Enviando carrossel "${content.topic}" via WhatsApp...`);

    // 1. Mensagem de abertura com resumo
    const dateStr = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const summaryText = [
      `🤖 *CARROSSEL PRONTO — ${dateStr}*`,
      ``,
      `📌 *Tema:* ${content.topic}`,
      `📝 *Headline:* ${content.headline}`,
      `🖼️ *Slides:* ${images.images.length}`,
      ``,
      `Enviando os slides agora... ⬇️`,
    ].join("\n");

    await sendWhatsAppText(apiUrl, apiKey, instance, phone, summaryText);
    console.log("✅ Resumo enviado");
    await sleep(1500);

    // 2. Enviar cada imagem
    for (const img of images.images) {
      const slideInfo = content.slides.find((s) => s.slideNumber === img.slideNumber);
      const caption = slideInfo
        ? `Slide ${img.slideNumber}/${images.images.length} — ${slideInfo.title}`
        : `Slide ${img.slideNumber}/${images.images.length}`;

      await sendWhatsAppImage(apiUrl, apiKey, instance, phone, img.base64, caption, img.filename);
      console.log(`📸 Slide ${img.slideNumber}/${images.images.length} enviado`);
      await sleep(2000); // pausa entre imagens
    }

    // 3. Enviar caption pronta para copiar
    const captionText = [
      `📋 *LEGENDA (copie e cole):*`,
      ``,
      content.caption,
      ``,
      content.hashtags.join(" "),
    ].join("\n");

    await sendWhatsAppText(apiUrl, apiKey, instance, phone, captionText);
    console.log("✅ Caption enviada");
    await sleep(1500);

    // 4. Gerar e enviar DOCX
    console.log("📄 Gerando DOCX...");
    const docxBuffer = await generateDocx(content, images);
    const docxFileName = `carrossel-${content.topic
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30)}.docx`;

    await sendWhatsAppDocument(apiUrl, apiKey, instance, phone, docxBuffer.toString("base64"), docxFileName);
    console.log("✅ DOCX enviado");

    // 5. Mensagem final
    await sleep(1500);
    await sendWhatsAppText(
      apiUrl, apiKey, instance, phone,
      `✅ *Carrossel completo!*\n\n🕐 Melhor horário para postar: 11h-13h ou 18h-20h\n\n_Gerado automaticamente por ArkheDigital_`
    );

    console.log("🎉 Tudo enviado via WhatsApp!");

    return {
      whatsappSent: true,
      imageCount: images.images.length,
      docxGenerated: true,
    };
  },
});
