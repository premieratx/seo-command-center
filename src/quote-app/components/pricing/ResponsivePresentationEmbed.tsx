import { Button } from "@/quote-app/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useIsMobile } from "@/quote-app/hooks/use-mobile";

interface ResponsivePresentationEmbedProps {
  embedUrl: string;
  linkUrl: string;
  title: string;
  thumbnailUrl?: string;
}

export const ResponsivePresentationEmbed = ({ 
  embedUrl, 
  linkUrl, 
  title,
  thumbnailUrl 
}: ResponsivePresentationEmbedProps) => {
  const isMobile = useIsMobile();

  // Generate thumbnail URL from Gamma embed URL if not provided
  const getThumbnailUrl = () => {
    if (thumbnailUrl) return thumbnailUrl;
    // For Gamma presentations, we can use a screenshot or placeholder
    // Using a generic presentation thumbnail approach
    return `https://api.microlink.io/?url=${encodeURIComponent(linkUrl)}&screenshot=true&meta=false&embed=screenshot.url`;
  };

  if (isMobile) {
    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <div className="w-full max-w-md rounded-lg overflow-hidden border-2 border-primary/20 shadow-lg">
          <img 
            src={getThumbnailUrl()}
            alt={`${title} preview`}
            className="w-full h-auto object-cover"
            onError={(e) => {
              // Fallback to a gradient placeholder if image fails
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden w-full h-48 bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <span className="text-primary font-bold text-center px-4">{title}</span>
          </div>
        </div>
        <Button 
          asChild
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
        >
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            View Full Summary Presentation
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-[75vh]">
      <iframe 
        src={embedUrl}
        className="w-full h-full border-none"
        allow="fullscreen" 
        title={title}
      />
    </div>
  );
};