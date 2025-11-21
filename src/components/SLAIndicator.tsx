import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { differenceInHours, differenceInMinutes, format } from "date-fns";

interface SLAIndicatorProps {
  dueDate: string | null;
  status: string;
  showDetails?: boolean;
}

export function SLAIndicator({ dueDate, status, showDetails = false }: SLAIndicatorProps) {
  if (!dueDate) {
    return null;
  }

  const now = new Date();
  const due = new Date(dueDate);
  const hoursRemaining = differenceInHours(due, now);
  const minutesRemaining = differenceInMinutes(due, now);
  const isCompleted = status === 'resolved' || status === 'closed';

  let slaStatus: 'completed' | 'overdue' | 'urgent' | 'warning' | 'on_track';
  let icon;
  let variant: "default" | "secondary" | "destructive" | "outline";
  let label: string;

  if (isCompleted) {
    slaStatus = 'completed';
    icon = <CheckCircle2 className="h-3 w-3" />;
    variant = "secondary";
    label = "Completed";
  } else if (hoursRemaining < 0) {
    slaStatus = 'overdue';
    icon = <AlertCircle className="h-3 w-3" />;
    variant = "destructive";
    label = `Overdue by ${Math.abs(hoursRemaining)}h`;
  } else if (hoursRemaining < 12) {
    slaStatus = 'urgent';
    icon = <AlertTriangle className="h-3 w-3" />;
    variant = "destructive";
    label = minutesRemaining < 60 
      ? `${minutesRemaining}m remaining`
      : `${hoursRemaining}h remaining`;
  } else if (hoursRemaining < 24) {
    slaStatus = 'warning';
    icon = <Clock className="h-3 w-3" />;
    variant = "outline";
    label = `${hoursRemaining}h remaining`;
  } else {
    slaStatus = 'on_track';
    icon = <Clock className="h-3 w-3" />;
    variant = "default";
    const days = Math.floor(hoursRemaining / 24);
    label = `${days}d ${hoursRemaining % 24}h remaining`;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={variant} className="flex items-center gap-1">
        {icon}
        {label}
      </Badge>
      {showDetails && !isCompleted && (
        <span className="text-xs text-muted-foreground">
          Due: {format(due, "MMM dd, yyyy 'at' HH:mm")}
        </span>
      )}
    </div>
  );
}