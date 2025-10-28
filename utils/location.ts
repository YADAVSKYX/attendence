interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculates the distance between two GPS coordinates in kilometers using the Haversine formula.
 * @param coord1 - The first coordinate.
 * @param coord2 - The second coordinate.
 * @returns The distance in kilometers.
 */
export const getDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(coord2.lat - coord1.lat);
  const dLng = deg2rad(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord1.lat)) * Math.cos(deg2rad(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
