import { useState, useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { Coordinates } from '../types';

type MapType = 'satellite' | 'roadmap' | 'dark';

// Mapbox style URLs
const MAP_STYLES: Record<MapType, string> = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  roadmap: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

// Default bounds for Toronto area
const DEFAULT_BOUNDS: [[number, number], [number, number]] = [
  [-79.80, 43.48], // SW [lng, lat]
  [-79.00, 43.90]  // NE [lng, lat]
];

interface UseMapControlsReturn {
  mapInstance: mapboxgl.Map | null;
  currentMapCenter: Coordinates;
  mapType: MapType;
  handleMapLoad: (map: mapboxgl.Map) => void;
  handleToggleMapType: () => void;
  handleLocateMe: () => void;
  handleResetView: () => void;
  handleZoomToMunicipality: () => void;
}

// Mapbox Geocoding API
const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

interface GeocodingFeature {
  id: string;
  type: string;
  place_type: string[];
  text: string;
  place_name: string;
  bbox?: [number, number, number, number];
  center: [number, number];
  context?: Array<{
    id: string;
    text: string;
  }>;
}

interface GeocodingResponse {
  features: GeocodingFeature[];
}

export function useMapControls(): UseMapControlsReturn {
  const getPreferredMapType = () => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'roadmap';
    }
    return 'roadmap';
  };

  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [currentMapCenter, setCurrentMapCenter] = useState<Coordinates>({ lat: 43.6532, lng: -79.3832 });
  const [mapType, setMapType] = useState<MapType>(() => getPreferredMapType());
  const styleLoadCallbackRef = useRef<(() => void) | null>(null);

  const handleMapLoad = useCallback((map: mapboxgl.Map) => {
    setMapInstance(map);
    
    map.on('moveend', () => {
      const center = map.getCenter();
      setCurrentMapCenter({ lat: center.lat, lng: center.lng });
    });
  }, []);

  const handleToggleMapType = useCallback(() => {
    if (!mapInstance) return;

    let newType: MapType;
    if (mapType === 'satellite') {
      newType = 'roadmap';
    } else if (mapType === 'roadmap') {
      newType = 'dark';
    } else {
      newType = 'satellite';
    }

    // Remove previous style load callback if any
    if (styleLoadCallbackRef.current) {
      mapInstance.off('style.load', styleLoadCallbackRef.current);
    }

    mapInstance.setStyle(MAP_STYLES[newType]);
    setMapType(newType);
  }, [mapInstance, mapType]);

  const handleLocateMe = useCallback(() => {
    console.log('handleLocateMe called, mapInstance:', !!mapInstance);

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    if (!mapInstance) {
      console.warn('Map instance not available yet');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        console.log('Got position:', pos);
        mapInstance.flyTo({
          center: pos,
          zoom: 17,
          duration: 1500
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert("Could not access your location. Please check browser permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [mapInstance]);

  const handleResetView = useCallback(() => {
    if (!mapInstance) return;

    mapInstance.fitBounds(DEFAULT_BOUNDS, {
      padding: 50,
      duration: 1000
    });
  }, [mapInstance]);

  const handleZoomToMunicipality = useCallback(async () => {
    console.log('handleZoomToMunicipality called, mapInstance:', !!mapInstance);

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    if (!mapInstance) {
      console.warn('Map instance not available yet');
      return;
    }

    const accessToken = mapboxgl.accessToken;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userPos = {
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        };
        console.log('Got position for city zoom:', userPos);

        try {
          // Reverse geocode to find municipality
          const response = await fetch(
            `${MAPBOX_GEOCODING_URL}/${userPos.lng},${userPos.lat}.json?types=place,locality&access_token=${accessToken}`
          );

          if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status}`);
          }

          const data: GeocodingResponse = await response.json();
          console.log('Geocoding results:', data.features.length);

          // Find municipality (place or locality)
          const municipality = data.features.find(f => 
            f.place_type.includes('place') || f.place_type.includes('locality')
          );

          if (municipality && municipality.bbox) {
            console.log('Found municipality with bounds:', municipality.place_name);
            
            const bounds: [[number, number], [number, number]] = [
              [municipality.bbox[0], municipality.bbox[1]], // SW
              [municipality.bbox[2], municipality.bbox[3]]  // NE
            ];

            mapInstance.flyTo({
              center: municipality.center,
              duration: 500
            });

            setTimeout(() => {
              mapInstance.fitBounds(bounds, {
                padding: 50,
                duration: 1000
              });
            }, 500);
          } else if (municipality) {
            // Has center but no bbox - just zoom to location
            console.log('Found municipality without bounds:', municipality.place_name);
            mapInstance.flyTo({
              center: municipality.center,
              zoom: 13,
              duration: 1500
            });
          } else {
            // No municipality found - fallback to user location
            console.log('No municipality found, using fallback zoom');
            mapInstance.flyTo({
              center: [userPos.lng, userPos.lat],
              zoom: 13,
              duration: 1500
            });
          }
        } catch (error) {
          // Geocoding failed, fallback to simple zoom
          console.warn('Geocoding API error, using fallback zoom:', error);
          mapInstance.flyTo({
            center: [userPos.lng, userPos.lat],
            zoom: 13,
            duration: 1500
          });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert("Could not access your location. Please check browser permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [mapInstance]);

  return {
    mapInstance,
    currentMapCenter,
    mapType,
    handleMapLoad,
    handleToggleMapType,
    handleLocateMe,
    handleResetView,
    handleZoomToMunicipality
  };
}
