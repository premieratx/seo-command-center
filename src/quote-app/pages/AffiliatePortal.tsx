import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { Badge } from "@/quote-app/components/ui/badge";
import { Copy, DollarSign, MousePointerClick, TrendingUp, Link as LinkIcon, Code } from "lucide-react";
import { toast } from "sonner";
import { getAffiliateLinks, generateAffiliateEmbedCode } from "@/quote-app/lib/affiliateTracking";

export default function AffiliatePortal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<any>(null);
  const [stats, setStats] = useState({
    totalClicks: 0,
    totalConversions: 0,
    totalEarnings: 0,
    availableBalance: 0,
    pendingBalance: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/auth');
      return;
    }

    await loadAffiliateData(user.id);
  };

  const loadAffiliateData = async (userId: string) => {
    try {
      // Get affiliate profile
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (affiliateError) throw affiliateError;

      if (!affiliateData) {
        toast.error('No affiliate account found');
        navigate('/');
        return;
      }

      setAffiliate(affiliateData);

      // Get click stats
      const { count: clickCount } = await supabase
        .from('affiliate_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', affiliateData.id);

      // Get conversion stats
      const { data: conversions } = await supabase
        .from('affiliate_conversions')
        .select('*')
        .eq('affiliate_id', affiliateData.id);

      const pendingBalance = conversions
        ?.filter(c => c.status === 'pending' || c.status === 'approved')
        .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

      setStats({
        totalClicks: clickCount || 0,
        totalConversions: conversions?.length || 0,
        totalEarnings: Number(affiliateData.total_earnings),
        availableBalance: Number(affiliateData.available_balance),
        pendingBalance,
      });

      // Get recent activity
      const { data: recentConversions } = await supabase
        .from('affiliate_conversions')
        .select('*')
        .eq('affiliate_id', affiliateData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentActivity(recentConversions || []);
    } catch (error) {
      console.error('Error loading affiliate data:', error);
      toast.error('Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  if (!affiliate) {
    return <div className="container mx-auto py-8">No affiliate account found</div>;
  }

  const links = getAffiliateLinks(affiliate.affiliate_code);

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Affiliate Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {affiliate.contact_name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.availableBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.pendingBalance.toFixed(2)} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {affiliate.commission_rate}% commission rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClicks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalConversions} conversions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalClicks > 0 
                ? ((stats.totalConversions / stats.totalClicks) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Click-to-conversion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Affiliate Links & Embed Codes */}
      <Tabs defaultValue="links" className="w-full">
        <TabsList>
          <TabsTrigger value="links">Affiliate Links</TabsTrigger>
          <TabsTrigger value="embed">Embed Codes</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Your Affiliate Links
              </CardTitle>
              <CardDescription>
                Share these links to track referrals. Your code: <Badge>{affiliate.affiliate_code}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(links).map(([key, url]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex-1 mr-4">
                    <p className="font-medium capitalize mb-1">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{url}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(url, key.replace(/_/g, ' '))}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Embed Codes
              </CardTitle>
              <CardDescription>
                Copy these codes to embed on your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(['embedded_quote_builder', 'embedded_chat_agent', 'chat_popup_widget'] as const).map((type) => (
                <div key={type} className="space-y-2">
                  <p className="font-medium capitalize">
                    {type.replace(/_/g, ' ')}
                  </p>
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
                      <code>{generateAffiliateEmbedCode(affiliate.affiliate_code, type)}</code>
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(
                        generateAffiliateEmbedCode(affiliate.affiliate_code, type),
                        type.replace(/_/g, ' ')
                      )}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversions</CardTitle>
              <CardDescription>Your latest affiliate conversions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No conversions yet. Share your links to start earning!
                </p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium capitalize">
                          {activity.conversion_type} - {activity.component_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          +${Number(activity.commission_amount).toFixed(2)}
                        </p>
                        <Badge variant={
                          activity.status === 'paid' ? 'default' :
                          activity.status === 'approved' ? 'secondary' : 'outline'
                        }>
                          {activity.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payout Info */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Information</CardTitle>
          <CardDescription>
            Payouts are processed automatically when you reach ${affiliate.payout_threshold}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Payout Threshold:</span>
            <span className="font-medium">${affiliate.payout_threshold}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Paid Out:</span>
            <span className="font-medium">${affiliate.total_paid_out}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Stripe Account:</span>
            <Badge variant={affiliate.stripe_connect_account_id ? 'default' : 'destructive'}>
              {affiliate.stripe_connect_account_id ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
