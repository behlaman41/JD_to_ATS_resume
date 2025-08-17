import { z } from 'zod';
import { createAiClient } from './client.js';
import { buildSystemPrompt, buildUserPrompt } from './prompt.js';
import type { AnalyzeAndUpdateOptions, AiUpdateResult, EditAction } from './types.js';

const EditActionSchema = z.object({
  section: z.string(),
  type: z.enum(['replace', 'reorder', 'delete', 'add', 'tighten', 'clarify']),
  rationale: z.string(),
  before: z.string().optional(),
  after: z.string().optional(),
});

const PlanSchema = z.object({
  objective: z.string(),
  constraints: z.array(z.string()),
  riskChecks: z.array(z.string()),
  jdHighlights: z.array(z.string()),
  actions: z.array(EditActionSchema),
});

const ResultSchema = z.object({
  plan: PlanSchema,
  updatedResume: z.string(),
  model: z.string().optional(),
});

export async function analyzeAndUpdateResume(
  jdText: string,
  resumeText: string,
  options: AnalyzeAndUpdateOptions = {}
): Promise<AiUpdateResult> {
  const { client, model, temperature } = createAiClient(options);

  const system = buildSystemPrompt(options.conservative);
  const user = buildUserPrompt(jdText, resumeText);

  // We aim for provider compatibility. Prefer JSON object responses but avoid
  // hard failures if the provider cannot guarantee JSON mode. Some providers
  // reject requests with invalid `response_format` parameters which previously
  // caused a 400 error when processing JD.txt files. We now omit the
  // `response_format` field and rely on our own JSON parsing fallback below.
  let response;
  try {
    response = await client.chat.completions.create({
      model,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
  } catch (err: any) {
    throw new Error(`AI request failed: ${err.message}`);
  }

  const content = response.choices?.[0]?.message?.content ?? '';

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Fallback: try to salvage a JSON substring
    const m = content.match(/[\{\[][\s\S]*[\}\]]/);
    if (!m) throw new Error('Model did not return JSON.');
    parsed = JSON.parse(m[0]);
  }

  const result = ResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('Invalid AI response schema: ' + result.error.message);
  }

  return {
    ...result.data,
    model,
  };
}

export type { EditAction } from './types.js';

