import { useState } from "react";
import { Button } from "@/quote-app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Badge } from "@/quote-app/components/ui/badge";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { toast } from "sonner";
import { Globe, Loader2, Check, Upload, Image as ImageIcon, X } from "lucide-react";

interface MediaItem {
  url: string;
  alt: string;
  type: string;
}

interface WebsiteMediaPullerProps {
  websiteUrl: string;
  onMediaSelected: (selections: { logo?: string; headerImage?: string; images?: string[] }) => void;
  currentLogo?: string;
  dashboardId?: string | null;
}

export const WebsiteMediaPuller = ({ websiteUrl, onMediaSelected, currentLogo, dashboardId }: WebsiteMediaPullerProps) => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [siteTitle, setSiteTitle] = useState("");
  const [selectedLogo, setSelectedLogo] = useState<string | null>(currentLogo || null);
  const [selectedHeader, setSelectedHeader] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [hasPulled, setHasPulled] = useState(false);

  const pullMedia = async () => {
    if (!websiteUrl.trim()) {
      toast.error("Enter a website URL first");
      return;
    }
    setLoading(true);
    setMediaItems([]);
    setHasPulled(false);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-website-media', {
        body: { url: websiteUrl },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to scrape');

      setMediaItems(data.data.images || []);
      setSiteTitle(data.data.title || '');
      setHasPulled(true);
      toast.success(`Found ${data.data.images?.length || 0} media items from ${data.data.domain}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to pull media');
    } finally {
      setLoading(false);
    }
  };

  const toggleImage = (url: string) => {
    setSelectedImages(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
  };

  const applySelections = () => {
    onMediaSelected({
      logo: selectedLogo || undefined,
      headerImage: selectedHeader || undefined,
      images: selectedImages.length > 0 ? selectedImages : undefined,
    });
    toast.success("Media selections applied!");
  };

  const syncToReservationTab = async () => {
    if (!dashboardId) {
      toast.error("Save the dashboard first before syncing photos");
      return;
    }
    if (selectedImages.length === 0) {
      toast.error("Select at least one image to sync");
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-dashboard-images', {
        body: { dashboardId, customImages: selectedImages },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error('Failed to update');
      // Also update local state via callback
      onMediaSelected({ images: selectedImages });
      toast.success(`Synced ${selectedImages.length} photos to reservation tab!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync photos');
    } finally {
      setSyncing(false);
    }
  };

  // Categorize media
  const logos = mediaItems.filter(m => m.type === 'logo' || m.type === 'favicon');
  const ogImages = mediaItems.filter(m => m.type === 'og_image');
  const regularImages = mediaItems.filter(m => m.type === 'image' || m.type === 'background' || m.type === 'srcset');

  return (
    <Card className="bg-slate-800/70 border-emerald-500/20 text-white">
      <CardHeader>
        <CardTitle className="text-lg text-emerald-300 flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Pull Website Media
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={pullMedia}
            disabled={loading || !websiteUrl.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
            {loading ? 'Pulling...' : 'Pull Website Media'}
          </Button>
        </div>

        {hasPulled && (
          <div className="space-y-4">
            {siteTitle && (
              <p className="text-sm text-slate-400">Site: <span className="text-white font-semibold">{siteTitle}</span></p>
            )}

            {/* Logos Section */}
            {logos.length > 0 && (
              <div className="space-y-2">
                <Label className="text-amber-300 text-sm font-semibold">Logos & Icons ({logos.length})</Label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {logos.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedLogo(selectedLogo === item.url ? null : item.url)}
                      className={`relative rounded-lg overflow-hidden border-2 p-2 bg-white transition-all ${
                        selectedLogo === item.url ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-slate-600/40 hover:border-slate-400'
                      }`}
                    >
                      <img src={item.url} alt={item.alt} className="w-full h-12 object-contain" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                      {selectedLogo === item.url && (
                        <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <Badge className="absolute bottom-0 left-0 text-[8px] bg-amber-600/80 text-white border-0">LOGO</Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* OG Images */}
            {ogImages.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sky-300 text-sm font-semibold">Social/Header Images ({ogImages.length})</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ogImages.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedHeader(selectedHeader === item.url ? null : item.url)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                        selectedHeader === item.url ? 'border-sky-400 ring-2 ring-sky-400/50' : 'border-slate-600/40 hover:border-slate-400'
                      }`}
                    >
                      <img src={item.url} alt={item.alt} className="w-full aspect-video object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                      {selectedHeader === item.url && (
                        <div className="absolute top-1 right-1 bg-sky-500 rounded-full p-0.5">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <Badge className="absolute bottom-0 left-0 text-[8px] bg-sky-600/80 text-white border-0">HEADER</Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Images */}
            {regularImages.length > 0 && (
              <div className="space-y-2">
                <Label className="text-purple-300 text-sm font-semibold">All Images ({regularImages.length})</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-[300px] overflow-y-auto">
                  {regularImages.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleImage(item.url)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImages.includes(item.url) ? 'border-purple-400 ring-2 ring-purple-400/50' : 'border-slate-600/40 hover:border-slate-400'
                      }`}
                    >
                      <img src={item.url} alt={item.alt} className="w-full aspect-square object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                      {selectedImages.includes(item.url) && (
                        <div className="absolute top-1 right-1 bg-purple-500 rounded-full p-0.5">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mediaItems.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No media found on this page. Try a different URL.</p>
            )}

            {/* Apply Button */}
            {(selectedLogo || selectedHeader || selectedImages.length > 0) && (
              <div className="flex flex-col gap-3 pt-2 border-t border-slate-700/50">
                <div className="flex items-center gap-3">
                  <Button onClick={applySelections} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                    <Check className="h-4 w-4 mr-2" />
                    Apply Selections
                  </Button>
                  <span className="text-xs text-slate-400">
                    {selectedLogo ? '1 logo' : ''}
                    {selectedLogo && (selectedHeader || selectedImages.length > 0) ? ' • ' : ''}
                    {selectedHeader ? '1 header' : ''}
                    {(selectedLogo || selectedHeader) && selectedImages.length > 0 ? ' • ' : ''}
                    {selectedImages.length > 0 ? `${selectedImages.length} images` : ''}
                  </span>
                </div>
                {selectedImages.length > 0 && (
                  <Button
                    onClick={syncToReservationTab}
                    disabled={syncing || !dashboardId}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-fit"
                  >
                    {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {syncing ? 'Syncing...' : `Sync ${selectedImages.length} Photos to Reservation Tab`}
                  </Button>
                )}
                {!dashboardId && selectedImages.length > 0 && (
                  <p className="text-xs text-amber-400">Save the dashboard first to enable direct sync</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
