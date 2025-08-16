export type EditActionType = 'replace' | 'reorder' | 'delete' | 'add' | 'tighten' | 'clarify';

export interface EditAction {
  section: string;
  type: EditActionType;
  rationale: string;
  before?: string;
  after?: string;
}

export interface EditPlan {
  objective: string;
  constraints: string[];
  riskChecks: string[];
  jdHighlights: string[];
  actions: EditAction[];
}

export interface AiUpdateResult {
  plan: EditPlan;
  updatedResume: string;
  model?: string;
}

export interface AiClientOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
}

export interface AnalyzeAndUpdateOptions extends AiClientOptions {
  // If true, returns a conservative output (fewer changes)
  conservative?: boolean;
}

