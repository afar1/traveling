'use client';

import { useState, useEffect } from 'react';
import { Contact } from '@/types/supabase';

interface ContactsListProps {
  contacts: Contact[];
  onCitySelect: (city: string) => void;
  selectedCity?: string;
  onContactSelect?: (contact: Contact) => void;
}

export default function ContactsList({
  contacts,
  onCitySelect,
  selectedCity,
  onContactSelect,
}: ContactsListProps) {
  // Handle search form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm) {
      onCitySelect(searchTerm);
    }
  };

  // Extract unique cities for the dropdown
  const cities = Array.from(new Set(contacts.map((contact) => contact.mailing_city)))
    .filter(Boolean)
    .sort();

  const [searchTerm, setSearchTerm] = useState(selectedCity || '');

  // Update search term when selected city changes
  useEffect(() => {
    if (selectedCity) {
      setSearchTerm(selectedCity);
    } else {
      setSearchTerm('');
    }
  }, [selectedCity]);

  // Clear search filter
  const handleClearFilter = () => {
    setSearchTerm('');
    onCitySelect('');
  };

  // Handle contact selection
  const handleContactClick = (contact: Contact) => {
    if (onContactSelect) {
      onContactSelect(contact);
    }
  };

  // Get contact full name
  const getFullName = (contact: Contact) => {
    const firstName = contact.first_name || '';
    const lastName = contact.last_name || '';
    
    // Format the name properly with correct capitalization
    const formatName = (name: string) => {
      return name
        .split(' ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    };
    
    const formattedFirstName = formatName(firstName);
    const formattedLastName = formatName(lastName);
    
    return `${formattedFirstName} ${formattedLastName}`.trim() || 'Unnamed Contact';
  };

  // Format address
  const formatAddress = (contact: Contact) => {
    const parts = [];
    if (contact.mailing_street) parts.push(contact.mailing_street);
    if (contact.mailing_city) {
      let cityPart = contact.mailing_city;
      if (contact.mailing_state) cityPart += `, ${contact.mailing_state}`;
      if (contact.mailing_zip) cityPart += ` ${contact.mailing_zip}`;
      parts.push(cityPart);
    }
    if (contact.mailing_country && !parts.includes(contact.mailing_country)) {
      parts.push(contact.mailing_country);
    }
    return parts.join(', ');
  };

  // Format company name
  const getCompanyName = (contact: Contact) => {
    if (!contact.account_name) return '';
    
    // Properly format company name with correct capitalization
    return contact.account_name
      .split(' ')
      .map(word => {
        // Don't lowercase small words like LLC, Inc, etc.
        if (['LLC', 'Inc.', 'Inc', 'Ltd', 'Corp', 'Corp.'].includes(word)) {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Check if a contact is visible in the current viewport
  // The first group of contacts are always the ones in viewport
  // This works because our contacts are pre-ordered in HomePage.getOrderedContacts()
  const isInViewport = (index: number) => {
    // Get count of visible contacts
    let visibleCount = 0;
    
    // Count contacts with same latitude/longitude (viewport contacts come first)
    let lastLat = null;
    let lastLng = null;
    let lastInView = true;
    
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      // If latitude/longitude change and we're past first group, we've found all viewport contacts
      if (i > 0 && lastInView && 
         (contact.latitude !== lastLat || contact.longitude !== lastLng)) {
        
        // Check if we have a group change
        let prevGroupCount = 0;
        for (let j = 0; j < i; j++) {
          if (contacts[j].latitude === lastLat && contacts[j].longitude === lastLng) {
            prevGroupCount++;
          }
        }
        
        // If previous group was big enough, count as a significant group
        if (prevGroupCount >= 3) {
          lastInView = false;
        }
      }
      
      if (lastInView) {
        visibleCount++;
      }
      
      lastLat = contact.latitude;
      lastLng = contact.longitude;
    }

    // For simplicity, if viewport detection isn't reliable, assume at least 10 contacts
    if (visibleCount < 5 && contacts.length > 10) {
      visibleCount = Math.min(10, Math.floor(contacts.length * 0.2)); // 20% of contacts or 10, whichever is smaller
    }
    
    return index < visibleCount;
  };

  // Get counts of contacts 
  const getViewportCounts = () => {
    let inViewport = 0;
    let total = contacts.length;
    
    for (let i = 0; i < total; i++) {
      if (isInViewport(i)) inViewport++;
    }
    
    return { inViewport, total };
  };
  
  const counts = getViewportCounts();

  return (
    <div className="w-full">
      <div className="mb-5">
        <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search by city..."
              className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white text-gray-900 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              list="city-list"
            />
            <datalist id="city-list">
              {cities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 text-white text-base font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            Search
          </button>
        </form>
        
        {selectedCity && (
          <div className="flex items-center gap-2">
            <div className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center">
              {selectedCity}
              <button
                type="button"
                onClick={handleClearFilter}
                className="ml-2 text-gray-600 hover:text-gray-800 focus:outline-none"
                aria-label="Clear filter"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-sm font-medium text-gray-600 mb-3 flex justify-between items-center">
        <div>
          {contacts.length} contacts total
        </div>
        {counts.inViewport > 0 && (
          <div className="text-blue-700 bg-blue-50 px-2 py-1 rounded-md text-xs">
            {counts.inViewport} in current map view
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3 text-xs">
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-100 border border-blue-400 mr-1"></span>
          <span className="text-gray-600">In current map view</span>
        </div>
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 rounded-full bg-white border border-gray-300 mr-1"></span>
          <span className="text-gray-600">Other locations</span>
        </div>
      </div>

      <div className="border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm">
        <div className="divide-y divide-gray-200 max-h-[calc(100vh-240px)] overflow-y-auto">
          {contacts.length > 0 ? (
            contacts.map((contact, index) => {
              const inViewport = isInViewport(index);
              return (
                <div 
                  key={contact.id} 
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    inViewport ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleContactClick(contact)}
                >
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 w-3 h-3 mt-2 mr-2 rounded-full ${
                      inViewport ? 'bg-blue-100 border border-blue-400' : 'bg-white border border-gray-300'
                    }`}></div>
                    <div className="flex-grow">
                      <div className="text-lg font-semibold text-gray-900">{getFullName(contact)}</div>
                      <div className="text-base text-gray-700 mt-1">
                        {contact.title && 
                          <div className="text-sm text-gray-600">
                            {contact.title}
                          </div>
                        }
                        {contact.account_name && 
                          <div className="font-medium text-indigo-700">
                            {getCompanyName(contact)}
                          </div>
                        }
                      </div>
                      <div className="text-sm text-gray-600 mt-2 truncate" title={formatAddress(contact)}>
                        {formatAddress(contact)}
                      </div>
                      {contact.mailing_city && (
                        <div className="text-sm text-blue-600 mt-1 font-medium">
                          <button
                            className="hover:underline"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent triggering parent click
                              onCitySelect(contact.mailing_city || '');
                            }}
                          >
                            {contact.mailing_city}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-gray-500">
              No contacts available
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 