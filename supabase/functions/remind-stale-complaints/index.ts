import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking for stale complaints...");

    // Get complaints that haven't been updated in 2+ days
    const { data: staleComplaints, error: staleError } = await supabase
      .rpc("get_stale_complaints");

    if (staleError) {
      console.error("Error fetching stale complaints:", staleError);
      throw staleError;
    }

    console.log(`Found ${staleComplaints?.length || 0} stale complaints`);

    if (!staleComplaints || staleComplaints.length === 0) {
      return new Response(
        JSON.stringify({ message: "No stale complaints found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send notifications for each stale complaint
    const notifications = [];
    
    for (const complaint of staleComplaints) {
      // Notify admin if assigned
      if (complaint.admin_id) {
        notifications.push({
          user_id: complaint.admin_id,
          title: "Complaint Needs Attention",
          message: `Complaint "${complaint.title}" hasn't been updated in 2+ days`,
          type: "reminder",
          complaint_id: complaint.complaint_id,
        });
      }

      // Notify assigned staff
      if (complaint.assigned_to) {
        const { data: staffData } = await supabase
          .from("staff")
          .select("user_id")
          .eq("id", complaint.assigned_to)
          .single();

        if (staffData) {
          notifications.push({
            user_id: staffData.user_id,
            title: "Complaint Needs Attention",
            message: `Complaint "${complaint.title}" hasn't been updated in 2+ days`,
            type: "reminder",
            complaint_id: complaint.complaint_id,
          });
        }
      }
    }

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Error creating notifications:", notifError);
        throw notifError;
      }

      console.log(`Created ${notifications.length} reminder notifications`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        staleCount: staleComplaints.length,
        notificationsSent: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in remind-stale-complaints:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
