import { task } from "@trigger.dev/sdk";
import * as fs from "fs";
import * as path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { ContentOutput } from "./content-writer.js";
import type { ImageOutput } from "./image-generator.js";

export interface OutputSaverResult {
  folderPath: string;
  imageCount: number;
  docxPath: string;
}

export const outputSaverTask = task({
  id: "carrossel-output-saver",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    content: ContentOutput;
    images: ImageOutput;
  }): Promise<OutputSaverResult> => {
    const { content, images } = payload;

    console.log(`💾 Salvando carrossel: "${content.topic}"`);

    // 1. Criar pasta de saída
    const dateStr = new Date().toISOString().slice(0, 10);
    const topicSlug = content.topic
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40);

    const folderName = `${dateStr}-${topicSlug}`;
    const outputDir = path.resolve("output", "carrosseis", folderName);
    fs.mkdirSync(outputDir, { recursive: true });

    // 2. Salvar imagens PNG
    for (const img of images.images) {
      const imgPath = path.join(outputDir, img.filename);
      fs.writeFileSync(imgPath, Buffer.from(img.base64, "base64"));
      console.log(`📸 Salvo: ${img.filename}`);
    }

    // 3. Gerar DOCX com legenda
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Título
            new Paragraph({
              text: `Carrossel: ${content.headline}`,
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 300 },
            }),

            // Data
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
              children: [
                new TextRun({
                  text: `Tema: ${content.topic}`,
                  bold: true,
                }),
              ],
              spacing: { after: 400 },
            }),

            // Separador
            new Paragraph({
              border: {
                bottom: {
                  color: "24D1E7",
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
              },
              spacing: { after: 400 },
            }),

            // Legenda
            new Paragraph({
              text: "LEGENDA DO POST",
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 },
            }),

            ...content.caption.split("\n").map(
              (line) =>
                new Paragraph({
                  text: line,
                  spacing: { after: 120 },
                })
            ),

            new Paragraph({ spacing: { after: 300 } }),

            // Hashtags
            new Paragraph({
              text: "HASHTAGS",
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 },
            }),

            new Paragraph({
              text: content.hashtags.join(" "),
              spacing: { after: 400 },
            }),

            // Separador
            new Paragraph({
              border: {
                bottom: {
                  color: "24D1E7",
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
              },
              spacing: { after: 400 },
            }),

            // Melhor horário
            new Paragraph({
              text: "DICAS DE PUBLICAÇÃO",
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 },
            }),

            new Paragraph({
              children: [
                new TextRun({ text: "Melhor horário: ", bold: true }),
                new TextRun({
                  text: "Entre 11h-13h ou 18h-20h (horário de maior engajamento no Instagram)",
                }),
              ],
              spacing: { after: 120 },
            }),

            new Paragraph({
              children: [
                new TextRun({ text: "Formato: ", bold: true }),
                new TextRun({
                  text: `Carrossel com ${images.images.length} slides (1080x1350px)`,
                }),
              ],
              spacing: { after: 120 },
            }),

            new Paragraph({
              children: [
                new TextRun({ text: "Ordem dos arquivos: ", bold: true }),
                new TextRun({
                  text: images.images.map((i) => i.filename).join(" → "),
                }),
              ],
              spacing: { after: 400 },
            }),

            // Separador
            new Paragraph({
              border: {
                bottom: {
                  color: "24D1E7",
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
              },
              spacing: { after: 400 },
            }),

            // Fontes
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
                    new TextRun({
                      text: source.url ? ` — ${source.url}` : "",
                      color: "045C90",
                    }),
                  ],
                  spacing: { after: 80 },
                })
            ),

            new Paragraph({ spacing: { after: 400 } }),

            // Roteiro completo
            new Paragraph({
              text: "ROTEIRO COMPLETO DOS SLIDES",
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 },
            }),

            ...content.slides.flatMap((slide) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Slide ${slide.slideNumber} — ${slide.title}`,
                    bold: true,
                    color: "045C90",
                  }),
                ],
                spacing: { before: 200, after: 80 },
              }),
              new Paragraph({
                text: slide.body,
                spacing: { after: 160 },
              }),
            ]),
          ],
        },
      ],
    });

    const docxBuffer = await Packer.toBuffer(doc);
    const docxPath = path.join(outputDir, "legenda.docx");
    fs.writeFileSync(docxPath, docxBuffer);

    console.log(`📄 DOCX salvo: legenda.docx`);
    console.log(`✅ Carrossel completo salvo em: ${outputDir}`);
    console.log(`📁 Arquivos:`);
    console.log(`   ${images.images.length} PNGs + 1 DOCX`);

    return {
      folderPath: outputDir,
      imageCount: images.images.length,
      docxPath,
    };
  },
});
