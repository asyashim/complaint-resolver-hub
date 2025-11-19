-- Function to count complaints submitted this week by a user
CREATE OR REPLACE FUNCTION public.count_user_complaints_this_week(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.complaints
  WHERE student_id = _user_id
    AND created_at >= date_trunc('week', CURRENT_TIMESTAMP)
    AND created_at < date_trunc('week', CURRENT_TIMESTAMP) + interval '1 week'
$$;

-- Add RLS policy to enforce 3 complaints per week limit
CREATE POLICY "Students can insert up to 3 complaints per week"
ON public.complaints
FOR INSERT
WITH CHECK (
  auth.uid() = student_id 
  AND count_user_complaints_this_week(auth.uid()) < 3
);

-- Drop the old policy that allowed unlimited complaints
DROP POLICY IF EXISTS "Students can insert own complaints" ON public.complaints;