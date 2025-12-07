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

// Clustering configuration
const CLUSTER_CONFIG = {
  radius: 60,
  minZoom: 0,
  maxZoom: 14,
  minPoints: 2,
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
      fillColor: 'rgba(99, 102, 241, 0.08)',
      strokeColor: 'rgba(129, 140, 248, 0.15)',
    };
  } else if (isSatellite) {
    return {
      fillColor: 'rgba(251, 191, 36, 0.1)',
      strokeColor: 'rgba(245, 158, 11, 0.2)',
    };
  } else {
    return {
      fillColor: 'rgba(59, 130, 246, 0.06)',
      strokeColor: 'rgba(96, 165, 250, 0.15)',
    };
  }
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

// Create HTML element for single place marker with CSS transitions
const createPinElement = (place: Place, scale: number = 1): HTMLDivElement => {
  const container = document.createElement('div');
  container.className = 'mapbox-place-marker';
  container.style.cssText = `
    cursor: pointer;
    z-index: 1;
    pointer-events: auto;
    opacity: 0;
    transition: opacity 0.3s ease-out;
  `;
  container.dataset.placeId = place.id;
  
  // Trigger fade-in after a microtask to ensure the transition works
  requestAnimationFrame(() => {
    container.style.opacity = '1';
  });

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
  scale: number = 1
): HTMLDivElement => {
  const container = document.createElement('div');
  container.className = 'mapbox-cluster-marker';
  container.style.cssText = `
    cursor: pointer;
    z-index: 1;
    pointer-events: auto;
    opacity: 0;
    transition: opacity 0.3s ease-out;
  `;
  
  // Trigger fade-in after a microtask to ensure the transition works
  requestAnimationFrame(() => {
    container.style.opacity = '1';
  });
  
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
  const totalCount = places.length;

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

    // Create or reuse Supercluster
    if (!superclusterRef.current) {
      superclusterRef.current = new Supercluster({
        radius: CLUSTER_CONFIG.radius,
        minZoom: CLUSTER_CONFIG.minZoom,
        maxZoom: CLUSTER_CONFIG.maxZoom,
        minPoints: CLUSTER_CONFIG.minPoints,
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

          // Add circle source for exploration areas
          if (!map.getSource('exploration-circles')) {
            map.addSource('exploration-circles', {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] }
            });
          }

          const isDarkMode = mapType === 'dark';
          const isSatellite = mapType === 'satellite';
          const circleStyle = getCircleStyle(isDarkMode, isSatellite);

          if (!map.getLayer('exploration-circles-fill')) {
            map.addLayer({
              id: 'exploration-circles-fill',
              type: 'fill',
              source: 'exploration-circles',
              paint: {
                'fill-color': circleStyle.fillColor,
              }
            });
          }

          if (!map.getLayer('exploration-circles-stroke')) {
            map.addLayer({
              id: 'exploration-circles-stroke',
              type: 'line',
              source: 'exploration-circles',
              paint: {
                'line-color': circleStyle.strokeColor,
                'line-width': 1,
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
          
          // Cancel pending removal if this cluster is still needed
          pendingRemovalsRef.current.delete(stableClusterId);
          
          const clusterPlaces = clusterPlaceIds
            .map((id: string) => placesMapRef.current.get(id))
            .filter((p: Place | undefined): p is Place => !!p);

          if (clusterPlaces.length > 0) {
            const [lng, lat] = cluster.geometry.coordinates;
            
            // Check if cluster marker already exists
            const existingMarker = clusterMarkersRef.current.get(stableClusterId);
            if (existingMarker) {
              // Update position smoothly
              existingMarker.setLngLat([lng, lat]);
              // Update scale
              const el = existingMarker.getElement();
              setClusterScale(el, scale);
              if (el) el.style.opacity = '1';
            } else {
              // Create new cluster marker
              const element = createClusterElement(clusterPlaces, scale);
              
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

      // Remove markers no longer in current view/clusters with fade out
      for (const [id, marker] of markersRef.current) {
        if (!currentMarkerIds.has(id) && !pendingRemovalsRef.current.has(id)) {
          pendingRemovalsRef.current.add(id);
          const el = marker.getElement();
          if (el) {
            el.style.opacity = '0';
            // Remove after transition
            setTimeout(() => {
              if (pendingRemovalsRef.current.has(id)) {
                marker.remove();
                markersRef.current.delete(id);
                pendingRemovalsRef.current.delete(id);
              }
            }, 200);
          } else {
            marker.remove();
            markersRef.current.delete(id);
            pendingRemovalsRef.current.delete(id);
          }
        }
      }
      
      // Remove old cluster markers with fade out
      for (const [id, marker] of clusterMarkersRef.current) {
        if (!currentClusterIds.has(id) && !pendingRemovalsRef.current.has(id)) {
          pendingRemovalsRef.current.add(id);
          const el = marker.getElement();
          if (el) {
            el.style.opacity = '0';
            // Remove after transition
            setTimeout(() => {
              if (pendingRemovalsRef.current.has(id)) {
                marker.remove();
                clusterMarkersRef.current.delete(id);
                pendingRemovalsRef.current.delete(id);
              }
            }, 200);
          } else {
            marker.remove();
            clusterMarkersRef.current.delete(id);
            pendingRemovalsRef.current.delete(id);
          }
        }
      }

      // Update exploration circles
      const circleFeatures = places
        .filter(p => p.location)
        .map(p => {
          const center = [p.location.lng, p.location.lat];
          const points = 64;
          const coordinates = [];
          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            const dx = EXPLORED_RADIUS * Math.cos(angle);
            const dy = EXPLORED_RADIUS * Math.sin(angle);
            const lat = p.location.lat + (dy / 111320);
            const lng = p.location.lng + (dx / (111320 * Math.cos(p.location.lat * Math.PI / 180)));
            coordinates.push([lng, lat]);
          }
          return {
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [coordinates]
            },
            properties: { id: p.id }
          };
        });

      const source = map.getSource('exploration-circles') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: circleFeatures
        });
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

      if (!map.getSource('exploration-circles')) {
        map.addSource('exploration-circles', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
      }

      if (!map.getLayer('exploration-circles-fill')) {
        map.addLayer({
          id: 'exploration-circles-fill',
          type: 'fill',
          source: 'exploration-circles',
          paint: { 'fill-color': circleStyle.fillColor }
        });
      } else {
        map.setPaintProperty('exploration-circles-fill', 'fill-color', circleStyle.fillColor);
      }

      if (!map.getLayer('exploration-circles-stroke')) {
        map.addLayer({
          id: 'exploration-circles-stroke',
          type: 'line',
          source: 'exploration-circles',
          paint: {
            'line-color': circleStyle.strokeColor,
            'line-width': 1,
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
