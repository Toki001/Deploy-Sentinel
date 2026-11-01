import { startHealthServer } from "./health.js";
import { EventProcessorWorker } from "./worker.js";
import { logger } from "@deploysentinel/shared";

async function main() {
  startHealthServer(parseInt(process.env.PROCESSOR_HEALTH_PORT || "4001", 10));
  const worker = new EventProcessorWorker();
  await worker.start();

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down processor...`);
    await worker.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

export * from "./topics.js";
export * from "./correlation.js";
export * from "./queue.js";
export * from "./retry-strategy.js";
export * from "./worker.js";
export * from "./health.js";

if (process.env.NODE_ENV !== "test") {
  main();
}
