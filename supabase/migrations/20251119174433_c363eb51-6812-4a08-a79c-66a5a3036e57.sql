-- Allow users to insert their own role during signup
CREATE POLICY "Users can insert own role during signup"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow admins to insert any role
CREATE POLICY "Admins can insert any role"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Update the handle_new_user trigger to also create the user role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, name, email, student_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    NEW.raw_user_meta_data->>'student_id'
  );
  
  -- Determine role based on student_id presence
  IF NEW.raw_user_meta_data->>'student_id' IS NULL THEN
    user_role := 'admin';
  ELSE
    user_role := 'student';
  END IF;
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;