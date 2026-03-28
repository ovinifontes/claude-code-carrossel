import { schedules } from "@trigger.dev/sdk";
import { researchTask } from "./research.js";
import { contentWriterTask } from "./content-writer.js";
import { reviewerTask } from "./reviewer.js";
import { imageGeneratorTask } from "./image-generator.js";
import { outputSaverTask } from "./output-saver.js";

/**
 * Carrossel Automático — ArkheDigital
 *
 * Pipeline completo:
 * 1. Pesquisar notícias de IA (RSS + GPT-4o curadoria)
 * 2. Criar roteiro do carrossel (GPT-4o copywriting)
 * 3. Revisar conteúdo (GPT-4o editor, até 2 rodadas)
 * 4. Gerar imagens (Gemini capa + HTML/CSS slides via Puppeteer)
 * 5. Salvar PNGs + DOCX na pasta local
 *
 * Schedule: Terça, Quinta, Sábado às 6h BRT (9h UTC)
 */
export const carrosselOrchestrator = schedules.task({
  id: "carrossel-orchestrator",
  // Terça(2), Quinta(4), Sábado(6) às 9h UTC = 6h BRT
  cron: "0 9 * * 2,4,6",

  run: async () => {
    const startTime = Date.now();
    console.log("🚀 Iniciando pipeline do carrossel automático...");
    console.log(`📅 ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`);

    // ── PASSO 1: Pesquisar notícias ──
    console.log("\n━━━ PASSO 1/5: Pesquisa ━━━");
    const researchResult = await researchTask.triggerAndWait({});
    if (!researchResult.ok) {
      throw new Error(`Pesquisa falhou: ${JSON.stringify(researchResult.error)}`);
    }
    const research = researchResult.output;
    console.log(`✅ Tema: "${research.topic}"`);

    // ── PASSO 2: Criar roteiro ──
    console.log("\n━━━ PASSO 2/5: Roteirização ━━━");
    const contentResult = await contentWriterTask.triggerAndWait({ research });
    if (!contentResult.ok) {
      throw new Error(`Roteirização falhou: ${JSON.stringify(contentResult.error)}`);
    }
    let content = contentResult.output;
    console.log(`✅ ${content.slides.length} slides criados`);

    // ── PASSO 3: Revisão (até 2 rodadas) ──
    console.log("\n━━━ PASSO 3/5: Revisão ━━━");
    for (let attempt = 1; attempt <= 2; attempt++) {
      const reviewResult = await reviewerTask.triggerAndWait({
        content,
        attempt,
      });
      if (!reviewResult.ok) {
        throw new Error(`Revisão falhou: ${JSON.stringify(reviewResult.error)}`);
      }

      const review = reviewResult.output;
      content = review.finalContent;

      if (review.approved) {
        console.log(`✅ Aprovado na rodada ${attempt}: ${review.feedback}`);
        break;
      } else {
        console.log(`🔄 Ajustes na rodada ${attempt}: ${review.feedback}`);
      }
    }

    // ── PASSO 4: Gerar imagens ──
    console.log("\n━━━ PASSO 4/5: Geração de Imagens ━━━");
    const imageResult = await imageGeneratorTask.triggerAndWait({
      slides: content.slides,
      topic: content.topic,
      headline: content.headline,
    });
    if (!imageResult.ok) {
      throw new Error(`Geração de imagens falhou: ${JSON.stringify(imageResult.error)}`);
    }
    const images = imageResult.output;
    console.log(`✅ ${images.images.length} imagens geradas`);

    // ── PASSO 5: Salvar output ──
    console.log("\n━━━ PASSO 5/5: Salvando Output ━━━");
    const saveResult = await outputSaverTask.triggerAndWait({
      content,
      images,
    });
    if (!saveResult.ok) {
      throw new Error(`Salvamento falhou: ${JSON.stringify(saveResult.error)}`);
    }
    const saved = saveResult.output;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 ════════════════════════════════════════`);
    console.log(`   CARROSSEL PRONTO!`);
    console.log(`   Tema: ${content.topic}`);
    console.log(`   Slides: ${images.images.length}`);
    console.log(`   WhatsApp: ${saved.whatsappSent ? "✅ Enviado" : "❌ Falhou"}`);
    console.log(`   Tempo: ${elapsed}s`);
    console.log(`   ════════════════════════════════════════`);

    return {
      topic: content.topic,
      headline: content.headline,
      slideCount: images.images.length,
      whatsappSent: saved.whatsappSent,
      elapsed: `${elapsed}s`,
    };
  },
});
