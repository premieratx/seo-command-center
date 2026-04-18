/**
 * Centralized boat selection logic based on guest count
 * This is the SINGLE SOURCE OF TRUTH for boat recommendations
 */

export interface BoatRecommendation {
  boatName: string;
  capacity: number;
  capacityRange: string;
}

/**
 * Get the recommended boat based on guest count
 * CRITICAL: This determines which boat availability to show
 */
export const getRecommendedBoat = (guestCount: number): BoatRecommendation => {
  if (guestCount <= 14) {
    return {
      boatName: "Day Tripper",
      capacity: 14,
      capacityRange: "1-14"
    };
  } else if (guestCount <= 30) {
    return {
      boatName: "Meeseeks / The Irony",
      capacity: 30,
      capacityRange: "15-30"
    };
  } else if (guestCount <= 50) {
    return {
      boatName: "Clever Girl",
      capacity: 50,
      capacityRange: "31-50"
    };
  } else {
    return {
      boatName: "Clever Girl",
      capacity: 75,
      capacityRange: "51-75"
    };
  }
};

/**
 * Check if guest count change requires boat change
 */
export const shouldChangeBoat = (oldCount: number, newCount: number): boolean => {
  const oldBoat = getRecommendedBoat(oldCount);
  const newBoat = getRecommendedBoat(newCount);
  return oldBoat.boatName !== newBoat.boatName;
};

/**
 * Get capacity thresholds for boat filtering
 */
export const getCapacityThresholds = (guestCount: number) => {
  if (guestCount <= 14) {
    return { min: 1, max: 14 };
  } else if (guestCount <= 30) {
    return { min: 15, max: 30 };
  } else if (guestCount <= 50) {
    return { min: 31, max: 50 };
  } else {
    return { min: 51, max: 75 };
  }
};
