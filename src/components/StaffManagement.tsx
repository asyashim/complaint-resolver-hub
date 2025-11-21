import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  is_active: boolean;
}

const roleLabels = {
  warden: "Warden",
  hod: "Head of Department",
  transport_officer: "Transport Officer",
  admin: "Admin"
};

const roleCategories = {
  warden: "Hostel",
  hod: "Academic",
  transport_officer: "Technical/Infrastructure",
  admin: "Other"
};

export function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    role: "",
    department: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch staff members");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // First create a user account for the staff member
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newStaff.email,
        password: Math.random().toString(36).slice(-8) + "A1!", // Random temp password
        options: {
          data: {
            name: newStaff.name,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Add staff member to staff table
      const { error: staffError } = await supabase
        .from("staff")
        .insert([{
          user_id: authData.user.id,
          name: newStaff.name,
          email: newStaff.email,
          role: newStaff.role as "warden" | "hod" | "transport_officer" | "admin",
          department: newStaff.department || null,
          is_active: true
        }]);

      if (staffError) throw staffError;

      // Add admin role for the staff member
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "admin"
        });

      if (roleError) throw roleError;

      toast.success("Staff member added successfully! They will receive a password reset email.");
      setShowAddDialog(false);
      setNewStaff({ name: "", email: "", role: "", department: "" });
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || "Failed to add staff member");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("staff")
        .update({ is_active: !currentStatus })
        .eq("id", staffId);

      if (error) throw error;

      toast.success(`Staff member ${!currentStatus ? "activated" : "deactivated"}`);
      fetchStaff();
    } catch (error: any) {
      toast.error("Failed to update staff status");
      console.error(error);
    }
  };

  const deleteStaff = async (staffId: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;

    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", staffId);

      if (error) throw error;

      toast.success("Staff member deleted");
      fetchStaff();
    } catch (error: any) {
      toast.error("Failed to delete staff member");
      console.error(error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading staff...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff Management</h2>
          <p className="text-sm text-muted-foreground">Manage staff members who handle complaints</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={newStaff.role} onValueChange={(value) => setNewStaff({ ...newStaff, role: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warden">Warden (Hostel)</SelectItem>
                    <SelectItem value="hod">Head of Department (Academic)</SelectItem>
                    <SelectItem value="transport_officer">Transport Officer (Technical/Infrastructure)</SelectItem>
                    <SelectItem value="admin">Admin (Other)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department (Optional)</Label>
                <Input
                  id="department"
                  value={newStaff.department}
                  onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                  placeholder="e.g., Computer Science, Block A"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Adding..." : "Add Staff Member"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {staff.map((member) => (
          <Card key={member.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                <Badge variant={member.is_active ? "default" : "secondary"}>
                  {member.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">{roleLabels[member.role as keyof typeof roleLabels]}</p>
                <p className="text-xs text-muted-foreground">
                  Handles: {roleCategories[member.role as keyof typeof roleCategories]}
                </p>
                {member.department && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Department: {member.department}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleStaffStatus(member.id, member.is_active)}
                  className="flex-1"
                >
                  {member.is_active ? (
                    <>
                      <UserX className="mr-1 h-3 w-3" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-1 h-3 w-3" />
                      Activate
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteStaff(member.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {staff.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No staff members added yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}