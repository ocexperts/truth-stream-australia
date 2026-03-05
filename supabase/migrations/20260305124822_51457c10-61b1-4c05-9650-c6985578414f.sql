
-- Drop restrictive SELECT policies
DROP POLICY IF EXISTS "Approved stories are viewable by everyone" ON public.stories;
DROP POLICY IF EXISTS "Admins can view all stories" ON public.stories;
DROP POLICY IF EXISTS "Users can view their own stories" ON public.stories;

-- Recreate as PERMISSIVE (any one passing = allowed)
CREATE POLICY "Approved stories are viewable by everyone" ON public.stories
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Admins can view all stories" ON public.stories
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own stories" ON public.stories
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
