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
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>(contacts);
  const [searchTerm, setSearchTerm] = useState(selectedCity || '');
  
  // Extract unique cities for the dropdown
  const cities = Array.from(new Set(contacts.map((contact) => contact.mailing_city)))
    .filter(Boolean)
    .sort();

  // Update filtered contacts when selected city or contacts change
  useEffect(() => {
    if (selectedCity) {
      setFilteredContacts(
        contacts.filter((contact) =>
          contact.mailing_city?.toLowerCase().includes(selectedCity.toLowerCase())
        )
      );
      setSearchTerm(selectedCity);
    } else {
      setFilteredContacts(contacts);
      setSearchTerm('');
    }
  }, [selectedCity, contacts]);

  // Handle search form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm) {
      onCitySelect(searchTerm);
    }
  };

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
        {filteredContacts.length} contacts{selectedCity ? ` in "${selectedCity}"` : ''}
      </div>

      <div className="border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm">
        <div className="divide-y divide-gray-200 max-h-[calc(100vh-200px)] overflow-y-auto">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <div 
                key={contact.id} 
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleContactClick(contact)}
              >
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
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              {selectedCity
                ? `No contacts found in "${selectedCity}"`
                : 'No contacts available'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 