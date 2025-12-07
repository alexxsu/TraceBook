import { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { Place, UserMap } from '../types';

export interface MapSearchSource {
  map: UserMap;
  places: Place[];
}

export interface SearchResultGroup {
  map: UserMap;
  matches: Place[];
}

interface UseSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResultGroup[];
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
  isSearchClosing: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  closeSearch: () => void;
  handleSearchSelect: (place: Place, mapInstance: mapboxgl.Map | null, onSelect: (p: Place) => void) => void;
}

export function useSearch(
  sources: MapSearchSource[],
  options?: { showAllWhenEmpty?: boolean }
): UseSearchReturn {
  const showAllWhenEmpty = options?.showAllWhenEmpty ?? false;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultGroup[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter results based on query
  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (trimmed === '') {
      if (showAllWhenEmpty) {
        // Show all maps, even those with 0 places
        const grouped = sources
          .map(source => ({
            map: source.map,
            matches: source.places
          }));
        // Don't filter out maps with 0 places - they should still appear in the list
        setSearchResults(grouped);
      } else {
        setSearchResults([]);
      }
      return;
    }

    const lowerQuery = trimmed.toLowerCase();
    const grouped = sources
      .map(source => ({
        map: source.map,
        matches: source.places.filter(p =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.address.toLowerCase().includes(lowerQuery)
        )
      }))
      .filter(group => group.matches.length > 0);
    setSearchResults(grouped);
  }, [searchQuery, sources, showAllWhenEmpty]);

  // Auto-focus search input when activated
  useEffect(() => {
    if (isSearchFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchFocused]);

  const closeSearch = useCallback(() => {
    if (!isSearchFocused && !searchQuery) return;
    setIsSearchClosing(true);
    setTimeout(() => {
      setSearchQuery('');
      setIsSearchFocused(false);
      setIsSearchClosing(false);
    }, 200); // Match animation duration
  }, [isSearchFocused, searchQuery]);

  const handleSearchSelect = useCallback((
    place: Place,
    mapInstance: mapboxgl.Map | null,
    onSelect: (p: Place) => void
  ) => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);

    if (mapInstance) {
      mapInstance.flyTo({
        center: [place.location.lng, place.location.lat],
        zoom: 16,
        duration: 1000
      });
    }

    onSelect(place);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearchFocused,
    setIsSearchFocused,
    isSearchClosing,
    searchInputRef,
    closeSearch,
    handleSearchSelect
  };
}
