export interface ToolContext {
  organizationId: string;
  serviceId: string;
  timeWindowStart: string;
  timeWindowEnd: string;
}

export interface ReadOnlyTool<TArgs = Record<string, unknown>, TResult = Record<string, unknown>> {
  name: string;
  description: string;
  execute(args: TArgs, context: ToolContext): Promise<{ output: TResult; evidenceIds: string[] }>;
}
