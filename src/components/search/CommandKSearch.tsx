'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Contact } from '@/types/supabase';
import { findNearbyCities, getGeocodedLocation, GeocodedLocation, CITY_PROXIMITY_RADIUS } from '@/utils/geo';

interface CommandKSearchProps {
  contacts: Contact[];
  onCitySelect: (city: string) => void;
  onContactSelect: (contact: Contact) => void;
}

export default function CommandKSearch({ 
  contacts, 
  onCitySelect, 
  onContactSelect 
}: CommandKSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<{
    contacts: Contact[];
    cities: string[];
    searchRadius?: number; // For showing the radius in the UI
    searchedCity?: string; // The original searched city
  }>({ contacts: [], cities: [] });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [activeSection, setActiveSection] = useState<'contacts' | 'cities'>('contacts');
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Extract unique cities using useMemo to prevent recreation on every render
  const cities = useMemo(() => {
    return Array.from(new Set(
      contacts
        .map((contact) => contact.mailing_city)
        .filter(Boolean) as string[]
    )).sort();
  }, [contacts]);

  // Create a map of cities to their geocoded locations for faster lookup
  const [cityLocations, setCityLocations] = useState<Map<string, GeocodedLocation>>(new Map());
  
  // Geocode all cities once when the component mounts
  useEffect(() => {
    const geocodeCities = async () => {
      const locationsMap = new Map<string, GeocodedLocation>();
      
      // Only geocode cities that we don't already have
      const citiesToGeocode = cities.filter(city => !cityLocations.has(city));
      
      if (citiesToGeocode.length === 0) return;
      
      // Geocode cities in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < citiesToGeocode.length; i += batchSize) {
        const batch = citiesToGeocode.slice(i, i + batchSize);
        
        // Geocode each city in the batch in parallel
        const results = await Promise.all(
          batch.map(async (city) => {
            const location = await getGeocodedLocation(city);
            return { city, location };
          })
        );
        
        // Add results to the map
        results.forEach(({ city, location }) => {
          if (location) {
            locationsMap.set(city, location);
          }
        });
      }
      
      // Update state with new locations
      setCityLocations(prevLocations => {
        const newLocations = new Map(prevLocations);
        locationsMap.forEach((location, city) => {
          newLocations.set(city, location);
        });
        return newLocations;
      });
    };
    
    geocodeCities();
  }, [cities, cityLocations]);
  
  // Listen for Command+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setSearchTerm('');
        setResults({ contacts: [], cities: [] });
        setSelectedIndex(-1);
        
        // Focus input after a short delay to allow modal to open
        setTimeout(() => {
          inputRef.current?.focus();
        }, 10);
      }
      
      // Close with Escape
      if (isOpen && e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
  
  // Handle search input changes
  useEffect(() => {
    if (!isOpen) return;
    
    if (!searchTerm.trim()) {
      setResults({ contacts: [], cities: [] });
      setSelectedIndex(-1);
      return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    
    // Function to perform the actual search
    const performSearch = async () => {
      setIsLoading(true);
      
      try {
        // First, do a basic text search for cities
        const directCityMatches = cities
          .filter(city => city.toLowerCase().includes(term))
          .slice(0, 3); // Limit to 3 direct matches
        
        // If we have a direct match, try to find nearby cities
        let nearbyCities: string[] = [];
        let searchedCity: string | undefined;
        let shouldPerformProximitySearch = false;
        
        // Try exact matches first, then partial matches
        const exactMatch = cities.find(city => city.toLowerCase() === term);
        const partialMatches = directCityMatches;
        
        // Determine which city to use as the center for proximity search
        const proximityCenter = exactMatch || (partialMatches.length > 0 ? partialMatches[0] : null);
        
        if (proximityCenter) {
          searchedCity = proximityCenter;
          shouldPerformProximitySearch = true;
        }
        // If no direct city matches, try geocoding the search term
        else if (term.length > 2) {
          const geocodedTerm = await getGeocodedLocation(term);
          if (geocodedTerm) {
            searchedCity = geocodedTerm.city;
            shouldPerformProximitySearch = true;
            
            // Add the geocoded location to our map
            setCityLocations(prev => {
              const newMap = new Map(prev);
              newMap.set(geocodedTerm.city, geocodedTerm);
              return newMap;
            });
          }
        }
        
        // If we found a city to search around, find nearby cities
        if (shouldPerformProximitySearch && searchedCity) {
          // Get the geocoded location of the search city
          const searchCityLocation = cityLocations.get(searchedCity);
          
          if (searchCityLocation) {
            // Convert the cityLocations Map to an array of GeocodedLocation
            const allLocations: GeocodedLocation[] = Array.from(cityLocations.values());
            
            // Find nearby cities
            nearbyCities = findNearbyCities(searchCityLocation, allLocations);
          }
        }
        
        // Combine direct matches with nearby cities and remove duplicates
        const combinedCities = Array.from(new Set([
          ...directCityMatches,
          ...nearbyCities
        ])).slice(0, 6); // Limit to 6 cities total
        
        // Search contacts
        // 1. First include contacts that directly match the search term
        const directContactMatches = contacts.filter(contact => {
          const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
          return fullName.includes(term) || 
                contact.account_name?.toLowerCase().includes(term);
        });
        
        // 2. Then include contacts from nearby cities
        const cityContactMatches = contacts.filter(contact => {
          return combinedCities.some(city => 
            contact.mailing_city?.toLowerCase() === city.toLowerCase()
          );
        });
        
        // Combine direct matches with city-based matches and remove duplicates
        const matchedContacts = Array.from(new Set([
          ...directContactMatches,
          ...cityContactMatches
        ])).slice(0, 10); // Limit to 10 contacts
        
        // Update results
        setResults({ 
          contacts: matchedContacts, 
          cities: combinedCities,
          searchRadius: CITY_PROXIMITY_RADIUS,
          searchedCity: searchedCity
        });
        
        // Reset selection
        setSelectedIndex(-1);
        
        // Set active section based on which has results
        if (matchedContacts.length > 0) {
          setActiveSection('contacts');
        } else if (combinedCities.length > 0) {
          setActiveSection('cities');
        }
      } catch (error) {
        console.error('Error performing search:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Debounce the search to avoid making too many requests
    const timeoutId = setTimeout(performSearch, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, contacts, cities, isOpen, cityLocations]);
  
  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyNav = (e: KeyboardEvent) => {
      // Arrow down - move selection down
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        
        const totalContactItems = results.contacts.length;
        const totalCityItems = results.cities.length;
        const totalItems = totalContactItems + totalCityItems;
        
        if (totalItems === 0) return;
        
        if (activeSection === 'contacts') {
          // If at the end of contacts section, move to cities section
          if (selectedIndex >= totalContactItems - 1) {
            if (totalCityItems > 0) {
              setActiveSection('cities');
              setSelectedIndex(0);
            }
          } else {
            // Move down within contacts
            setSelectedIndex(prev => Math.min(prev + 1, totalContactItems - 1));
          }
        } else {
          // Move down within cities
          setSelectedIndex(prev => Math.min(prev + 1, totalCityItems - 1));
        }
      }
      
      // Arrow up - move selection up
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        
        if (activeSection === 'cities') {
          // If at the start of cities section, move to contacts section
          if (selectedIndex <= 0) {
            if (results.contacts.length > 0) {
              setActiveSection('contacts');
              setSelectedIndex(results.contacts.length - 1);
            }
          } else {
            // Move up within cities
            setSelectedIndex(prev => Math.max(prev - 1, 0));
          }
        } else {
          // Move up within contacts
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        }
      }
      
      // Enter - select item
      if (e.key === 'Enter') {
        e.preventDefault();
        
        if (selectedIndex >= 0) {
          if (activeSection === 'contacts' && results.contacts[selectedIndex]) {
            onContactSelect(results.contacts[selectedIndex]);
            setIsOpen(false);
          } else if (activeSection === 'cities' && results.cities[selectedIndex]) {
            onCitySelect(results.cities[selectedIndex]);
            setIsOpen(false);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyNav);
    return () => window.removeEventListener('keydown', handleKeyNav);
  }, [isOpen, results, selectedIndex, activeSection, onContactSelect, onCitySelect]);
  
  // Handle outside click to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && 
          modalRef.current && 
          !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  // Helper function to format address
  const formatAddress = (contact: Contact) => {
    const parts = [];
    if (contact.mailing_city) parts.push(contact.mailing_city);
    if (contact.mailing_state) parts.push(contact.mailing_state);
    if (parts.length === 0 && contact.mailing_country) parts.push(contact.mailing_country);
    return parts.join(', ');
  };
  
  // If not open, render nothing visible
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-700/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Dialog */}
      <div 
        ref={modalRef}
        className="relative flex items-start justify-center min-h-screen pt-24 px-4 sm:px-6"
      >
        <div className="w-full max-w-xl mx-auto overflow-hidden rounded-xl shadow-2xl bg-white ring-1 ring-black/5">
          {/* Search input */}
          <div className="relative p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search contacts or cities..."
                className="flex-1 border-0 bg-transparent py-1.5 focus:ring-0 focus:outline-none text-gray-900 placeholder:text-gray-400 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
              />
              
              {isLoading ? (
                <div className="animate-spin h-5 w-5 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <kbd className="hidden sm:inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-gray-100 font-sans text-xs text-gray-500">⌘</kbd>
                  <kbd className="hidden sm:inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-gray-100 font-sans text-xs text-gray-500">K</kbd>
                </div>
              )}
            </div>
          </div>
          
          {/* Search results */}
          <div className="max-h-[24rem] overflow-y-auto overscroll-contain py-2">
            {/* Soft search indicator */}
            {results.searchedCity && results.cities.length > 1 && (
              <div className="px-4 py-2 bg-blue-50 text-sm">
                <p className="text-blue-700">
                  <span className="font-medium">Showing results within {results.searchRadius} miles of {results.searchedCity}</span>
                </p>
              </div>
            )}
            
            {/* No results state */}
            {results.contacts.length === 0 && results.cities.length === 0 && searchTerm && !isLoading && (
              <div className="px-4 py-10 text-center">
                <p className="text-gray-500">No results found</p>
                <p className="text-sm text-gray-400 mt-1">Try searching for something else</p>
              </div>
            )}
            
            {/* Loading state */}
            {isLoading && results.contacts.length === 0 && results.cities.length === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="text-gray-500">Searching...</p>
              </div>
            )}
            
            {/* Contacts section */}
            {results.contacts.length > 0 && (
              <div>
                <div className="px-4 py-1">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacts</h3>
                </div>
                <ul>
                  {results.contacts.map((contact, idx) => (
                    <li 
                      key={contact.id}
                      className={`px-4 py-2 cursor-pointer transition-colors ${
                        activeSection === 'contacts' && idx === selectedIndex 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        onContactSelect(contact);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => {
                        setActiveSection('contacts');
                        setSelectedIndex(idx);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 rounded-full h-8 w-8 bg-gray-200 flex items-center justify-center text-gray-600">
                          {contact.first_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{contact.first_name} {contact.last_name}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">{formatAddress(contact)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Cities section */}
            {results.cities.length > 0 && (
              <div>
                <div className="px-4 py-1">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cities</h3>
                </div>
                <ul>
                  {results.cities.map((city, idx) => (
                    <li 
                      key={city}
                      className={`px-4 py-2 cursor-pointer transition-colors ${
                        activeSection === 'cities' && idx === selectedIndex 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        onCitySelect(city);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => {
                        setActiveSection('cities');
                        setSelectedIndex(idx);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 rounded-full h-8 w-8 bg-blue-100 flex items-center justify-center text-blue-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="font-medium text-gray-900">{city}</span>
                        {/* Indication that this city is close to the searched city */}
                        {results.searchedCity && city !== results.searchedCity && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            Near {results.searchedCity}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Footer with search commands */}
          {(results.contacts.length > 0 || results.cities.length > 0) && (
            <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-500">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-500">↓</kbd>
                    <span>to navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-500">Enter</kbd>
                    <span>to select</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-500">Esc</kbd>
                  <span>to close</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 