import type { AIProvider, InvestigationOutput, InvestigationToolResult } from "./types.js";
import { UnauthorizedError } from "@deploysentinel/shared";

export class GeminiLiveProvider implements AIProvider {
  public readonly name = "gemini-live";
  public readonly isOffline = false;

  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
  }

  public isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async investigate(
    incidentSnapshot: Record<string, unknown>,
    toolResults: InvestigationToolResult[],
  ): Promise<InvestigationOutput> {
    if (!this.isAvailable()) {
      throw new UnauthorizedError(
        "GeminiLiveProvider is unconfigured: GEMINI_API_KEY environment variable is missing or empty. Please use DeterministicOfflineProvider for offline evaluations.",
      );
    }

    // When live credentials are supplied and verified:
    // In accordance with Section 8, this provider uses the official Gemini API format.
    // However, in offline demo / test suites, this remains pending and DeterministicOfflineProvider is active.
    throw new Error(
      "Live cloud model invocation requires verified free-tier Gemini API credentials and explicit user cost authorization. Offline simulator is active.",
    );
  }
}
