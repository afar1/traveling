'use client';

import { useState, useEffect } from 'react';
import { Contact } from '@/types/supabase';
import MapboxMap from '@/components/map/MapboxMap';
import ContactsList from '@/components/contacts/ContactsList';
import Link from 'next/link';
import CommandKSearch from '@/components/search/CommandKSearch';

export default function HomePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [visibleContacts, setVisibleContacts] = useState<Contact[]>([]);

  // Set isMounted to true when component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only run on client-side
    if (!isMounted) return;
    
    async function fetchContacts(retryCount = 0) {
      try {
        setLoading(true);
        
        // Build URL with city query parameter if needed
        const url = selectedCity
          ? `/api/contacts?city=${encodeURIComponent(selectedCity)}`
          : '/api/contacts';
        
        const response = await fetch(url);
        
        if (!response.ok) {
          // Get error details from response if possible
          let errorMessage = 'Failed to fetch contacts';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If we can't parse the error, just use the status text
            errorMessage = `Failed to fetch contacts: ${response.status} ${response.statusText}`;
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        setContacts(data.contacts || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching contacts:', err);
        
        // Try up to 2 retries (3 total attempts) for network errors
        if (retryCount < 2 && err instanceof Error && 
            (err.message.includes('network') || err.message.includes('fetch'))) {
          console.log(`Retrying fetch (attempt ${retryCount + 1})...`);
          setTimeout(() => fetchContacts(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
        
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Failed to load contacts. Please try again later.';
        
        setError(errorMessage);
        setContacts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, [selectedCity, isMounted]);

  const handleCitySelect = (city: string) => {
    console.log(`Setting selected city/state to: "${city}"`);
    setSelectedCity(city);
    // Reset selected contact when selecting a city/state
    setSelectedContact(null);
    
    // Close sidebar for better map view on mobile
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    
    // Close sidebar for better map view on mobile
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Function to center the map and open map view
  const openMap = () => {
    // If sidebar is open, close it to show the map better
    if (showSidebar) {
      setShowSidebar(false);
    }
    
    // Also reset any filters to show all contacts
    setSelectedCity('');
    setSelectedContact(null);
  };

  const handleViewportChange = (newVisibleContacts: Contact[]) => {
    setVisibleContacts(newVisibleContacts);
  };

  // Function to order contacts based on location
  const getOrderedContacts = () => {
    // Always prioritize visible contacts from current viewport
    if (visibleContacts.length > 0) {
      // First: contacts that are in the current viewport
      // Second: remaining contacts
      const visibleIds = new Set(visibleContacts.map(c => c.id));
      
      return [
        ...visibleContacts,
        ...contacts.filter(c => !visibleIds.has(c.id))
      ];
    }
    
    // If no city is selected or no visible contacts, return contacts as is
    if (!selectedCity) return contacts;
    
    // If a city is selected but no visible contacts (maybe the area has no contacts),
    // order contacts by city name similarity
    return [...contacts].sort((a, b) => {
      const aCity = a.mailing_city?.toLowerCase() || '';
      const bCity = b.mailing_city?.toLowerCase() || '';
      const searchCity = selectedCity.toLowerCase();
      
      // If contact city exactly matches the search city, prioritize it
      if (aCity === searchCity && bCity !== searchCity) return -1;
      if (bCity === searchCity && aCity !== searchCity) return 1;
      
      // If contact city contains the search term, prioritize it
      const aContains = aCity.includes(searchCity);
      const bContains = bCity.includes(searchCity);
      if (aContains && !bContains) return -1;
      if (bContains && !aContains) return 1;
      
      // Default to alphabetical order
      return aCity.localeCompare(bCity);
    });
  };

  // Return a loading state if not mounted yet (server-side)
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-gray-500">Loading application...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Full-screen map */}
      <MapboxMap 
        contacts={contacts} 
        selectedCity={selectedCity} 
        selectedContact={selectedContact}
        onViewportChange={handleViewportChange}
      />
      
      {/* Command+K Search */}
      <CommandKSearch 
        contacts={contacts}
        onCitySelect={handleCitySelect}
        onContactSelect={handleContactSelect}
      />
      
      {/* Header */}
      <div className="fixed top-0 left-0 w-full z-10 bg-white/90 backdrop-blur-sm shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 
                className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors" 
                onClick={openMap}
              >
                Traveling
              </h1>
              {selectedCity && (
                <div className="ml-3 text-sm text-gray-600">
                  <span className="font-medium text-gray-700">{selectedCity}</span> area
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Contact count badge */}
              {visibleContacts.length > 0 && (
                <div className="hidden md:flex items-center px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-md">
                  <span className="font-medium">{visibleContacts.length}</span>
                  <span className="ml-1">contacts in view</span>
                </div>
              )}
              
              {/* Command+K Search Indicator */}
              <button
                className="flex items-center px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                onClick={() => {
                  // Simulate Command+K press
                  window.dispatchEvent(
                    new KeyboardEvent('keydown', {
                      key: 'k', 
                      metaKey: true, 
                      ctrlKey: true,
                      bubbles: true
                    })
                  );
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="mr-1">Search</span>
                <kbd className="hidden sm:inline-flex px-1.5 bg-white text-xs text-gray-500 border border-gray-300 rounded">⌘</kbd>
                <kbd className="hidden sm:inline-flex px-1.5 bg-white text-xs text-gray-500 border border-gray-300 rounded">K</kbd>
              </button>
              
              {/* Sidebar Toggle */}
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                {showSidebar ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
              
              {/* Upload Link */}
              <Link
                href="/upload"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Upload Contacts
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating sidebar */}
      <div 
        className={`fixed right-0 top-16 bottom-0 bg-white/90 backdrop-blur-sm p-4 shadow-lg transition-all duration-300 ease-in-out z-10 overflow-auto ${
          showSidebar ? 'w-80' : 'w-0 opacity-0'
        }`}
      >
        {showSidebar && (
          <>
            <div className="flex items-center justify-between border-b pb-2 mb-5">
              <h2 className="text-xl font-semibold text-gray-900">Filter Contacts</h2>
              {visibleContacts.length > 0 && (
                <div className="text-sm bg-blue-100 text-blue-800 rounded-full px-2.5 py-0.5">
                  {visibleContacts.length} in view
                </div>
              )}
            </div>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error loading contacts</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md bg-red-100 text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Refresh page
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {selectedCity && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-md flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-blue-800">
                        Showing area around: <span className="font-semibold">{selectedCity}</span>
                      </div>
                      <div className="text-xs text-blue-600 mt-0.5">
                        {visibleContacts.length > 0 
                          ? 'Contacts sorted by proximity' 
                          : 'No contacts found in this area'}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCity('')}
                      className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
                
                <ContactsList
                  contacts={getOrderedContacts()}
                  onCitySelect={handleCitySelect}
                  selectedCity={selectedCity}
                  onContactSelect={handleContactSelect}
                />
                
                {contacts.length === 0 && (
                  <div className="text-center py-8">
                    <h3 className="text-lg font-medium text-gray-900">No contacts found</h3>
                    <p className="mt-2 text-gray-500">
                      {selectedCity
                        ? `No contacts found in "${selectedCity}". Try searching for a different city or upload new contacts.`
                        : 'Get started by uploading your contacts.'}
                    </p>
                    <div className="mt-4">
                      <Link
                        href="/upload"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Upload Contacts
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
} 