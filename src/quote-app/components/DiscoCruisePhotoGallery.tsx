import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Lightbox } from "@/quote-app/components/ui/lightbox";

const BUCKET_NAME = "2024-disco-cruise-photos";

// Shuffle array using Fisher-Yates algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

interface DiscoCruisePhotoGalleryProps {
  /** Delay loading the photos until this many ms after mount (default: 0 = immediate) */
  lazyDelay?: number;
}

export const DiscoCruisePhotoGallery = ({ lazyDelay = 0 }: DiscoCruisePhotoGalleryProps) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [shouldLoad, setShouldLoad] = useState(lazyDelay === 0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Defer loading based on lazyDelay or intersection observer
  useEffect(() => {
    if (lazyDelay > 0) {
      const timer = setTimeout(() => setShouldLoad(true), lazyDelay);
      return () => clearTimeout(timer);
    }
  }, [lazyDelay]);

  // Use Intersection Observer to only load when visible
  useEffect(() => {
    if (shouldLoad) return; // Already triggered
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before visible
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return;
    
    const loadPhotos = async () => {
      try {
        // Load up to 200 photos for 8-row gallery
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .list('', { limit: 200, sortBy: { column: 'name', order: 'asc' } });

        if (error) {
          console.error("Error loading photos:", error);
          return;
        }

        // Filter for image files only
        const imageFiles = data?.filter(file => 
          file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
        ) || [];

        // Generate public URLs and deduplicate by filename
        const seenNames = new Set<string>();
        const uniqueUrls: string[] = [];
        
        for (const file of imageFiles) {
          // Normalize filename to detect duplicates (remove extensions, lowercase)
          const baseName = file.name.toLowerCase().replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
          
          if (!seenNames.has(baseName)) {
            seenNames.add(baseName);
            const { data: urlData } = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(file.name);
            uniqueUrls.push(urlData.publicUrl);
          }
        }

        setPhotos(uniqueUrls);
      } catch (err) {
        console.error("Failed to load photos:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, [shouldLoad]);

  // Create 8 different shuffled sets for each row - no duplicates across visible area
  const rowPhotos = useMemo(() => {
    if (photos.length === 0) return { row1: [], row2: [], row3: [], row4: [], row5: [], row6: [], row7: [], row8: [] };
    
    const shuffled = shuffleArray(photos);
    const photosPerRow = Math.ceil(photos.length / 8);
    
    return {
      row1: shuffled.slice(0, photosPerRow),
      row2: shuffled.slice(photosPerRow, photosPerRow * 2),
      row3: shuffled.slice(photosPerRow * 2, photosPerRow * 3),
      row4: shuffled.slice(photosPerRow * 3, photosPerRow * 4),
      row5: shuffled.slice(photosPerRow * 4, photosPerRow * 5),
      row6: shuffled.slice(photosPerRow * 5, photosPerRow * 6),
      row7: shuffled.slice(photosPerRow * 6, photosPerRow * 7),
      row8: shuffled.slice(photosPerRow * 7),
    };
  }, [photos]);

  // Duplicate each row's photos for seamless infinite scroll
  const getScrollingPhotos = (rowPhotos: string[]) => {
    return [...rowPhotos, ...rowPhotos, ...rowPhotos];
  };

  if (loading) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        Loading disco cruise photos...
      </div>
    );
  }

  if (!shouldLoad || photos.length === 0) {
    // Placeholder to maintain layout and enable intersection observer
    return (
      <div ref={containerRef} className="mt-4 overflow-hidden min-h-[200px]">
        {loading && shouldLoad && (
          <div className="py-4 text-center text-muted-foreground">
            Loading disco cruise photos...
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="mt-4 overflow-hidden">
      <h3 className="text-lg font-bold text-center mb-2">🎉 ATX Disco Cruise Photos 🎉</h3>
      
      <style>
        {`
          @keyframes scroll-gallery {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-33.333%);
            }
          }
          .animate-scroll-gallery {
            animation: scroll-gallery 40s linear infinite;
          }
          .animate-scroll-gallery:hover {
            animation-play-state: paused;
          }
        `}
      </style>

      <div className="space-y-1">
        {/* Row 1 */}
        <div className="flex gap-1 animate-scroll-gallery will-change-transform">
          {getScrollingPhotos(rowPhotos.row1).map((photo, idx) => (
            <img key={`row1-${idx}`} src={photo} alt="Disco cruise photo" className="h-[120px] w-auto flex-shrink-0 rounded cursor-pointer hover:opacity-80 transition-opacity object-cover" onClick={() => { setLightboxIndex(photos.indexOf(photo) >= 0 ? photos.indexOf(photo) : 0); setLightboxOpen(true); }} loading="lazy" />
          ))}
        </div>
        {/* Row 2 - reverse */}
        <div className="flex gap-1 animate-scroll-gallery will-change-transform" style={{ animationDirection: 'reverse', animationDelay: '-10s' }}>
          {getScrollingPhotos(rowPhotos.row2).map((photo, idx) => (
            <img key={`row2-${idx}`} src={photo} alt="Disco cruise photo" className="h-[120px] w-auto flex-shrink-0 rounded cursor-pointer hover:opacity-80 transition-opacity object-cover" onClick={() => { setLightboxIndex(photos.indexOf(photo) >= 0 ? photos.indexOf(photo) : 0); setLightboxOpen(true); }} loading="lazy" />
          ))}
        </div>
        {/* Row 3 */}
        <div className="flex gap-1 animate-scroll-gallery will-change-transform" style={{ animationDelay: '-20s' }}>
          {getScrollingPhotos(rowPhotos.row3).map((photo, idx) => (
            <img key={`row3-${idx}`} src={photo} alt="Disco cruise photo" className="h-[120px] w-auto flex-shrink-0 rounded cursor-pointer hover:opacity-80 transition-opacity object-cover" onClick={() => { setLightboxIndex(photos.indexOf(photo) >= 0 ? photos.indexOf(photo) : 0); setLightboxOpen(true); }} loading="lazy" />
          ))}
        </div>
        {/* Row 4 - reverse */}
        <div className="flex gap-1 animate-scroll-gallery will-change-transform" style={{ animationDirection: 'reverse', animationDelay: '-30s' }}>
          {getScrollingPhotos(rowPhotos.row4).map((photo, idx) => (
            <img key={`row4-${idx}`} src={photo} alt="Disco cruise photo" className="h-[120px] w-auto flex-shrink-0 rounded cursor-pointer hover:opacity-80 transition-opacity object-cover" onClick={() => { setLightboxIndex(photos.indexOf(photo) >= 0 ? photos.indexOf(photo) : 0); setLightboxOpen(true); }} loading="lazy" />
          ))}
        </div>
        {/* Row 5 */}
        <div className="flex gap-1 animate-scroll-gallery will-change-transform" style={{ animationDelay: '-5s' }}>
          {getScrollingPhotos(rowPhotos.row5).map((photo, idx) => (
            <img key={`row5-${idx}`} src={photo} alt="Disco cruise photo" className="h-[120px] w-auto flex-shrink-0 rounded cursor-pointer hover:opacity-80 transition-opacity object-cover" onClick={() => { setLightboxIndex(photos.indexOf(photo) >= 0 ? photos.indexOf(photo) : 0); setLightboxOpen(true); }} loading="lazy" />
          ))}
        </div>
        {/* Row 6 - reverse */}
        <div className="flex gap-1 animate-scroll-gallery will-change-transform" style={{ animationDirection: 'reverse', animationDelay: '-15s' }}>
          {getScrollingPhotos(rowPhotos.row6).map((photo, idx) => (
            <img key={`row6-${idx}`} src={photo} alt="Disco cruise photo" className="h-[120px] w-auto flex-shrink-0 rounded cursor-pointer hover:opacity-80 transition-opacity object-cover" onClick={() => { setLightboxIndex(photos.indexOf(photo) >= 0 ? photos.indexOf(photo) : 0); setLightboxOpen(true); }} loading="lazy" />
          ))}
        </div>
        {/* Row 7 */}
        <div className="flex gap-1 animate-scroll-gallery will-change-transform" style={{ animationDelay: '-25s' }}>
          {getScrollingPhotos(rowPhotos.row7).map((photo, idx) => (
            <img key={`row7-${idx}`} src={photo} alt="Disco cruise photo" className="h-[120px] w-auto flex-shrink-0 rounded cursor-pointer hover:opacity-80 transition-opacity object-cover" onClick={() => { setLightboxIndex(photos.indexOf(photo) >= 0 ? photos.indexOf(photo) : 0); setLightboxOpen(true); }} loading="lazy" />
          ))}
        </div>
        {/* Row 8 - reverse */}
        <div className="flex gap-1 animate-scroll-gallery will-change-transform" style={{ animationDirection: 'reverse', animationDelay: '-35s' }}>
          {getScrollingPhotos(rowPhotos.row8).map((photo, idx) => (
            <img key={`row8-${idx}`} src={photo} alt="Disco cruise photo" className="h-[120px] w-auto flex-shrink-0 rounded cursor-pointer hover:opacity-80 transition-opacity object-cover" onClick={() => { setLightboxIndex(photos.indexOf(photo) >= 0 ? photos.indexOf(photo) : 0); setLightboxOpen(true); }} loading="lazy" />
          ))}
        </div>
      </div>

      <Lightbox
        images={photos}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};