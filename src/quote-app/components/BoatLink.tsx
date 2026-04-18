import { useState } from "react";
import { getBoatByName, BoatDetails } from "@/quote-app/lib/boatDetails";
import { BoatDetailsModal } from "./BoatDetailsModal";

interface BoatLinkProps {
  boatName: string;
  className?: string;
  capacityOverride?: number;
}

export const BoatLink = ({ boatName, className = "", capacityOverride }: BoatLinkProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const boat = getBoatByName(boatName);

  if (!boat) {
    return <span className={className}>{boatName}</span>;
  }

  const displayCapacity = capacityOverride ?? boat.capacity;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`text-primary hover:underline cursor-pointer font-medium ${className}`}
      >
        {boatName} ({displayCapacity})
      </button>
      <BoatDetailsModal 
        boat={boat}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};
