/**
 * @file receipt-extraction.service.ts
 * @description Reads an uploaded purchase receipt (PDF or image) with Claude and
 * returns its total and line items as structured data. Used to auto-fill the
 * receipt total and quantities at upload time instead of asking the technician
 * to type them. A forced tool call guarantees a typed, parseable result.
 */

import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { AppError } from '../../core/app-error';

export interface ExtractedReceiptItem {
  itemName: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
}

export interface ExtractedReceipt {
  total: number | null;
  currency: string | null;
  supplier: string | null;
  items: ExtractedReceiptItem[];
}

/** Allowed receipt file extensions mapped to the media types Claude accepts. */
const MEDIA_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
};

const RECORD_TOOL: Anthropic.Tool = {
  name: 'record_receipt',
  description: 'Record the data extracted from the purchase receipt.',
  input_schema: {
    type: 'object',
    properties: {
      total: {
        type: ['number', 'null'],
        description: 'The grand total of the receipt as a number, or null if not shown.',
      },
      currency: {
        type: ['string', 'null'],
        description: 'ISO currency code or symbol if shown (e.g. "CAD"), else null.',
      },
      supplier: {
        type: ['string', 'null'],
        description: 'Supplier / vendor name if shown, else null.',
      },
      items: {
        type: 'array',
        description: 'Every line item on the receipt.',
        items: {
          type: 'object',
          properties: {
            itemName: { type: 'string', description: 'The item description as printed.' },
            quantity: { type: 'number', description: 'Quantity purchased.' },
            unitPrice: { type: ['number', 'null'], description: 'Price per unit, or null.' },
            totalPrice: { type: ['number', 'null'], description: 'Line total, or null.' },
          },
          required: ['itemName', 'quantity'],
        },
      },
    },
    required: ['items'],
  },
};

const PROMPT =
  'You are reading a purchase / truck-stock receipt. Extract the supplier, the grand ' +
  'total, and every line item (name, quantity, unit price, and line total) exactly as ' +
  'printed — do not invent or recompute values. If a field is missing, leave it null. ' +
  'Then call the record_receipt tool with the result.';

export class ReceiptExtractionService {
  private client: Anthropic | null = env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
    : null;

  /** Whether AI receipt reading is configured (an API key is present). */
  get enabled(): boolean {
    return this.client !== null;
  }

  /**
   * Extract a receipt's total and line items from its base64-encoded file.
   * Throws a 503 when AI is not configured and a 400 for unsupported file types.
   */
  async extract(fileBase64: string, fileName: string): Promise<ExtractedReceipt> {
    if (!this.client) {
      throw new AppError(
        'AI receipt reading is not configured. Set ANTHROPIC_API_KEY on the API to enable it.',
        503
      );
    }

    const ext = (fileName.split('.').pop() ?? '').toLowerCase();
    const mediaType = MEDIA_TYPES[ext];
    if (!mediaType) {
      throw new AppError(
        'Only PDF and image receipts (png, jpg, webp, gif) can be read automatically.',
        400
      );
    }

    // Tolerate a data-URL prefix (data:...;base64,XXXX) from the browser.
    const data = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;

    const fileBlock: Anthropic.ContentBlockParam =
      mediaType === 'application/pdf'
        ? {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data },
          }
        : {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
              data,
            },
          };

    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model: env.AI_MODEL,
        max_tokens: 2048,
        tools: [RECORD_TOOL],
        tool_choice: { type: 'tool', name: 'record_receipt' },
        messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: PROMPT }] }],
      });
    } catch (err) {
      logger.error({ err }, 'Receipt extraction request to Claude failed');
      throw new AppError('Could not read the receipt automatically. Enter the total manually.', 502);
    }

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );
    if (!toolUse) {
      throw new AppError('Could not read the receipt automatically. Enter the total manually.', 502);
    }

    const input = toolUse.input as {
      total?: unknown;
      currency?: unknown;
      supplier?: unknown;
      items?: Array<Record<string, unknown>>;
    };

    const num = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const items: ExtractedReceiptItem[] = Array.isArray(input.items)
      ? input.items
          .map((it) => ({
            itemName: String(it.itemName ?? '').trim(),
            quantity: num(it.quantity) ?? 0,
            unitPrice: num(it.unitPrice),
            totalPrice: num(it.totalPrice),
          }))
          .filter((it) => it.itemName !== '' && it.quantity > 0)
      : [];

    return {
      total: num(input.total),
      currency: typeof input.currency === 'string' ? input.currency : null,
      supplier: typeof input.supplier === 'string' ? input.supplier : null,
      items,
    };
  }
}
