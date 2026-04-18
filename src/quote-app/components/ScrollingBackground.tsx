// Empty boat photos - keeping best variety, removing water-heavy/duplicates
import irony1 from "@/quote-app/assets/boats/irony-1.jpg";
import irony3 from "@/quote-app/assets/boats/irony-3.jpg";
import irony5 from "@/quote-app/assets/boats/irony-5.jpg";
import meeseeks1 from "@/quote-app/assets/boats/meeseeks-1.jpg";
import meeseeks3 from "@/quote-app/assets/boats/meeseeks-3.jpg";
import meeseeks5 from "@/quote-app/assets/boats/meeseeks-5.jpg";

// Clever Girl disco ball photos
import cleverGirl1 from "@/quote-app/assets/boats/clever-girl-1.jpg";
import cleverGirl3 from "@/quote-app/assets/boats/clever-girl-3.jpg";
import cleverGirl4 from "@/quote-app/assets/boats/clever-girl-4.jpg";
import cleverGirl6 from "@/quote-app/assets/boats/clever-girl-6.jpg";
import cleverGirl9 from "@/quote-app/assets/boats/clever-girl-9.jpg";

// Party photos
import partyFun27 from "@/quote-app/assets/party/disco_fun_27.jpg";
import partyFun28 from "@/quote-app/assets/party/disco_fun_28.jpg";
import partyBest2 from "@/quote-app/assets/party/disco_fun_best2.jpg";
import partyFirst from "@/quote-app/assets/party/disco_fun_first.jpg";
import partyFun29 from "@/quote-app/assets/party/disco_fun29.jpg";
import partyWigs from "@/quote-app/assets/party/disco_wigs.jpg";
import partyDJ from "@/quote-app/assets/party/DJ_Pic.jpg";
import partyGroup from "@/quote-app/assets/party/Group_Pic_6_22.jpg";
import partyBoat from "@/quote-app/assets/party/IMG_7635.jpg";
import partyUnicorn from "@/quote-app/assets/party/unicorn_pic.jpg";

export const ScrollingBackground = () => {
  // Empty boat photos - mix of irony, meeseeks, and clever girl (disco balls)
  const boatImages = [
    cleverGirl1, irony1, cleverGirl3, meeseeks1, 
    cleverGirl4, irony3, cleverGirl6, meeseeks3,
    cleverGirl9, irony5, meeseeks5,
  ];

  // Party photos
  const partyImages = [
    partyFun27, partyFun28, partyBest2, partyFirst, partyFun29,
    partyWigs, partyDJ, partyGroup, partyBoat, partyUnicorn,
  ];

  // Create alternating array: boat, party, boat, party...
  const alternatingImages: string[] = [];
  const maxLength = Math.max(boatImages.length, partyImages.length);
  for (let i = 0; i < maxLength; i++) {
    if (i < boatImages.length) alternatingImages.push(boatImages[i]);
    if (i < partyImages.length) alternatingImages.push(partyImages[i]);
  }

  return (
    <>
      <style>
        {`
          @keyframes scroll-left {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          .animate-scroll-left {
            animation: scroll-left 40s linear infinite;
          }
        `}
      </style>
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Row 1 */}
        <div className="flex gap-2 mb-2 animate-scroll-left will-change-transform">
          {[...Array(4)].map((_, setIndex) => (
            <div key={`row1-set${setIndex}`} className="flex gap-2">
              {alternatingImages.map((image, idx) => (
                <div
                  key={`row1-${setIndex}-${idx}`}
                  className="w-[180px] h-[140px] flex-shrink-0 rounded-lg overflow-hidden"
                >
                  <img 
                    src={image} 
                    alt="" 
                    className="w-full h-full object-cover opacity-50"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Row 2 - offset */}
        <div className="flex gap-2 mb-2 animate-scroll-left will-change-transform" style={{ marginLeft: '-80px', animationDelay: '-5s' }}>
          {[...Array(4)].map((_, setIndex) => (
            <div key={`row2-set${setIndex}`} className="flex gap-2">
              {[...alternatingImages].reverse().map((image, idx) => (
                <div
                  key={`row2-${setIndex}-${idx}`}
                  className="w-[180px] h-[140px] flex-shrink-0 rounded-lg overflow-hidden"
                >
                  <img 
                    src={image} 
                    alt="" 
                    className="w-full h-full object-cover opacity-50"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Row 3 */}
        <div className="flex gap-2 mb-2 animate-scroll-left will-change-transform" style={{ animationDelay: '-10s' }}>
          {[...Array(4)].map((_, setIndex) => (
            <div key={`row3-set${setIndex}`} className="flex gap-2">
              {alternatingImages.map((image, idx) => (
                <div
                  key={`row3-${setIndex}-${idx}`}
                  className="w-[180px] h-[140px] flex-shrink-0 rounded-lg overflow-hidden"
                >
                  <img 
                    src={image} 
                    alt="" 
                    className="w-full h-full object-cover opacity-50"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Row 4 - offset */}
        <div className="flex gap-2 mb-2 animate-scroll-left will-change-transform" style={{ marginLeft: '-120px', animationDelay: '-15s' }}>
          {[...Array(4)].map((_, setIndex) => (
            <div key={`row4-set${setIndex}`} className="flex gap-2">
              {[...alternatingImages].reverse().map((image, idx) => (
                <div
                  key={`row4-${setIndex}-${idx}`}
                  className="w-[180px] h-[140px] flex-shrink-0 rounded-lg overflow-hidden"
                >
                  <img 
                    src={image} 
                    alt="" 
                    className="w-full h-full object-cover opacity-50"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Row 5 */}
        <div className="flex gap-2 mb-2 animate-scroll-left will-change-transform" style={{ animationDelay: '-20s' }}>
          {[...Array(4)].map((_, setIndex) => (
            <div key={`row5-set${setIndex}`} className="flex gap-2">
              {alternatingImages.map((image, idx) => (
                <div
                  key={`row5-${setIndex}-${idx}`}
                  className="w-[180px] h-[140px] flex-shrink-0 rounded-lg overflow-hidden"
                >
                  <img 
                    src={image} 
                    alt="" 
                    className="w-full h-full object-cover opacity-50"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Row 6 - offset */}
        <div className="flex gap-2 animate-scroll-left will-change-transform" style={{ marginLeft: '-60px', animationDelay: '-25s' }}>
          {[...Array(4)].map((_, setIndex) => (
            <div key={`row6-set${setIndex}`} className="flex gap-2">
              {[...alternatingImages].reverse().map((image, idx) => (
                <div
                  key={`row6-${setIndex}-${idx}`}
                  className="w-[180px] h-[140px] flex-shrink-0 rounded-lg overflow-hidden"
                >
                  <img 
                    src={image} 
                    alt="" 
                    className="w-full h-full object-cover opacity-50"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
