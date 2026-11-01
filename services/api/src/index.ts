import { buildApp } from "./app.js";
import { logger, validateEnv } from "@deploysentinel/shared";

async function main() {
  const env = validateEnv();
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(`DeploySentinel API server listening on http://${env.HOST}:${env.PORT}`);
    logger.info(`GraphQL endpoint available at http://${env.HOST}:${env.PORT}/graphql`);
  } catch (err) {
    logger.error("Failed to start API server", err as Error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  main();
}
