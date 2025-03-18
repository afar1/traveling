'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Contact } from '@/types/supabase';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Get the Mapbox access token from environment variables
// Use a hardcoded token if the environment variable isn't available
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiYWZhcjAxIiwiYSI6ImNtOGRpcG4zNDIybncycm9iNHhtc3g2dGsifQ.QBFYHz7yyD31BFpN5KopPQ';

// Log token for debugging
console.log('Mapbox token available:', !!MAPBOX_ACCESS_TOKEN);

// Add US_STATES constant at the top of the file under the imports
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

interface MapboxMapProps {
  contacts: Contact[];
  selectedCity?: string;
  selectedContact: Contact | null;
  onViewportChange?: (visibleContacts: Contact[]) => void;
}

export default function MapboxMap({ contacts, selectedCity, selectedContact, onViewportChange }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [visibleContacts, setVisibleContacts] = useState<Contact[]>([]);
  const [debugInfo, setDebugInfo] = useState<{
    action: string;
    data?: any;
    success: boolean;
    timestamp: number;
  } | null>(null);
  const lastGeocodedCity = useRef<string | null>(null);
  const [flyingTo, setFlyingTo] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState({
    lastLocation: '',
    lastCoordinates: [0, 0],
    message: ''
  });

  // Filter valid contacts that have coordinates
  const validContacts = contacts.filter(
    (contact) => contact.latitude && contact.longitude
  );

  // Check if the input is a state or province
  const isStateOrProvince = useCallback((location: string): boolean => {
    return US_STATES.includes(location);
  }, []);

  // Format a location name for display
  const formatLocationName = useCallback((location: string): string => {
    // If it's a two-letter state code, convert to title case
    if (location.length === 2 && US_STATES.includes(location.toUpperCase())) {
      // Return the state name for 2-letter codes
      const stateMap: {[key: string]: string} = {
        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
        'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
        'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
        'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
        'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
        'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
        'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
        'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
        'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
        'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
        'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
        'WI': 'Wisconsin', 'WY': 'Wyoming'
      };
      return stateMap[location.toUpperCase()] || location.toUpperCase();
    }
    
    // For other locations, capitalize first letter of each word
    return location
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  // Add a marker for a city or state
  const addCityMarker = useCallback((city: string, coordinates: [number, number]): mapboxgl.Marker | null => {
    if (!map.current) return null;
    
    // Remove any existing city markers
    markers.current = markers.current.filter(marker => {
      const el = marker.getElement();
      if (el.classList.contains('city-marker')) {
        marker.remove();
        return false;
      }
      return true;
    });
    
    // Create marker element
    const el = document.createElement('div');
    el.className = 'city-marker';
    
    // Style based on whether it's a state or city
    const isState = isStateOrProvince(city);
    el.style.backgroundColor = isState ? '#10B981' : '#8B5CF6'; // Green for states, purple for cities
    el.style.width = isState ? '18px' : '14px';
    el.style.height = isState ? '18px' : '14px';
    el.style.borderRadius = '50%';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
    el.style.zIndex = '5';
    
    // Create popup for the marker
    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: true,
      closeOnClick: true,
      maxWidth: '300px',
      className: 'custom-popup'
    }).setHTML(`
      <div class="p-4" style="background-color: rgba(255, 255, 255, 0.95);">
        <h3 class="font-bold text-lg mb-1" style="color: #1F2937; text-shadow: 0 0 1px rgba(255,255,255,0.5);">
          ${formatLocationName(city)}
        </h3>
        <p class="text-sm" style="color: #111827; font-weight: 500;">
          ${isState ? 'State' : 'City'} location
        </p>
      </div>
    `);
    
    // Create and add the marker
    const marker = new mapboxgl.Marker(el)
      .setLngLat(coordinates as mapboxgl.LngLatLike)
      .setPopup(popup)
      .addTo(map.current);
    
    // Open the popup by default
    marker.togglePopup();
    
    // Add to markers array
    markers.current.push(marker);
    
    return marker;
  }, [isStateOrProvince, formatLocationName]);

  // Geocode a city name and return coordinates
  const geocodeCity = useCallback(async (city: string, tryGlobal = false): Promise<[number, number] | null> => {
    try {
      console.log(`🔍 Starting geocoding for ${US_STATES.includes(city) ? 'state' : 'city'}: "${city}"${tryGlobal ? ' (global search)' : ''}`);
      setIsGeocoding(true);
      setDebugInfo({
        action: `Geocoding "${city}"${tryGlobal ? ' (global)' : ''}`,
        success: true,
        timestamp: Date.now()
      });

      // Make sure the city name is properly encoded
      const encodedCity = encodeURIComponent(city);
      
      // Check if this is a state to use the correct types parameter
      const isState = US_STATES.includes(city);
      const types = isState ? 'region' : 'place,locality,region';
      
      // Only include country filter if not doing a global search
      const countryFilter = tryGlobal ? '' : '&country=us,ca,gb,de,fr';
      
      // Create the direct Mapbox API URL
      const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedCity}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=${types}${countryFilter}&limit=1&fuzzyMatch=true`;
      console.log(`📡 Geocoding API URL with types=${types}: ${mapboxUrl.replace(MAPBOX_ACCESS_TOKEN, 'HIDDEN_TOKEN')}`);
      
      try {
        // Try direct API call first
        const directResponse = await fetch(mapboxUrl);
        
        if (directResponse.ok) {
          const data = await directResponse.json();
          console.log(`✅ Direct Mapbox API response:`, data);
          
          // Check if we got any results
          if (data.features && data.features.length > 0) {
            const firstResult = data.features[0];
            const placeName = firstResult.place_name;
            const coordinates = firstResult.center;
            console.log(`🎯 Successfully geocoded "${city}" to: "${placeName}" at coordinates:`, coordinates);
            
            setDebugInfo({
              action: `Successfully geocoded "${city}"`,
              data: { placeName, coordinates, method: 'direct', isState, global: tryGlobal },
              success: true,
              timestamp: Date.now()
            });
            
            return [coordinates[0], coordinates[1]];
          } 
          
          // If no results and not already trying a global search, try again globally
          if ((!data.features || data.features.length === 0) && !tryGlobal) {
            console.log(`❌ No results found with country filter, trying global search for "${city}"`);
            // Instead of calling self recursively, prepare for trying with global=true in the API call later
            tryGlobal = true;
            // Continue to API fallback with updated tryGlobal parameter
          } else if (!data.features || data.features.length === 0) {
            // If we're already trying global and still no results
            console.warn(`⚠️ No results found even with global search for: "${city}"`);
            setDebugInfo({
              action: `No results for "${city}" (global)`,
              success: false,
              timestamp: Date.now()
            });
            return null;
          }
        } else {
          console.warn(`⚠️ Direct API call failed with status ${directResponse.status}, trying Next.js API route fallback`);
        }
      } catch (directError) {
        console.warn(`⚠️ Direct API call error:`, directError);
        // Continue to fallback method
      }
      
      // Create a local API route URL as fallback (this will handle CORS issues)
      // This assumes you've created an API route in Next.js that proxies to Mapbox
      const globalParam = tryGlobal ? '&global=true' : '';
      const localApiUrl = `/api/geocode?city=${encodedCity}${globalParam}`;
      console.log(`🔄 Trying API route fallback: ${localApiUrl}`);
      
      setDebugInfo({
        action: `Trying fallback method for "${city}"`,
        data: { url: localApiUrl, isState, global: tryGlobal },
        success: true,
        timestamp: Date.now()
      });
      
      // If direct call failed, try through our own API endpoint
      const response = await fetch(localApiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Geocoding API error: Status ${response.status}`, errorText);
        setDebugInfo({
          action: `Geocoding error for "${city}"`,
          data: { status: response.status, error: errorText, method: 'fallback' },
          success: false,
          timestamp: Date.now()
        });
        throw new Error(`Geocoding error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Fallback API response:`, data);
      
      // Check if we got any results
      if (data.features && data.features.length > 0) {
        const firstResult = data.features[0];
        const placeName = firstResult.place_name;
        const coordinates = firstResult.center;
        console.log(`🎯 Successfully geocoded "${city}" to: "${placeName}" at coordinates:`, coordinates);
        
        setDebugInfo({
          action: `Successfully geocoded "${city}"`,
          data: { placeName, coordinates, method: 'fallback', isState: data.isState, global: data.global },
          success: true,
          timestamp: Date.now()
        });
        
        return [coordinates[0], coordinates[1]];
      }
      
      console.warn(`⚠️ No geocoding results found for: "${city}"${tryGlobal ? ' (even with global search)' : ''}`);
      
      setDebugInfo({
        action: `No results for "${city}"${tryGlobal ? ' (global)' : ''}`,
        success: false,
        timestamp: Date.now()
      });
      
      // If we haven't tried global search yet, try again
      if (!tryGlobal) {
        console.log(`🌎 Attempting global search for "${city}"`);
        // Create a new URL with global=true and try again
        const globalApiUrl = `/api/geocode?city=${encodedCity}&global=true`;
        console.log(`🔄 Trying global API route fallback: ${globalApiUrl}`);
        
        setDebugInfo({
          action: `Trying global search for "${city}"`,
          data: { url: globalApiUrl, isState },
          success: true,
          timestamp: Date.now()
        });
        
        const globalResponse = await fetch(globalApiUrl);
        
        if (!globalResponse.ok) {
          const errorText = await globalResponse.text();
          console.error(`❌ Global geocoding API error: Status ${globalResponse.status}`, errorText);
          return null;
        }
        
        const globalData = await globalResponse.json();
        
        if (globalData.features && globalData.features.length > 0) {
          const firstResult = globalData.features[0];
          const placeName = firstResult.place_name;
          const coordinates = firstResult.center;
          
          setDebugInfo({
            action: `Successfully geocoded "${city}" (global)`,
            data: { placeName, coordinates, method: 'fallback', isState, global: true },
            success: true,
            timestamp: Date.now()
          });
          
          return [coordinates[0], coordinates[1]];
        }
      }
      
      return null;
    } catch (err) {
      console.error('❌ Error geocoding city:', err);
      setDebugInfo({
        action: `Geocoding error for "${city}"`,
        data: { message: err instanceof Error ? err.message : String(err) },
        success: false,
        timestamp: Date.now()
      });
      return null;
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Geocode a city and fly to it
  const geocodeAndFlyToCity = useCallback(async (cityInput: string): Promise<void> => {
    if (!cityInput || !cityInput.trim() || !map.current) {
      console.log('📍 No city name provided to geocode or map not initialized');
      return;
    }
    
    const city = cityInput.trim();
    console.log(`🔎 Geocoding and flying to: "${city}"`);
    
    // Show loading state
    setFlyingTo(city);
    
    try {
      // First try with default country filter
      const coordinates = await geocodeCity(city);
      
      if (coordinates) {
        console.log(`✈️ Flying to "${city}" at coordinates:`, coordinates);
        
        // Add marker for the city
        if (map.current) {
          addCityMarker(city, coordinates);
          
          // Get current zoom level to use as starting point
          const currentZoom = map.current.getZoom();
          
          // Calculate target zoom based on whether it's a state/province
          const targetZoom = isStateOrProvince(city) ? 5 : 11;
          
          // Fly to the coordinates from current position
          map.current.flyTo({
            center: coordinates,
            zoom: targetZoom,
            essential: true,
            speed: 0.8, // Moderate speed for better UX
            curve: 1.2, // Slightly curved animation
            
            // Don't jump to new location if far away, always animate
            screenSpeed: 0.8, // Consistent screen speed regardless of distance
            maxDuration: 5000, // Cap animation duration to 5 seconds
          });
          
          setMapStatus({
            ...mapStatus,
            lastLocation: city,
            lastCoordinates: coordinates,
            message: `Now viewing ${isStateOrProvince(city) ? 'state' : 'city'}: ${formatLocationName(city)}`
          });
          
          // Log the transition details for debugging
          console.log(`📍 Flying from zoom level ${currentZoom} to ${targetZoom}`);
          
          setFlyingTo(null);
          
          return;
        } else {
          console.warn('⚠️ Map not initialized, cannot fly to coordinates');
          setMapStatus({
            ...mapStatus,
            message: '⚠️ Map not initialized, try refreshing the page'
          });
        }
      } else {
        console.error(`❌ Failed to geocode "${city}"`);
        setMapStatus({
          ...mapStatus,
          message: `⚠️ Could not find location: "${city}"`
        });
      }
    } catch (error) {
      console.error('❌ Error geocoding and flying to city:', error);
      setMapStatus({
        ...mapStatus,
        message: `⚠️ Error finding location: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
    
    // Clear loading state if there was an error
    setFlyingTo(null);
  }, [mapStatus, geocodeCity, isStateOrProvince, formatLocationName, addCityMarker]);

  // Calculate map center or default to a fixed center if no contacts
  const getMapCenter = (): [number, number] => {
    // If we have a selected contact with coordinates, use that
    if (selectedContact?.longitude && selectedContact?.latitude) {
      return [selectedContact.longitude, selectedContact.latitude];
    }
    
    // If filtering by city, center on the first contact in that city
    if (selectedCity && validContacts.length > 0) {
      const cityContacts = validContacts.filter(
        (contact) => contact.mailing_city?.toLowerCase().includes(selectedCity.toLowerCase())
      );
      
      if (cityContacts.length > 0 && cityContacts[0].longitude && cityContacts[0].latitude) {
        return [cityContacts[0].longitude, cityContacts[0].latitude];
      }
    }
    
    // If we have valid contacts, use the first one as center
    if (validContacts.length > 0 && validContacts[0].longitude && validContacts[0].latitude) {
      return [validContacts[0].longitude, validContacts[0].latitude];
    }
    
    // Fallback to default if no valid contacts
    return [-95, 40]; // Default center (USA) - note Mapbox uses [lng, lat] order
  };

  // Set mounted state after initial render
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize map in a separate effect that runs after mounting
  useEffect(() => {
    if (!mounted) return;
    
    // Wait for next tick to ensure DOM is ready
    const timer = setTimeout(() => {
      initializeMap();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [mounted, contacts, selectedCity]);
  
  // Add a new effect to handle city selection
  useEffect(() => {
    // Skip if not mounted or no map or no selected city
    if (!mounted || !map.current || !selectedCity) return;
    
    // Geocode and fly to the selected city
    geocodeAndFlyToCity(selectedCity);
  }, [mounted, selectedCity]);
  
  // Function to initialize the map
  const initializeMap = () => {
    if (!mapContainer.current) {
      console.error('Map container ref is not available');
      setError('Map container element is not available. Please refresh the page.');
      return;
    }
    
    try {
      console.log('Initializing Mapbox with container:', mapContainer.current);
      
      // Clean up existing map if it exists
      if (map.current) {
        map.current.remove();
      }
      
      // Set access token
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      console.log('Mapbox token set');
      
      // Create new map
      const center = getMapCenter();
      console.log('Creating map with center:', center);
      
      const newMap = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11', // Use dark style theme
        center: center,
        zoom: selectedCity ? 10 : 5,
        attributionControl: true,
        pitchWithRotate: false,
        dragRotate: false,
      });
      
      // Add error handling
      newMap.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Failed to load map: ' + (e.error?.message || 'Unknown error'));
      });
      
      // Add load event handler
      newMap.on('load', () => {
        console.log('Map loaded successfully');
        
        // Add markers
        addMarkers(newMap);
        
        // If there's a selected city, fly to it
        if (selectedCity && selectedCity !== lastGeocodedCity.current) {
          geocodeAndFlyToCity(selectedCity);
        }
        
        // Update visible contacts when the map moves
        newMap.on('moveend', updateVisibleContacts);
        
        // Also update on zoom end
        newMap.on('zoomend', updateVisibleContacts);
        
        // Initial update of visible contacts
        updateVisibleContacts();
      });
      
      // Add zoom controls
      newMap.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      
      // Store map reference
      map.current = newMap;
    } catch (err) {
      console.error('Error initializing Mapbox:', err);
      setError('Failed to initialize map: ' + (err instanceof Error ? err.message : String(err)));
    }
  };
  
  // Update the list of visible contacts based on map bounds
  const updateVisibleContacts = useCallback(() => {
    if (!map.current) return;
    
    try {
      // Get the current bounds of the map
      const bounds = map.current.getBounds();
      if (!bounds) {
        console.warn('Could not get map bounds');
        return;
      }
      
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      
      // Filter contacts that are within these bounds
      const visibleContacts = validContacts.filter(contact => {
        // Skip contacts without coordinates
        if (!contact.longitude || !contact.latitude) return false;
        
        return (
          contact.longitude >= sw.lng &&
          contact.longitude <= ne.lng &&
          contact.latitude >= sw.lat &&
          contact.latitude <= ne.lat
        );
      });
      
      // Update visible contacts
      setVisibleContacts(visibleContacts);
      
      // Log details for debugging
      console.log(`Map bounds: SW(${sw.lng.toFixed(4)}, ${sw.lat.toFixed(4)}) NE(${ne.lng.toFixed(4)}, ${ne.lat.toFixed(4)})`);
      console.log(`Visible contacts: ${visibleContacts.length} out of ${validContacts.length}`);
      
      // Update the debug info - COMMENTED OUT FOR NOW
      /*
      setDebugInfo({
        action: `Updated visible contacts`,
        data: {
          count: visibleContacts.length,
          bounds: [
            [sw.lng, sw.lat],
            [ne.lng, ne.lat]
          ]
        },
        success: true,
        timestamp: Date.now()
      });
      */
      
      // Call the onViewportChange callback if provided
      if (onViewportChange) {
        onViewportChange(visibleContacts);
      }
    } catch (error) {
      console.error('Error updating visible contacts:', error);
    }
  }, [validContacts, onViewportChange]);
  
  // Function to add markers to the map
  const addMarkers = (mapInstance: mapboxgl.Map) => {
    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];
    
    // Add markers for all valid contacts
    // We'll update visibility of markers based on the viewport separately
    validContacts.forEach(contact => {
      if (!contact.latitude || !contact.longitude) return;
      
      // Check if this is the selected contact
      const isSelected = selectedContact && selectedContact.id === contact.id;
      
      // Create marker element
      const el = document.createElement('div');
      el.className = 'contact-marker';
      
      // Style the marker differently if it's selected
      if (isSelected) {
        el.style.backgroundColor = '#2563eb'; // Blue
        el.style.width = '22px';
        el.style.height = '22px';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 0 8px rgba(0,0,0,0.4)';
        el.style.zIndex = '10'; // Make selected marker appear above others
      } else {
        el.style.backgroundColor = '#3b82f6'; // Lighter blue
        el.style.width = '14px';
        el.style.height = '14px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 0 4px rgba(0,0,0,0.2)';
      }
      
      // Format contact name correctly for popup
      const formatName = (name: string) => {
        return name
          .split(' ')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
      };
      
      const firstName = contact.first_name || '';
      const lastName = contact.last_name || '';
      const formattedFirstName = formatName(firstName);
      const formattedLastName = formatName(lastName);
      const contactName = `${formattedFirstName} ${formattedLastName}`.trim() || 'Unnamed Contact';
      
      // Format company name
      let companyName = '';
      if (contact.account_name) {
        companyName = contact.account_name
          .split(' ')
          .map(word => {
            // Don't lowercase small words like LLC, Inc, etc.
            if (['LLC', 'Inc.', 'Inc', 'Ltd', 'Corp', 'Corp.'].includes(word)) {
              return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(' ');
      }
      
      // Create address string for popup
      const addressParts = [];
      if (contact.mailing_street) addressParts.push(contact.mailing_street);
      if (contact.mailing_city) addressParts.push(contact.mailing_city);
      if (contact.mailing_state) addressParts.push(contact.mailing_state);
      if (contact.mailing_zip) addressParts.push(contact.mailing_zip);
      const address = addressParts.join(', ') || 'No address provided';
      
      // Create popup content
      const popupContent = `
        <div class="p-4" style="background-color: rgba(255, 255, 255, 0.95);">
          <h3 class="font-bold text-lg mb-1" style="color: #1F2937; text-shadow: 0 0 1px rgba(255,255,255,0.5);">${contactName}</h3>
          ${contact.title ? `<p class="text-sm mb-1" style="color: #4B5563; font-weight: 500;">${contact.title}</p>` : ''}
          ${companyName ? `<p class="text-sm font-medium mb-3" style="color: #4338CA;">${companyName}</p>` : ''}
          <p class="text-sm" style="color: #111827; font-weight: 500;">${address}</p>
        </div>
      `;
      
      // Create the popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: true,
        maxWidth: '320px',
        className: 'custom-popup'
      }).setHTML(popupContent);
      
      // Add event listener to close all other popups when this one opens
      popup.on('open', () => {
        // Close all other popups
        markers.current.forEach(m => {
          try {
            if (m !== marker) {
              const mPopup = m.getPopup();
              if (mPopup && typeof mPopup.isOpen === 'function' && mPopup.isOpen()) {
                m.togglePopup();
              }
            }
          } catch (e) {
            // Ignore errors with popups
          }
        });
      });
      
      // Create and add the marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([contact.longitude, contact.latitude])
        .setPopup(popup)
        .addTo(mapInstance);
      
      // Add click handler to select contact
      marker.getElement().addEventListener('click', () => {
        if (onViewportChange) {
          // Handle contact selection through parent component
          const visibleContacts = validContacts.filter(c => 
            c.latitude === contact.latitude && c.longitude === contact.longitude
          );
          onViewportChange(visibleContacts);
        }
      });
      
      // Auto-open popup for selected contact
      if (isSelected) {
        marker.togglePopup();
      }
      
      // Add to markers array
      markers.current.push(marker);
    });
    
    // Add custom popup styling to the document if it doesn't exist yet
    if (!document.getElementById('custom-popup-style')) {
      const style = document.createElement('style');
      style.id = 'custom-popup-style';
      style.textContent = `
        .mapboxgl-popup-content {
          padding: 0 !important;
          border-radius: 10px !important;
          overflow: hidden !important;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25) !important;
          border: 1px solid rgba(255, 255, 255, 0.8) !important;
        }
        .mapboxgl-popup-close-button {
          font-size: 18px !important;
          color: #374151 !important;
          padding: 5px 8px !important;
          right: 2px !important;
          top: 2px !important;
          z-index: 10 !important;
          background-color: rgba(255, 255, 255, 0.6) !important;
          border-radius: 50% !important;
          width: 26px !important;
          height: 26px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          line-height: 1 !important;
        }
        .mapboxgl-popup-close-button:hover {
          background-color: rgba(255, 255, 255, 0.9) !important;
          color: #111827 !important;
        }
        
        /* Make sure text in popups is crisp and readable */
        .mapboxgl-popup {
          z-index: 999 !important;
        }
        
        .custom-popup .mapboxgl-popup-content {
          backdrop-filter: blur(5px) !important;
          -webkit-backdrop-filter: blur(5px) !important;
        }
        
        /* Toast animation */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `;
      document.head.appendChild(style);
    }
  };
  
  // Fly to selectedContact when it changes
  useEffect(() => {
    if (!map.current || !selectedContact?.longitude || !selectedContact?.latitude) return;
    
    // Clear all open popups first
    markers.current.forEach(marker => {
      try {
        const popup = marker.getPopup();
        if (popup && typeof popup.isOpen === 'function' && popup.isOpen()) {
          marker.togglePopup();
        }
      } catch (e) {
        // Ignore errors with popups
      }
    });
    
    // Find the marker for this contact and open its popup
    const contactMarker = markers.current.find(marker => {
      const [lng, lat] = marker.getLngLat().toArray();
      return lng === selectedContact.longitude && lat === selectedContact.latitude;
    });
    
    // If we found a marker, open its popup
    if (contactMarker) {
      contactMarker.togglePopup();
    }
    
    // Get current zoom level for smooth transition
    const currentZoom = map.current.getZoom();
    console.log(`📍 Flying to contact from zoom level ${currentZoom} to 13`);
    
    // Fly to the contact location, starting from current view
    map.current.flyTo({
      center: [selectedContact.longitude, selectedContact.latitude],
      zoom: 13, // Closer zoom for individual contacts
      essential: true,
      speed: 1.2, // Slightly faster for contact selection
      curve: 1.0, // Linear curve for contact selection
      screenSpeed: 0.7, // Consistent screen speed
      maxDuration: 4000, // Cap animation duration
    });
    
    // Log that we're flying to a contact
    console.log(`🧑‍💼 Flying to contact: ${selectedContact.first_name} ${selectedContact.last_name}`);
  }, [selectedContact]);
  
  // Function to dismiss debug panel
  const dismissDebug = () => {
    setDebugInfo(null);
  };

  if (!mounted) {
    return (
      <div className="w-full h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center p-4 max-w-md">
          <div className="text-red-500 mb-2">⚠️ Map Error</div>
          <p className="text-gray-700">{error}</p>
          <p className="text-gray-500 mt-4 text-sm">
            Please check console for more details or try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen fixed top-0 left-0 z-0">
      <div ref={mapContainer} id="map-container" className="w-full h-full" style={{ opacity: 1 }} />
      
      {/* Toast notification for errors that shouldn't take over the whole screen */}
      {error && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md shadow-lg z-50 animate-fade-in-up max-w-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {/* Loading indicator for geocoding */}
      {isGeocoding && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 px-4 py-2 rounded-full shadow-md">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-gray-800 font-medium">Searching...</span>
          </div>
        </div>
      )}
      
      {/* Debug info overlay - COMMENTED OUT FOR NOW */}
      {/* 
      {debugInfo && (
        <div 
          className={`absolute right-4 bottom-8 p-2 rounded-lg shadow-lg max-w-xs ${
            debugInfo.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-orange-50 border border-orange-200 text-orange-800'
          }`}
          style={{ zIndex: 10, maxWidth: '300px', fontSize: '0.8rem' }}
        >
          <div className="flex items-center mb-1">
            <div className="flex-1 truncate">
              <span className="font-bold">{isGeocoding ? '⏳' : (debugInfo.success ? '✅' : '⚠️')}</span>
              <span className="ml-1 font-bold truncate">{debugInfo.action}</span>
            </div>
            <button 
              className="ml-2 text-gray-500 hover:text-gray-700"
              onClick={() => setDebugInfo(null)}
            >
              ×
            </button>
          </div>
          {debugInfo.data && (
            <pre className="text-xs mt-1 overflow-auto max-h-32 bg-white bg-opacity-70 p-1 rounded">
              {JSON.stringify(debugInfo.data, null, 2)}
            </pre>
          )}
          <div className="text-xs text-right mt-1 text-gray-600">
            {new Date(debugInfo.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
      */}
    </div>
  );
}

// Add this declaration at the top of the file after the imports
declare global {
  interface Window {
    geocodeTimer?: ReturnType<typeof setTimeout>;
  }
} 