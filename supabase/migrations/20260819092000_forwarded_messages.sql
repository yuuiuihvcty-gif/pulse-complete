ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS forwarded_from uuid REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS messages_forwarded_from_idx
  ON public.messages (forwarded_from)
  WHERE forwarded_from IS NOT NULL;
