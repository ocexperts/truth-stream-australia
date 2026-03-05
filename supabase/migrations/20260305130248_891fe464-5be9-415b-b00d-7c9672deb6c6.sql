
-- Allow admins to insert/delete roles
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow editors to view/update pending stories
DROP POLICY IF EXISTS "Admins can view all stories" ON public.stories;
CREATE POLICY "Admins and editors can view all stories" ON public.stories
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "Admins can update any story" ON public.stories;
CREATE POLICY "Admins and editors can update any story" ON public.stories
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
