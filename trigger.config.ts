import { defineConfig } from "@trigger.dev/sdk/v3";
import { puppeteer } from "@trigger.dev/build/extensions/puppeteer";

export default defineConfig({
  project: "proj_orphyrdeevddiqehvtph",
  dirs: ["./src/trigger"],
  maxDuration: 300, // 5 minutos — suficiente para o pipeline completo
  build: {
    extensions: [puppeteer()],
  },
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
});
