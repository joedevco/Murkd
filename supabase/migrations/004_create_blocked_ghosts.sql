-- Drop old schema if it exists (ghost-tag-based blocking)
DROP TABLE IF EXISTS public.blocked_ghosts CASCADE;

CREATE TABLE IF NOT EXISTS public.blocked_ghosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_ghost_tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, blocked_user_id)
);

ALTER TABLE public.blocked_ghosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own blocked ghosts"
  ON public.blocked_ghosts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blocked ghosts"
  ON public.blocked_ghosts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blocked ghosts"
  ON public.blocked_ghosts
  FOR DELETE
  USING (auth.uid() = user_id);
