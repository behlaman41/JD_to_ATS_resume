import OpenAI from 'openai';
import type { AiClientOptions } from './types.js';

const DEFAULT_BASE_URL = process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || undefined;
const DEFAULT_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

export function createAiClient(opts: AiClientOptions = {}) {
  const apiKey = opts.apiKey || process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error('AI_API_KEY is required. Set it in .env or pass via options.');
  }
  const baseURL = opts.baseURL || DEFAULT_BASE_URL;
  const model = opts.model || DEFAULT_MODEL;
  const temperature = opts.temperature ?? 0.2;

  const client = new OpenAI({ apiKey, baseURL });
  return { client, model, temperature };
}
