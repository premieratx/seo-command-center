import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Badge } from "@/quote-app/components/ui/badge";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { toast } from "@/quote-app/hooks/use-toast";
import { Loader2, Plus, Trash2, Edit } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export const TagsManager = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#3b82f6"
  });

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTags(data || []);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Tag name is required", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    
    try {
      if (editingId) {
        const { error } = await supabase
          .from("tags")
          .update({ name: formData.name, color: formData.color })
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Success", description: "Tag updated" });
      } else {
        const { error } = await supabase
          .from("tags")
          .insert({ name: formData.name, color: formData.color });

        if (error) throw error;
        toast({ title: "Success", description: "Tag created" });
      }

      setFormData({ name: "", color: "#3b82f6" });
      setEditingId(null);
      fetchTags();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (tag: Tag) => {
    setFormData({ name: tag.name, color: tag.color });
    setEditingId(tag.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will remove the tag from all leads and bookings.")) return;

    const { error } = await supabase
      .from("tags")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Tag deleted" });
      fetchTags();
    }
  };

  const cancelEdit = () => {
    setFormData({ name: "", color: "#3b82f6" });
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Tag" : "Create New Tag"}</CardTitle>
          <CardDescription>
            Tags help organize and filter leads and bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tag Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., VIP, Follow-up, Urgent"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Badge style={{ backgroundColor: formData.color, color: "white" }}>
                    {formData.name || "Preview"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : editingId ? (
                  "Update Tag"
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tag
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Tags ({tags.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No tags yet. Create your first tag above.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 p-2 rounded-md border bg-card"
                >
                  <Badge style={{ backgroundColor: tag.color, color: "white" }}>
                    {tag.name}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(tag)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(tag.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
