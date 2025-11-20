-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  complaint_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Function to notify admins of new complaint
CREATE OR REPLACE FUNCTION public.notify_admins_new_complaint()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN 
    SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, complaint_id)
    VALUES (
      admin_record.user_id,
      'New Complaint Submitted',
      'A new complaint "' || NEW.title || '" has been submitted.',
      'complaint_submitted',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- Function to notify student of status change
CREATE OR REPLACE FUNCTION public.notify_student_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, complaint_id)
    VALUES (
      NEW.student_id,
      'Complaint Status Updated',
      'Your complaint "' || NEW.title || '" status changed to ' || NEW.status || '.',
      'status_changed',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Function to notify student of admin reply
CREATE OR REPLACE FUNCTION public.notify_student_admin_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.resolution_note IS DISTINCT FROM NEW.resolution_note AND NEW.resolution_note IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, complaint_id)
    VALUES (
      NEW.student_id,
      'Admin Reply Received',
      'An admin has replied to your complaint "' || NEW.title || '".',
      'admin_reply',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_complaint_created
AFTER INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_complaint();

CREATE TRIGGER on_complaint_status_changed
AFTER UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_status_change();

CREATE TRIGGER on_admin_reply
AFTER UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_admin_reply();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;