import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, User, Tag, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { ComplaintDetail } from "./ComplaintDetail";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ComplaintListProps {
  complaints: any[];
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

export function ComplaintList({ complaints, isAdmin, onUpdate }: ComplaintListProps) {
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  if (complaints.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No complaints found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {complaints.map((complaint) => (
          <Card 
            key={complaint.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedComplaint(complaint)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{categoryIcons[complaint.category as keyof typeof categoryIcons]}</span>
                    <Badge variant="outline" className="text-xs">
                      <Tag className="mr-1 h-3 w-3" />
                      {complaint.category}
                    </Badge>
                    <Badge className={statusColors[complaint.status as keyof typeof statusColors]}>
                      {complaint.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-lg truncate">{complaint.title}</h3>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {complaint.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(complaint.created_at), "MMM dd, yyyy")}
                </div>
                
                {isAdmin && complaint.profiles && !complaint.is_anonymous && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {complaint.profiles.name}
                    {complaint.profiles.student_id && ` (${complaint.profiles.student_id})`}
                  </div>
                )}

                {isAdmin && complaint.is_anonymous && (
                  <Badge variant="outline" className="text-xs">
                    Anonymous
                  </Badge>
                )}

                {complaint.attachments && complaint.attachments.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    {complaint.attachments.length} attachment{complaint.attachments.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedComplaint} onOpenChange={(open) => !open && setSelectedComplaint(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedComplaint && (
            <ComplaintDetail 
              complaint={selectedComplaint} 
              isAdmin={isAdmin}
              onUpdate={() => {
                onUpdate();
                setSelectedComplaint(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
