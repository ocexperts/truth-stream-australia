
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS original_title text,
  ADD COLUMN IF NOT EXISTS original_content text;
