-- Allow admins to delete any comment
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;
CREATE POLICY "Admins can delete any comment"
ON public.comments
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));