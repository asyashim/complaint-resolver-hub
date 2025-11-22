-- Add feedback fields to complaints table
ALTER TABLE public.complaints 
ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN feedback_comment TEXT,
ADD COLUMN feedback_submitted_at TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN public.complaints.rating IS 'Student satisfaction rating (1-5 stars)';
COMMENT ON COLUMN public.complaints.feedback_comment IS 'Student feedback comment after resolution';
COMMENT ON COLUMN public.complaints.feedback_submitted_at IS 'Timestamp when feedback was submitted';

-- Create index for querying feedback
CREATE INDEX idx_complaints_rating ON public.complaints(rating) WHERE rating IS NOT NULL;