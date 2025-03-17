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
}

export default function MapboxMap({ contacts, selectedCity }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter valid contacts that have coordinates
  const validContacts = contacts.filter(
    (contact) => contact.latitude && contact.longitude
  );

  // Calculate map center or default to a fixed center if no contacts
  const getMapCenter = (): [number, number] => {
    if (validContacts.length === 0) {
      return [-95, 40]; // Default center (USA) - note Mapbox uses [lng, lat] order
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
    
    // Otherwise, use the first contact as center
    // Ensure we have valid coordinates
    if (validContacts[0].longitude && validContacts[0].latitude) {
      return [validContacts[0].longitude, validContacts[0].latitude];
    }
    
    // Fallback to default if somehow the coordinates are not valid
    return [-95, 40];
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
        style: 'mapbox://styles/mapbox/streets-v12',
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
      
      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="text-center p-1">
          <div class="inline-flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-full mb-2">
            ${contact.first_name.slice(0, 1).toUpperCase()}${contact.last_name.slice(0, 1).toUpperCase()}
          </div>
          <h3 class="font-semibold text-sm">${fullName}</h3>
          ${contact.title ? `<p class="text-gray-600 text-xs">${contact.title}</p>` : ''}
          ${contact.account_name ? `<p class="text-gray-600 text-xs">${contact.account_name}</p>` : ''}
          <div class="text-gray-500 text-xs mt-1">
            ${contact.mailing_street ? `<p>${contact.mailing_street}</p>` : ''}
            ${contact.mailing_city ? `<p>${contact.mailing_city}${contact.mailing_state ? `, ${contact.mailing_state}` : ''} ${contact.mailing_zip || ''}</p>` : ''}
            ${contact.mailing_country ? `<p>${contact.mailing_country}</p>` : ''}
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
  };
  
  // Update map center when selectedCity changes
  useEffect(() => {
    if (!map.current) return;
    
    map.current.flyTo({
      center: getMapCenter(),
      zoom: selectedCity ? 10 : 5,
      essential: true,
    });
  }, [selectedCity]);
  
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
    </div>
  );
} 