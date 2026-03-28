// Script para disparar teste do pipeline completo
// O Trigger.dev SDK v4 usa TRIGGER_SECRET_KEY para autenticar
// No ambiente dev, o dev server intercepta as chamadas

import "dotenv/config";

async function main() {
  // Buscar a secret key do dev environment pelo dashboard
  // Por ora, disparar via API do dev server local

  // O dev server roda na porta padrão e expõe as tasks
  // Vamos usar a abordagem de importar e chamar diretamente
  const { carrosselOrchestrator } = await import("./src/trigger/carrossel/orchestrator.js");

  console.log("🚀 Disparando teste do carrossel...");
  const handle = await carrosselOrchestrator.trigger({});
  console.log(`✅ Run disparada! ID: ${handle.id}`);
}

main().catch(console.error);
