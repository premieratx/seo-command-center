import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/quote-app/components/ui/dialog";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { Badge } from "@/quote-app/components/ui/badge";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { toast } from "@/quote-app/hooks/use-toast";
import { Loader2, X } from "lucide-react";

interface EditLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  lead: any;
}

export const EditLeadModal = ({ open, onOpenChange, onSuccess, lead }: EditLeadModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    first_name: lead?.first_name || "",
    last_name: lead?.last_name || "",
    email: lead?.email || "",
    phone: lead?.phone || "",
    party_type: lead?.party_type || "",
    guest_count: lead?.guest_count || "",
    event_date: lead?.event_date || "",
    status: lead?.status || "new"
  });

  useEffect(() => {
    if (open && lead) {
      setFormData({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        party_type: lead.party_type,
        guest_count: lead.guest_count,
        event_date: lead.event_date,
        status: lead.status
      });
      fetchTags();
      fetchLeadTags();
    }
  }, [open, lead]);

  const fetchTags = async () => {
    const { data } = await supabase.from("tags").select("*").order("name");
    setTags(data || []);
  };

  const fetchLeadTags = async () => {
    if (!lead?.id) return;
    const { data } = await supabase
      .from("lead_tags")
      .select("tag_id")
      .eq("lead_id", lead.id);
    setSelectedTags(data?.map(t => t.tag_id) || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Update lead via admin function
      const { error: updateError } = await supabase.functions.invoke('admin-update-lead', {
        body: {
          leadId: lead.id,
          updates: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
            party_type: formData.party_type,
            guest_count: parseInt(formData.guest_count),
            event_date: formData.event_date,
            status: formData.status
          }
        }
      });

      if (updateError) throw updateError;

      // Update tags
      await supabase.from("lead_tags").delete().eq("lead_id", lead.id);
      
      if (selectedTags.length > 0) {
        const tagInserts = selectedTags.map(tag_id => ({
          lead_id: lead.id,
          tag_id
        }));
        await supabase.from("lead_tags").insert(tagInserts);
      }

      toast({ title: "Success", description: "Lead updated successfully" });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
          <DialogDescription>
            Update lead information and assign tags
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="party_type">Party Type *</Label>
              <Input
                id="party_type"
                value={formData.party_type}
                onChange={(e) => setFormData({ ...formData, party_type: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest_count">Guest Count *</Label>
              <Input
                id="guest_count"
                type="number"
                min="1"
                value={formData.guest_count}
                onChange={(e) => setFormData({ ...formData, guest_count: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_date">Event Date *</Label>
              <Input
                id="event_date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px]">
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <Badge
                    key={tag.id}
                    style={{ 
                      backgroundColor: isSelected ? tag.color : "transparent",
                      color: isSelected ? "white" : tag.color,
                      borderColor: tag.color,
                      cursor: "pointer"
                    }}
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => toggleTag(tag.id)}
                    className="cursor-pointer"
                  >
                    {tag.name}
                  </Badge>
                );
              })}
              {tags.length === 0 && (
                <p className="text-sm text-muted-foreground">No tags available. Create tags in the Tags tab.</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
