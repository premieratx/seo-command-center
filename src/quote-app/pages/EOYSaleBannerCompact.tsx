import { EOYSaleBannerStacked } from "@/quote-app/components/quote-builder/EOYSaleBannerStacked";

// Import images for photo strip
import cleverGirl1 from "@/quote-app/assets/boats/clever-girl-1.jpg";
import cleverGirl3 from "@/quote-app/assets/boats/clever-girl-3.jpg";
import cleverGirl4 from "@/quote-app/assets/boats/clever-girl-4.jpg";
import cleverGirl6 from "@/quote-app/assets/boats/clever-girl-6.jpg";
import cleverGirl9 from "@/quote-app/assets/boats/clever-girl-9.jpg";
import irony1 from "@/quote-app/assets/boats/irony-1.jpg";
import irony3 from "@/quote-app/assets/boats/irony-3.jpg";
import irony5 from "@/quote-app/assets/boats/irony-5.jpg";
import meeseeks1 from "@/quote-app/assets/boats/meeseeks-1.jpg";
import meeseeks3 from "@/quote-app/assets/boats/meeseeks-3.jpg";
import meeseeks5 from "@/quote-app/assets/boats/meeseeks-5.jpg";
import discoFun27 from "@/quote-app/assets/party/disco_fun_27.jpg";
import discoFun28 from "@/quote-app/assets/party/disco_fun_28.jpg";
import discoFun29 from "@/quote-app/assets/party/disco_fun29.jpg";
import discoFunBest2 from "@/quote-app/assets/party/disco_fun_best2.jpg";
import discoFunFirst from "@/quote-app/assets/party/disco_fun_first.jpg";
import discoWigs from "@/quote-app/assets/party/disco_wigs.jpg";
import djPic from "@/quote-app/assets/party/DJ_Pic.jpg";
import groupPic from "@/quote-app/assets/party/Group_Pic_6_22.jpg";
import boatPic from "@/quote-app/assets/party/IMG_7635.jpg";
import unicornPic from "@/quote-app/assets/party/unicorn_pic.jpg";

const PhotoStrip = ({ images }: { images: string[] }) => {
  const imageWidth = 68;
  const totalWidth = images.length * imageWidth;
  
  return (
    <div className="h-10 overflow-hidden relative w-full">
      <div 
        className="flex gap-1 absolute left-0"
        style={{
          animation: `scroll-seamless 40s linear infinite`,
          width: `${totalWidth * 2}px`
        }}
      >
        {images.map((img, idx) => (
          <img 
            key={`a-${idx}`} 
            src={img} 
            alt="" 
            className="h-10 w-16 object-cover rounded-sm opacity-70 flex-shrink-0"
          />
        ))}
        {images.map((img, idx) => (
          <img 
            key={`b-${idx}`} 
            src={img} 
            alt="" 
            className="h-10 w-16 object-cover rounded-sm opacity-70 flex-shrink-0"
          />
        ))}
      </div>
      <style>{`
        @keyframes scroll-seamless {
          0% { transform: translateX(0); }
          100% { transform: translateX(-${totalWidth}px); }
        }
      `}</style>
    </div>
  );
};

const EOYSaleBannerCompact = () => {
  const bottomImages = [
    cleverGirl1, discoFun27, irony1, discoFunBest2, meeseeks1, groupPic,
    cleverGirl3, discoFun28, irony3, discoWigs, meeseeks3, djPic,
    cleverGirl4, discoFun29, irony5, discoFunFirst, meeseeks5, boatPic,
    cleverGirl6, unicornPic, cleverGirl9
  ];

  return (
    <div className="w-full">
      <EOYSaleBannerStacked />
      <PhotoStrip images={bottomImages} />
    </div>
  );
};

export default EOYSaleBannerCompact;
