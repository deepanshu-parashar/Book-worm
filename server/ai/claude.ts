import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { ScanRequest } from '../../shared/types.ts';
import { config } from '../config.ts';
import { SYSTEM_PROMPT, userText } from './prompt.ts';
import { AnalysisSchema, type ModelBook, type ScanMode } from './schema.ts';

export interface Analyzer {
  analyze(mode: ScanMode, req: ScanRequest): Promise<ModelBook[]>;
}

/** The model could not be reached or did not return a usable answer. */
export class AiUnavailable extends Error {}

export function claudeAnalyzer(): Analyzer {
  // The key comes from the environment (ANTHROPIC_API_KEY); it is never sent to the browser.
  const client = new Anthropic({ apiKey: config.anthropicKey, timeout: 80_000, maxRetries: 1 });

  return {
    async analyze(mode, req) {
      let response;
      try {
        response = await client.beta.messages.parse({
          model: config.model,
          max_tokens: 16000,
          // If the primary model declines a request, the API reruns it on a fallback model.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: config.effort, format: betaZodOutputFormat(AnalysisSchema) },
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: req.mediaType, data: req.image } },
                { type: 'text', text: userText(mode, req) },
              ],
            },
          ],
        });
      } catch (err) {
        if (err instanceof Anthropic.AuthenticationError) throw new AiUnavailable('The Claude API key was rejected.');
        if (err instanceof Anthropic.RateLimitError) throw new AiUnavailable('Claude API rate limit reached.');
        if (err instanceof Anthropic.APIError) throw new AiUnavailable(`Claude API error ${err.status ?? ''}`.trim());
        throw err;
      }
      if (response.stop_reason === 'refusal') return [];
      if (!response.parsed_output) throw new AiUnavailable(`No usable answer (stop reason: ${response.stop_reason}).`);
      return response.parsed_output.books;
    },
  };
}
