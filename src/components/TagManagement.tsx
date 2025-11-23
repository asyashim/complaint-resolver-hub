import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export function TagManagement() {
  const { t } = useTranslation();
  const [tags, setTags] = useState<Tag[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [loading, setLoading] = useState(false);

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
      setTags(data || []);
    } catch (error: any) {
      console.error("Error fetching tags:", error);
      toast.error("Failed to load tags");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingTag) {
        const { error } = await supabase
          .from("tags")
          .update({ name, color })
          .eq("id", editingTag.id);

        if (error) throw error;
        toast.success("Tag updated successfully");
      } else {
        const { error } = await supabase
          .from("tags")
          .insert({ name, color });

        if (error) throw error;
        toast.success("Tag created successfully");
      }

      setShowDialog(false);
      resetForm();
      fetchTags();
    } catch (error: any) {
      console.error("Error saving tag:", error);
      toast.error(error.message || "Failed to save tag");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;

    try {
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Tag deleted successfully");
      fetchTags();
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      toast.error(error.message || "Failed to delete tag");
    }
  };

  const resetForm = () => {
    setEditingTag(null);
    setName("");
    setColor("#3b82f6");
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    resetForm();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tag Management
            </CardTitle>
            <CardDescription>
              Create and manage tags for organizing complaints
            </CardDescription>
          </div>
          <Button onClick={() => setShowDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Tag
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-1 p-1 pr-2 rounded-lg border bg-card"
            >
              <Badge
                style={{ backgroundColor: tag.color }}
                className="text-white"
              >
                #{tag.name}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleEdit(tag)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleDelete(tag.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground">No tags created yet</p>
          )}
        </div>
      </CardContent>

      <Dialog open={showDialog} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTag ? "Edit Tag" : "Create New Tag"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tag Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., urgent, technical"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Badge style={{ backgroundColor: color }} className="text-white">
                  #{name || "preview"}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleDialogClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editingTag ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
