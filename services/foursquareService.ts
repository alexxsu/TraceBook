/**
 * Place Search Service using Geoapify Places API
 * FREE: 3,000 requests/day, no credit card required!
 * 
 * Signup: https://myprojects.geoapify.com/register
 * Docs: https://apidocs.geoapify.com/docs/places/
 */

import { Coordinates, PlaceResult } from '../types';

// Get API key from .env
const GEOAPIFY_KEY = (import.meta.env.VITE_GEOAPIFY_API_KEY || '').trim();

if (!GEOAPIFY_KEY) {
  console.warn('Geoapify API key not found. Set VITE_GEOAPIFY_API_KEY in .env');
}

const PLACES_URL = 'https://api.geoapify.com/v2/places';
const AUTOCOMPLETE_URL = 'https://api.geoapify.com/v1/geocode/autocomplete';

// Categories for food/dining
// Full list: https://apidocs.geoapify.com/docs/places/#categories
const FOOD_CATEGORIES = [
  'catering.restaurant',
  'catering.cafe',
  'catering.fast_food',
  'catering.bar',
  'catering.food_court',
  'catering.ice_cream',
  'commercial.food_and_drink',
].join(',');

interface GeoapifyPlace {
  properties: {
    place_id: string;
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    formatted?: string;
    lat: number;
    lon: number;
    categories?: string[];
    distance?: number;
  };
}

interface GeoapifyAutocompleteResult {
  properties: {
    place_id: string;
    name?: string;
    formatted: string;
    street?: string;
    city?: string;
    state?: string;
    lat: number;
    lon: number;
    result_type?: string;
  };
}

/**
 * Convert Geoapify place to our PlaceResult format
 */
function geoapifyToPlaceResult(feature: GeoapifyPlace): PlaceResult {
  const p = feature.properties;
  
  // Build address
  const addressParts = [];
  if (p.street) addressParts.push(p.street);
  if (p.city) addressParts.push(p.city);
  if (p.state) addressParts.push(p.state);
  const vicinity = addressParts.length > 0 ? addressParts.join(', ') : (p.formatted || 'Unknown');

  return {
    place_id: p.place_id,
    name: p.name || p.formatted?.split(',')[0] || 'Unknown',
    vicinity: vicinity,
    geometry: {
      location: {
        lat: () => p.lat,
        lng: () => p.lon,
      }
    },
    types: p.categories || [],
    distance: p.distance,
  };
}

/**
 * Search for nearby places (restaurants, cafes, etc.)
 */
export async function searchNearbyPlaces(
  location: Coordinates,
  options: {
    radius?: number;
    categories?: string;
    limit?: number;
    query?: string;
  } = {}
): Promise<PlaceResult[]> {
  const {
    radius = 1000,
    categories = FOOD_CATEGORIES,
    limit = 20,
  } = options;

  const params = new URLSearchParams({
    categories: categories,
    filter: `circle:${location.lng},${location.lat},${radius}`,
    limit: String(limit),
    apiKey: GEOAPIFY_KEY,
  });

  try {
    const response = await fetch(`${PLACES_URL}?${params}`);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Geoapify API error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    return (data.features || []).map(geoapifyToPlaceResult);
  } catch (error) {
    console.error('Geoapify nearby search error:', error);
    throw error;
  }
}

/**
 * Autocomplete place search
 */
export async function autocompletePlaces(
  query: string,
  options: {
    location?: Coordinates;
    radius?: number;
    limit?: number;
    types?: string;
  } = {}
): Promise<Array<{ placeId: string; description: string; mainText: string; secondaryText: string }>> {
  const {
    location,
    limit = 10,
  } = options;

  if (!query || query.length < 2) {
    return [];
  }

  const params = new URLSearchParams({
    text: query,
    limit: String(limit),
    apiKey: GEOAPIFY_KEY,
    format: 'json',
  });

  // Bias results to user's location
  if (location) {
    params.append('bias', `proximity:${location.lng},${location.lat}`);
  }

  try {
    const response = await fetch(`${AUTOCOMPLETE_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`Geoapify API error: ${response.status}`);
    }

    const data = await response.json();
    
    return (data.results || []).map((result: GeoapifyAutocompleteResult['properties']) => {
      const parts = result.formatted?.split(',') || [];
      const mainText = result.name || parts[0] || query;
      const secondaryText = parts.slice(1).join(',').trim() || '';
      
      return {
        placeId: result.place_id,
        description: result.formatted || mainText,
        mainText: mainText,
        secondaryText: secondaryText,
      };
    });
  } catch (error) {
    console.error('Geoapify autocomplete error:', error);
    throw error;
  }
}

/**
 * Get place details by ID
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceResult> {
  const params = new URLSearchParams({
    apiKey: GEOAPIFY_KEY,
  });

  try {
    const response = await fetch(
      `https://api.geoapify.com/v2/place-details?id=${encodeURIComponent(placeId)}&${params}`
    );

    if (!response.ok) {
      throw new Error(`Geoapify API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return geoapifyToPlaceResult(data.features[0]);
    }
    
    throw new Error('Place not found');
  } catch (error) {
    console.error('Geoapify get details error:', error);
    throw error;
  }
}

/**
 * Search with text query
 */
export async function searchPlaces(
  query: string,
  location?: Coordinates,
  options: {
    radius?: number;
    limit?: number;
  } = {}
): Promise<PlaceResult[]> {
  const { limit = 10 } = options;

  const params = new URLSearchParams({
    text: query,
    limit: String(limit),
    apiKey: GEOAPIFY_KEY,
    format: 'json',
  });

  if (location) {
    params.append('bias', `proximity:${location.lng},${location.lat}`);
  }

  try {
    const response = await fetch(`${AUTOCOMPLETE_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`Geoapify API error: ${response.status}`);
    }

    const data = await response.json();
    
    return (data.results || []).map((result: any) => ({
      place_id: result.place_id,
      name: result.name || result.formatted?.split(',')[0] || query,
      vicinity: result.formatted || '',
      geometry: {
        location: {
          lat: () => result.lat,
          lng: () => result.lon,
        }
      },
      types: [],
    }));
  } catch (error) {
    console.error('Geoapify search error:', error);
    throw error;
  }
}

// Export category constants
export const Categories = {
  FOOD: FOOD_CATEGORIES,
  ALL: '',
};
