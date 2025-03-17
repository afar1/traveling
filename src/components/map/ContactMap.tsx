'use client';

// ******************************************************
// THIS COMPONENT IS DEPRECATED - PLEASE USE MapboxMap.tsx INSTEAD
// This file will be removed in a future update
// ******************************************************

import { useEffect, useState, useRef } from 'react';
import { Contact } from '@/types/supabase';
import dynamic from 'next/dynamic';
import L from 'leaflet';

// Forward to the new implementation
import MapboxMap from './MapboxMap';

// Import Leaflet CSS directly (will only run on client)
const importLeafletCSS = () => {
  if (typeof window !== 'undefined') {
    // Using require to avoid TypeScript errors with dynamic imports
    require('leaflet/dist/leaflet.css');
  }
};

// Dynamically import the map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const ZoomControl = dynamic(
  () => import('react-leaflet').then((mod) => mod.ZoomControl),
  { ssr: false }
);

// Dynamically import other components we need
const MapEvents = dynamic(
  () => 
    import('react-leaflet').then((mod) => {
      // Create a component that handles map events
      // Use any type to bypass TypeScript strict checking for the ref
      const MapEventsComponent = ({ onMapReady }: { onMapReady: (map: L.Map) => void }) => {
        const map = mod.useMap();
        
        useEffect(() => {
          if (map) {
            onMapReady(map);
            map.invalidateSize();
          }
        }, [map, onMapReady]);
        
        return null;
      };
      
      return MapEventsComponent;
    }),
  { ssr: false }
);

interface ContactMapProps {
  contacts: Contact[];
  selectedCity?: string;
}

export default function ContactMap(props: { contacts: Contact[], selectedCity?: string }) {
  // Just render the new MapboxMap component instead
  return <MapboxMap {...props} />;
} 