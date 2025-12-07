import { useState, useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { Coordinates } from '../types';

type MapType = 'satellite' | 'roadmap' | 'dark';

const MAP_STYLES: Record<MapType, string> = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  roadmap: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

const DEFAULT_BOUNDS: [[number, number], [number, number]] = [
  [-79.80, 43.48],
  [-79.00, 43.90]
];

interface UseMapControlsReturn {
  mapInstance: mapboxgl.Map | null;
  currentMapCenter: Coordinates;
  mapType: MapType;
  isLocating: boolean;
  handleMapLoad: (map: mapboxgl.Map) => void;
  handleToggleMapType: () => void;
  handleLocateMe: () => void;
  handleResetView: () => void;
  handleZoomToMunicipality: () => void;
}

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

// Helper to get user's current position with better error handling
const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    // Check if we already have permission
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
        if (permissionStatus.state === 'denied') {
          reject(new Error('Location permission was denied. Please enable location access in your browser settings.'));
          return;
        }
        // Permission is granted or prompt - proceed with geolocation
        requestLocation();
      }).catch(() => {
        // Permissions API not available, try anyway
        requestLocation();
      });
    } else {
      requestLocation();
    }

    function requestLocation() {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position);
        },
        (error) => {
          let errorMessage = 'Could not get your location.';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access was denied. Please allow location access in your browser settings and try again.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please check your device\'s location settings.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout
          maximumAge: 30000 // Allow cached position up to 30 seconds old
        }
      );
    }
  });
};

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
  const [isLocating, setIsLocating] = useState(false);
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

    if (styleLoadCallbackRef.current) {
      mapInstance.off('style.load', styleLoadCallbackRef.current);
    }

    mapInstance.setStyle(MAP_STYLES[newType]);
    setMapType(newType);
  }, [mapInstance, mapType]);

  const handleLocateMe = useCallback(async () => {
    console.log('handleLocateMe called, mapInstance:', !!mapInstance);

    if (!mapInstance) {
      console.warn('Map instance not available yet');
      alert('Map is still loading. Please wait and try again.');
      return;
    }

    if (isLocating) {
      console.log('Already locating, skipping');
      return;
    }

    setIsLocating(true);

    try {
      const position = await getCurrentPosition();
      
      const pos: [number, number] = [
        position.coords.longitude,
        position.coords.latitude,
      ];
      
      console.log('Got position:', pos, 'accuracy:', position.coords.accuracy);
      
      mapInstance.flyTo({
        center: pos,
        zoom: 17,
        duration: 1500
      });
      
    } catch (error: any) {
      console.error('Location error:', error);
      alert(error.message || 'Could not access your location. Please check browser permissions.');
    } finally {
      setIsLocating(false);
    }
  }, [mapInstance, isLocating]);

  const handleResetView = useCallback(() => {
    if (!mapInstance) return;

    mapInstance.fitBounds(DEFAULT_BOUNDS, {
      padding: 50,
      duration: 1000
    });
  }, [mapInstance]);

  const handleZoomToMunicipality = useCallback(async () => {
    console.log('handleZoomToMunicipality called, mapInstance:', !!mapInstance);

    if (!mapInstance) {
      console.warn('Map instance not available yet');
      alert('Map is still loading. Please wait and try again.');
      return;
    }

    if (isLocating) {
      console.log('Already locating, skipping');
      return;
    }

    setIsLocating(true);

    const accessToken = mapboxgl.accessToken;

    try {
      const position = await getCurrentPosition();
      
      const userPos = {
        lng: position.coords.longitude,
        lat: position.coords.latitude,
      };
      
      console.log('Got position for city zoom:', userPos);

      try {
        const response = await fetch(
          `${MAPBOX_GEOCODING_URL}/${userPos.lng},${userPos.lat}.json?types=place,locality&access_token=${accessToken}`
        );

        if (!response.ok) {
          throw new Error(`Geocoding failed: ${response.status}`);
        }

        const data: GeocodingResponse = await response.json();
        console.log('Geocoding results:', data.features.length);

        const municipality = data.features.find(f => 
          f.place_type.includes('place') || f.place_type.includes('locality')
        );

        if (municipality && municipality.bbox) {
          console.log('Found municipality with bounds:', municipality.place_name);
          
          const bounds: [[number, number], [number, number]] = [
            [municipality.bbox[0], municipality.bbox[1]],
            [municipality.bbox[2], municipality.bbox[3]]
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
          console.log('Found municipality without bounds:', municipality.place_name);
          mapInstance.flyTo({
            center: municipality.center,
            zoom: 13,
            duration: 1500
          });
        } else {
          console.log('No municipality found, using fallback zoom');
          mapInstance.flyTo({
            center: [userPos.lng, userPos.lat],
            zoom: 13,
            duration: 1500
          });
        }
      } catch (geocodeError) {
        console.warn('Geocoding API error, using fallback zoom:', geocodeError);
        mapInstance.flyTo({
          center: [userPos.lng, userPos.lat],
          zoom: 13,
          duration: 1500
        });
      }
    } catch (error: any) {
      console.error('Location error:', error);
      alert(error.message || 'Could not access your location. Please check browser permissions.');
    } finally {
      setIsLocating(false);
    }
  }, [mapInstance, isLocating]);

  return {
    mapInstance,
    currentMapCenter,
    mapType,
    isLocating,
    handleMapLoad,
    handleToggleMapType,
    handleLocateMe,
    handleResetView,
    handleZoomToMunicipality
  };
}
