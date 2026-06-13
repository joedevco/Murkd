CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.blocked_ghosts WHERE user_id = _user_id OR blocked_user_id = _user_id;
  DELETE FROM public.notifications WHERE user_id = _user_id;
  DELETE FROM public.push_tokens WHERE user_id = _user_id;
  DELETE FROM public.reports WHERE user_id = _user_id;
  DELETE FROM public.likes WHERE user_id = _user_id;
  DELETE FROM public.not_alone WHERE user_id = _user_id;
  DELETE FROM public.votes WHERE user_id = _user_id;
  DELETE FROM public.posts WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;
