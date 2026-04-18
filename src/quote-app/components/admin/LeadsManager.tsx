import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Badge } from "@/quote-app/components/ui/badge";
import { Button } from "@/quote-app/components/ui/button";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Loader2, ExternalLink, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { EditLeadModal } from "./EditLeadModal";
import { toast } from "@/quote-app/hooks/use-toast";
import { formatPartyType } from "@/quote-app/lib/utils";

export const LeadsManager = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-leads');
      if (error) throw error;
      const leads = (data && (data.leads || data.data || data)) ?? [];
      setLeads(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;

    try {
      const { error } = await supabase.functions.invoke('admin-delete-lead', {
        body: { leadId }
      });

      if (error) throw error;
      toast({ title: "Success", description: "Lead deleted" });
      fetchLeads();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>Manage quote requests and leads</CardDescription>
        </CardHeader>
        <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : leads.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No leads yet
          </p>
        ) : (
          <div className="space-y-4">
            {leads.map(lead => (
              <Card key={lead.id} className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="font-medium">
                        {lead.first_name} {lead.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {lead.email} • {lead.phone}
                      </p>
                      {lead.lead_tags && lead.lead_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {lead.lead_tags.map((lt: any) => (
                            <Badge
                              key={lt.tag.id}
                              style={{ backgroundColor: lt.tag.color, color: "white" }}
                              className="text-xs"
                            >
                              {lt.tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        lead.status === "new" ? "default" :
                        lead.status === "contacted" ? "secondary" :
                        "outline"
                      }>
                        {lead.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm">
                    <p>
                      <span className="font-medium">{formatPartyType(lead.party_type)}</span> • 
                      {lead.guest_count} guests
                    </p>
                    <p className="text-muted-foreground">
                      Event: {format(new Date(lead.event_date), "PPP")}
                    </p>
                    <p className="text-muted-foreground">
                      Submitted: {format(new Date(lead.created_at), "PPP p")}
                    </p>
                    {lead.source_type && (
                      <p className="text-muted-foreground">
                        <span className="font-medium">Source:</span> {lead.source_type.replace(/_/g, ' ')}
                      </p>
                    )}
                    {lead.source_url && lead.source_url !== 'unknown' && (
                      <p className="text-muted-foreground text-xs truncate max-w-md">
                        <span className="font-medium">From:</span> {lead.source_url}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {lead.quote_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(lead.quote_url, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Quote
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingLead(lead);
                        setIsEditModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(lead.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        </CardContent>
      </Card>

      <EditLeadModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={fetchLeads}
        lead={editingLead}
      />
    </>
  );
};
