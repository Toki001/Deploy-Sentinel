import { logger, NotFoundError } from "@deploysentinel/shared";
import {
  DeterministicOfflineProvider,
  InvestigationRunner,
  type InvestigationOutput,
  DiagnosticStore,
  defaultDiagnosticStore,
} from "@deploysentinel/ai";

export interface InvestigationJobRequest {
  jobId: string;
  incidentId: string;
  organizationId: string;
  serviceId: string;
  incidentSnapshot?: Record<string, unknown>;
  timeWindowStart?: string;
  timeWindowEnd?: string;
}

export interface InvestigationJobResult {
  jobId: string;
  incidentId: string;
  status: "completed" | "failed";
  output?: InvestigationOutput;
  error?: string;
  completedAt: string;
}

export class InvestigationWorker {
  private isRunning = false;
  private runner: InvestigationRunner;
  private jobs: Map<string, InvestigationJobResult> = new Map();
  private completedCount = 0;

  constructor(
    provider = new DeterministicOfflineProvider(),
    store: DiagnosticStore = defaultDiagnosticStore,
  ) {
    this.runner = new InvestigationRunner(provider, store);
  }

  public async start(): Promise<void> {
    this.isRunning = true;
    logger.info("Investigation worker initialized and ready for diagnostic jobs");
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    logger.info("Investigation worker stopped gracefully");
  }

  public async processJob(job: InvestigationJobRequest): Promise<InvestigationJobResult> {
    if (!this.isRunning) {
      throw new Error("InvestigationWorker is not currently running");
    }

    logger.info(`Starting investigation job ${job.jobId} for incident ${job.incidentId}`);

    try {
      const output = await this.runner.run({
        organizationId: job.organizationId,
        serviceId: job.serviceId,
        incidentId: job.incidentId,
        incidentSnapshot: job.incidentSnapshot || {
          incidentId: job.incidentId,
          serviceId: job.serviceId,
        },
        timeWindowStart: job.timeWindowStart,
        timeWindowEnd: job.timeWindowEnd,
      });

      const result: InvestigationJobResult = {
        jobId: job.jobId,
        incidentId: job.incidentId,
        status: "completed",
        output,
        completedAt: new Date().toISOString(),
      };

      this.jobs.set(job.jobId, result);
      this.completedCount += 1;
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error(`Investigation job ${job.jobId} failed: ${errorMsg}`);
      const failedResult: InvestigationJobResult = {
        jobId: job.jobId,
        incidentId: job.incidentId,
        status: "failed",
        error: errorMsg,
        completedAt: new Date().toISOString(),
      };
      this.jobs.set(job.jobId, failedResult);
      return failedResult;
    }
  }

  public getJobResult(jobId: string): InvestigationJobResult | undefined {
    return this.jobs.get(jobId);
  }

  public getStatus() {
    return {
      running: this.isRunning,
      workerId: "investigator-node-1",
      provider: "offline-simulator",
      jobsCompleted: this.completedCount,
    };
  }
}
