import { startHealthServer } from "./health.js";
import { InvestigationWorker } from "./worker.js";
import { logger } from "@deploysentinel/shared";

async function main() {
  startHealthServer(parseInt(process.env.INVESTIGATOR_HEALTH_PORT || "4002", 10));
  const worker = new InvestigationWorker();
  await worker.start();

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down investigator...`);
    await worker.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

if (process.env.NODE_ENV !== "test") {
  main();
}
