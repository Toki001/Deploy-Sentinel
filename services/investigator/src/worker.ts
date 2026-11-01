import { logger } from "@deploysentinel/shared";
import { DeterministicOfflineProvider } from "@deploysentinel/ai";

export class InvestigationWorker {
  private isRunning = false;
  private provider = new DeterministicOfflineProvider();

  public async start(): Promise<void> {
    this.isRunning = true;
    logger.info(`Investigation worker initialized with provider: ${this.provider.name}`);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    logger.info("Investigation worker stopped gracefully");
  }

  public getStatus() {
    return {
      running: this.isRunning,
      workerId: "investigator-node-1",
      provider: this.provider.name,
    };
  }
}
