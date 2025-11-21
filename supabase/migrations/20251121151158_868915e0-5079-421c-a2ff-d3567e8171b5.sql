-- Add is_anonymous column to complaints table
ALTER TABLE public.complaints
ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.complaints.is_anonymous IS 'When true, student identity is hidden from admins';