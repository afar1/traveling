/**
 * Geographic utilities for calculating distances and grouping locations
 */

// Earth radius in miles
const EARTH_RADIUS_MILES = 3958.8;

// Distance threshold in miles for "soft" city search
export const CITY_PROXIMITY_RADIUS = 60;

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Convert coordinates from degrees to radians
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Distance in miles
  return EARTH_RADIUS_MILES * c;
}

/**
 * Interface for a location with coordinates
 */
export interface GeocodedLocation {
  city: string;
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Find all cities within a specified radius of a target city
 * @param targetCity The city to search around
 * @param allLocations All available locations with coordinates
 * @param radiusMiles The search radius in miles (default: CITY_PROXIMITY_RADIUS)
 * @returns Array of nearby city names including the target city
 */
export function findNearbyCities(
  targetCity: GeocodedLocation,
  allLocations: GeocodedLocation[],
  radiusMiles: number = CITY_PROXIMITY_RADIUS
): string[] {
  if (!targetCity || !targetCity.coordinates) {
    return [targetCity.city];
  }
  
  const [targetLon, targetLat] = targetCity.coordinates;
  
  // Filter locations within the radius
  const nearbyCities = allLocations.filter(location => {
    if (!location.coordinates) return false;
    
    const [lon, lat] = location.coordinates;
    const distance = calculateDistance(targetLat, targetLon, lat, lon);
    
    return distance <= radiusMiles;
  });
  
  // Extract city names
  return nearbyCities.map(location => location.city);
}

/**
 * Cache for geocoded city data to avoid repeated API calls
 */
interface GeocodeCache {
  [city: string]: GeocodedLocation;
}

// In-memory cache for geocoded cities
export const geocodeCache: GeocodeCache = {};

/**
 * Get the geocoded location for a city, using cache if available
 * @param city The city name to geocode
 * @returns A Promise resolving to the geocoded location
 */
export async function getGeocodedLocation(city: string): Promise<GeocodedLocation | null> {
  // Check cache first
  if (geocodeCache[city.toLowerCase()]) {
    return geocodeCache[city.toLowerCase()];
  }
  
  try {
    // Call the geocoding API
    const response = await fetch(`/api/geocode?city=${encodeURIComponent(city)}`);
    
    if (!response.ok) {
      console.error(`Error geocoding city "${city}":`, response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    // Check if we got valid results
    if (!data.features || data.features.length === 0) {
      console.warn(`No geocoding results for city "${city}"`);
      return null;
    }
    
    // Get the first result
    const result = data.features[0];
    
    // Create the geocoded location
    const location: GeocodedLocation = {
      city: city,
      coordinates: result.geometry.coordinates,
    };
    
    // Cache the result
    geocodeCache[city.toLowerCase()] = location;
    
    return location;
  } catch (error) {
    console.error(`Error geocoding city "${city}":`, error);
    return null;
  }
} 