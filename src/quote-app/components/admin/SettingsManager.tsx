import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Input } from "@/quote-app/components/ui/input";
import { Button } from "@/quote-app/components/ui/button";
import { Label } from "@/quote-app/components/ui/label";
import { Switch } from "@/quote-app/components/ui/switch";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { useToast } from "@/quote-app/hooks/use-toast";
import { Settings, Save, RefreshCw } from "lucide-react";

interface AppSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

const BOOLEAN_SETTINGS = ['show_places_to_stay_tab', 'show_photos_tab'];

export function SettingsManager() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('key');

      if (error) throw error;

      setSettings(data || []);
      const values: Record<string, string> = {};
      data?.forEach(s => {
        values[s.key] = s.value;
      });
      setEditValues(values);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value?: string) => {
    setSaving(key);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: value ?? editValues[key] })
        .eq('key', key);

      if (error) throw error;

      toast({
        title: "Saved",
        description: `${getSettingLabel(key)} updated successfully`,
      });

      fetchSettings();
    } catch (error: any) {
      console.error('Error saving setting:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save setting",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const getSettingLabel = (key: string): string => {
    const labels: Record<string, string> = {
      'high_engagement_threshold': 'High Engagement Alert Threshold',
      'show_places_to_stay_tab': 'Show "Places to Stay" Tab',
      'show_photos_tab': 'Show "Photos" Tab',
    };
    return labels[key] || key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getSettingHelp = (key: string): string => {
    const help: Record<string, string> = {
      'high_engagement_threshold': 'Leads with engagement scores at or above this value will trigger a "hot lead" email alert. Valid range: 0-100.',
      'show_places_to_stay_tab': 'When enabled, the "Places to Stay" tab is visible on the customer dashboard. When disabled, it is hidden from customers.',
      'show_photos_tab': 'When enabled, the "Photos" tab is visible on customer dashboards. When disabled, it is hidden from customers.',
    };
    return help[key] || '';
  };

  const isBooleanSetting = (key: string) => BOOLEAN_SETTINGS.includes(key);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            App Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          App Settings
        </CardTitle>
        <CardDescription>
          Configure application behavior and thresholds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {settings.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No settings configured</p>
        ) : (
          settings.map((setting) => (
            <div key={setting.id} className="space-y-2 border-b pb-4 last:border-0">
              <Label htmlFor={setting.key} className="text-base font-medium">
                {getSettingLabel(setting.key)}
              </Label>
              {setting.description && (
                <p className="text-sm text-muted-foreground">{setting.description}</p>
              )}
              {getSettingHelp(setting.key) && (
                <p className="text-xs text-muted-foreground/80">{getSettingHelp(setting.key)}</p>
              )}

              {isBooleanSetting(setting.key) ? (
                <div className="flex items-center gap-3">
                  <Switch
                    id={setting.key}
                    checked={editValues[setting.key] === 'true'}
                    disabled={saving === setting.key}
                    onCheckedChange={(checked) => {
                      const newVal = checked ? 'true' : 'false';
                      setEditValues(prev => ({ ...prev, [setting.key]: newVal }));
                      saveSetting(setting.key, newVal);
                    }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {editValues[setting.key] === 'true' ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <Input
                    id={setting.key}
                    type={setting.key.includes('threshold') ? 'number' : 'text'}
                    value={editValues[setting.key] || ''}
                    onChange={(e) => setEditValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                    className="max-w-xs"
                    min={setting.key.includes('threshold') ? 0 : undefined}
                    max={setting.key.includes('threshold') ? 100 : undefined}
                  />
                  <Button
                    onClick={() => saveSetting(setting.key)}
                    disabled={saving === setting.key || editValues[setting.key] === setting.value}
                    size="sm"
                  >
                    {saving === setting.key ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="ml-1">Save</span>
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(setting.updated_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
