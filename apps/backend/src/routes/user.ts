import { Router, type Response, type NextFunction } from 'express';
import { supabase } from '../supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

export const userRouter = Router();

/** Wrap an async route handler so rejected promises are forwarded to Express error handling. */
function asyncHandler(fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** GET /api/user/profile — get current user's profile */
userRouter.get('/user/profile', requireAuth, asyncHandler(async (req, res) => {
  if (!supabase) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url, tier, session_limit')
    .eq('id', req.userId!)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  res.json({
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    tier: data.tier,
    sessionLimit: data.session_limit,
  });
}));
