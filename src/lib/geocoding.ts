interface GeocodingResult {
  latitude: number | null;
  longitude: number | null;
  error?: string;
}

// Cache to avoid repeated geocoding requests
const GEOCODING_CACHE: Record<string, GeocodingResult> = {};

// Create a function to format the address for geocoding
function formatAddress(
  street?: string,
  city?: string,
  state?: string,
  zip?: string,
  country?: string
): string {
  const parts = [];
  if (street) parts.push(street);
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (zip) parts.push(zip);
  if (country) parts.push(country);
  return parts.join(', ');
}

// Geocode a complete address
export async function geocodeContact(
  street?: string,
  city?: string,
  state?: string,
  zip?: string,
  country?: string
): Promise<GeocodingResult> {
  const formattedAddress = formatAddress(street, city, state, zip, country);
  return geocodeAddress(formattedAddress);
}

export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  if (!address || address.trim() === '') {
    return { latitude: null, longitude: null, error: 'No address provided' };
  }

  // Check cache first
  if (GEOCODING_CACHE[address]) {
    return GEOCODING_CACHE[address];
  }

  try {
    // Using Nominatim OSM geocoding service (free, but has usage limits)
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'Traveling-Internal-CRM/1.0',
          'Accept-Language': 'en-US,en',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.length === 0) {
      const result = { latitude: null, longitude: null, error: 'Address not found' };
      GEOCODING_CACHE[address] = result;
      return result;
    }

    const result = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };

    // Cache the result
    GEOCODING_CACHE[address] = result;
    return result;
  } catch (error) {
    console.error('Geocoding error:', error);
    return { 
      latitude: null, 
      longitude: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 