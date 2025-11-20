import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, FileText } from "lucide-react";
import { ComplaintForm } from "@/components/ComplaintForm";
import { ComplaintList } from "@/components/ComplaintList";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { NotificationBell } from "@/components/NotificationBell";

export default function StudentDashboard() {
  const { user, signOut } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchComplaints();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();
    setProfile(data);
  };

  const fetchComplaints = async () => {
    const { data } = await supabase
      .from("complaints")
      .select(`
        *,
        attachments (*)
      `)
      .eq("student_id", user?.id)
      .order("created_at", { ascending: false });
    setComplaints(data || []);
  };

  const handleComplaintSubmitted = () => {
    setShowForm(false);
    fetchComplaints();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Student Portal</h1>
            {profile && (
              <p className="text-sm text-muted-foreground">
                Welcome, {profile.name} {profile.student_id && `(${profile.student_id})`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button onClick={signOut} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">My Complaints</h2>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Complaint
          </Button>
        </div>

        <ComplaintList complaints={complaints} isAdmin={false} onUpdate={fetchComplaints} />

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <ComplaintForm onSuccess={handleComplaintSubmitted} />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
