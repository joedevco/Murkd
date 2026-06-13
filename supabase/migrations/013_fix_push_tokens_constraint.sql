DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'push_tokens_push_token_key'
    AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER TABLE public.push_tokens DROP CONSTRAINT push_tokens_push_token_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'push_tokens_user_id_key'
    AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER TABLE public.push_tokens ADD CONSTRAINT push_tokens_user_id_key UNIQUE (user_id);
  END IF;
END $$;

DELETE FROM public.push_tokens a USING (
  SELECT MIN(id) as id, user_id FROM public.push_tokens GROUP BY user_id HAVING COUNT(*) > 1
) b WHERE a.user_id = b.user_id AND a.id <> b.id;
