import { useState, useCallback } from "react";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { compressImage, formatBytes } from "@/quote-app/lib/imageCompression";
import { Button } from "@/quote-app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/quote-app/components/ui/card";
import { Progress } from "@/quote-app/components/ui/progress";
import { toast } from "sonner";
import { Upload, CheckCircle, XCircle, Image as ImageIcon, Trash2, RefreshCw } from "lucide-react";

interface UploadedPhoto {
  name: string;
  url: string;
  originalSize: number;
  compressedSize: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface QueuedFile {
  file: File;
  status: 'pending' | 'compressing' | 'uploading' | 'success' | 'error';
  progress: number;
  originalSize: number;
  compressedSize?: number;
  error?: string;
}

const BUCKET_NAME = '2024-disco-cruise-photos';

export const DiscoCruisePhotoUploader = () => {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Load existing photos from bucket
  const loadExistingPhotos = useCallback(async () => {
    setLoadingExisting(true);
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list('', { limit: 500 });
      
      if (error) throw error;
      
      const urls = data
        .filter(file => file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i))
        .map(file => {
          const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(file.name);
          return urlData.publicUrl;
        });
      
      setExistingPhotos(urls);
    } catch (error) {
      console.error('Error loading existing photos:', error);
      toast.error('Failed to load existing photos');
    } finally {
      setLoadingExisting(false);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    const newQueue: QueuedFile[] = imageFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0,
      originalSize: file.size
    }));
    
    setQueue(prev => [...prev, ...newQueue]);
    
    // Reset input
    e.target.value = '';
  }, []);

  // Process the queue
  const processQueue = useCallback(async () => {
    setIsProcessing(true);
    
    const pendingFiles = queue.filter(f => f.status === 'pending');
    
    for (let i = 0; i < pendingFiles.length; i++) {
      const queueItem = pendingFiles[i];
      const queueIndex = queue.findIndex(q => q.file === queueItem.file);
      
      try {
        // Update status to compressing
        setQueue(prev => prev.map((q, idx) => 
          idx === queueIndex ? { ...q, status: 'compressing', progress: 20 } : q
        ));
        
        // Compress the image
        const { blob, filename, originalSize, compressedSize } = await compressImage(queueItem.file);
        
        // Update status to uploading
        setQueue(prev => prev.map((q, idx) => 
          idx === queueIndex ? { ...q, status: 'uploading', progress: 50, compressedSize } : q
        ));
        
        // Generate unique filename
        const timestamp = Date.now();
        const uniqueFilename = `${timestamp}-${filename}`;
        
        // Upload to Supabase
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(uniqueFilename, blob, {
            contentType: blob.type,
            upsert: false
          });
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(uniqueFilename);
        
        // Update status to success
        setQueue(prev => prev.map((q, idx) => 
          idx === queueIndex ? { ...q, status: 'success', progress: 100 } : q
        ));
        
        // Add to uploaded photos
        setUploadedPhotos(prev => [...prev, {
          name: uniqueFilename,
          url: urlData.publicUrl,
          originalSize,
          compressedSize,
          status: 'success'
        }]);
        
      } catch (error) {
        console.error('Upload error:', error);
        setQueue(prev => prev.map((q, idx) => 
          idx === queueIndex ? { 
            ...q, 
            status: 'error', 
            progress: 0,
            error: error instanceof Error ? error.message : 'Upload failed'
          } : q
        ));
      }
    }
    
    setIsProcessing(false);
    toast.success(`Processed ${pendingFiles.length} photos`);
  }, [queue]);

  // Clear completed items
  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(q => q.status !== 'success'));
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    setQueue([]);
  }, []);

  const pendingCount = queue.filter(q => q.status === 'pending').length;
  const successCount = queue.filter(q => q.status === 'success').length;
  const errorCount = queue.filter(q => q.status === 'error').length;
  const totalOriginalSize = queue.reduce((sum, q) => sum + q.originalSize, 0);
  const totalCompressedSize = queue.reduce((sum, q) => sum + (q.compressedSize || 0), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            2024 Disco Cruise Photo Uploader
          </CardTitle>
          <CardDescription>
            Drag & drop or select photos. They'll be automatically compressed to under 1MB before uploading to storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="photo-upload"
            />
            <label htmlFor="photo-upload" className="cursor-pointer">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Drop photos here or click to select</p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports JPG, PNG, WebP, GIF. Auto-compresses to &lt;1MB
              </p>
            </label>
          </div>

          {/* Queue Stats */}
          {queue.length > 0 && (
            <div className="flex flex-wrap gap-4 items-center justify-between bg-muted/50 rounded-lg p-4">
              <div className="flex flex-wrap gap-4">
                <div className="text-sm">
                  <span className="font-medium">{queue.length}</span> total
                </div>
                <div className="text-sm text-yellow-600">
                  <span className="font-medium">{pendingCount}</span> pending
                </div>
                <div className="text-sm text-green-600">
                  <span className="font-medium">{successCount}</span> uploaded
                </div>
                {errorCount > 0 && (
                  <div className="text-sm text-red-600">
                    <span className="font-medium">{errorCount}</span> failed
                  </div>
                )}
              </div>
              
              {totalCompressedSize > 0 && (
                <div className="text-sm text-muted-foreground">
                  Saved: {formatBytes(totalOriginalSize - totalCompressedSize)} 
                  ({Math.round((1 - totalCompressedSize / totalOriginalSize) * 100)}% reduction)
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={processQueue} 
                  disabled={isProcessing || pendingCount === 0}
                  size="sm"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload {pendingCount} Photos
                    </>
                  )}
                </Button>
                <Button onClick={clearCompleted} variant="outline" size="sm" disabled={successCount === 0}>
                  Clear Done
                </Button>
                <Button onClick={clearAll} variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Queue List */}
          {queue.length > 0 && (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {queue.map((item, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    item.status === 'success' ? 'bg-green-50 border-green-200' :
                    item.status === 'error' ? 'bg-red-50 border-red-200' :
                    'bg-muted/30 border-muted'
                  }`}
                >
                  {item.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : item.status === 'error' ? (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.originalSize)}
                      {item.compressedSize && (
                        <span className="text-green-600 ml-2">
                          → {formatBytes(item.compressedSize)} 
                          ({Math.round((1 - item.compressedSize / item.originalSize) * 100)}% saved)
                        </span>
                      )}
                      {item.error && (
                        <span className="text-red-600 ml-2">{item.error}</span>
                      )}
                    </p>
                  </div>
                  
                  {(item.status === 'compressing' || item.status === 'uploading') && (
                    <div className="w-24">
                      <Progress value={item.progress} className="h-2" />
                      <p className="text-[10px] text-muted-foreground text-center mt-1">
                        {item.status === 'compressing' ? 'Compressing...' : 'Uploading...'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Photos Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Photos in Storage</CardTitle>
            <Button onClick={loadExistingPhotos} variant="outline" size="sm" disabled={loadingExisting}>
              {loadingExisting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Load Photos'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {existingPhotos.length > 0 ? (
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {existingPhotos.map((url, index) => (
                <img 
                  key={index}
                  src={url} 
                  alt={`Photo ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-lg"
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Click "Load Photos" to see existing photos in storage
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
