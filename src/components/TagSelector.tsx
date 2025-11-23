import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  complaintId: string;
  selectedTags: Tag[];
  onTagsChange: () => void;
}

export function TagSelector({ complaintId, selectedTags, onTagsChange }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");

      if (error) throw error;
      setAllTags(data || []);
    } catch (error: any) {
      console.error("Error fetching tags:", error);
    }
  };

  const handleAddTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from("complaint_tags")
        .insert({ complaint_id: complaintId, tag_id: tagId });

      if (error) throw error;
      toast.success("Tag added");
      onTagsChange();
      setOpen(false);
    } catch (error: any) {
      console.error("Error adding tag:", error);
      toast.error(error.message || "Failed to add tag");
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from("complaint_tags")
        .delete()
        .eq("complaint_id", complaintId)
        .eq("tag_id", tagId);

      if (error) throw error;
      toast.success("Tag removed");
      onTagsChange();
    } catch (error: any) {
      console.error("Error removing tag:", error);
      toast.error(error.message || "Failed to remove tag");
    }
  };

  const availableTags = allTags.filter(
    (tag) => !selectedTags.some((st) => st.id === tag.id)
  );

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {selectedTags.map((tag) => (
        <div key={tag.id} className="flex items-center gap-1">
          <Badge
            style={{ backgroundColor: tag.color }}
            className="text-white"
          >
            #{tag.name}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => handleRemoveTag(tag.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      
      {availableTags.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6">
              <Plus className="h-3 w-3 mr-1" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <div className="space-y-1">
              {availableTags.map((tag) => (
                <Button
                  key={tag.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleAddTag(tag.id)}
                >
                  <Badge
                    style={{ backgroundColor: tag.color }}
                    className="text-white mr-2"
                  >
                    #{tag.name}
                  </Badge>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
