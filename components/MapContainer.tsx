import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import Supercluster from 'supercluster';
import { Place } from '../types';

// Import Mapbox CSS in your index.html or here
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapContainerProps {
  accessToken: string;
  places: Place[];
  onMarkerClick: (place: Place) => void;
  onMapLoad: (map: mapboxgl.Map) => void;
  onMapClick?: () => void;
  mapType?: 'satellite' | 'roadmap' | 'dark';
}

const DEFAULT_CENTER: [number, number] = [-79.3832, 43.6532]; // [lng, lat] for Mapbox

// Mapbox style URLs
const MAP_STYLES = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  roadmap: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

const EXPLORED_RADIUS = 300; // meters

// Zoom-based scaling configuration
const ZOOM_SCALE_CONFIG = {
  baseZoom: 14,
  maxScaleZoom: 6,
  baseScale: 1.0,
  maxScale: 1.25,
};

// Clustering configuration - increased radius for better grouping
const CLUSTER_CONFIG = {
  radius: 80, // Increased from 60 for more consistent clustering
  minZoom: 0,
  maxZoom: 16, // Increased to allow clustering at higher zoom levels
  minPoints: 2,
  // Use extent to help with clustering at edges
  extent: 512,
  nodeSize: 64,
};

// Buffer multiplier for pre-loading markers outside visible bounds
// 0.5 = 50% extra on each side, so total area is 2x2 = 4x the visible area
const BOUNDS_BUFFER = 0.5;

// Smooth easing function for scale interpolation
const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

const getScaleForZoom = (zoom: number): number => {
  const { baseZoom, maxScaleZoom, baseScale, maxScale } = ZOOM_SCALE_CONFIG;
  if (zoom >= baseZoom) return baseScale;
  if (zoom <= maxScaleZoom) return maxScale;
  const linearRatio = (baseZoom - zoom) / (baseZoom - maxScaleZoom);
  const easedRatio = easeOutCubic(linearRatio);
  return baseScale + easedRatio * (maxScale - baseScale);
};

const getCircleStyle = (isDarkMode: boolean, isSatellite: boolean) => {
  if (isDarkMode) {
    return {
      // Inner ring (most visible)
      innerFillColor: 'rgba(99, 102, 241, 0.12)',
      // Middle ring
      middleFillColor: 'rgba(99, 102, 241, 0.06)',
      // Outer ring (faded edge)
      outerFillColor: 'rgba(99, 102, 241, 0.02)',
      // Legacy stroke (now very subtle)
      strokeColor: 'rgba(129, 140, 248, 0.08)',
    };
  } else if (isSatellite) {
    return {
      innerFillColor: 'rgba(251, 191, 36, 0.15)',
      middleFillColor: 'rgba(251, 191, 36, 0.08)',
      outerFillColor: 'rgba(251, 191, 36, 0.03)',
      strokeColor: 'rgba(245, 158, 11, 0.1)',
    };
  } else {
    return {
      innerFillColor: 'rgba(59, 130, 246, 0.1)',
      middleFillColor: 'rgba(59, 130, 246, 0.05)',
      outerFillColor: 'rgba(59, 130, 246, 0.02)',
      strokeColor: 'rgba(96, 165, 250, 0.08)',
    };
  }
};

// Helper to create a circle polygon around a center point
const createCirclePolygon = (
  centerLng: number,
  centerLat: number,
  radiusMeters: number,
  numPoints: number = 64
): number[][] => {
  const coordinates: number[][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);
    const lat = centerLat + (dy / 111320);
    const lng = centerLng + (dx / (111320 * Math.cos(centerLat * Math.PI / 180)));
    coordinates.push([lng, lat]);
  }
  return coordinates;
};

// Calculate the bounding circle for a set of coordinates
const calculateBoundingCircle = (
  coordinates: { lng: number; lat: number }[]
): { center: { lng: number; lat: number }; radius: number } => {
  if (coordinates.length === 0) {
    return { center: { lng: 0, lat: 0 }, radius: 0 };
  }
  
  if (coordinates.length === 1) {
    return { center: coordinates[0], radius: EXPLORED_RADIUS };
  }
  
  // Calculate centroid
  const sumLng = coordinates.reduce((sum, c) => sum + c.lng, 0);
  const sumLat = coordinates.reduce((sum, c) => sum + c.lat, 0);
  const center = {
    lng: sumLng / coordinates.length,
    lat: sumLat / coordinates.length
  };
  
  // Calculate max distance from centroid to any point (in meters)
  let maxDistance = 0;
  for (const coord of coordinates) {
    const dLat = (coord.lat - center.lat) * 111320;
    const dLng = (coord.lng - center.lng) * 111320 * Math.cos(center.lat * Math.PI / 180);
    const distance = Math.sqrt(dLat * dLat + dLng * dLng);
    maxDistance = Math.max(maxDistance, distance);
  }
  
  // Add the base exploration radius to the max distance
  const radius = maxDistance + EXPLORED_RADIUS;
  
  return { center, radius };
};

// Keep Mapbox positioning transform intact; scale only the inner content
const setMarkerScale = (el: HTMLElement | null, scale: number) => {
  if (!el) return;
  const content = el.querySelector<HTMLElement>('.mapbox-marker-content');
  if (content) {
    content.dataset.baseScale = String(scale);
    content.style.transform = `scale(${scale})`;
  }
};

