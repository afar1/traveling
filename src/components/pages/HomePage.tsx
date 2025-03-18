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
  const [showMap, setShowMap] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [visibleContacts, setVisibleContacts] = useState<Contact[]>([]);
  const [visibleMapContacts, setVisibleMapContacts] = useState<Contact[]>([]);

  // Set isMounted to true when component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch contacts when needed
  useEffect(() => {
    // Only run on client-side
    if (!isMounted) return;
    
    async function fetchContacts(retryCount = 0) {
      try {
        setLoading(true);
        
        // Always fetch all contacts, regardless of selected city
        const url = '/api/contacts';
        
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
        console.log('Contacts API response:', data); // Debug log
        
        if (data && data.contacts) {
          setContacts(data.contacts);
          console.log(`Loaded ${data.contacts.length} contacts`);
          setError(null);
        } else {
          console.error('Unexpected API response format:', data);
          setContacts([]);
          setError('Received invalid data format from server');
        }
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
  // This effect should only run when isMounted changes, no longer dependent on selectedCity
  }, [isMounted]);

  // Handle city selection
  const handleCitySelect = (city: string) => {
    console.log(`Selected city/state: ${city}`);
    setSelectedCity(city);
    // Reset selected contact when choosing a new city/state
    if (selectedContact) setSelectedContact(null);
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

  // Handle contacts that are visible in the current map view
  const handleVisibleContactsChange = (visibleContacts: Contact[]) => {
    setVisibleMapContacts(visibleContacts);
  };

  // Sidebar content - show either loading message, error, or contacts
  const sidebarContent = () => {
    if (loading) {
      return <div className="p-4 text-center">Loading contacts...</div>;
    }
    
    if (error) {
      return <div className="p-4 text-center text-red-500">{error}</div>;
    }
    
    // Message to display depending on selected city
    let statusMessage = null;
    if (selectedCity) {
      // Check if there are any contacts in the selected location
      const hasContactsInLocation = contacts.some(
        contact => 
          (contact.mailing_city && contact.mailing_city.toLowerCase().includes(selectedCity.toLowerCase())) ||
          (contact.mailing_state && contact.mailing_state.toLowerCase().includes(selectedCity.toLowerCase()))
      );
      
      if (hasContactsInLocation) {
        statusMessage = (
          <div className="bg-green-50 text-green-700 px-4 py-2 text-sm">
            Viewing contacts near {selectedCity}
          </div>
        );
      } else {
        statusMessage = (
          <div className="bg-blue-50 text-blue-700 px-4 py-2 text-sm">
            No contacts found in {selectedCity}
          </div>
        );
      }
    }
    
    // Sort contacts by:
    // 1. First show contacts that are visible in the current map viewport
    // 2. Then sort by relevance to selected city (if any)
    // 3. Otherwise maintain the original order
    let orderedContacts = [...contacts];
    
    // If we have a selected city or visible contacts from the map
    if (selectedCity || visibleMapContacts.length > 0) {
      // First, prioritize contacts visible in the current map view
      const visibleIds = new Set(visibleMapContacts.map(c => c.id));
      
      // Next, find contacts relevant to selected city
      const relevantToCity = selectedCity 
        ? contacts.filter(contact => 
            (contact.mailing_city && contact.mailing_city.toLowerCase().includes(selectedCity.toLowerCase())) ||
            (contact.mailing_state && contact.mailing_state.toLowerCase().includes(selectedCity.toLowerCase()))
          )
        : [];
      
      const relevantIds = new Set(relevantToCity.map(c => c.id));
      
      orderedContacts.sort((a, b) => {
        // First priority: visible in current map view with distance sorting
        const aVisibleIndex = visibleMapContacts.findIndex(c => c.id === a.id);
        const bVisibleIndex = visibleMapContacts.findIndex(c => c.id === b.id);
        
        if (aVisibleIndex >= 0 && bVisibleIndex >= 0) {
          return aVisibleIndex - bVisibleIndex; // Use the order from visible contacts
        }
        
        if (aVisibleIndex >= 0) return -1;
        if (bVisibleIndex >= 0) return 1;
        
        // Second priority: relevant to selected city
        const aIsRelevant = relevantIds.has(a.id);
        const bIsRelevant = relevantIds.has(b.id);
        
        if (aIsRelevant && !bIsRelevant) return -1;
        if (!aIsRelevant && bIsRelevant) return 1;
        
        // Default: maintain original ordering
        return 0;
      });
    }
    
    return (
      <div className="flex flex-col h-full">
        {statusMessage}
        <ContactsList 
          contacts={orderedContacts} 
          selectedContact={selectedContact}
          onContactSelect={setSelectedContact}
        />
      </div>
    );
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
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top bar with logo and action buttons */}
      <div className="flex justify-between items-center bg-white shadow px-4 py-2 z-10">
        <h1 className="text-xl font-bold text-gray-800" onClick={() => setShowMap(true)}>Traveling</h1>
        
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 rounded-md hover:bg-gray-100"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Map component (always rendered) */}
        <div className={`flex-1 ${showMap ? 'block' : 'hidden md:block'}`}>
          <MapboxMap 
            contacts={contacts}
            selectedCity={selectedCity}
            selectedContact={selectedContact}
            onVisibleContactsChange={handleVisibleContactsChange}
          />
        </div>
        
        {/* Sidebar with contacts list (conditional rendering based on state) */}
        {showSidebar && (
          <div className="w-full md:w-96 bg-white shadow-lg overflow-y-auto h-full">
            {sidebarContent()}
          </div>
        )}
      </div>
      
      {/* Command+K search component */}
      <CommandKSearch 
        contacts={contacts}
        onCitySelect={handleCitySelect}
        onContactSelect={setSelectedContact}
      />
    </div>
  );
} 