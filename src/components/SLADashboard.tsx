import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, TrendingUp, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { StarRating } from "./StarRating";

interface SLAStats {
  total: number;
  completed: number;
  overdue: number;
  urgent: number;
  warning: number;
  onTrack: number;
  complianceRate: number;
  averageRating: number;
  totalFeedback: number;
}

export function SLADashboard() {
  const [stats, setStats] = useState<SLAStats>({
    total: 0,
    completed: 0,
    overdue: 0,
    urgent: 0,
    warning: 0,
    onTrack: 0,
    complianceRate: 0,
    averageRating: 0,
    totalFeedback: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSLAStats();
  }, []);

  const fetchSLAStats = async () => {
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("id, status, due_date, rating");

      if (error) throw error;

      const now = new Date();
      const complaints = data || [];
      
      let completed = 0;
      let overdue = 0;
      let urgent = 0;
      let warning = 0;
      let onTrack = 0;

      complaints.forEach(complaint => {
        const isCompleted = complaint.status === 'resolved' || complaint.status === 'closed';
        
        if (isCompleted) {
          completed++;
        } else if (complaint.due_date) {
          const due = new Date(complaint.due_date);
          const hoursRemaining = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

          if (hoursRemaining < 0) {
            overdue++;
          } else if (hoursRemaining < 12) {
            urgent++;
          } else if (hoursRemaining < 24) {
            warning++;
          } else {
            onTrack++;
          }
        }
      });

      const total = complaints.length;
      const activeComplaints = total - completed;
      const compliant = completed + onTrack + warning + urgent;
      const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;

      // Calculate feedback statistics
      const complaintsWithRating = complaints.filter(c => c.rating);
      const totalFeedback = complaintsWithRating.length;
      const sumRatings = complaintsWithRating.reduce((sum, c) => sum + (c.rating || 0), 0);
      const averageRating = totalFeedback > 0 ? Number((sumRatings / totalFeedback).toFixed(1)) : 0;

      setStats({
        total,
        completed,
        overdue,
        urgent,
        warning,
        onTrack,
        complianceRate,
        averageRating,
        totalFeedback
      });
    } catch (error) {
      console.error("Error fetching SLA stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading SLA statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">SLA Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Service Level Agreement compliance and resolution tracking
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completed} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.complianceRate}%</div>
            <Progress value={stats.complianceRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.onTrack}</div>
            <p className="text-xs text-muted-foreground">
              Within SLA timeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{stats.averageRating}</span>
              <StarRating rating={Math.round(stats.averageRating)} readonly size="sm" />
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalFeedback} feedback responses
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SLA Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-sm">Completed</span>
              </div>
              <span className="text-sm font-medium">{stats.completed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span className="text-sm">On Track</span>
              </div>
              <span className="text-sm font-medium">{stats.onTrack}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-warning" />
                <span className="text-sm">Warning (&lt;24h)</span>
              </div>
              <span className="text-sm font-medium">{stats.warning}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-500" />
                <span className="text-sm">Urgent (&lt;12h)</span>
              </div>
              <span className="text-sm font-medium">{stats.urgent}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <span className="text-sm">Overdue</span>
              </div>
              <span className="text-sm font-medium">{stats.overdue}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-semibold mb-2">SLA Resolution Times</h3>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span>🎓 Academic issues</span>
            <span className="font-medium">3 days</span>
          </div>
          <div className="flex justify-between">
            <span>🏠 Hostel issues</span>
            <span className="font-medium">2 days</span>
          </div>
          <div className="flex justify-between">
            <span>💻 Technical/IT issues</span>
            <span className="font-medium">24 hours</span>
          </div>
          <div className="flex justify-between">
            <span>🏗️ Infrastructure issues</span>
            <span className="font-medium">24 hours</span>
          </div>
          <div className="flex justify-between">
            <span>📋 Other issues</span>
            <span className="font-medium">3 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}