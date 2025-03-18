import { NextRequest, NextResponse } from 'next/server';

// Get the Mapbox access token from environment variables or use a hardcoded one
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiYWZhcjAxIiwiYSI6ImNtOGRpcG4zNDIybncycm9iNHhtc3g2dGsifQ.QBFYHz7yyD31BFpN5KopPQ';

// List of US state names and abbreviations
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 
  'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 
  'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  // Also include common abbreviations
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY'
];

export async function GET(request: NextRequest) {
  try {
    // Get the city from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const global = searchParams.get('global') === 'true';
    
    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
    }
    
    // Check if this is a state
    const isState = US_STATES.includes(city);
    
    // Log the request
    console.log(`API route: Geocoding request for ${isState ? 'state' : 'city'} "${city}" ${global ? '(global search)' : ''}`);
    
    // Build the Mapbox Geocoding API URL
    const encodedCity = encodeURIComponent(city);
    
    // Use different types parameter for states vs cities
    const types = isState ? 'region' : 'place,locality,region';
    
    // Only include country filter if not doing a global search
    const countryFilter = global ? '' : '&country=us,ca,gb,de,fr';
    
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedCity}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=${types}${countryFilter}&limit=1&fuzzyMatch=true`;
    
    console.log(`API route: Using geocoding URL with types=${types} ${global ? '(global search)' : ''}`);
    
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
    
    // If we didn't find results and it's not already a global search, try again with global search
    if ((!data.features || data.features.length === 0) && !global) {
      console.log(`No results found with country filter, trying global search for "${city}"`);
      
      // Recursive call with global=true
      const globalSearchParams = new URLSearchParams(searchParams);
      globalSearchParams.set('global', 'true');
      
      // Create a new request with modified searchParams
      const globalRequest = new NextRequest(
        new URL(`?${globalSearchParams.toString()}`, request.url),
        request
      );
      
      // Call this function again with the modified request
      return GET(globalRequest);
    }
    
    // Store whether this was a state query in the response
    data.isState = isState;
    data.global = global;
    
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