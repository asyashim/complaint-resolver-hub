import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, X, AlertCircle, Sparkles, Loader2 } from "lucide-react";

interface ComplaintFormProps {
  onSuccess: () => void;
}

export function ComplaintForm({ onSuccess }: ComplaintFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complaintsThisWeek, setComplaintsThisWeek] = useState(0);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const MAX_COMPLAINTS_PER_WEEK = 3;
  const remainingComplaints = MAX_COMPLAINTS_PER_WEEK - complaintsThisWeek;
  const canSubmit = remainingComplaints > 0;

  useEffect(() => {
    const fetchComplaintCount = async () => {
      if (!user) return;
      
      setCheckingLimit(true);
      try {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const { count, error } = await supabase
          .from("complaints")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user.id)
          .gte("created_at", startOfWeek.toISOString());

        if (error) throw error;
        setComplaintsThisWeek(count || 0);
      } catch (error: any) {
        console.error("Error fetching complaint count:", error);
      } finally {
        setCheckingLimit(false);
      }
    };

    fetchComplaintCount();
  }, [user]);

  // Debounced AI suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (description.length > 50) {
        fetchAISuggestions();
      } else {
        setAiSuggestions(null);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [description]);

  const fetchAISuggestions = async () => {
    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-suggestions", {
        body: { complaintText: description },
      });

      if (error) throw error;
      setAiSuggestions(data);
    } catch (error: any) {
      console.error("AI suggestions error:", error);
      // Don't show error toast for AI suggestions - it's optional
    } finally {
      setLoadingAI(false);
    }
  };

  const applySuggestedCategory = () => {
    if (aiSuggestions?.category) {
      setCategory(aiSuggestions.category);
      toast.success("Category applied!");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { data: complaint, error: complaintError } = await supabase
        .from("complaints")
        .insert({
          student_id: user.id,
          title,
          description,
          category: category as "academic" | "technical" | "hostel" | "infrastructure" | "other",
          status: "open",
          is_anonymous: isAnonymous
        })
        .select()
        .single();

      if (complaintError) throw complaintError;

      if (files.length > 0 && complaint) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${complaint.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from("complaint-attachments")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("complaint-attachments")
            .getPublicUrl(fileName);

          await supabase.from("attachments").insert({
            complaint_id: complaint.id,
            file_url: publicUrl,
            file_name: file.name,
            file_size: file.size
          });
        }
      }

      toast.success("Complaint submitted successfully!");
      onSuccess();
    } catch (error: any) {
      if (error.message?.includes("policy")) {
        toast.error("You have reached the maximum of 3 complaints per week");
      } else {
        toast.error(error.message || "Failed to submit complaint");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Submit New Complaint</h2>
        <p className="text-sm text-muted-foreground">
          Please provide details about your issue
        </p>
      </div>

      {!checkingLimit && (
        <Alert variant={canSubmit ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {canSubmit ? (
              <>You can submit <strong>{remainingComplaints}</strong> more complaint{remainingComplaints !== 1 ? 's' : ''} this week</>
            ) : (
              <>You have reached the weekly limit of 3 complaints. Please try again next week.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Brief description of the issue"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="academic">Academic</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="hostel">Hostel</SelectItem>
            <SelectItem value="infrastructure">Infrastructure</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="flex items-center gap-2">
          Description *
          {loadingAI && <Loader2 className="h-3 w-3 animate-spin" />}
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={6}
          placeholder="Provide detailed information about your complaint (AI will suggest category and solutions as you type)..."
        />
        
        {aiSuggestions && (
          <div className="mt-3 p-4 bg-accent/10 rounded-lg border space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Suggestions
            </div>

            {/* Suggested Category */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Suggested Category:</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {aiSuggestions.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ({Math.round(aiSuggestions.confidence * 100)}% confidence)
                </span>
                {category !== aiSuggestions.category && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={applySuggestedCategory}
                    className="h-6 text-xs"
                  >
                    Apply
                  </Button>
                )}
              </div>
            </div>

            {/* Similar Complaints */}
            {aiSuggestions.similarComplaints?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Similar Past Complaints:</p>
                <ul className="text-xs space-y-1 ml-3">
                  {aiSuggestions.similarComplaints.slice(0, 3).map((complaint: string, idx: number) => (
                    <li key={idx} className="list-disc">{complaint}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {aiSuggestions.suggestions?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Potential Solutions:</p>
                <ul className="text-xs space-y-1 ml-3">
                  {aiSuggestions.suggestions.map((suggestion: string, idx: number) => (
                    <li key={idx} className="list-disc">{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="anonymous"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="anonymous" className="text-sm font-normal cursor-pointer">
          Submit anonymously (your identity will be hidden from admins)
        </Label>
      </div>

      <div className="space-y-2">
        <Label>Attachments (optional)</Label>
        <div className="space-y-2">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                multiple
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx"
              />
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button 
          type="submit" 
          disabled={loading || !canSubmit || checkingLimit}
        >
          {checkingLimit ? "Checking limit..." : loading ? "Submitting..." : "Submit Complaint"}
        </Button>
      </div>
    </form>
  );
}
