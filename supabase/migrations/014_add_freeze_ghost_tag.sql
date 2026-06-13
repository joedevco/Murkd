ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS freeze_ghost_tag BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles
SET freeze_ghost_tag = true
WHERE id = '7c89a863-13fa-47aa-a4e0-24faf960dd26';
