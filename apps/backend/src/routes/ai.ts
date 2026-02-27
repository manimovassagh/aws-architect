import { Router } from 'express';
import { z } from 'zod';
import type { ApiError } from '@infragraph/shared';
import { checkOllamaStatus, listModels, chat, buildSystemPrompt } from '../services/ollama.js';

export const aiRouter = Router();

const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const ChatSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  resources: z.array(z.any()).optional(),
  model: z.string().optional(),
  stream: z.boolean().optional(),
});

// GET /api/ai/status — probe Ollama availability + model status
aiRouter.get('/ai/status', async (req, res) => {
  const model = typeof req.query.model === 'string' ? req.query.model : undefined;
  const status = await checkOllamaStatus(model);
  res.json(status);
});

// GET /api/ai/models — list available Ollama models
aiRouter.get('/ai/models', async (_req, res) => {
  try {
    const models = await listModels();
    res.json(models);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list models';
    const apiErr: ApiError = { error: 'Ollama unavailable', details: message };
    res.status(502).json(apiErr);
  }
});

// POST /api/ai/chat — send chat message with optional infra context
aiRouter.post('/ai/chat', async (req, res) => {
  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) {
    const apiErr: ApiError = { error: 'Invalid request', details: parsed.error.message };
    res.status(400).json(apiErr);
    return;
  }

  const { messages, resources, model } = parsed.data;

  // Prepend infrastructure context as a system message if resources provided
  const fullMessages = [...messages];
  if (resources && resources.length > 0) {
    fullMessages.unshift({
      role: 'system' as const,
      content: buildSystemPrompt(resources),
    });
  }

  try {
    const result = await chat(fullMessages, model);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat failed';
    const apiErr: ApiError = { error: 'AI chat failed', details: message };
    res.status(502).json(apiErr);
  }
});
