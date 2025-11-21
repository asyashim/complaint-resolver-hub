-- Create staff_role enum
CREATE TYPE public.staff_role AS ENUM ('warden', 'hod', 'transport_officer', 'admin');

-- Create staff table
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role staff_role NOT NULL,
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on staff table
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Staff RLS policies
CREATE POLICY "Admins can view all staff"
  ON public.staff FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert staff"
  ON public.staff FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update staff"
  ON public.staff FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete staff"
  ON public.staff FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Add assigned_to column to complaints
ALTER TABLE public.complaints
ADD COLUMN assigned_to UUID REFERENCES public.staff(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_complaints_assigned_to ON public.complaints(assigned_to);
CREATE INDEX idx_staff_role ON public.staff(role);

-- Create function to auto-assign complaints based on category
CREATE OR REPLACE FUNCTION public.auto_assign_complaint()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_member_id UUID;
  target_role staff_role;
BEGIN
  -- Determine target role based on category
  IF NEW.category = 'hostel' THEN
    target_role := 'warden';
  ELSIF NEW.category = 'academic' THEN
    target_role := 'hod';
  ELSIF NEW.category = 'technical' OR NEW.category = 'infrastructure' THEN
    target_role := 'transport_officer';
  ELSE
    -- For 'other' category, assign to admin
    target_role := 'admin';
  END IF;

  -- Find an active staff member with the target role
  SELECT id INTO staff_member_id
  FROM public.staff
  WHERE role = target_role
    AND is_active = true
  ORDER BY RANDOM() -- Distribute load if multiple staff with same role
  LIMIT 1;

  -- Assign the complaint to the staff member if found
  IF staff_member_id IS NOT NULL THEN
    NEW.assigned_to := staff_member_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign on insert
CREATE TRIGGER trigger_auto_assign_complaint
  BEFORE INSERT ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_complaint();

-- Update trigger for updated_at on staff table
CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.staff IS 'Staff members who can be assigned to handle complaints';
COMMENT ON COLUMN public.complaints.assigned_to IS 'Staff member assigned to handle this complaint';