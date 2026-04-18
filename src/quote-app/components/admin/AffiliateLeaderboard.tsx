import { useState, useEffect } from "react";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/quote-app/components/ui/table";
import { Badge } from "@/quote-app/components/ui/badge";
import { Trophy, TrendingUp, Users, DollarSign } from "lucide-react";

interface LeaderboardEntry {
  affiliate_id: string;
  affiliate_name: string;
  company_name: string | null;
  total_clicks: number;
  total_leads: number;
  total_abandoned: number;
  total_conversions: number;
  total_revenue: number;
  conversion_rate: number;
}

export function AffiliateLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase.rpc('get_affiliate_leaderboard');

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-yellow-500"><Trophy className="h-3 w-3 mr-1" />1st</Badge>;
    if (index === 1) return <Badge className="bg-gray-400"><Trophy className="h-3 w-3 mr-1" />2nd</Badge>;
    if (index === 2) return <Badge className="bg-orange-600"><Trophy className="h-3 w-3 mr-1" />3rd</Badge>;
    return <Badge variant="outline">{index + 1}</Badge>;
  };

  if (loading) {
    return <div>Loading leaderboard...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Affiliate Leaderboard
        </CardTitle>
        <CardDescription>
          Top performing affiliates by revenue and conversion rate
        </CardDescription>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No affiliate data yet
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Total Clicks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {leaderboard.reduce((sum, entry) => sum + Number(entry.total_clicks), 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Total Leads</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {leaderboard.reduce((sum, entry) => sum + Number(entry.total_leads), 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Total Conversions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {leaderboard.reduce((sum, entry) => sum + Number(entry.total_conversions), 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Total Revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${leaderboard.reduce((sum, entry) => sum + Number(entry.total_revenue), 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Leaderboard Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Abandoned</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Conv. Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry, index) => (
                  <TableRow key={entry.affiliate_id}>
                    <TableCell>{getRankBadge(index)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{entry.affiliate_name}</div>
                        {entry.company_name && (
                          <div className="text-xs text-muted-foreground">{entry.company_name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{Number(entry.total_clicks)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{Number(entry.total_leads)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{Number(entry.total_abandoned)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge>{Number(entry.total_conversions)}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ${Number(entry.total_revenue).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        {Number(entry.conversion_rate).toFixed(2)}%
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
