-- ARN Database Schema
-- For self-hosted PostgreSQL

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'editor');

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  content text NOT NULL,
  original_title text,
  original_content text,
  media_outlet text,
  category text DEFAULT 'general',
  status text NOT NULL DEFAULT 'approved',
  guest_name text,
  guest_email text,
  upvotes integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote_type integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Anonymous'));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at on stories
CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on new user signup (attach to auth.users if using GoTrue)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- STORIES policies
CREATE POLICY "Approved stories are viewable by everyone" ON public.stories FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can view their own stories" ON public.stories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins and editors can view all stories" ON public.stories FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
CREATE POLICY "Anyone can create stories" ON public.stories FOR INSERT WITH CHECK (
  ((auth.uid() IS NOT NULL) AND (auth.uid() = user_id) AND (status = 'approved'))
  OR ((auth.uid() IS NULL) AND (user_id IS NULL) AND (status = 'pending'))
);
CREATE POLICY "Users can update their own stories" ON public.stories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins and editors can update any story" ON public.stories FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
CREATE POLICY "Users can delete their own stories" ON public.stories FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any story" ON public.stories FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- COMMENTS policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any comment" ON public.comments FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- VOTES policies
CREATE POLICY "Votes are viewable by everyone" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON public.votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change their vote" ON public.votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove their vote" ON public.votes FOR DELETE USING (auth.uid() = user_id);

-- USER_ROLES policies
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'));
