import { NextRequest, NextResponse } from 'next/server';

// Get the Mapbox access token from environment variables or use a hardcoded one
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiYWZhcjAxIiwiYSI6ImNtOGRpcG4zNDIybncycm9iNHhtc3g2dGsifQ.QBFYHz7yyD31BFpN5KopPQ';

export async function GET(request: NextRequest) {
  try {
    // Get the city from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    
    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
    }
    
    // Log the request
    console.log(`API route: Geocoding request for city "${city}"`);
    
    // Build the Mapbox Geocoding API URL
    const encodedCity = encodeURIComponent(city);
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedCity}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,locality,region&country=us,ca,gb,de,fr&limit=1&fuzzyMatch=true`;
    
    // Make the request to Mapbox
    const response = await fetch(geocodingUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Mapbox API error: ${response.status}`, errorText);
      return NextResponse.json(
        { error: `Mapbox API error: ${response.status}` },
        { status: response.status }
      );
    }
    
    // Get the response data
    const data = await response.json();
    
    // Return the response
    return NextResponse.json(data);
  } catch (error) {
    console.error('Geocoding API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 