const setClusterScale = (el: HTMLElement | null, scale: number) => {
  if (!el) return;
  const content = el.querySelector<HTMLElement>('.mapbox-cluster-content');
  if (content) {
    content.dataset.baseScale = String(scale);
    content.style.transform = `scale(${scale})`;
  }
};

// Generate stable cluster ID based on member place IDs (sorted for consistency)
const generateStableClusterId = (placeIds: string[]): string => {
  return `cluster-${[...placeIds].sort().join('-').substring(0, 100)}`;
};

// Check if two clusters share any places (indicating a merge/split)
const clustersOverlap = (placeIds1: string[], placeIds2: string[]): boolean => {
  const set1 = new Set(placeIds1);
  return placeIds2.some(id => set1.has(id));
};

// Create HTML element for single place marker with CSS transitions
const createPinElement = (
  place: Place, 
  scale: number = 1
): HTMLDivElement => {
  const container = document.createElement('div');
  container.className = 'mapbox-place-marker';
  container.style.cssText = `
    cursor: pointer;
    z-index: 1;
    pointer-events: auto;
    opacity: 0;
    transition: opacity 0.4s ease-in-out;
  `;
  container.dataset.placeId = place.id;
  
  // Slight delay before fade-in to let clusters start fading out first
  setTimeout(() => {
    container.style.opacity = '1';
  }, 80);

  const content = document.createElement('div');
  content.className = 'mapbox-marker-content';
  content.dataset.baseScale = String(scale);
  content.style.cssText = `
    transform: scale(${scale});
    transform-origin: bottom center;
    transition: transform 0.15s ease-out;
  `;

  const visits = place.visits || [];
  const hasMultiplePosts = visits.length >= 2;
  const firstVisit = visits[0];
  const secondVisit = visits[1];
  const photoUrl1 = firstVisit?.photoDataUrl || firstVisit?.photos?.[0] || '';
  const photoUrl2 = secondVisit?.photoDataUrl || secondVisit?.photos?.[0] || '';

  if (hasMultiplePosts) {
    content.innerHTML = `
      <div style="
        position: relative;
        width: 85px;
        height: 95px;
        filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
      ">
        <div style="
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%) rotate(8deg);
          width: 55px;
          height: 55px;
          background: #fffef8;
          border: 2px solid #d4c5a9;
          border-radius: 6px;
          overflow: hidden;
        ">
          ${photoUrl2 ? `
            <img src="${photoUrl2}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';" />
          ` : `<div style="width: 100%; height: 100%; background: #f3f4f6;"></div>`}
        </div>
        
        <div style="
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%) rotate(-3deg);
          width: 65px;
          height: 65px;
          background: #fffef8;
          border: 2px solid #d4c5a9;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
          ${photoUrl1 ? `
            <img src="${photoUrl1}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div style="display: none; width: 100%; height: 100%; background: #f3f4f6; align-items: center; justify-content: center; font-size: 24px; position: absolute; top: 0; left: 0;">📍</div>
          ` : `<div style="width: 100%; height: 100%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 24px;">📍</div>`}
        </div>
        
        <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);">
          <div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 12px solid #d4c5a9;"></div>
          <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid #fffef8; margin-top: -12px; margin-left: 3px;"></div>
        </div>
      </div>
    `;
  } else {
    content.innerHTML = `
      <div style="
        position: relative;
        width: 65px;
        filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
      ">
        <div style="
          width: 65px;
          height: 65px;
          background: #fffef8;
          border: 2px solid #d4c5a9;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        ">
          ${photoUrl1 ? `
            <img src="${photoUrl1}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div style="display: none; width: 100%; height: 100%; background: #f3f4f6; align-items: center; justify-content: center; font-size: 24px; position: absolute; top: 0; left: 0;">📍</div>
          ` : `<div style="width: 100%; height: 100%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 24px;">📍</div>`}
        </div>
        
        <div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 12px solid #d4c5a9; margin: -1px auto 0;"></div>
        <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid #fffef8; margin: -12px auto 0;"></div>
      </div>
    `;
  }

  // Hover effects
  container.addEventListener('mouseenter', () => {
    const baseScale = parseFloat(content.dataset.baseScale || '1');
    content.style.transform = `scale(${baseScale * 1.15})`;
    content.style.zIndex = '1000';
  });
  container.addEventListener('mouseleave', () => {
    const baseScale = parseFloat(content.dataset.baseScale || '1');
    content.style.transform = `scale(${baseScale})`;
    content.style.zIndex = '1';
  });

  container.appendChild(content);
  return container;
};

