/**
 * @file ai.service.ts
 * @description The AI assistant. Runs a Claude tool-use loop that lets the model
 * answer questions, build reports, and take actions across the inventory system on
 * behalf of the signed-in user, through the permission-checked tools in ai.tools.ts.
 */

import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { AppError } from '../../core/app-error';
import { aiTools, executeTool, type AiContext } from './ai.tools';

/** A turn of conversation as sent from the client (plain text only). */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** A tool the assistant actually invoked during this turn — surfaced to the UI. */
export interface ActionLog {
  tool: string;
  ok: boolean;
}

export interface ChatResult {
  reply: string;
  actions: ActionLog[];
}

/** Hard ceiling on tool-call rounds so a confused model can't loop forever. */
const MAX_ITERATIONS = 8;

function systemPrompt(ctx: AiContext): string {
  const today = new Date().toISOString().slice(0, 10);
  return [
    'You are the built-in AI assistant for an inventory and field-service management',
    'platform (products, assets, trucks, truck-stock, receipts, reports, and team).',
    `Today is ${today}. You are acting for a signed-in user whose role is ${ctx.role}.`,
    '',
    'You can both answer questions AND take real actions by calling the provided tools',
    '(creating products, adjusting stock, registering assets, inviting users, etc.).',
    'All tools operate only on this user\'s own company — you cannot see other companies.',
    '',
    'Guidelines:',
    '- Use tools to ground every factual claim about inventory; never invent numbers.',
    '- For reports, gather data with the read tools, then present clear, structured',
    '  summaries (totals, low-stock callouts, recommendations).',
    '- Before any destructive or hard-to-reverse action (delete, bulk change), confirm',
    '  the specifics with the user unless they already clearly asked for it.',
    '- If a tool returns a permission error, explain plainly that the user\'s role lacks',
    '  the permission and an admin must do it — do not retry the same call.',
    '- Be concise and lead with the answer. Use short paragraphs or bullet points.',
  ].join('\n');
}

export class AiService {
  private client: Anthropic | null = env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
    : null;

  /**
   * Run one assistant turn. `history` is the full prior conversation (plain text);
   * the last entry should be the new user message. Returns the assistant's final
   * reply plus the list of actions it took.
   */
  async chat(history: ChatMessage[], ctx: AiContext): Promise<ChatResult> {
    if (!this.client) {
      throw new AppError(
        'The AI assistant is not configured. Set ANTHROPIC_API_KEY on the API to enable it.',
        503,
      );
    }

    if (!Array.isArray(history) || history.length === 0) {
      throw new AppError('At least one message is required', 400);
    }

    const messages: Anthropic.MessageParam[] = history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content?.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      throw new AppError('The last message must be from the user', 400);
    }

    const actions: ActionLog[] = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await this.client.messages.create({
        model: env.AI_MODEL,
        max_tokens: 8000,
        thinking: { type: 'adaptive' },
        system: systemPrompt(ctx),
        tools: aiTools,
        messages,
      });

      // Preserve the assistant turn verbatim (including thinking blocks) so signatures
      // replay correctly on the next request in this loop.
      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason !== 'tool_use') {
        const reply = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim();
        return { reply: reply || 'Done.', actions };
      }

      // Execute every requested tool and feed all results back in one user turn.
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const result = await executeTool(block.name, block.input, ctx);
        actions.push({ tool: block.name, ok: !result.isError });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result.content,
          is_error: result.isError,
        });
      }

      messages.push({ role: 'user', content: toolResults });
    }

    logger.warn({ companyId: ctx.companyId }, 'AI assistant hit max tool iterations');
    return {
      reply:
        'I took several steps but reached my action limit for this turn. ' +
        'Could you confirm or narrow what you\'d like me to do next?',
      actions,
    };
  }
}
