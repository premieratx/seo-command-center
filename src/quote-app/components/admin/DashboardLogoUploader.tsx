import { useState, useRef } from "react";
import { Button } from "@/quote-app/components/ui/button";
import { Label } from "@/quote-app/components/ui/label";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, X, Image as ImageIcon } from "lucide-react";

interface DashboardLogoUploaderProps {
  slug: string;
  currentLogoUrl?: string;
  onLogoUploaded: (url: string) => void;
}

export const DashboardLogoUploader = ({ slug, currentLogoUrl, onLogoUploaded }: DashboardLogoUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentLogoUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)');
      return;
    }

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `logos/${slug || 'new'}-${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('dashboard-media')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('dashboard-media')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      setPreviewUrl(publicUrl);
      onLogoUploaded(publicUrl);
      toast.success('Logo uploaded!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const clearLogo = () => {
    setPreviewUrl('');
    onLogoUploaded('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <Label className="text-slate-300">📷 Upload Custom Logo</Label>
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-500"
          size="sm"
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {uploading ? 'Uploading...' : 'Upload Logo'}
        </Button>
        {previewUrl && (
          <>
            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-600/40">
              <img src={previewUrl} alt="Logo preview" className="h-10 object-contain" />
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={clearLogo}>
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      <p className="text-xs text-slate-500">Upload a PNG/JPG logo (max 5MB). This overrides the auto-detected logo.</p>
    </div>
  );
};