// Create cluster element with CSS transitions
const createClusterElement = (
  places: Place[],
  scale: number = 1,
  pointCount?: number // Add optional point count from Supercluster
): HTMLDivElement => {
  const container = document.createElement('div');
  container.className = 'mapbox-cluster-marker';
  container.style.cssText = `
    cursor: pointer;
    z-index: 1;
    pointer-events: auto;
    opacity: 0;
    transition: opacity 0.4s ease-in-out;
  `;
  
  // Slight delay before fade-in to let markers start fading out first
  setTimeout(() => {
    container.style.opacity = '1';
  }, 80);
  
  const content = document.createElement('div');
  content.className = 'mapbox-cluster-content';
  content.dataset.baseScale = String(scale);
  content.style.cssText = `
    transform: scale(${scale});
    transform-origin: bottom center;
    transition: transform 0.15s ease-out;
  `;

  const photos: string[] = [];
  for (const place of places) {
    const visits = place.visits || [];
    for (const visit of visits) {
      const photoUrl = visit.photoDataUrl || visit.photos?.[0];
      if (photoUrl && photos.length < 4) {
        photos.push(photoUrl);
      }
    }
    if (photos.length >= 4) break;
  }

  const stackCount = Math.min(places.length, 4);
  // Use pointCount from Supercluster if provided, otherwise fall back to places.length
  const totalCount = pointCount ?? places.length;

  let stackedCards = '';
  
  if (stackCount >= 4 && photos[3]) {
    stackedCards += `
      <div style="position: absolute; top: -2px; left: 50%; transform: translateX(-50%) rotate(18deg); width: 50px; height: 50px; background: #fffef8; border: 2px solid #d4c5a9; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
        <img src="${photos[3]}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';" />
      </div>
    `;
  }
  
  if (stackCount >= 3 && photos[2]) {
    stackedCards += `
      <div style="position: absolute; top: 2px; left: 50%; transform: translateX(-50%) rotate(12deg); width: 52px; height: 52px; background: #fffef8; border: 2px solid #d4c5a9; border-radius: 7px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
        <img src="${photos[2]}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';" />
      </div>
    `;
  }

  if (stackCount >= 2 && photos[1]) {
    stackedCards += `
      <div style="position: absolute; top: 6px; left: 50%; transform: translateX(-50%) rotate(-6deg); width: 56px; height: 56px; background: #fffef8; border: 2px solid #d4c5a9; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
        <img src="${photos[1]}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';" />
      </div>
    `;
  }

  content.innerHTML = `
    <div style="position: relative; width: 85px; height: 100px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
      ${stackedCards}
      <div style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%) rotate(1deg); width: 65px; height: 65px; background: #fffef8; border: 3px solid #d4c5a9; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
        ${photos[0] ? `
          <img src="${photos[0]}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <div style="display:none;width:100%;height:100%;background:#f3f4f6;align-items:center;justify-content:center;font-size:24px;position:absolute;top:0;left:0;">📍</div>
        ` : `<div style="width:100%;height:100%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:24px;">📍</div>`}
      </div>
      ${totalCount > 1 ? `
        <div style="position: absolute; top: 8px; right: 2px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: white; font-size: 11px; font-weight: bold; min-width: 20px; height: 20px; border-radius: 10px; display: flex; align-items: center; justify-content: center; padding: 0 5px; box-shadow: 0 2px 6px rgba(0,0,0,0.4); border: 2px solid rgba(255,255,255,0.9); z-index: 10;">${totalCount}</div>
      ` : ''}
      <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);">
        <div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 12px solid #d4c5a9;"></div>
        <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid #fffef8; margin-top: -12px; margin-left: 3px;"></div>
      </div>
    </div>
  `;

  // Hover effect
  container.addEventListener('mouseenter', () => {
    const baseScale = parseFloat(content.dataset.baseScale || '1');
    content.style.transform = `scale(${baseScale * 1.1})`;
    content.style.zIndex = '1000';
  });
  container.addEventListener('mouseleave', () => {
    const baseScale = parseFloat(content.dataset.baseScale || '1');
    content.style.transform = `scale(${baseScale})`;
    content.style.zIndex = '10';
  });

  container.appendChild(content);
  return container;
};

// Convert meters to pixels at a given latitude and zoom
const metersToPixels = (meters: number, latitude: number, zoom: number): number => {
  const earthCircumference = 40075016.686;
  const latRadians = latitude * Math.PI / 180;
  const metersPerPixel = earthCircumference * Math.cos(latRadians) / Math.pow(2, zoom + 8);
  return meters / metersPerPixel;
};

