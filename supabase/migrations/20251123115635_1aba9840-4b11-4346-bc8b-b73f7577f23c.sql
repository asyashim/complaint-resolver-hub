-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create complaint_tags junction table (many-to-many)
CREATE TABLE IF NOT EXISTS public.complaint_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(complaint_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_tags ENABLE ROW LEVEL SECURITY;

-- Tags RLS Policies
CREATE POLICY "Everyone can view tags"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert tags"
  ON public.tags FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update tags"
  ON public.tags FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete tags"
  ON public.tags FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Complaint_tags RLS Policies
CREATE POLICY "Users can view tags of complaints they can access"
  ON public.complaint_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_tags.complaint_id
      AND (c.student_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "Admins can insert complaint tags"
  ON public.complaint_tags FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete complaint tags"
  ON public.complaint_tags FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Insert default tags
INSERT INTO public.tags (name, color) VALUES
  ('bullying', '#ef4444'),
  ('technical', '#3b82f6'),
  ('urgent', '#f59e0b'),
  ('maintenance', '#10b981'),
  ('resolved', '#8b5cf6'),
  ('follow-up', '#ec4899')
ON CONFLICT (name) DO NOTHING;