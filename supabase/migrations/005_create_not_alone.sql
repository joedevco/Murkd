ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS not_alone_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.not_alone (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.not_alone ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read not_alone"
  ON public.not_alone
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own not_alone"
  ON public.not_alone
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own not_alone"
  ON public.not_alone
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_post_not_alone_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET not_alone_count = not_alone_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET not_alone_count = not_alone_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER trg_update_post_not_alone_count
  AFTER INSERT OR DELETE ON public.not_alone
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_not_alone_count();
