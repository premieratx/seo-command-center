import { useState, useEffect, useRef } from "react";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { Switch } from "@/quote-app/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/quote-app/components/ui/table";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "@/quote-app/hooks/use-toast";
import { Badge } from "@/quote-app/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/quote-app/components/ui/tooltip";

interface PromoCode {
  id: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
  usage_count: number;
  usage_limit: number | null;
  expires_at: string | null;
  affiliate_id: string | null;
  affiliate_code_id: string | null;
  tier_2_value: number | null;
  tier_2_starts_at: string | null;
  tier_3_value: number | null;
  tier_3_starts_at: string | null;
}

export const PromoCodesManager = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newCode, setNewCode] = useState({
    code: "",
    type: "percent",
    value: 0,
    affiliateCode: "",
    affiliateCommissionRate: "",
    usageLimit: "",
    expiresAt: ""
  });

  useEffect(() => {
    fetchPromoCodes();
    fetchAffiliates();
  }, []);

  const fetchAffiliates = async () => {
    const { data } = await supabase
      .from("affiliates")
      .select("id, affiliate_code, contact_name")
      .eq("status", "active");
    
    setAffiliates(data || []);
  };

  const fetchPromoCodes = async () => {
    const { data, error } = await supabase
      .from("promo_codes")
      .select(`
        *,
        affiliates:affiliate_id(contact_name, affiliate_code),
        affiliate_codes:affiliate_code_id(commission_rate)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching promo codes", description: error.message, variant: "destructive" });
    } else {
      setPromoCodes(data || []);
    }
    setIsLoading(false);
  };

  const getCurrentDiscountValue = (promo: any) => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    
    if (promo.tier_3_value && promo.tier_3_starts_at) {
      const tier3Start = new Date(promo.tier_3_starts_at);
      if (now >= tier3Start) {
        return { value: promo.tier_3_value, tier: 3 };
      }
    }
    
    if (promo.tier_2_value && promo.tier_2_starts_at) {
      const tier2Start = new Date(promo.tier_2_starts_at);
      if (now >= tier2Start) {
        return { value: promo.tier_2_value, tier: 2 };
      }
    }
    
    return { value: promo.value, tier: 1 };
  };

  const createPromoCode = async () => {
    if (!newCode.code || !newCode.value) {
      toast({ title: "Error", description: "Code and value are required", variant: "destructive" });
      return;
    }

    setIsCreating(true);

    let affiliateId = null;
    let affiliateCodeId = null;

    // Find affiliate by code if provided
    if (newCode.affiliateCode) {
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id, affiliate_code")
        .eq("affiliate_code", newCode.affiliateCode.toUpperCase())
        .single();

      if (affiliate) {
        affiliateId = affiliate.id;

        // Create or find affiliate_code entry
        if (newCode.affiliateCommissionRate) {
          const { data: affCode } = await supabase
            .from("affiliate_codes")
            .insert({
              affiliate_id: affiliateId,
              code: newCode.code.toUpperCase(),
              commission_rate: parseFloat(newCode.affiliateCommissionRate),
            })
            .select()
            .single();

          if (affCode) {
            affiliateCodeId = affCode.id;
          }
        }
      }
    }

    const { error } = await supabase
      .from("promo_codes")
      .insert({
        code: newCode.code.toUpperCase(),
        type: newCode.type,
        value: newCode.value,
        usage_limit: newCode.usageLimit ? parseInt(newCode.usageLimit) : null,
        expires_at: newCode.expiresAt || null,
        affiliate_id: affiliateId,
        affiliate_code_id: affiliateCodeId,
        active: true
      });

    setIsCreating(false);

    if (error) {
      toast({ title: "Error creating promo code", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Promo code created" });
      setNewCode({ 
        code: "", 
        type: "percent", 
        value: 0, 
        affiliateCode: "",
        affiliateCommissionRate: "",
        usageLimit: "", 
        expiresAt: "" 
      });
      fetchPromoCodes();
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("promo_codes")
      .update({ active: !currentActive })
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating promo code", description: error.message, variant: "destructive" });
    } else {
      fetchPromoCodes();
    }
  };

  const deletePromoCode = async (id: string) => {
    const { error } = await supabase
      .from("promo_codes")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting promo code", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Promo code deleted" });
      fetchPromoCodes();
    }
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ title: "Error", description: "CSV file appears to be empty", variant: "destructive" });
        return;
      }

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const promoCodesToCreate = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        // Find affiliate by code
        let affiliateId = null;
        let affiliateCodeId = null;

        if (row.affiliate_code) {
          const { data: affiliate } = await supabase
            .from("affiliates")
            .select("id")
            .eq("affiliate_code", row.affiliate_code.toUpperCase())
            .single();

          if (affiliate) {
            affiliateId = affiliate.id;

            // Create affiliate_code entry if commission rate provided
            if (row.affiliate_commission_rate) {
              const { data: affCode } = await supabase
                .from("affiliate_codes")
                .insert({
                  affiliate_id: affiliateId,
                  code: row.code.toUpperCase(),
                  commission_rate: parseFloat(row.affiliate_commission_rate),
                })
                .select()
                .single();

              if (affCode) {
                affiliateCodeId = affCode.id;
              }
            }
          }
        }

        promoCodesToCreate.push({
          code: row.code.toUpperCase(),
          type: row.discount_type === "fixed" ? "amount" : "percent",
          value: parseFloat(row.discount_value || row.customer_discount || "0"),
          affiliate_id: affiliateId,
          affiliate_code_id: affiliateCodeId,
          active: true,
        });
      }

      if (promoCodesToCreate.length === 0) {
        toast({ title: "Error", description: "No valid promo code data found in CSV", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("promo_codes")
        .insert(promoCodesToCreate);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Successfully imported ${promoCodesToCreate.length} promo codes` 
      });
      fetchPromoCodes();
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error("Error importing CSV:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to import CSV file", 
        variant: "destructive" 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Create New Promo Code</CardTitle>
              <CardDescription>
                Add discount codes for customers to use
                <span className="block mt-2 text-xs">
                  CSV Format: code, affiliate_code, discount_type (percentage/fixed), discount_value, affiliate_commission_rate
                </span>
              </CardDescription>
            </div>
            <div>
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="SUMMER99"
                value={newCode.code}
                onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Discount Type</Label>
              <Select value={newCode.type} onValueChange={(value) => setNewCode({ ...newCode, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage</SelectItem>
                  <SelectItem value="amount">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">
                Value {newCode.type === "percent" ? "(%)" : "($)"}
              </Label>
              <Input
                id="value"
                type="number"
                min="0"
                max={newCode.type === "percent" ? "100" : undefined}
                value={newCode.value || ""}
                onChange={(e) => setNewCode({ ...newCode, value: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="affiliateCode">Affiliate Code (optional)</Label>
              <Input
                id="affiliateCode"
                placeholder="AFFILIATE123"
                value={newCode.affiliateCode}
                onChange={(e) => setNewCode({ ...newCode, affiliateCode: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="affiliateCommissionRate">Affiliate Commission % (optional)</Label>
              <Input
                id="affiliateCommissionRate"
                type="number"
                min="0"
                max="100"
                placeholder="10"
                value={newCode.affiliateCommissionRate}
                onChange={(e) => setNewCode({ ...newCode, affiliateCommissionRate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usageLimit">Usage Limit (optional)</Label>
              <Input
                id="usageLimit"
                type="number"
                placeholder="Unlimited"
                value={newCode.usageLimit}
                onChange={(e) => setNewCode({ ...newCode, usageLimit: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires At (optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={newCode.expiresAt}
                onChange={(e) => setNewCode({ ...newCode, expiresAt: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={createPromoCode} disabled={isCreating}>
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Create Promo Code
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Promo Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Affiliate</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promoCodes.map((promo: any) => (
                <TableRow key={promo.id}>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-mono font-bold cursor-help">{promo.code}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-2">
                            <p className="font-semibold">Discount Details</p>
                            {promo.tier_2_value || promo.tier_3_value ? (
                              <>
                                <div className="space-y-1 border-b pb-2">
                                  <p className="text-xs font-semibold text-muted-foreground">Tiered Pricing:</p>
                                  <p>Tier 1: {promo.type === "percent" ? `${promo.value}%` : `$${promo.value}`}
                                    {promo.tier_2_starts_at && ` (until ${new Date(promo.tier_2_starts_at).toLocaleDateString()})`}
                                  </p>
                                  {promo.tier_2_value && (
                                    <p>Tier 2: {promo.type === "percent" ? `${promo.tier_2_value}%` : `$${promo.tier_2_value}`}
                                      {promo.tier_2_starts_at && promo.tier_3_starts_at && 
                                        ` (${new Date(promo.tier_2_starts_at).toLocaleDateString()} - ${new Date(promo.tier_3_starts_at).toLocaleDateString()})`}
                                    </p>
                                  )}
                                  {promo.tier_3_value && (
                                    <p>Tier 3: {promo.type === "percent" ? `${promo.tier_3_value}%` : `$${promo.tier_3_value}`}
                                      {promo.tier_3_starts_at && ` (from ${new Date(promo.tier_3_starts_at).toLocaleDateString()})`}
                                    </p>
                                  )}
                                </div>
                                <p className="text-sm">
                                  <strong>Current Value:</strong> {promo.type === "percent" ? `${getCurrentDiscountValue(promo).value}%` : `$${getCurrentDiscountValue(promo).value}`}
                                  <Badge variant="secondary" className="ml-2">Tier {getCurrentDiscountValue(promo).tier}</Badge>
                                </p>
                              </>
                            ) : (
                              <p>Customer saves: {promo.type === "percent" ? `${promo.value}%` : `$${promo.value}`}</p>
                            )}
                            {promo.affiliates && (
                              <p className="pt-2 border-t">Affiliate earns: {promo.affiliate_codes?.commission_rate ? `${promo.affiliate_codes.commission_rate}% commission` : "Default commission"}</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="capitalize">{promo.type}</TableCell>
                  <TableCell>
                    {promo.tier_2_value || promo.tier_3_value ? (
                      <div className="flex items-center gap-2">
                        <span>{promo.type === "percent" ? `${getCurrentDiscountValue(promo).value}%` : `$${getCurrentDiscountValue(promo).value}`}</span>
                        <Badge variant="secondary" className="text-xs">Tier {getCurrentDiscountValue(promo).tier}</Badge>
                      </div>
                    ) : (
                      <span>{promo.type === "percent" ? `${promo.value}%` : `$${promo.value}`}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {promo.affiliates ? (
                      <Badge variant="outline">
                        {promo.affiliates.contact_name} ({promo.affiliates.affiliate_code})
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">No affiliate</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {promo.usage_count} / {promo.usage_limit || "∞"}
                  </TableCell>
                  <TableCell>
                    {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={promo.active}
                      onCheckedChange={() => toggleActive(promo.id, promo.active)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePromoCode(promo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
