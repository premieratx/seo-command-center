import { ScrollingBackground } from "@/quote-app/components/ScrollingBackground";
import { EOYSaleBanner } from "@/quote-app/components/quote-builder/EOYSaleBanner";

const EOYSaleBannerEmbed = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Scrolling photo background */}
      <ScrollingBackground />
      
      {/* Banner content - wider container, minimal padding */}
      <div className="relative z-10 flex items-start justify-center min-h-screen p-2">
        <div className="w-full max-w-6xl">
          <EOYSaleBanner />
        </div>
      </div>
    </div>
  );
};

export default EOYSaleBannerEmbed;
