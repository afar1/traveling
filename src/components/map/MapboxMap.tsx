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
  
  // Add a new effect to handle city selection
  useEffect(() => {
    // Skip if not mounted or no map or no selected city
    if (!mounted || !map.current || !selectedCity) return;
    
    // Geocode and fly to the selected city
    geocodeAndFlyToCity(selectedCity);
  }, [mounted, selectedCity]);
  
  // Function to geocode a city and fly to it
  const geocodeAndFlyToCity = async (city: string) => {
    if (!map.current) return;
    
    // Skip if we've already geocoded this city recently
    if (lastGeocodedCity.current === city) return;
    
    // Update the last geocoded city
    lastGeocodedCity.current = city;
    
    // Show loading indicator
    setIsGeocoding(true);
    
    // Geocode the city
    const coordinates = await geocodeCity(city);
    if (!coordinates) {
      console.error(`Failed to geocode city: ${city}`);
      setDebugInfo({
        action: `Failed to geocode "${city}"`,
        success: false,
        timestamp: Date.now()
      });
      setIsGeocoding(false);
      return;
    }
    
    // Clean up existing city markers
    markers.current = markers.current.filter(marker => {
      const el = marker.getElement();
      if (el.classList.contains('city-marker')) {
        marker.remove();
        return false;
      }
      return true;
    });
    
    // Add a city marker
    const el = document.createElement('div');
    el.className = 'city-marker';
    el.style.backgroundColor = '#9333ea'; // Purple
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.borderRadius = '50%';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    
    // Create popup for the city
    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px',
    }).setHTML(`
      <div class="p-3">
        <h3 class="font-bold text-lg mb-1">${city}</h3>
        <p class="text-sm text-gray-600">Showing area around ${city}</p>
      </div>
    `);
    
    // Create and add the marker
    const cityMarker = new mapboxgl.Marker(el)
      .setLngLat(coordinates)
      .setPopup(popup)
      .addTo(map.current);
    
    // Store the marker
    markers.current.push(cityMarker);
    
    // Auto-open the popup
    cityMarker.togglePopup();
    
    // Fly to the city with a consistent zoom level for area view
    map.current.flyTo({
      center: coordinates,
      zoom: 11, // Fixed zoom level for consistent area view
      essential: true,
      speed: 1.5,
      curve: 1.2,
    });
    
    setDebugInfo({
      action: `Navigated to "${city}"`,
      data: { coordinates },
      success: true,
      timestamp: Date.now()
    });
    
    setIsGeocoding(false);
  };

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
  
  // Function to update visible contacts based on the current viewport
  const updateVisibleContacts = () => {
    if (!map.current) return;
    
    // Get the current viewport bounds
    const bounds = map.current.getBounds();
    if (!bounds) {
      console.warn('Could not get map bounds');
      return;
    }
    
    // Filter contacts that are within the bounds
    const visible = validContacts.filter(contact => {
      if (!contact.latitude || !contact.longitude) return false;
      
      return bounds.contains(new mapboxgl.LngLat(contact.longitude, contact.latitude));
    });
    
    // Update state with visible contacts
    setVisibleContacts(visible);
    
    // Notify parent component about visible contacts
    if (onViewportChange) {
      onViewportChange(visible);
    }
    
    setDebugInfo({
      action: `Updated visible contacts`,
      data: { count: visible.length, bounds: bounds.toArray() },
      success: true,
      timestamp: Date.now()
    });
    
    console.log(`Found ${visible.length} contacts in the current viewport`);
  };
  
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