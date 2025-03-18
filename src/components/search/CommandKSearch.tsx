'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Contact } from '@/types/supabase';

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
  }>({ contacts: [], cities: [] });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [activeSection, setActiveSection] = useState<'contacts' | 'cities'>('contacts');
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
    
    // Search contacts
    const matchedContacts = contacts.filter(contact => {
      const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
      return fullName.includes(term) || 
             contact.account_name?.toLowerCase().includes(term) ||
             contact.mailing_city?.toLowerCase().includes(term) ||
             contact.mailing_state?.toLowerCase().includes(term);
    }).slice(0, 5); // Limit to 5 contacts
    
    // Search cities
    const matchedCities = cities
      .filter(city => city.toLowerCase().includes(term))
      .slice(0, 3); // Limit to 3 cities
    
    setResults({ 
      contacts: matchedContacts, 
      cities: matchedCities 
    });
    
    // Reset selection
    setSelectedIndex(-1);
    
    // Set active section based on which has results
    if (matchedContacts.length > 0) {
      setActiveSection('contacts');
    } else if (matchedCities.length > 0) {
      setActiveSection('cities');
    }
  }, [searchTerm, contacts, cities, isOpen]);
  
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
              
              <div className="flex items-center gap-1">
                <kbd className="hidden sm:inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-gray-100 font-sans text-xs text-gray-500">⌘</kbd>
                <kbd className="hidden sm:inline-flex h-6 w-6 items-center justify-center rounded border border-gray-200 bg-gray-100 font-sans text-xs text-gray-500">K</kbd>
              </div>
            </div>
          </div>
          
          {/* Search results */}
          <div className="max-h-[24rem] overflow-y-auto overscroll-contain py-2">
            {results.contacts.length === 0 && results.cities.length === 0 && searchTerm && (
              <div className="px-4 py-10 text-center">
                <p className="text-gray-500">No results found</p>
                <p className="text-sm text-gray-400 mt-1">Try searching for something else</p>
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