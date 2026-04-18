import { useState, useEffect } from "react";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Lightbox } from "@/quote-app/components/ui/lightbox";

const BUCKET_NAME = "2024-disco-cruise-photos";

export const DiscoPhotoStrip = () => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .list('', { limit: 30, sortBy: { column: 'name', order: 'asc' } });

        if (error) {
          console.error("Error loading photos:", error);
          return;
        }

        // Filter for image files only
        const imageFiles = data?.filter(file => 
          file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
        ) || [];

        // Generate public URLs for first 30
        const urls = imageFiles.slice(0, 30).map(file => {
          const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(file.name);
          return urlData.publicUrl;
        });

        setPhotos(urls);
      } catch (err) {
        console.error("Failed to load photos:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, []);

  if (loading || photos.length === 0) {
    return null;
  }

  // Duplicate for seamless scroll
  const duplicatedPhotos = [...photos, ...photos];

  return (
    <>
      <style>
        {`
          @keyframes scroll-strip {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-scroll-strip {
            animation: scroll-strip 45s linear infinite;
          }
          .animate-scroll-strip:hover {
            animation-play-state: paused;
          }
        `}
      </style>

      <div className="overflow-hidden mb-1">
        <div className="flex gap-1 animate-scroll-strip will-change-transform">
          {duplicatedPhotos.map((photo, idx) => (
            <img
              key={`strip-${idx}`}
              src={photo}
              alt={`Disco cruise ${(idx % photos.length) + 1}`}
              className="h-[100px] w-auto flex-shrink-0 rounded cursor-pointer hover:opacity-80 transition-opacity object-cover"
              onClick={() => {
                setLightboxIndex(idx % photos.length);
                setLightboxOpen(true);
              }}
              loading="lazy"
            />
          ))}
        </div>
      </div>

      <Lightbox
        images={photos}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};
