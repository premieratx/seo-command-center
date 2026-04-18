import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Loader2, Video, MousePointer, Eye, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface EngagementSession {
  id: string;
  session_id: string;
  lead_id: string | null;
  quote_number: string | null;
  first_seen_at: string;
  last_activity_at: string;
  session_duration_seconds: number | null;
  quote_open_count: number | null;
  videos_started: string[] | null;
  video_max_progress: Record<string, number> | null;
  total_video_watch_seconds: number | null;
  max_scroll_depth_percent: number | null;
  xola_tab_opened: boolean | null;
  xola_booking_started: boolean | null;
  gamma_link_clicked: boolean | null;
  gamma_scroll_depth_percent: number | null;
  quote_builder_interactions: number | null;
  ghl_sync_count: number | null;
  // Joined from leads table
  lead_first_name?: string | null;
  lead_last_name?: string | null;
  lead_email?: string | null;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function EngagementAnalytics() {
  const [sessions, setSessions] = useState<EngagementSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    fetchEngagementData();
  }, [timeRange]);

  const fetchEngagementData = async () => {
    setLoading(true);
    try {
      // First fetch engagement sessions
      let query = supabase
        .from('engagement_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (timeRange === '7d') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.gte('created_at', sevenDaysAgo.toISOString());
      } else if (timeRange === '30d') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('created_at', thirtyDaysAgo.toISOString());
      }

      const { data, error } = await query.limit(500);
      
      // Fetch lead names for sessions with lead_id
      const leadIds = (data || [])
        .map(s => s.lead_id)
        .filter((id): id is string => id !== null);
      
      let leadsMap: Record<string, { first_name: string; last_name: string; email: string }> = {};
      if (leadIds.length > 0) {
        const { data: leadsData } = await supabase
          .from('leads')
          .select('id, first_name, last_name, email')
          .in('id', leadIds);
        
        if (leadsData) {
          leadsMap = leadsData.reduce((acc, lead) => {
            acc[lead.id] = { first_name: lead.first_name, last_name: lead.last_name, email: lead.email };
            return acc;
          }, {} as Record<string, { first_name: string; last_name: string; email: string }>);
        }
      }

      if (error) throw error;
      
      // Transform the data to handle JSONB fields properly and add lead names
      const transformedData = (data || []).map(session => {
        const leadInfo = session.lead_id ? leadsMap[session.lead_id] : null;
        return {
          ...session,
          videos_started: Array.isArray(session.videos_started) 
            ? session.videos_started as string[]
            : [],
          video_max_progress: typeof session.video_max_progress === 'object' && session.video_max_progress !== null
            ? session.video_max_progress as Record<string, number>
            : {},
          lead_first_name: leadInfo?.first_name || null,
          lead_last_name: leadInfo?.last_name || null,
          lead_email: leadInfo?.email || null,
        };
      });
      
      setSessions(transformedData);
    } catch (error) {
      console.error('Error fetching engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate video completion stats
  const getVideoCompletionData = () => {
    const milestones = { '0-25%': 0, '25-50%': 0, '50-75%': 0, '75-100%': 0 };
    let totalVideos = 0;

    sessions.forEach(session => {
      const progress = session.video_max_progress || {};
      Object.values(progress).forEach((pct: number) => {
        totalVideos++;
        if (pct >= 75) milestones['75-100%']++;
        else if (pct >= 50) milestones['50-75%']++;
        else if (pct >= 25) milestones['25-50%']++;
        else milestones['0-25%']++;
      });
    });

    return Object.entries(milestones).map(([name, value]) => ({
      name,
      value,
      percentage: totalVideos > 0 ? Math.round((value / totalVideos) * 100) : 0,
    }));
  };

  // Calculate Xola funnel data
  const getXolaFunnelData = () => {
    const total = sessions.length;
    const tabOpened = sessions.filter(s => s.xola_tab_opened).length;
    const bookingStarted = sessions.filter(s => s.xola_booking_started).length;

    return [
      { name: 'Quote Views', value: total, fill: 'hsl(var(--primary))' },
      { name: 'Xola Tab Opened', value: tabOpened, fill: 'hsl(var(--chart-2))' },
      { name: 'Booking Started', value: bookingStarted, fill: 'hsl(var(--chart-3))' },
    ];
  };

  // Calculate scroll depth distribution
  const getScrollDepthData = () => {
    const buckets = { '0-25%': 0, '25-50%': 0, '50-75%': 0, '75-100%': 0 };

    sessions.forEach(session => {
      const depth = session.max_scroll_depth_percent || 0;
      if (depth >= 75) buckets['75-100%']++;
      else if (depth >= 50) buckets['50-75%']++;
      else if (depth >= 25) buckets['25-50%']++;
      else buckets['0-25%']++;
    });

    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  };

  // Calculate summary stats
  const getSummaryStats = () => {
    const total = sessions.length;
    const withLead = sessions.filter(s => s.lead_id).length;
    const avgDuration = sessions.reduce((sum, s) => sum + (s.session_duration_seconds || 0), 0) / (total || 1);
    const avgVideoTime = sessions.reduce((sum, s) => sum + (s.total_video_watch_seconds || 0), 0) / (total || 1);
    const gammaClicks = sessions.filter(s => s.gamma_link_clicked).length;
    const xolaOpened = sessions.filter(s => s.xola_tab_opened).length;

    return {
      totalSessions: total,
      sessionsWithLead: withLead,
      leadConversionRate: total > 0 ? Math.round((withLead / total) * 100) : 0,
      avgSessionDuration: Math.round(avgDuration),
      avgVideoWatchTime: Math.round(avgVideoTime),
      gammaClickRate: total > 0 ? Math.round((gammaClicks / total) * 100) : 0,
      xolaOpenRate: total > 0 ? Math.round((xolaOpened / total) * 100) : 0,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = getSummaryStats();
  const videoData = getVideoCompletionData();
  const funnelData = getXolaFunnelData();
  const scrollData = getScrollDepthData();

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['7d', '30d', 'all'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeRange === range
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'All Time'}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>With Lead</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sessionsWithLead}</div>
            <p className="text-xs text-muted-foreground">{stats.leadConversionRate}% rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Duration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(stats.avgSessionDuration / 60)}m</div>
            <p className="text-xs text-muted-foreground">{stats.avgSessionDuration % 60}s</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Video Time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgVideoWatchTime}s</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gamma Clicks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.gammaClickRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Xola Opens</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.xolaOpenRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>GHL Syncs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.reduce((sum, s) => sum + (s.ghl_sync_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Video Completion Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Completion
            </CardTitle>
            <CardDescription>Distribution of max video progress</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={videoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {videoData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Xola Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Xola Booking Funnel
            </CardTitle>
            <CardDescription>Quote → Tab → Booking conversion</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))">
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Scroll Depth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="h-5 w-5" />
              Scroll Depth
            </CardTitle>
            <CardDescription>How far users scroll on quote pages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scrollData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                  {scrollData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Recent Sessions
          </CardTitle>
          <CardDescription>Latest 20 engagement sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Quote #</th>
                  <th className="text-left py-2 px-2">Views</th>
                  <th className="text-left py-2 px-2">Duration</th>
                  <th className="text-left py-2 px-2">Videos</th>
                  <th className="text-left py-2 px-2">Scroll %</th>
                  <th className="text-left py-2 px-2">Xola</th>
                  <th className="text-left py-2 px-2">Gamma</th>
                  <th className="text-left py-2 px-2">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 20).map((session) => (
                  <tr key={session.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 font-medium">
                      {session.lead_first_name && session.lead_last_name 
                        ? `${session.lead_first_name} ${session.lead_last_name}`
                        : <span className="text-muted-foreground italic">Anonymous</span>
                      }
                    </td>
                    <td className="py-2 px-2 font-mono text-xs">
                      {session.quote_number || session.session_id.slice(0, 8)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {session.quote_open_count || 1}
                    </td>
                    <td className="py-2 px-2">
                      {session.session_duration_seconds 
                        ? `${Math.floor(session.session_duration_seconds / 60)}m ${session.session_duration_seconds % 60}s`
                        : '-'
                      }
                    </td>
                    <td className="py-2 px-2">
                      {session.videos_started?.length || 0} started
                      {session.total_video_watch_seconds ? ` (${session.total_video_watch_seconds}s)` : ''}
                    </td>
                    <td className="py-2 px-2">{session.max_scroll_depth_percent || 0}%</td>
                    <td className="py-2 px-2">
                      {session.xola_booking_started ? '🎯 Booking' : session.xola_tab_opened ? '👀 Opened' : '-'}
                    </td>
                    <td className="py-2 px-2">
                      {session.gamma_link_clicked ? '✅' : '-'}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">
                      {new Date(session.last_activity_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
