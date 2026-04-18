import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/quote-app/components/ui/dialog";
import { BoatDetails } from "@/quote-app/lib/boatDetails";
import { X, Users, DollarSign, Package } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface BoatDetailsModalProps {
  boat: BoatDetails | null;
  open: boolean;
  onClose: () => void;
}

export const BoatDetailsModal = ({ boat, open, onClose }: BoatDetailsModalProps) => {
  if (!boat) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">{boat.displayName}</DialogTitle>
              <div className="flex gap-3 mt-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {boat.capacityRange ? `${boat.capacityRange} guests` : `Up to ${boat.capacity} guests`}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  ${boat.hourlyRate}/hour
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Photo Gallery */}
        {boat.images.length > 0 && (
          <div className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {boat.images.map((image, index) => (
                <div 
                  key={index} 
                  className="aspect-video rounded-lg overflow-hidden bg-muted hover:scale-105 transition-transform cursor-pointer"
                >
                  <img 
                    src={image} 
                    alt={`${boat.name} - Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mt-6">
          <p className="text-muted-foreground">{boat.description}</p>
        </div>

        {/* What's Included */}
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Package className="h-5 w-5" />
            What's Included
          </h3>
          <ul className="grid md:grid-cols-2 gap-2">
            {boat.included?.filter(item => item).map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Package Options */}
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">Package Options for Private Parties</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {boat.packages?.filter(pkg => pkg).map((pkg, index) => (
              <div key={index} className="border rounded-lg p-4 hover:border-primary transition-colors">
                <h4 className="font-semibold mb-2">{pkg.name}</h4>
                <p className="text-sm text-muted-foreground">{pkg.description}</p>
                {pkg.price && (
                  <p className="text-primary font-semibold mt-2">{pkg.price}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