const MapContainer: React.FC<MapContainerProps> = ({
  accessToken,
  places,
  onMarkerClick,
  onMapLoad,
  onMapClick,
  mapType = 'roadmap'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const clusterMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const clusterMembershipRef = useRef<Map<string, string[]>>(new Map()); // clusterId -> placeIds
  const superclusterRef = useRef<Supercluster | null>(null);
  const placesMapRef = useRef<Map<string, Place>>(new Map());
  const [isMapReady, setIsMapReady] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);
  const currentMapTypeRef = useRef<string>(mapType);
  const isUpdatingRef = useRef(false);
  const initializingRef = useRef(false);
  const lastPlacesHashRef = useRef<string>('');
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRemovalsRef = useRef<Set<string>>(new Set());

  // Memoize places hash to detect actual changes
  const placesHash = useMemo(() => {
    return places.map(p => `${p.id}:${p.location?.lat}:${p.location?.lng}:${p.visits?.length || 0}`).join('|');
  }, [places]);

  // Initialize Supercluster only when places actually change
  const initializeSupercluster = useCallback(() => {
    // Only reinitialize if places actually changed
    if (lastPlacesHashRef.current === placesHash && superclusterRef.current) {
      return;
    }
    
    lastPlacesHashRef.current = placesHash;

    // Update places map
    placesMapRef.current.clear();
    places.forEach(p => placesMapRef.current.set(p.id, p));

    // Create GeoJSON features for Supercluster
    const features = places
      .filter(p => p.location && typeof p.location.lat === 'number' && typeof p.location.lng === 'number')
      .map(p => ({
        type: 'Feature' as const,
        properties: { id: p.id },
        geometry: {
          type: 'Point' as const,
          coordinates: [p.location.lng, p.location.lat]
        }
      }));

    // Create or reuse Supercluster with improved settings
    if (!superclusterRef.current) {
      superclusterRef.current = new Supercluster({
        radius: CLUSTER_CONFIG.radius,
        minZoom: CLUSTER_CONFIG.minZoom,
        maxZoom: CLUSTER_CONFIG.maxZoom,
        minPoints: CLUSTER_CONFIG.minPoints,
        extent: CLUSTER_CONFIG.extent,
        nodeSize: CLUSTER_CONFIG.nodeSize,
      });
    }
    superclusterRef.current.load(features);
  }, [places, placesHash]);

  // Initialize map with retry logic
  useEffect(() => {
    // Prevent multiple simultaneous initializations
    if (initializingRef.current) return;
    if (mapRef.current) return; // Already initialized
    if (!accessToken) {
      console.warn('MapContainer: No access token provided');
      return;
    }

    const initMap = () => {
      const container = mapContainerRef.current;
      if (!container) {
        console.warn('MapContainer: Container not ready, retrying...');
        // Retry after a short delay
        if (initAttempts < 5) {
          setTimeout(() => setInitAttempts(a => a + 1), 200);
        }
        return;
      }

      // Check if container has dimensions
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn('MapContainer: Container has no dimensions, retrying...');
        if (initAttempts < 5) {
          setTimeout(() => setInitAttempts(a => a + 1), 200);
        }
        return;
      }

      initializingRef.current = true;

      try {
        mapboxgl.accessToken = accessToken;

        const map = new mapboxgl.Map({
          container: container,
          style: MAP_STYLES[mapType],
          center: DEFAULT_CENTER,
          zoom: 13,
          pitch: 45,
          bearing: 0,
          attributionControl: false,
          pitchWithRotate: true,
          dragRotate: true,
          scrollZoom: {
            speed: 1.5,
            smooth: true,
          },
          touchZoomRotate: true,
          touchPitch: true,
          renderWorldCopies: false,
          failIfMajorPerformanceCaveat: false, // Don't fail on low-end devices
        });

        // Handle load error
        map.on('error', (e) => {
          console.error('MapContainer: Map error', e);
        });

        // Add minimal attribution
        map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

        map.on('load', () => {
          console.log('MapContainer: Map loaded successfully');
          mapRef.current = map;
          setIsMapReady(true);
          initializingRef.current = false;
          onMapLoad(map);

          // Ensure desktop users can tilt/rotate with right mouse drag
          map.dragRotate.enable();
          map.touchZoomRotate.enable();
          if ((map as any).touchPitch?.enable) {
            (map as any).touchPitch.enable();
          }
          map.getCanvas().addEventListener('contextmenu', (e) => e.preventDefault());

          // Add circle sources for exploration areas (3 layers for gradient effect)
          if (!map.getSource('exploration-circles-outer')) {
            map.addSource('exploration-circles-outer', {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] }
            });
          }
          if (!map.getSource('exploration-circles-middle')) {
            map.addSource('exploration-circles-middle', {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] }
            });
          }
          if (!map.getSource('exploration-circles-inner')) {
            map.addSource('exploration-circles-inner', {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] }
            });
          }

          const isDarkMode = mapType === 'dark';
          const isSatellite = mapType === 'satellite';
          const circleStyle = getCircleStyle(isDarkMode, isSatellite);

          // Outer ring (most faded - largest)
          if (!map.getLayer('exploration-circles-outer-fill')) {
            map.addLayer({
              id: 'exploration-circles-outer-fill',
              type: 'fill',
              source: 'exploration-circles-outer',
              paint: {
                'fill-color': circleStyle.outerFillColor,
              }
            });
          }

          // Middle ring
          if (!map.getLayer('exploration-circles-middle-fill')) {
            map.addLayer({
              id: 'exploration-circles-middle-fill',
              type: 'fill',
              source: 'exploration-circles-middle',
              paint: {
                'fill-color': circleStyle.middleFillColor,
              }
            });
          }

          // Inner ring (most visible - smallest)
          if (!map.getLayer('exploration-circles-inner-fill')) {
            map.addLayer({
              id: 'exploration-circles-inner-fill',
              type: 'fill',
              source: 'exploration-circles-inner',
              paint: {
                'fill-color': circleStyle.innerFillColor,
              }
            });
          }

          // Subtle stroke on outer edge only
          if (!map.getLayer('exploration-circles-stroke')) {
            map.addLayer({
              id: 'exploration-circles-stroke',
              type: 'line',
              source: 'exploration-circles-outer',
              paint: {
                'line-color': circleStyle.strokeColor,
                'line-width': 1,
                'line-blur': 2,
              }
            });
          }

          // Add 3D buildings layer
          const layers = map.getStyle()?.layers;
          const labelLayerId = layers?.find(
            (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
          )?.id;

          if (!map.getLayer('3d-buildings')) {
            map.addLayer(
              {
                id: '3d-buildings',
                source: 'composite',
                'source-layer': 'building',
                filter: ['==', 'extrude', 'true'],
                type: 'fill-extrusion',
                minzoom: 12,
                paint: {
                  'fill-extrusion-color': isDarkMode ? '#1a1a2e' : isSatellite ? '#aaa' : '#ddd',
                  'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    12, 0,
                    13, ['get', 'height']
                  ],
                  'fill-extrusion-base': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    12, 0,
                    13, ['get', 'min_height']
                  ],
                  'fill-extrusion-opacity': 0.7
                }
              },
              labelLayerId
            );
          }
        });

        map.on('click', () => {
          if (onMapClick) onMapClick();
        });

      } catch (error) {
        console.error('MapContainer: Failed to initialize map', error);
        initializingRef.current = false;
        // Retry on failure
        if (initAttempts < 5) {
          setTimeout(() => setInitAttempts(a => a + 1), 500);
        }
      }
    };

    initMap();

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (mapRef.current) {
        // Clear all markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current.clear();
        clusterMarkersRef.current.forEach(m => m.remove());
        clusterMarkersRef.current.clear();
        
        mapRef.current.remove();
        mapRef.current = null;
        setIsMapReady(false);
        initializingRef.current = false;
      }
    };
  }, [accessToken, initAttempts]);

  // Update markers when places change or map moves
  const updateMarkers = useCallback((forceFullLoad: boolean = false) => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    
    // Prevent concurrent updates
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;

    try {
      // Initialize/update supercluster
      initializeSupercluster();

      if (!superclusterRef.current) {
        isUpdatingRef.current = false;
        return;
      }

      const zoom = map.getZoom();
      const scale = getScaleForZoom(zoom);

      // Get clusters for current view with expanded bounds buffer
      const bounds = map.getBounds();
      if (!bounds) {
        isUpdatingRef.current = false;
        return;
      }
      
      // Calculate expanded bounding box for pre-loading
      const west = bounds.getWest();
      const south = bounds.getSouth();
      const east = bounds.getEast();
      const north = bounds.getNorth();
      
      const lngSpan = east - west;
      const latSpan = north - south;
      
      // Expand bounds by buffer (e.g., 50% on each side)
      // For initial/force load, use world bounds to load everything
      let bbox: [number, number, number, number];
      if (forceFullLoad) {
        // World bounds - load all markers
        bbox = [-180, -85, 180, 85];
      } else {
        // Expanded bounds for pre-loading nearby markers
        bbox = [
          Math.max(-180, west - lngSpan * BOUNDS_BUFFER),
          Math.max(-85, south - latSpan * BOUNDS_BUFFER),
          Math.min(180, east + lngSpan * BOUNDS_BUFFER),
          Math.min(85, north + latSpan * BOUNDS_BUFFER)
        ];
      }
      
      const clusters = superclusterRef.current.getClusters(bbox, Math.floor(zoom));

      // Track current marker IDs to determine which to keep/remove
      const currentMarkerIds = new Set<string>();
      const currentClusterIds = new Set<string>();
      const newClusterMembership = new Map<string, string[]>(); // For tracking this frame

      // Process clusters and individual points
      clusters.forEach(cluster => {
        if (cluster.properties.cluster) {
          // It's a cluster - get leaves to create stable ID
          const clusterLeaves = superclusterRef.current!
            .getLeaves(cluster.properties.cluster_id, Infinity);
          const clusterPlaceIds = clusterLeaves.map((f: any) => f.properties.id as string);
          
          // Generate stable cluster ID based on member places
          const stableClusterId = generateStableClusterId(clusterPlaceIds);
          currentClusterIds.add(stableClusterId);
          newClusterMembership.set(stableClusterId, clusterPlaceIds);
          
          // Cancel pending removal if this cluster is still needed
          pendingRemovalsRef.current.delete(stableClusterId);
          
          const clusterPlaces = clusterPlaceIds
            .map((id: string) => placesMapRef.current.get(id))
            .filter((p: Place | undefined): p is Place => !!p);

          if (clusterPlaces.length > 0) {
            const [lng, lat] = cluster.geometry.coordinates;
            // Get the actual point count from Supercluster
            const pointCount = cluster.properties.point_count || clusterLeaves.length;
            
            // Check if cluster marker already exists
            const existingMarker = clusterMarkersRef.current.get(stableClusterId);
            if (existingMarker) {
              // Update position smoothly
              existingMarker.setLngLat([lng, lat]);
              // Update scale
              const el = existingMarker.getElement();
              setClusterScale(el, scale);
              if (el) el.style.opacity = '1';
              
              // Update the count badge if it changed
              const countBadge = el.querySelector('div[style*="min-width: 20px"]');
              if (countBadge && countBadge.textContent !== String(pointCount)) {
                countBadge.textContent = String(pointCount);
              }
            } else {
              // Check if this new cluster is formed from merging existing clusters AND/OR markers
              // Find old clusters that share places with this new cluster
              const mergingFromClusters: { id: string; marker: mapboxgl.Marker }[] = [];
              for (const [oldClusterId, oldPlaceIds] of clusterMembershipRef.current) {
                if (oldClusterId !== stableClusterId && clustersOverlap(clusterPlaceIds, oldPlaceIds)) {
                  const oldMarker = clusterMarkersRef.current.get(oldClusterId);
                  if (oldMarker && !pendingRemovalsRef.current.has(oldClusterId)) {
                    mergingFromClusters.push({ id: oldClusterId, marker: oldMarker });
                  }
                }
              }
              
              // Find individual markers that are being absorbed into this cluster
              const mergingFromMarkers: { id: string; marker: mapboxgl.Marker }[] = [];
              for (const placeId of clusterPlaceIds) {
                const existingMarker = markersRef.current.get(placeId);
                if (existingMarker && !pendingRemovalsRef.current.has(placeId)) {
                  mergingFromMarkers.push({ id: placeId, marker: existingMarker });
                }
              }
              
              // Create new cluster marker with correct count
              const element = createClusterElement(clusterPlaces, scale, pointCount);
              
              // Store cluster_id for expansion zoom calculation
              element.dataset.superclusterId = String(cluster.properties.cluster_id);
              
              element.addEventListener('click', (e) => {
                e.stopPropagation();
                const scId = parseInt(element.dataset.superclusterId || '0', 10);
                if (superclusterRef.current) {
                  try {
                    const expansionZoom = superclusterRef.current.getClusterExpansionZoom(scId);
                    map.easeTo({
                      center: [lng, lat],
                      zoom: Math.min(expansionZoom, 18),
                      duration: 300
                    });
                  } catch (err) {
                    // Fallback: just zoom in
                    map.easeTo({
                      center: [lng, lat],
                      zoom: Math.min(zoom + 2, 18),
                      duration: 300
                    });
                  }
                }
              });

              const marker = new mapboxgl.Marker({ element, anchor: 'bottom' })
                .setLngLat([lng, lat])
                .addTo(map);
              
              clusterMarkersRef.current.set(stableClusterId, marker);
              
              // Animate merging clusters (cluster + cluster → bigger cluster)
              if (mergingFromClusters.length > 0) {
                mergingFromClusters.forEach(({ id: oldId, marker: oldMarker }) => {
                  if (!pendingRemovalsRef.current.has(oldId)) {
                    pendingRemovalsRef.current.add(oldId);
                    const oldEl = oldMarker.getElement();
                    if (oldEl) {
                      // Fade out the merging cluster
                      oldEl.style.transition = 'opacity 0.35s ease-in-out';
                      oldEl.style.opacity = '0';
                    }
                    // Remove after animation
                    setTimeout(() => {
                      if (pendingRemovalsRef.current.has(oldId)) {
                        oldMarker.remove();
                        clusterMarkersRef.current.delete(oldId);
                        clusterMembershipRef.current.delete(oldId);
                        pendingRemovalsRef.current.delete(oldId);
                      }
                    }, 350);
                  }
                });
              }
              
              // Animate merging markers (marker joins cluster)
              if (mergingFromMarkers.length > 0) {
                mergingFromMarkers.forEach(({ id: markerId, marker: markerToMerge }) => {
                  if (!pendingRemovalsRef.current.has(markerId)) {
                    pendingRemovalsRef.current.add(markerId);
                    const markerEl = markerToMerge.getElement();
                    if (markerEl) {
                      // Fade out the marker being absorbed
                      markerEl.style.transition = 'opacity 0.35s ease-in-out';
                      markerEl.style.opacity = '0';
                    }
                    // Remove after animation
                    setTimeout(() => {
                      if (pendingRemovalsRef.current.has(markerId)) {
                        markerToMerge.remove();
                        markersRef.current.delete(markerId);
                        pendingRemovalsRef.current.delete(markerId);
                      }
                    }, 350);
                  }
                });
              }
            }
          }
        } else {
          // Individual place
          const placeId = cluster.properties.id;
          currentMarkerIds.add(placeId);
          
          // Cancel pending removal if this marker is still needed
          pendingRemovalsRef.current.delete(placeId);
          
          const place = placesMapRef.current.get(placeId);
          
          if (place && place.location) {
            const existingMarker = markersRef.current.get(placeId);
            if (existingMarker) {
              // Update position and scale
              existingMarker.setLngLat([place.location.lng, place.location.lat]);
              const el = existingMarker.getElement();
              setMarkerScale(el, scale);
              if (el) el.style.opacity = '1';
            } else {
              // Create new marker
              const element = createPinElement(place, scale);
              element.addEventListener('click', (e) => {
                e.stopPropagation();
                onMarkerClick(place);
              });

              const marker = new mapboxgl.Marker({ element, anchor: 'bottom' })
                .setLngLat([place.location.lng, place.location.lat])
                .addTo(map);
              
              markersRef.current.set(placeId, marker);
            }
          }
        }
      });

      // Remove markers no longer in current view/clusters with smooth fade out
      for (const [id, marker] of markersRef.current) {
        if (!currentMarkerIds.has(id) && !pendingRemovalsRef.current.has(id)) {
          pendingRemovalsRef.current.add(id);
          const el = marker.getElement();
          if (el) {
            // Smooth fade out - overlaps with new element fade in for crossfade effect
            el.style.transition = 'opacity 0.35s ease-in-out';
            el.style.opacity = '0';
            // Remove after transition completes
            setTimeout(() => {
              if (pendingRemovalsRef.current.has(id)) {
                marker.remove();
                markersRef.current.delete(id);
                pendingRemovalsRef.current.delete(id);
              }
            }, 350);
          } else {
            marker.remove();
            markersRef.current.delete(id);
            pendingRemovalsRef.current.delete(id);
          }
        }
      }
      
      // Remove old cluster markers with smooth fade out (skip ones already handled by merge logic)
      for (const [id, marker] of clusterMarkersRef.current) {
        if (!currentClusterIds.has(id) && !pendingRemovalsRef.current.has(id)) {
          pendingRemovalsRef.current.add(id);
          const el = marker.getElement();
          if (el) {
            // Smooth fade out - overlaps with new element fade in for crossfade effect
            el.style.transition = 'opacity 0.35s ease-in-out';
            el.style.opacity = '0';
            // Remove after transition completes
            setTimeout(() => {
              if (pendingRemovalsRef.current.has(id)) {
                marker.remove();
                clusterMarkersRef.current.delete(id);
                clusterMembershipRef.current.delete(id);
                pendingRemovalsRef.current.delete(id);
              }
            }, 350);
          } else {
            marker.remove();
            clusterMarkersRef.current.delete(id);
            clusterMembershipRef.current.delete(id);
            pendingRemovalsRef.current.delete(id);
          }
        }
      }
      
      // Update cluster membership tracking for next frame
      for (const [clusterId, placeIds] of newClusterMembership) {
        clusterMembershipRef.current.set(clusterId, placeIds);
      }

      // Update exploration circles based on current clusters
      // Create gradient rings: outer (100% radius), middle (75% radius), inner (50% radius)
      const outerFeatures: any[] = [];
      const middleFeatures: any[] = [];
      const innerFeatures: any[] = [];

      // Process clusters to create merged exploration areas
      clusters.forEach(cluster => {
        if (cluster.properties.cluster) {
          // It's a cluster - create a bounding circle around all places in it
          const clusterLeaves = superclusterRef.current!
            .getLeaves(cluster.properties.cluster_id, Infinity);
          
          const coordinates = clusterLeaves
            .map((leaf: any) => {
              const place = placesMapRef.current.get(leaf.properties.id);
              return place?.location;
            })
            .filter((loc): loc is { lng: number; lat: number } => !!loc);
          
          if (coordinates.length > 0) {
            const { center, radius } = calculateBoundingCircle(coordinates);
            
            // Create three concentric rings for gradient effect
            outerFeatures.push({
              type: 'Feature' as const,
              geometry: {
                type: 'Polygon' as const,
                coordinates: [createCirclePolygon(center.lng, center.lat, radius * 1.0)]
              },
              properties: { id: `cluster-outer-${cluster.properties.cluster_id}` }
            });
            
            middleFeatures.push({
              type: 'Feature' as const,
              geometry: {
                type: 'Polygon' as const,
                coordinates: [createCirclePolygon(center.lng, center.lat, radius * 0.75)]
              },
              properties: { id: `cluster-middle-${cluster.properties.cluster_id}` }
            });
            
            innerFeatures.push({
              type: 'Feature' as const,
              geometry: {
                type: 'Polygon' as const,
                coordinates: [createCirclePolygon(center.lng, center.lat, radius * 0.5)]
              },
              properties: { id: `cluster-inner-${cluster.properties.cluster_id}` }
            });
          }
        } else {
          // Individual place - create standard exploration circle with gradient
          const place = placesMapRef.current.get(cluster.properties.id);
          if (place?.location) {
            const { lat, lng } = place.location;
            
            outerFeatures.push({
              type: 'Feature' as const,
              geometry: {
                type: 'Polygon' as const,
                coordinates: [createCirclePolygon(lng, lat, EXPLORED_RADIUS * 1.0)]
              },
              properties: { id: `place-outer-${place.id}` }
            });
            
            middleFeatures.push({
              type: 'Feature' as const,
              geometry: {
                type: 'Polygon' as const,
                coordinates: [createCirclePolygon(lng, lat, EXPLORED_RADIUS * 0.75)]
              },
              properties: { id: `place-middle-${place.id}` }
            });
            
            innerFeatures.push({
              type: 'Feature' as const,
              geometry: {
                type: 'Polygon' as const,
                coordinates: [createCirclePolygon(lng, lat, EXPLORED_RADIUS * 0.5)]
              },
              properties: { id: `place-inner-${place.id}` }
            });
          }
        }
      });

      // Update all three circle sources
      const outerSource = map.getSource('exploration-circles-outer') as mapboxgl.GeoJSONSource;
      const middleSource = map.getSource('exploration-circles-middle') as mapboxgl.GeoJSONSource;
      const innerSource = map.getSource('exploration-circles-inner') as mapboxgl.GeoJSONSource;
      
      if (outerSource) {
        outerSource.setData({ type: 'FeatureCollection', features: outerFeatures });
      }
      if (middleSource) {
        middleSource.setData({ type: 'FeatureCollection', features: middleFeatures });
      }
      if (innerSource) {
        innerSource.setData({ type: 'FeatureCollection', features: innerFeatures });
      }
    } finally {
      isUpdatingRef.current = false;
    }
  }, [places, isMapReady, onMarkerClick, initializeSupercluster]);

  // Update markers on places change or map move
  useEffect(() => {
    // Force full load on initial places load or when places change
    updateMarkers(true);

    const map = mapRef.current;
    if (!map) return;

    // Handle map movement - load markers during panning for seamless experience
    let moveThrottleTimeout: NodeJS.Timeout | null = null;
    const handleMove = () => {
      // Throttle move updates (more frequent than moveend for smooth loading)
      if (moveThrottleTimeout) return;
      moveThrottleTimeout = setTimeout(() => {
        moveThrottleTimeout = null;
        updateMarkers(false);
      }, 100); // Update every 100ms during pan
    };
    
    // Use 'moveend' for final cleanup after drag/zoom completes
    const handleMoveEnd = () => {
      // Clear throttle timeout
      if (moveThrottleTimeout) {
        clearTimeout(moveThrottleTimeout);
        moveThrottleTimeout = null;
      }
      // Debounce final update
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        updateMarkers(false);
      }, 50);
    };
    
    const handleZoom = () => {
      const zoom = map.getZoom();
      const scale = getScaleForZoom(zoom);
      
      // Update individual marker scales immediately for smooth feel
      markersRef.current.forEach((marker) => {
        const el = marker.getElement();
        setMarkerScale(el, scale);
      });
      
      // Update cluster scales
      clusterMarkersRef.current.forEach((marker) => {
        const el = marker.getElement();
        setClusterScale(el, scale);
      });
    };

    // Listen to both move and moveend for smooth loading
    map.on('move', handleMove);
    map.on('moveend', handleMoveEnd);
    map.on('zoom', handleZoom);

    return () => {
      if (moveThrottleTimeout) {
        clearTimeout(moveThrottleTimeout);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      map.off('move', handleMove);
      map.off('moveend', handleMoveEnd);
      map.off('zoom', handleZoom);
    };
  }, [updateMarkers]);

  // Handle map type changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    if (currentMapTypeRef.current === mapType) return;

    currentMapTypeRef.current = mapType;
    map.setStyle(MAP_STYLES[mapType]);

    // Re-add layers after style change
    map.once('style.load', () => {
      const isDarkMode = mapType === 'dark';
      const isSatellite = mapType === 'satellite';
      const circleStyle = getCircleStyle(isDarkMode, isSatellite);

      // Add sources for gradient exploration circles
      if (!map.getSource('exploration-circles-outer')) {
        map.addSource('exploration-circles-outer', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
      }
      if (!map.getSource('exploration-circles-middle')) {
        map.addSource('exploration-circles-middle', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
      }
      if (!map.getSource('exploration-circles-inner')) {
        map.addSource('exploration-circles-inner', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
      }

      // Outer ring layer
      if (!map.getLayer('exploration-circles-outer-fill')) {
        map.addLayer({
          id: 'exploration-circles-outer-fill',
          type: 'fill',
          source: 'exploration-circles-outer',
          paint: { 'fill-color': circleStyle.outerFillColor }
        });
      } else {
        map.setPaintProperty('exploration-circles-outer-fill', 'fill-color', circleStyle.outerFillColor);
      }

      // Middle ring layer
      if (!map.getLayer('exploration-circles-middle-fill')) {
        map.addLayer({
          id: 'exploration-circles-middle-fill',
          type: 'fill',
          source: 'exploration-circles-middle',
          paint: { 'fill-color': circleStyle.middleFillColor }
        });
      } else {
        map.setPaintProperty('exploration-circles-middle-fill', 'fill-color', circleStyle.middleFillColor);
      }

      // Inner ring layer
      if (!map.getLayer('exploration-circles-inner-fill')) {
        map.addLayer({
          id: 'exploration-circles-inner-fill',
          type: 'fill',
          source: 'exploration-circles-inner',
          paint: { 'fill-color': circleStyle.innerFillColor }
        });
      } else {
        map.setPaintProperty('exploration-circles-inner-fill', 'fill-color', circleStyle.innerFillColor);
      }

      // Subtle stroke on outer edge
      if (!map.getLayer('exploration-circles-stroke')) {
        map.addLayer({
          id: 'exploration-circles-stroke',
          type: 'line',
          source: 'exploration-circles-outer',
          paint: {
            'line-color': circleStyle.strokeColor,
            'line-width': 1,
            'line-blur': 2,
          }
        });
      } else {
        map.setPaintProperty('exploration-circles-stroke', 'line-color', circleStyle.strokeColor);
      }

      // Re-add 3D buildings layer
      if (!map.getLayer('3d-buildings')) {
        const layers = map.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
        )?.id;

        map.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 12,
            paint: {
              'fill-extrusion-color': isDarkMode ? '#1a1a2e' : isSatellite ? '#aaa' : '#ddd',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                12, 0,
                13, ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                12, 0,
                13, ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.7
            }
          },
          labelLayerId
        );
      } else {
        map.setPaintProperty('3d-buildings', 'fill-extrusion-color', 
          isDarkMode ? '#1a1a2e' : isSatellite ? '#aaa' : '#ddd'
        );
      }

      updateMarkers(true);
    });
  }, [mapType, isMapReady, updateMarkers]);

  // Handle visibility changes - resize map when container becomes visible
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !mapRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      const map = mapRef.current;
      if (map) {
        // Trigger resize to handle visibility changes
        map.resize();
      }
    });

    resizeObserver.observe(container);

    // Also handle visibility change
    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && mapRef.current) {
          // Map became visible, trigger resize
          setTimeout(() => {
            mapRef.current?.resize();
          }, 100);
        }
      });
    }, { threshold: 0.1 });

    intersectionObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [isMapReady]);

  const bgColor = mapType === 'satellite' ? '#1a1f1a' :
                  mapType === 'dark' ? '#0e1626' : '#e8e6e1';

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ backgroundColor: bgColor, zIndex: 0 }}
      />
    </div>
  );
};

export default MapContainer;
