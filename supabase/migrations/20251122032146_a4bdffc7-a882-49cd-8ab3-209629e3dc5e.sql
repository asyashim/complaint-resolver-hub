-- Create messages table for complaint chat
CREATE TABLE public.complaint_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on messages
ALTER TABLE public.complaint_messages ENABLE ROW LEVEL SECURITY;

-- Index for performance
CREATE INDEX idx_complaint_messages_complaint_id ON public.complaint_messages(complaint_id);
CREATE INDEX idx_complaint_messages_created_at ON public.complaint_messages(created_at DESC);

-- RLS Policies for messages
CREATE POLICY "Users can view messages of complaints they can access"
ON public.complaint_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.complaints c
    WHERE c.id = complaint_messages.complaint_id
    AND (c.student_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  )
);

CREATE POLICY "Users can insert messages to complaints they can access"
ON public.complaint_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.complaints c
    WHERE c.id = complaint_messages.complaint_id
    AND (c.student_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaint_messages;

-- Function to check if complaint needs reminder
CREATE OR REPLACE FUNCTION public.get_stale_complaints()
RETURNS TABLE (
  complaint_id UUID,
  title TEXT,
  admin_id UUID,
  assigned_to UUID,
  last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    title,
    admin_id,
    assigned_to,
    updated_at
  FROM public.complaints
  WHERE status IN ('open', 'in_progress')
  AND updated_at < NOW() - INTERVAL '2 days'
  ORDER BY updated_at ASC;
$$;

COMMENT ON FUNCTION public.get_stale_complaints IS 'Returns complaints that haven''t been updated in 2+ days';