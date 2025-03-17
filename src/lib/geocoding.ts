interface GeocodingResult {
  latitude: number | null;
  longitude: number | null;
  error?: string;
}

const GEOCODING_CACHE: Record<string, GeocodingResult> = {};

export async function geocodeAddress(address: string): Promise<GeocodingResult> {
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