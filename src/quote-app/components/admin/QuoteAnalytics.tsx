import { useEffect, useState } from 'react';
import { supabase } from '@/quote-app/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/quote-app/components/ui/card';
import { Loader2, TrendingUp, Users, MousePointerClick, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/quote-app/components/ui/select';

interface AnalyticsData {
  totalViews: number;
  dateSelected: number;
  partyTypeSelected: number;
  guestCountSelected: number;
  leadFormShown: number;
  leadFormCompleted: number;
  packageSelected: number;
  checkoutStarted: number;
}

interface FunnelStep {
  name: string;
  count: number;
  percentage: number;
  icon: React.ReactNode;
}

export const QuoteAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('admin-analytics', {
        body: { timeRange }
      });

      if (error) {
        console.error('Error fetching analytics:', error);
        setData({
          totalViews: 0, dateSelected: 0, partyTypeSelected: 0,
          guestCountSelected: 0, leadFormShown: 0, leadFormCompleted: 0,
          packageSelected: 0, checkoutStarted: 0,
        });
        return;
      }

      if (result?.data) {
        setData(result.data);
      } else {
        setData({
          totalViews: 0, dateSelected: 0, partyTypeSelected: 0,
          guestCountSelected: 0, leadFormShown: 0, leadFormCompleted: 0,
          packageSelected: 0, checkoutStarted: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setData({
        totalViews: 0, dateSelected: 0, partyTypeSelected: 0,
        guestCountSelected: 0, leadFormShown: 0, leadFormCompleted: 0,
        packageSelected: 0, checkoutStarted: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No analytics data available
      </div>
    );
  }

  const funnelSteps: FunnelStep[] = [
    {
      name: 'Started Quote',
      count: data.totalViews,
      percentage: 100,
      icon: <MousePointerClick className="h-4 w-4" />,
    },
    {
      name: 'Selected Date',
      count: data.dateSelected,
      percentage: data.totalViews ? (data.dateSelected / data.totalViews) * 100 : 0,
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      name: 'Selected Party Type',
      count: data.partyTypeSelected,
      percentage: data.totalViews ? (data.partyTypeSelected / data.totalViews) * 100 : 0,
      icon: <Users className="h-4 w-4" />,
    },
    {
      name: 'Selected Guest Count',
      count: data.guestCountSelected,
      percentage: data.totalViews ? (data.guestCountSelected / data.totalViews) * 100 : 0,
      icon: <Users className="h-4 w-4" />,
    },
    {
      name: 'Lead Form Shown',
      count: data.leadFormShown,
      percentage: data.totalViews ? (data.leadFormShown / data.totalViews) * 100 : 0,
      icon: <CheckCircle className="h-4 w-4" />,
    },
    {
      name: 'Completed Lead Form',
      count: data.leadFormCompleted,
      percentage: data.totalViews ? (data.leadFormCompleted / data.totalViews) * 100 : 0,
      icon: <CheckCircle className="h-4 w-4" />,
    },
    {
      name: 'Selected Package',
      count: data.packageSelected,
      percentage: data.totalViews ? (data.packageSelected / data.totalViews) * 100 : 0,
      icon: <CheckCircle className="h-4 w-4" />,
    },
    {
      name: 'Started Checkout',
      count: data.checkoutStarted,
      percentage: data.totalViews ? (data.checkoutStarted / data.totalViews) * 100 : 0,
      icon: <CheckCircle className="h-4 w-4" />,
    },
  ];

  const conversionRate = data.totalViews > 0 
    ? ((data.leadFormCompleted / data.totalViews) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quote Builder Analytics</h2>
          <p className="text-muted-foreground mt-1">
            Track user behavior and conversion funnel
          </p>
        </div>
        <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              Unique quote sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Completed lead forms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drop-off Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(100 - parseFloat(conversionRate)).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Did not complete
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>
            See where users drop off in the quote process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {funnelSteps.map((step, index) => {
              const dropOff = index > 0 
                ? funnelSteps[index - 1].count - step.count 
                : 0;
              const dropOffPercentage = index > 0 && funnelSteps[index - 1].count > 0
                ? ((dropOff / funnelSteps[index - 1].count) * 100).toFixed(1)
                : '0.0';

              return (
                <div key={step.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {step.icon}
                      <span className="font-medium">{step.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {step.count} sessions ({step.percentage.toFixed(1)}%)
                      </span>
                      {index > 0 && dropOff > 0 && (
                        <span className="text-sm text-destructive">
                          -{dropOff} ({dropOffPercentage}% drop-off)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${step.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
