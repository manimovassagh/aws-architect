import { Router, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

export const sessionsRouter = Router();

/** Wrap an async route handler so rejected promises are forwarded to Express error handling. */
function asyncHandler(fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createSessionSchema = z.object({
  provider: z.enum(['aws', 'azure', 'gcp']),
  fileName: z.string().min(1),
  resourceCount: z.number().int().min(0),
  data: z.object({
    nodes: z.array(z.record(z.string(), z.unknown())),
    edges: z.array(z.record(z.string(), z.unknown())),
    resources: z.array(z.record(z.string(), z.unknown())),
    provider: z.enum(['aws', 'azure', 'gcp']),
    warnings: z.array(z.string()),
  }),
});

/** GET /api/sessions — list user's sessions (summaries, no data blob) */
sessionsRouter.get('/sessions', requireAuth, asyncHandler(async (req, res) => {
  if (!supabase) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('id, provider, file_name, resource_count, created_at')
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
    return;
  }

  res.json(
    data.map((row) => ({
      id: row.id,
      provider: row.provider,
      fileName: row.file_name,
      resourceCount: row.resource_count,
      createdAt: row.created_at,
    })),
  );
}));

/** GET /api/sessions/:id — get full session with data */
sessionsRouter.get('/sessions/:id', requireAuth, asyncHandler(async (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    res.status(400).json({ error: 'Invalid session ID format' });
    return;
  }

  if (!supabase) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json({
    id: data.id,
    userId: data.user_id,
    provider: data.provider,
    fileName: data.file_name,
    resourceCount: data.resource_count,
    data: data.data,
    createdAt: data.created_at,
  });
}));

/** POST /api/sessions — save a new session */
sessionsRouter.post('/sessions', requireAuth, asyncHandler(async (req, res) => {
  if (!supabase) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  const result = createSessionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid request', details: result.error.message });
    return;
  }

  const { provider, fileName, resourceCount, data: sessionData } = result.data;

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: req.userId!,
      provider,
      file_name: fileName,
      resource_count: resourceCount,
      data: sessionData,
    })
    .select('id, created_at')
    .single();

  if (error) {
    res.status(500).json({ error: 'Failed to save session' });
    return;
  }

  res.status(201).json({
    id: data.id,
    provider,
    fileName,
    resourceCount,
    createdAt: data.created_at,
  });
}));

/** DELETE /api/sessions/:id — delete a session */
sessionsRouter.delete('/sessions/:id', requireAuth, asyncHandler(async (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    res.status(400).json({ error: 'Invalid session ID format' });
    return;
  }

  if (!supabase) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId!);

  if (error) {
    res.status(500).json({ error: 'Failed to delete session' });
    return;
  }

  res.status(204).send();
}));
