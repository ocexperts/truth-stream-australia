
-- Add status and guest fields to stories
ALTER TABLE public.stories 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ALTER COLUMN user_id DROP NOT NULL;

-- Create app_role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS for user_roles: only admins can see roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update stories RLS: public SELECT only shows approved
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON public.stories;

CREATE POLICY "Approved stories are viewable by everyone" ON public.stories
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Admins can view all stories" ON public.stories
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own stories" ON public.stories
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow guest inserts (anon)
DROP POLICY IF EXISTS "Authenticated users can create stories" ON public.stories;

CREATE POLICY "Anyone can create stories" ON public.stories
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id AND status = 'approved')
    OR
    (auth.uid() IS NULL AND user_id IS NULL AND status = 'pending')
  );

-- Admin can update any story (for approval)
CREATE POLICY "Admins can update any story" ON public.stories
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
