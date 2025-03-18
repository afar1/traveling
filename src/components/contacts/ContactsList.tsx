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
    return `${contact.first_name} ${contact.last_name}`;
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

  // Check if a contact is visible in the current viewport (first contacts when city selected)
  const isInViewport = (contact: Contact, index: number) => {
    if (!selectedCity) return false;
    
    // If there's a city selected, the first few contacts are from the viewport
    // This assumes the contacts array is ordered with viewport contacts first
    return index < 15; // Assume first 15 contacts are from viewport 
  };

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

      <div className="text-sm font-medium text-gray-600 mb-3">
        {contacts.length} contacts {selectedCity ? `(sorted by proximity to "${selectedCity}")` : ''}
      </div>

      {selectedCity && (
        <div className="flex items-center gap-2 mb-3 text-xs">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-100 border border-blue-400 mr-1"></span>
            <span className="text-gray-600">In current view</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-white border border-gray-300 mr-1"></span>
            <span className="text-gray-600">Other locations</span>
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm">
        <div className="divide-y divide-gray-200 max-h-[calc(100vh-240px)] overflow-y-auto">
          {contacts.length > 0 ? (
            contacts.map((contact, index) => {
              const inViewport = isInViewport(contact, index);
              return (
                <div 
                  key={contact.id} 
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    inViewport ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleContactClick(contact)}
                >
                  <div className="flex items-start">
                    {selectedCity && (
                      <div className={`flex-shrink-0 w-3 h-3 mt-2 mr-2 rounded-full ${
                        inViewport ? 'bg-blue-100 border border-blue-400' : 'bg-white border border-gray-300'
                      }`}></div>
                    )}
                    <div className="flex-grow">
                      <div className="text-lg font-semibold text-gray-900">{getFullName(contact)}</div>
                      <div className="text-base text-gray-700 mt-1">
                        {contact.title && <span className="mr-1">{contact.title},</span>}
                        {contact.account_name}
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