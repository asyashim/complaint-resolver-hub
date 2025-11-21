-- Fix security issues

-- Drop and recreate the view without security definer
DROP VIEW IF EXISTS public.complaint_sla_status;

-- Fix the calculate_sla_due_date function with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_sla_due_date(complaint_category complaint_category)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
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

-- Recreate the view as a regular view (not security definer)
CREATE VIEW public.complaint_sla_status AS
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