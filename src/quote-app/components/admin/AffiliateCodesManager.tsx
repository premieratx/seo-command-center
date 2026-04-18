import { useState, useEffect } from "react";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/quote-app/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/quote-app/components/ui/dialog";
import { Badge } from "@/quote-app/components/ui/badge";
import { Switch } from "@/quote-app/components/ui/switch";
import { toast } from "sonner";
import { Plus, Copy, Eye, Trash2 } from "lucide-react";

interface AffiliateCode {
  id: string;
  code: string;
  commission_rate: number;
  active: boolean;
  usage_count: number;
  created_at: string;
}

interface AffiliateCodesManagerProps {
  affiliateId: string;
  affiliateName: string;
}

export function AffiliateCodesManager({ affiliateId, affiliateName }: AffiliateCodesManagerProps) {
  const [codes, setCodes] = useState<AffiliateCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newRate, setNewRate] = useState("10");

  useEffect(() => {
    loadCodes();
  }, [affiliateId]);

  const loadCodes = async () => {
    try {
      const { data, error } = await supabase
        .from("affiliate_codes")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error("Error loading codes:", error);
      toast.error("Failed to load affiliate codes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCode.trim()) {
      toast.error("Please enter a code");
      return;
    }

    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Please enter a valid commission rate (0-100)");
      return;
    }

    try {
      const { error } = await supabase
        .from("affiliate_codes")
        .insert({
          affiliate_id: affiliateId,
          code: newCode.trim().toUpperCase(),
          commission_rate: rate,
          active: true,
        });

      if (error) throw error;

      toast.success("Code created successfully");
      setShowDialog(false);
      setNewCode("");
      setNewRate("10");
      loadCodes();
    } catch (error: any) {
      console.error("Error creating code:", error);
      if (error.code === '23505') {
        toast.error("This code already exists");
      } else {
        toast.error("Failed to create code");
      }
    }
  };

  const handleToggleActive = async (codeId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("affiliate_codes")
        .update({ active: !currentActive })
        .eq("id", codeId);

      if (error) throw error;
      toast.success(`Code ${!currentActive ? 'activated' : 'deactivated'}`);
      loadCodes();
    } catch (error) {
      console.error("Error updating code:", error);
      toast.error("Failed to update code");
    }
  };

  const handleDelete = async (codeId: string) => {
    if (!confirm("Are you sure you want to delete this code?")) return;

    try {
      const { error } = await supabase
        .from("affiliate_codes")
        .delete()
        .eq("id", codeId);

      if (error) throw error;
      toast.success("Code deleted");
      loadCodes();
    } catch (error) {
      console.error("Error deleting code:", error);
      toast.error("Failed to delete code");
    }
  };

  const copyToClipboard = (code: string) => {
    const url = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  if (loading) {
    return <div>Loading codes...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Affiliate Codes for {affiliateName}</CardTitle>
              <CardDescription>Manage custom tracking codes with individual commission rates</CardDescription>
            </div>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Code
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No codes yet. Create your first affiliate code to start tracking.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Commission Rate</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono font-medium">{code.code}</TableCell>
                    <TableCell>{code.commission_rate}%</TableCell>
                    <TableCell>{code.usage_count} clicks</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={code.active}
                          onCheckedChange={() => handleToggleActive(code.id, code.active)}
                        />
                        <Badge variant={code.active ? "default" : "secondary"}>
                          {code.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(code.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(code.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(code.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Affiliate Code</DialogTitle>
            <DialogDescription>
              Create a custom tracking code with a specific commission rate
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                placeholder="SUMMER2025"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Will be used as: {window.location.origin}/?ref={newCode.toUpperCase() || 'CODE'}
              </p>
            </div>
            <div>
              <Label htmlFor="rate">Commission Rate (%) *</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Create Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
