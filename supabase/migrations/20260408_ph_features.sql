-- 20260408_ph_features.sql
-- Run this in Supabase SQL Editor to support new Product Hunt features

-- Support threading
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.posts(id);

-- Support burn timers (ephemeral posts)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Support channels and refined sorting
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'general';

-- Support reaction varieties
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS reaction_type TEXT DEFAULT 'fire';

-- Create an index for the burn timer to optimize fetching live posts
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON public.posts(expires_at);

-- Create an index for channels
CREATE INDEX IF NOT EXISTS idx_posts_channel ON public.posts(channel);
