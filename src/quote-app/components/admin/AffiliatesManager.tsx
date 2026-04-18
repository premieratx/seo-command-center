import { useState, useEffect, useRef } from "react";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/quote-app/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/quote-app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { Badge } from "@/quote-app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { toast } from "sonner";
import { UserPlus, DollarSign, Link, Code, Check, Settings, Upload, Pencil, Trash2, Download, ArrowUpDown } from "lucide-react";
import { getAffiliateLinks, generateAffiliateEmbedCode } from "@/quote-app/lib/affiliateTracking";
import { AffiliateLeaderboard } from "./AffiliateLeaderboard";
import { AffiliateCodesManager } from "./AffiliateCodesManager";
import { Textarea } from "@/quote-app/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/quote-app/components/ui/alert-dialog";

type SortField = 'contact_name' | 'affiliate_code' | 'commission_rate' | 'clicks' | 'conversions' | 'code_redemptions' | 'available_balance' | 'total_earned' | 'status';
type SortDirection = 'asc' | 'desc';

export default function AffiliatesManager() {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null);
  const [showLinksDialog, setShowLinksDialog] = useState(false);
  const [showCodesDialog, setShowCodesDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [affiliateToDelete, setAffiliateToDelete] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [sortField, setSortField] = useState<SortField>('contact_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    contact_name: "",
    email: "",
    company_name: "",
    phone: "",
    venmo_id: "",
    commission_rate: "10",
    payout_threshold: "100",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    loadAffiliates();
  }, []);

  const loadAffiliates = async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke('admin-affiliate-stats', {
        body: { startDate: null, endDate: null }
      });

      if (error) throw error;

      setAffiliates(result?.affiliates || []);
    } catch (error) {
      console.error("Error loading affiliates:", error);
      toast.error("Failed to load affiliates");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAffiliates = [...affiliates].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    // Handle numeric values
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    // Handle string values
    const aStr = String(aVal || '').toLowerCase();
    const bStr = String(bVal || '').toLowerCase();
    
    if (sortDirection === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });

  const handleCreateAffiliate = async () => {
    try {
      if (!formData.contact_name || !formData.email) {
        toast.error("Name and email are required");
        return;
      }

      if (editMode && selectedAffiliate) {
        // Update existing affiliate
        const { error } = await supabase
          .from("affiliates")
          .update({
            contact_name: formData.contact_name,
            email: formData.email,
            company_name: formData.company_name,
            phone: formData.phone,
            venmo_id: formData.venmo_id,
            commission_rate: parseFloat(formData.commission_rate),
            payout_threshold: parseFloat(formData.payout_threshold),
            status: formData.status,
            notes: formData.notes,
          })
          .eq("id", selectedAffiliate.id);

        if (error) throw error;
        toast.success("Affiliate updated successfully");
      } else {
        // Generate affiliate code
        const { data: codeData, error: codeError } = await supabase
          .rpc('generate_affiliate_code');

        if (codeError) throw codeError;

        const { error } = await supabase
          .from("affiliates")
          .insert({
            ...formData,
            affiliate_code: codeData,
            commission_rate: parseFloat(formData.commission_rate),
            payout_threshold: parseFloat(formData.payout_threshold),
          });

        if (error) throw error;
        toast.success("Affiliate created successfully");
      }

      setShowDialog(false);
      setEditMode(false);
      resetForm();
      loadAffiliates();
    } catch (error) {
      console.error("Error saving affiliate:", error);
      toast.error("Failed to save affiliate");
    }
  };

  const handleUpdateStatus = async (affiliateId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("affiliates")
        .update({ status })
        .eq("id", affiliateId);

      if (error) throw error;

      toast.success("Status updated");
      loadAffiliates();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleProcessPayout = async (affiliate: any) => {
    try {
      // Get approved conversions
      const { data: conversions } = await supabase
        .from("affiliate_conversions")
        .select("id")
        .eq("affiliate_id", affiliate.id)
        .eq("status", "approved");

      if (!conversions || conversions.length === 0) {
        toast.error("No approved conversions to payout");
        return;
      }

      const conversionIds = conversions.map(c => c.id);

      const { error } = await supabase.functions.invoke('process-affiliate-payout', {
        body: {
          affiliateId: affiliate.id,
          conversionIds,
        },
      });

      if (error) throw error;

      toast.success("Payout processed successfully");
      loadAffiliates();
    } catch (error) {
      console.error("Error processing payout:", error);
      toast.error("Failed to process payout");
    }
  };

  const handleDeleteAffiliate = async () => {
    if (!affiliateToDelete) return;

    try {
      const { error } = await supabase
        .from("affiliates")
        .delete()
        .eq("id", affiliateToDelete.id);

      if (error) throw error;

      toast.success("Affiliate deleted successfully");
      setShowDeleteDialog(false);
      setAffiliateToDelete(null);
      loadAffiliates();
    } catch (error) {
      console.error("Error deleting affiliate:", error);
      toast.error("Failed to delete affiliate");
    }
  };

  const handleEditAffiliate = (affiliate: any) => {
    setSelectedAffiliate(affiliate);
    setEditMode(true);
    setFormData({
      contact_name: affiliate.contact_name || "",
      email: affiliate.email || "",
      company_name: affiliate.company_name || "",
      phone: affiliate.phone || "",
      venmo_id: affiliate.venmo_id || "",
      commission_rate: String(affiliate.commission_rate || "10"),
      payout_threshold: String(affiliate.payout_threshold || "100"),
      status: affiliate.status || "active",
      notes: affiliate.notes || "",
    });
    setShowDialog(true);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("CSV file appears to be empty");
        return;
      }

      // Parse CSV (simple parser - doesn't handle quotes/commas in fields)
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const affiliatesToCreate = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        // Generate affiliate code
        const { data: codeData, error: codeError } = await supabase
          .rpc('generate_affiliate_code');

        if (codeError) throw codeError;

        affiliatesToCreate.push({
          contact_name: row.name || row.contact_name || "",
          email: row.email || "",
          company_name: row.company || row.company_name || "",
          phone: row.phone || "",
          venmo_id: row.venmo || row.venmo_id || "",
          commission_rate: parseFloat(row.commission_rate || row.commission || "10"),
          payout_threshold: parseFloat(row.payout_threshold || "100"),
          status: row.status || "active",
          notes: row.notes || "",
          affiliate_code: codeData,
        });
      }

      if (affiliatesToCreate.length === 0) {
        toast.error("No valid affiliate data found in CSV");
        return;
      }

      const { error } = await supabase
        .from("affiliates")
        .insert(affiliatesToCreate);

      if (error) throw error;

      toast.success(`Successfully imported ${affiliatesToCreate.length} affiliates`);
      loadAffiliates();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error importing CSV:", error);
      toast.error("Failed to import CSV file");
    }
  };

  const resetForm = () => {
    setFormData({
      contact_name: "",
      email: "",
      company_name: "",
      phone: "",
      venmo_id: "",
      commission_rate: "10",
      payout_threshold: "100",
      status: "active",
      notes: "",
    });
    setEditMode(false);
    setSelectedAffiliate(null);
  };

  const showAffiliateLinks = (affiliate: any) => {
    setSelectedAffiliate(affiliate);
    setShowLinksDialog(true);
  };

  const showAffiliateCodes = (affiliate: any) => {
    setSelectedAffiliate(affiliate);
    setShowCodesDialog(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const exportToCSV = () => {
    const csvData = affiliates.map(affiliate => ({
      'Contact Name': affiliate.contact_name,
      'Email': affiliate.email,
      'Phone': affiliate.phone || '',
      'Company': affiliate.company_name || '',
      'Affiliate Code': affiliate.affiliate_code,
      'Commission Rate': affiliate.commission_rate,
      'Status': affiliate.status,
      'Total Earnings': affiliate.total_earnings,
      'Available Balance': affiliate.available_balance,
      'Affiliate Link': `https://premierpartycruises.com/?ref=${affiliate.affiliate_code}`
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `affiliates-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("CSV exported successfully!");
  };

  if (loading) {
    return <div>Loading affiliates...</div>;
  }

  return (
    <Tabs defaultValue="list" className="space-y-4">
      <TabsList>
        <TabsTrigger value="list">Affiliates</TabsTrigger>
        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Affiliate Management</CardTitle>
                <CardDescription>
                  Manage affiliate partners and track performance. 
                  <span className="block mt-2 text-xs">
                    CSV Format: name, email, company, phone, venmo, commission_rate, payout_threshold, status, notes
                  </span>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
                <Button 
                  variant="outline" 
                  onClick={exportToCSV}
                  disabled={affiliates.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button onClick={() => {
                  resetForm();
                  setShowDialog(true);
                }}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Affiliate
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('contact_name')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Name <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('affiliate_code')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Code <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </Button>
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('commission_rate')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Commission <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('clicks')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Clicks <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('conversions')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Conversions <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('code_redemptions')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Code Uses <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('available_balance')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Balance <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('total_earned')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Total Earned <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('status')} className="h-auto p-0 font-semibold hover:bg-transparent">
                    Status <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </Button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAffiliates.map((affiliate) => (
                <TableRow key={affiliate.id}>
                  <TableCell className="font-medium">{affiliate.contact_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{affiliate.affiliate_code}</Badge>
                  </TableCell>
                  <TableCell>{affiliate.email}</TableCell>
                  <TableCell>{affiliate.commission_rate}%</TableCell>
                  <TableCell>{affiliate.clicks || 0}</TableCell>
                  <TableCell>{affiliate.conversions || 0}</TableCell>
                  <TableCell>
                    <Badge variant={affiliate.code_redemptions > 0 ? "default" : "outline"}>
                      {affiliate.code_redemptions || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>${Number(affiliate.available_balance || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-semibold text-green-600">${Number(affiliate.total_earned || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Select
                      value={affiliate.status}
                      onValueChange={(value) => handleUpdateStatus(affiliate.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAffiliate(affiliate)}
                        title="Edit Affiliate"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => showAffiliateCodes(affiliate)}
                        title="Manage Codes"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => showAffiliateLinks(affiliate)}
                        title="View Links"
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAffiliateToDelete(affiliate);
                          setShowDeleteDialog(true);
                        }}
                        title="Delete Affiliate"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {Number(affiliate.available_balance) >= Number(affiliate.payout_threshold) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleProcessPayout(affiliate)}
                          title="Process Payout"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="leaderboard">
        <AffiliateLeaderboard />
      </TabsContent>

      {/* Create/Edit Affiliate Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Affiliate' : 'Add New Affiliate'}</DialogTitle>
            <DialogDescription>
              {editMode ? 'Update affiliate partner details' : 'Create a new affiliate partner account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contact_name">Contact Name *</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="venmo_id">Venmo ID</Label>
              <Input
                id="venmo_id"
                value={formData.venmo_id}
                onChange={(e) => setFormData({ ...formData, venmo_id: e.target.value })}
                placeholder="@username"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="payout_threshold">Payout Threshold ($)</Label>
                <Input
                  id="payout_threshold"
                  type="number"
                  value={formData.payout_threshold}
                  onChange={(e) => setFormData({ ...formData, payout_threshold: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this affiliate"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateAffiliate}>
              {editMode ? 'Update Affiliate' : 'Create Affiliate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Affiliate Codes Dialog */}
      <Dialog open={showCodesDialog} onOpenChange={setShowCodesDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Affiliate Codes</DialogTitle>
          </DialogHeader>
          {selectedAffiliate && (
            <AffiliateCodesManager
              affiliateId={selectedAffiliate.id}
              affiliateName={selectedAffiliate.contact_name}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Affiliate Links Dialog */}
      <Dialog open={showLinksDialog} onOpenChange={setShowLinksDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Affiliate Links & Codes</DialogTitle>
            <DialogDescription>
              Links and embed codes for {selectedAffiliate?.contact_name}
            </DialogDescription>
          </DialogHeader>
          {selectedAffiliate && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Affiliate Links
                </h3>
                <div className="space-y-3">
                  {Object.entries(getAffiliateLinks(selectedAffiliate.affiliate_code)).map(([key, url]) => (
                    <div key={key} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm capitalize mb-1">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{url as string}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(url as string)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Embed Codes
                </h3>
                <div className="space-y-4">
                  {(['embedded_quote_builder', 'embedded_chat_agent', 'chat_popup_widget'] as const).map((type) => (
                    <div key={type}>
                      <p className="font-medium text-sm capitalize mb-2">
                        {type.replace(/_/g, ' ')}
                      </p>
                      <div className="relative">
                        <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                          <code>{generateAffiliateEmbedCode(selectedAffiliate.affiliate_code, type)}</code>
                        </pre>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(
                            generateAffiliateEmbedCode(selectedAffiliate.affiliate_code, type)
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Affiliate?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {affiliateToDelete?.contact_name}? This action cannot be undone.
              All affiliate links and codes associated with this affiliate will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAffiliateToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAffiliate}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
