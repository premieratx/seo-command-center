import { useState } from "react";
import { Button } from "@/quote-app/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/quote-app/components/ui/dialog";
import { Info } from "lucide-react";
import saleGraphicBach from "@/quote-app/assets/sale-graphic-feb-2026-bach.png";
import saleGraphicPrivate from "@/quote-app/assets/sale-graphic-feb-2026-pvt.png";

interface PayInFullPerksBannerProps {
  variant?: 'bach' | 'private';
}

export const PayInFullPerksBanner = ({ variant = 'bach' }: PayInFullPerksBannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const saleGraphic = variant === 'private' ? saleGraphicPrivate : saleGraphicBach;

  return (
    <div className="bg-gradient-to-r from-orange-100 via-yellow-50 to-orange-100 border-2 border-orange-400 rounded-lg p-1.5 sm:p-3 mb-2 sm:mb-4">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
        <h2 className="text-xs sm:text-lg md:text-xl font-bold text-center">
          <span className="text-orange-600">PLUS</span>{" "}
          <span className="text-primary">$100s in Perks & Upgrades When You Pay in Full by Thurs 2/5!</span>
        </h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white border-orange-400 text-orange-600 hover:bg-orange-50 text-[10px] sm:text-xs h-5 sm:h-7 px-1.5 sm:px-2 flex items-center gap-0.5 sm:gap-1"
            >
              <Info className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              View Details
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-0 overflow-hidden">
            <img 
              src={saleGraphic} 
              alt="New Year Super Sale Extended til Thurs 2/5 - Full Details" 
              className="w-full h-auto"
            />
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-0.5 sm:gap-y-1">
        {/* Row 1 */}
        <div className="flex items-start gap-1 sm:gap-2">
          <span className="text-orange-500 font-bold text-[10px] sm:text-base">•</span>
          <span className="text-[9px] sm:text-sm text-blue-600 font-semibold leading-tight">
            25% Discount on R/T Transportation
          </span>
        </div>
        <div className="flex items-start gap-1 sm:gap-2">
          <span className="text-orange-500 font-bold text-[10px] sm:text-base">•</span>
          <span className="text-[9px] sm:text-sm text-blue-600 font-semibold leading-tight">
            FREE Alcohol Delivery, Stock-the-Cooler Svc & Bottle of Champagne!
          </span>
        </div>
        
        {/* Row 2 - Concierge */}
        <div className="col-span-2 flex items-start gap-1 sm:gap-2">
          <span className="text-orange-500 font-bold text-[10px] sm:text-base">•</span>
          <span className="text-[9px] sm:text-sm text-blue-600 font-semibold leading-tight">
            FREE BnB Concierge Delivery Service & Welcome to Austin Gift!
          </span>
        </div>
        
        {/* Cruise-type specific perks with border */}
        <div className="col-span-2 mt-1 sm:mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
          {/* ATX Disco Cruise Perk - only show for bach */}
          {variant === 'bach' && (
            <div className="border border-blue-400 rounded-md p-1 sm:p-2 bg-blue-50/50">
              <div className="flex items-start gap-1 sm:gap-2">
                <span className="text-orange-500 font-bold text-[10px] sm:text-base">•</span>
                <span className="text-[9px] sm:text-sm text-orange-600 font-medium leading-tight">
                  FREE Mimosa Party Cooler + Sparkle Package ($200-$250 value) - <span className="font-bold">ATX Disco Cruise</span>
                </span>
              </div>
            </div>
          )}
          
          {/* Private Cruise Perk */}
          <div className={`border border-orange-400 rounded-md p-1 sm:p-2 bg-orange-50/50 ${variant === 'private' ? 'col-span-2' : ''}`}>
            <div className="flex items-start gap-1 sm:gap-2">
              <span className="text-orange-500 font-bold text-[10px] sm:text-base">•</span>
              <span className="text-[9px] sm:text-sm text-orange-600 font-medium leading-tight">
                FREE Ultimate Disco Party Package Upgrade ($250-$350 value) - <span className="font-bold">Private Cruise</span>
              </span>
            </div>
          </div>
        </div>
        
        {/* Full-width call to action text */}
        <div className="col-span-2 mt-1.5 sm:mt-3 text-center">
          <p className="text-xs sm:text-base md:text-lg font-bold text-primary leading-tight">
            **Book by the Deadlines Below to Get $150-$250 Off Your Booking - Once You Pay in Full, We'll Add All the Free Perks!**
          </p>
        </div>
      </div>
    </div>
  );
};