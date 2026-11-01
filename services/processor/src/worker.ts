import { logger } from "@deploysentinel/shared";

export class EventProcessorWorker {
  private isRunning = false;

  public async start(): Promise<void> {
    this.isRunning = true;
    logger.info("Event processor worker initialized (pending Kafka connection in M04)");
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    logger.info("Event processor worker stopped gracefully");
  }

  public getStatus() {
    return {
      running: this.isRunning,
      workerId: "processor-node-1",
    };
  }
}
