import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Clock, User, Tag, FileText, Download, UserCheck } from "lucide-react";

interface ComplaintDetailProps {
  complaint: any;
  isAdmin: boolean;
  onUpdate: () => void;
}

const statusColors = {
  open: "bg-warning text-warning-foreground",
  in_progress: "bg-primary text-primary-foreground",
  resolved: "bg-success text-success-foreground",
  closed: "bg-muted text-muted-foreground"
};

const categoryIcons = {
  academic: "🎓",
  technical: "💻",
  hostel: "🏠",
  infrastructure: "🏗️",
  other: "📋"
};

export function ComplaintDetail({ complaint, isAdmin, onUpdate }: ComplaintDetailProps) {
  const [status, setStatus] = useState(complaint.status);
  const [resolutionNote, setResolutionNote] = useState(complaint.resolution_note || "");
  const [loading, setLoading] = useState(false);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [assignedTo, setAssignedTo] = useState(complaint.assigned_to || "");

  useEffect(() => {
    if (isAdmin) {
      fetchStaff();
    }
  }, [isAdmin]);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setStaffMembers(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("complaints")
        .update({
          status,
          resolution_note: resolutionNote,
          assigned_to: assignedTo || null,
          admin_id: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("id", complaint.id);

      if (error) throw error;

      toast.success("Complaint updated successfully!");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to update complaint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-3xl">{categoryIcons[complaint.category as keyof typeof categoryIcons]}</span>
          <Badge variant="outline">
            <Tag className="mr-1 h-3 w-3" />
            {complaint.category}
          </Badge>
          <Badge className={statusColors[status as keyof typeof statusColors]}>
            {status.replace("_", " ")}
          </Badge>
        </div>
        <h2 className="text-2xl font-bold mb-2">{complaint.title}</h2>
        
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Submitted on {format(new Date(complaint.created_at), "MMM dd, yyyy 'at' HH:mm")}
          </div>
          {complaint.profiles && !complaint.is_anonymous && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {complaint.profiles.name}
              {complaint.profiles.student_id && ` (${complaint.profiles.student_id})`}
            </div>
          )}
          {complaint.is_anonymous && isAdmin && (
            <Badge variant="outline" className="text-xs">
              Anonymous Complaint
            </Badge>
          )}
          {complaint.staff && (
            <div className="flex items-center gap-1">
              <UserCheck className="h-4 w-4" />
              Assigned to: {complaint.staff.name} ({complaint.staff.role.replace("_", " ")})
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-base font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Description
        </Label>
        <div className="bg-muted rounded-lg p-4">
          <p className="text-sm whitespace-pre-wrap">{complaint.description}</p>
        </div>
      </div>

      {complaint.attachments && complaint.attachments.length > 0 && (
        <div className="space-y-2">
          <Label className="text-base font-semibold">Attachments</Label>
          <div className="grid gap-2">
            {complaint.attachments.map((attachment: any) => (
              <a
                key={attachment.id}
                href={attachment.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                <span className="text-sm truncate flex-1">{attachment.file_name}</span>
                <Download className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold">Admin Actions</h3>
          
          <div className="space-y-2">
            <Label htmlFor="assigned">Assign To Staff</Label>
            <Select value={assignedTo || "unassigned"} onValueChange={(value) => setAssignedTo(value === "unassigned" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name} - {staff.role.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Update Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution">Resolution Note</Label>
            <Textarea
              id="resolution"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={4}
              placeholder="Add notes about the resolution..."
            />
          </div>

          <Button onClick={handleUpdate} disabled={loading} className="w-full">
            {loading ? "Updating..." : "Update Complaint"}
          </Button>
        </div>
      )}

      {!isAdmin && complaint.resolution_note && (
        <div className="space-y-2 border-t pt-6">
          <Label className="text-base font-semibold">Admin Response</Label>
          <div className="bg-accent/10 rounded-lg p-4">
            <p className="text-sm whitespace-pre-wrap">{complaint.resolution_note}</p>
          </div>
        </div>
      )}

      {!isAdmin && complaint.staff && (
        <div className="space-y-2 border-t pt-6">
          <Label className="text-base font-semibold flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Assigned Staff
          </Label>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm font-medium">{complaint.staff.name}</p>
            <p className="text-xs text-muted-foreground">
              {complaint.staff.role.replace("_", " ")} • {complaint.staff.email}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
