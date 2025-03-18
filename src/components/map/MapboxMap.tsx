'use client';

import { useEffect, useRef, useState } from 'react';
import { Contact } from '@/types/supabase';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Get the Mapbox access token from environment variables
// Use a hardcoded token if the environment variable isn't available
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiYWZhcjAxIiwiYSI6ImNtOGRpcG4zNDIybncycm9iNHhtc3g2dGsifQ.QBFYHz7yyD31BFpN5KopPQ';

// Log token for debugging
console.log('Mapbox token available:', !!MAPBOX_ACCESS_TOKEN);

interface MapboxMapProps {
  contacts: Contact[];
  selectedCity?: string;
  selectedContact: Contact | null;
}

export default function MapboxMap({ contacts, selectedCity, selectedContact }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    action: string;
    data?: any;
    success: boolean;
    timestamp: number;
  } | null>(null);
  const lastGeocodedCity = useRef<string | null>(null);

  // Filter valid contacts that have coordinates
  const validContacts = contacts.filter(
    (contact) => contact.latitude && contact.longitude
  );

  // Geocode a city name and return coordinates
  const geocodeCity = async (city: string): Promise<[number, number] | null> => {
    try {
      console.log(`🔍 Starting geocoding for city: "${city}"`);
      setIsGeocoding(true);
      setDebugInfo({
        action: `Geocoding "${city}"`,
        success: true,
        timestamp: Date.now()
      });

      // Make sure the city name is properly encoded
      const encodedCity = encodeURIComponent(city);
      
      // Create the direct Mapbox API URL
      const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedCity}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,locality,region&country=us,ca,gb,de,fr&limit=1&fuzzyMatch=true`;
      console.log(`📡 Geocoding API URL: ${mapboxUrl.replace(MAPBOX_ACCESS_TOKEN, 'HIDDEN_TOKEN')}`);
      
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
              data: { placeName, coordinates, method: 'direct' },
              success: true,
              timestamp: Date.now()
            });
            
            return [coordinates[0], coordinates[1]];
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
      const localApiUrl = `/api/geocode?city=${encodedCity}`;
      console.log(`🔄 Trying API route fallback: ${localApiUrl}`);
      
      setDebugInfo({
        action: `Trying fallback method for "${city}"`,
        data: { url: localApiUrl },
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
          data: { placeName, coordinates, method: 'fallback' },
          success: true,
          timestamp: Date.now()
        });
        
        return [coordinates[0], coordinates[1]];
      }
      
      console.warn(`⚠️ No geocoding results found for: "${city}"`);
      setDebugInfo({
        action: `No results for "${city}"`,
        success: false,
        timestamp: Date.now()
      });
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
  };

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
  
  // Function to add markers to the map
  const addMarkers = (mapInstance: mapboxgl.Map) => {
    // Clear any existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];
    
    // Add markers for each contact
    validContacts.forEach(contact => {
      // Skip if we don't have valid coordinates
      if (!contact.longitude || !contact.latitude) return;
      
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.backgroundColor = '#3b82f6';
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 0 3px rgba(0,0,0,0.3)';
      
      // Format full name
      const fullName = `${contact.first_name} ${contact.last_name}`;
      
      // Create popup with improved styling for better legibility
      const popup = new mapboxgl.Popup({ 
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '300px',
        className: 'custom-popup'
      }).setHTML(`
        <div class="p-4 bg-white rounded-lg shadow-lg">
          <div class="flex items-center mb-3">
            <div class="flex-shrink-0 bg-blue-100 text-blue-700 font-bold rounded-full h-12 w-12 flex items-center justify-center mr-3 text-lg">
              ${contact.first_name.slice(0, 1).toUpperCase()}${contact.last_name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h3 class="font-bold text-gray-900 text-base leading-tight">${fullName}</h3>
              ${contact.title ? `<p class="text-gray-700 text-sm">${contact.title}</p>` : ''}
            </div>
          </div>
          
          ${contact.account_name ? `
            <div class="mb-2">
              <p class="text-gray-800 text-sm font-medium">${contact.account_name}</p>
            </div>
          ` : ''}
          
          <div class="border-t border-gray-200 pt-2 mt-2">
            <div class="text-gray-700 text-sm space-y-1">
              ${contact.mailing_street ? `<p>${contact.mailing_street}</p>` : ''}
              ${contact.mailing_city ? `<p class="font-medium">${contact.mailing_city}${contact.mailing_state ? `, ${contact.mailing_state}` : ''} ${contact.mailing_zip || ''}</p>` : ''}
              ${contact.mailing_country ? `<p>${contact.mailing_country}</p>` : ''}
            </div>
          </div>
        </div>
      `);
      
      // Create and store marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([contact.longitude, contact.latitude] as [number, number])
        .setPopup(popup)
        .addTo(mapInstance);
      
      markers.current.push(marker);
    });
    
    // Add custom popup styling to the document if it doesn't exist yet
    if (!document.getElementById('custom-popup-style')) {
      const style = document.createElement('style');
      style.id = 'custom-popup-style';
      style.textContent = `
        .mapboxgl-popup-content {
          padding: 0 !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2) !important;
        }
        .mapboxgl-popup-close-button {
          font-size: 16px !important;
          color: #4B5563 !important;
          padding: 5px 8px !important;
          right: 2px !important;
          top: 2px !important;
          z-index: 10 !important;
        }
        .mapboxgl-popup-close-button:hover {
          background-color: rgba(0, 0, 0, 0.05) !important;
          color: #000 !important;
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
  
  // Geocode and fly to city when selectedCity changes
  useEffect(() => {
    // Skip if no map or no city
    if (!map.current || !selectedCity) {
      console.log(`🗺️ Skipping geocoding: map exists=${!!map.current}, selectedCity=${selectedCity}`);
      return;
    }
    
    // Skip if already geocoding
    if (isGeocoding) {
      console.log(`⏳ Already geocoding, skipping new request for "${selectedCity}"`);
      return;
    }
    
    console.log(`🔍 Processing city selection: "${selectedCity}"`);
    
    // Check if we have contacts in this city
    const cityContacts = validContacts.filter(
      contact => contact.mailing_city?.toLowerCase().includes(selectedCity.toLowerCase())
    );
    
    console.log(`📊 Found ${cityContacts.length} contacts in "${selectedCity}"`);
    
    // If we have contacts in this city, center on the first one
    if (cityContacts.length > 0 && cityContacts[0].longitude && cityContacts[0].latitude) {
      console.log(`📍 Using existing contact coordinates for "${selectedCity}": [${cityContacts[0].longitude}, ${cityContacts[0].latitude}]`);
      map.current.jumpTo({
        center: [cityContacts[0].longitude, cityContacts[0].latitude],
        zoom: 10,
      });
      return;
    }
    
    // If we don't have contacts in this city, geocode it
    async function geocodeAndFly() {
      console.log(`🔎 No contacts found in "${selectedCity}", attempting geocoding...`);
      setIsGeocoding(true);
      
      try {
        // Direct geocoding through Mapbox API
        const cityName = selectedCity || "";
        const encodedCity = encodeURIComponent(cityName);
        const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedCity}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,locality,region&country=us,ca,gb,de,fr&limit=1&fuzzyMatch=true`;
        
        const response = await fetch(mapboxUrl);
        if (!response.ok) {
          throw new Error(`Geocoding failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Geocoding response:', data);
        
        if (!data.features || data.features.length === 0) {
          throw new Error(`No results found for "${cityName}"`);
        }
        
        const result = data.features[0];
        const coords: [number, number] = [result.center[0], result.center[1]];
        const placeName = result.place_name;
        
        console.log(`✅ Successfully geocoded "${cityName}" to "${placeName}" at [${coords[0]}, ${coords[1]}]`);
        
        // Update the debug info
        setDebugInfo({
          action: `Successfully geocoded "${cityName}"`,
          data: { placeName, coordinates: coords },
          success: true,
          timestamp: Date.now()
        });
        
        // Clear existing markers
        markers.current.forEach(marker => marker.remove());
        markers.current = [];
        
        // Add contact markers back
        validContacts.forEach(contact => {
          if (!contact.longitude || !contact.latitude) return;
          
          const el = document.createElement('div');
          el.className = 'contact-marker';
          el.style.backgroundColor = '#3b82f6';
          el.style.width = '14px';
          el.style.height = '14px';
          el.style.borderRadius = '50%';
          el.style.border = '2px solid white';
          el.style.boxShadow = '0 0 3px rgba(0,0,0,0.3)';
          
          const marker = new mapboxgl.Marker(el)
            .setLngLat([contact.longitude, contact.latitude])
            .addTo(map.current!);
          
          markers.current.push(marker);
        });
        
        // Add city marker with different style
        const el = document.createElement('div');
        el.className = 'city-marker';
        el.style.backgroundColor = '#9333ea'; // Purple
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 0 4px rgba(0,0,0,0.5)';
        
        // Create popup
        const popup = new mapboxgl.Popup({ 
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          maxWidth: '300px',
          className: 'custom-popup'
        }).setHTML(`
          <div class="p-4 bg-white rounded-lg shadow-lg">
            <h3 class="font-bold text-gray-900 text-base mb-2">${placeName}</h3>
            <p class="text-gray-700 text-sm">No contacts in this location</p>
            <p class="text-xs text-blue-700 mt-2">Coordinates: ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}</p>
          </div>
        `);
        
        // Create marker
        const cityMarker = new mapboxgl.Marker(el)
          .setLngLat(coords)
          .setPopup(popup)
          .addTo(map.current!);
        
        markers.current.push(cityMarker);
        
        // Open popup
        cityMarker.togglePopup();
        
        // Important: Instead of using flyTo which can have issues with animation,
        // we'll directly set the center of the map
        if (map.current) {
          console.log(`🔄 Setting map center to: [${coords[0]}, ${coords[1]}]`);
          
          // Reset the map view completely to ensure it moves
          map.current.setCenter(coords);
          map.current.setZoom(10);
          
          // Verify the center was set correctly
          setTimeout(() => {
            if (!map.current) return;
            const actualCenter = map.current.getCenter();
            console.log(`✓ Map center is now: [${actualCenter.lng}, ${actualCenter.lat}]`);
          }, 500);
        }
      } catch (error) {
        console.error('Error during geocoding:', error);
        setError(`Failed to find location: ${error instanceof Error ? error.message : String(error)}`);
        setTimeout(() => setError(null), 3000);
      } finally {
        setIsGeocoding(false);
      }
    }
    
    geocodeAndFly();
  }, [selectedCity, validContacts]);
  
  // Fly to selectedContact when it changes
  useEffect(() => {
    if (!map.current || !selectedContact?.longitude || !selectedContact?.latitude) return;
    
    // Find the marker for this contact and open its popup
    const contactMarker = markers.current.find(marker => {
      const [lng, lat] = marker.getLngLat().toArray();
      return lng === selectedContact.longitude && lat === selectedContact.latitude;
    });
    
    // If we found a marker, open its popup
    if (contactMarker) {
      contactMarker.togglePopup();
    }
    
    // Fly to the contact location
    map.current.flyTo({
      center: [selectedContact.longitude, selectedContact.latitude],
      zoom: 13, // Closer zoom for individual contacts
      essential: true,
    });
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
      
      {/* Debug indicator */}
      {debugInfo && (
        <div 
          className={`fixed top-20 left-4 p-3 rounded-md shadow-lg z-50 text-sm font-mono max-w-xs overflow-hidden ${
            debugInfo.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-orange-50 border border-orange-200 text-orange-800'
          }`}
          style={{ maxHeight: '200px', overflowY: 'auto' }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center">
              <span className="font-bold">{isGeocoding ? '⏳' : (debugInfo.success ? '✅' : '⚠️')}</span>
              <span className="ml-1 font-bold truncate">{debugInfo.action}</span>
            </div>
            <button 
              onClick={dismissDebug}
              className="text-xs opacity-70 hover:opacity-100 p-1"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
          {debugInfo.data && (
            <pre className="text-xs mt-1 opacity-80 overflow-x-auto">
              {JSON.stringify(debugInfo.data, null, 2)}
            </pre>
          )}
          <div className="text-xs mt-1 opacity-70">
            {new Date(debugInfo.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
} 