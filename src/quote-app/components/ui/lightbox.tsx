import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface LightboxProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export const Lightbox = ({ images, initialIndex, isOpen, onClose }: LightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Reset to initial index when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, goNext, goPrev]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        goNext(); // Swipe left = next
      } else {
        goPrev(); // Swipe right = prev
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-fade-in overflow-hidden"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Navigation arrows - always visible, large and bold */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          goPrev();
        }}
        className="absolute left-2 sm:left-4 z-50 p-2 sm:p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
      >
        <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[3]" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          goNext();
        }}
        className="absolute right-2 sm:right-4 z-50 p-2 sm:p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
      >
        <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[3]" />
      </button>

      {/* Content container - scrollable for tall images, no horizontal overflow */}
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden flex items-start justify-center px-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {images[currentIndex]?.startsWith("youtube:") ? (
          <div className="w-full aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${images[currentIndex].replace("youtube:", "")}?autoplay=1`}
              title="Video"
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <img
            src={images[currentIndex]}
            alt={`Gallery image ${currentIndex + 1}`}
            className="w-full rounded-lg"
          />
        )}
      </div>

      {/* Image counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 px-3 py-1 rounded-full text-white text-sm">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Swipe hint on mobile */}
      <div className="sm:hidden absolute bottom-12 left-1/2 -translate-x-1/2 text-white/50 text-xs">
        Swipe to navigate • Tap outside to close
      </div>
    </div>
  );
};
