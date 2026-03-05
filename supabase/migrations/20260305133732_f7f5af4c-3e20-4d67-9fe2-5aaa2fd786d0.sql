-- Allow admins to delete any story from any view
DROP POLICY IF EXISTS "Admins can delete any story" ON public.stories;
CREATE POLICY "Admins can delete any story"
ON public.stories
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));