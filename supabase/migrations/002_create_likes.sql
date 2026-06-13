ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read likes"
  ON public.likes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own likes"
  ON public.likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- migrate existing votes to likes if table exists
INSERT INTO public.likes (post_id, user_id, created_at)
SELECT post_id, user_id, created_at
FROM public.votes
WHERE vote_type = 1
ON CONFLICT DO NOTHING;
