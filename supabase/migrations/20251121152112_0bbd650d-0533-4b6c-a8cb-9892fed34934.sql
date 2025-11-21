-- Add due_date column to complaints
ALTER TABLE public.complaints
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;

-- Create function to calculate SLA due date based on category
CREATE OR REPLACE FUNCTION public.calculate_sla_due_date(complaint_category complaint_category)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  days_to_resolve INTEGER;
BEGIN
  -- Set SLA days based on category
  CASE complaint_category
    WHEN 'academic' THEN days_to_resolve := 3;
    WHEN 'hostel' THEN days_to_resolve := 2;
    WHEN 'technical' THEN days_to_resolve := 1;  -- 24 hours
    WHEN 'infrastructure' THEN days_to_resolve := 1;  -- 24 hours
    WHEN 'other' THEN days_to_resolve := 3;
    ELSE days_to_resolve := 3;  -- Default
  END CASE;
  
  RETURN now() + (days_to_resolve || ' days')::INTERVAL;
END;
$$;

-- Update existing auto_assign_complaint function to also set due_date
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

  -- Set the SLA due date
  NEW.due_date := calculate_sla_due_date(NEW.category);

  RETURN NEW;
END;
$$;

-- Create view for SLA compliance tracking
CREATE OR REPLACE VIEW public.complaint_sla_status AS
SELECT 
  c.id,
  c.title,
  c.category,
  c.status,
  c.created_at,
  c.due_date,
  c.assigned_to,
  s.name as assigned_staff_name,
  s.role as assigned_staff_role,
  CASE 
    WHEN c.status IN ('resolved', 'closed') THEN 'completed'
    WHEN c.due_date < now() THEN 'overdue'
    WHEN c.due_date < now() + INTERVAL '12 hours' THEN 'urgent'
    WHEN c.due_date < now() + INTERVAL '1 day' THEN 'warning'
    ELSE 'on_track'
  END as sla_status,
  EXTRACT(EPOCH FROM (c.due_date - now())) / 3600 as hours_remaining
FROM public.complaints c
LEFT JOIN public.staff s ON c.assigned_to = s.id;

-- Add comment
COMMENT ON COLUMN public.complaints.due_date IS 'SLA deadline for complaint resolution based on category';
COMMENT ON VIEW public.complaint_sla_status IS 'Tracks SLA compliance status for all complaints';