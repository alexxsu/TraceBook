
import React, { useEffect, useRef, useState } from 'react';
import { Restaurant } from '../types';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

interface MapContainerProps {
  apiKey: string;
  restaurants: Restaurant[];
  onMarkerClick: (restaurant: Restaurant) => void;
  onMapLoad: (map: google.maps.Map) => void;
}

const DEFAULT_CENTER = { lat: 43.6532, lng: -79.3832 };

const MapContainer: React.FC<MapContainerProps> = ({ apiKey, restaurants, onMarkerClick, onMapLoad }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Store clusterer instance
  const clustererRef = useRef<MarkerClusterer | null>(null);
  // Store marker instances to manage updates
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());

  // 1. Load Map
  useEffect(() => {
    if (!apiKey) return;

    // Define global error handler for Google Maps Auth Failures
    (window as any).gm_authFailure = () => {
      const message = "Google Maps API Blocked. Please check your API Key Restrictions in Google Cloud Console. You may need to add this preview domain to the allowed list.";
      setAuthError(message);
      console.error(message);
    };

    const loadMaps = async () => {
      // Check if script already exists
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
         initMap();
         return;
      }

      (function(g: any){
        var h: any, a: any, k: any, p: string = "The Google Maps JavaScript API", c: string = "google", l: string = "importLibrary", q: string = "__ib__", m: Document = document, b: any = window;
        b = b[c] || (b[c] = {});
        var d = b.maps || (b.maps = {}), r = new Set(), e = new URLSearchParams(), u = () => h || (h = new Promise(async (f, n) => {
            await (a = m.createElement("script"));
            e.set("libraries", [...r] + "");
            for (k in g) e.set(k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()), g[k]);
            e.set("callback", c + ".maps." + q);
            a.src = `https://maps.googleapis.com/maps/api/js?` + e;
            d[q] = f;
            a.onerror = () => h = n(Error(p + " could not load."));
            a.nonce = (m.querySelector("script[nonce]") as any)?.nonce || "";
            m.head.append(a);
        }));
        d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f: any, ...n: any[]) => r.add(f) && u().then(() => d[l](f, ...n));
      })({
        key: apiKey,
        v: "weekly",
        loading: "async"
      });

      initMap();
    };

    loadMaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const initMap = async () => {
    if (!mapRef.current) return;

    try {
      const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
      await google.maps.importLibrary("marker"); // Ensure Marker is loaded for Clusterer if needed

      const map = new Map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: 13,
        mapTypeId: 'satellite',
        mapId: "DEMO_MAP_ID",
        disableDefaultUI: true, // Explicitly disable all default controls
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        rotateControl: false,
        scaleControl: false,
        gestureHandling: 'greedy', 
      });

      // Custom cluster renderer with elegant blue gradient
      const renderer = {
        render: ({ count, position }: { count: number; position: google.maps.LatLng }) => {
          // Consistent blue gradient for all clusters
          let backgroundColor: string;
          let borderColor = 'white';
          let textColor = 'white';
          let size = 50;

          if (count < 10) {
            // Small clusters: Bright cyan blue
            backgroundColor = '#0EA5E9'; // sky-500
            size = 44;
          } else if (count < 30) {
            // Medium clusters: Royal blue
            backgroundColor = '#3B82F6'; // blue-500
            size = 50;
          } else if (count < 100) {
            // Large clusters: Deep blue
            backgroundColor = '#2563EB'; // blue-600
            size = 56;
          } else {
            // Very large clusters: Navy blue
            backgroundColor = '#1E40AF'; // blue-700
            size = 62;
          }

          // Elegant cluster design with gradient and shadow
          const svg = `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="shadow-${count}" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                  <feOffset dx="0" dy="2" result="offsetblur"/>
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.3"/>
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <radialGradient id="grad-${count}">
                  <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
                  <stop offset="100%" style="stop-color:${backgroundColor};stop-opacity:0.85" />
                </radialGradient>
              </defs>
              <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" fill="url(#grad-${count})" stroke="${borderColor}" stroke-width="3" filter="url(#shadow-${count})"/>
              <text x="${size/2}" y="${size/2}" font-size="${size/3.5}" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${count}</text>
            </svg>
          `;

          const icon = document.createElement('div');
          icon.innerHTML = svg;
          icon.style.width = `${size}px`;
          icon.style.height = `${size}px`;
          icon.style.cursor = 'pointer';

          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: icon,
            zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
          });
        }
      };

      // Initialize MarkerClusterer with custom renderer and click handler
      clustererRef.current = new MarkerClusterer({
        map,
        renderer,
        onClusterClick: (event, cluster, map) => {
          // Explicit fitBounds ensures consistent zoom animation
          const bounds = new google.maps.LatLngBounds();
          if (cluster.markers) {
            cluster.markers.forEach(m => {
              if (m.position) {
                bounds.extend(m.position);
              }
            });
            // Padding ensures markers aren't right on the edge
            map.fitBounds(bounds, 50);
          }
        }
      });

      setMapInstance(map);
      onMapLoad(map);
    } catch (error) {
      console.error("Failed to initialize Google Map:", error);
    }
  };

  // 2. Handle Markers & Clustering
  useEffect(() => {
    const updateMarkers = async () => {
      if (!mapInstance || !clustererRef.current) return;

      try {
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

        const currentIds = new Set(restaurants.map(r => r.id));
        const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

        // A. Add New Markers
        restaurants.forEach(restaurant => {
          if (!markersRef.current.has(restaurant.id)) {
            // Create elegant blue pin matching cluster theme
            const pinView = document.createElement("div");
            pinView.className = "marker-pin group relative flex items-center justify-center cursor-pointer";
            pinView.innerHTML = `
              <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                    <feOffset dx="0" dy="2" result="offsetblur"/>
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.4"/>
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <radialGradient id="pin-gradient">
                    <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2563EB;stop-opacity:1" />
                  </radialGradient>
                </defs>
                <path d="M16 0C9.373 0 4 5.373 4 12c0 8 12 24 12 24s12-16 12-24c0-6.627-5.373-12-12-12z"
                      fill="url(#pin-gradient)"
                      stroke="white"
                      stroke-width="2"
                      filter="url(#pin-shadow)"
                      class="group-hover:opacity-90 transition-opacity"/>
                <circle cx="16" cy="12" r="5" fill="white" opacity="0.9"/>
              </svg>
            `;

            const marker = new AdvancedMarkerElement({
              position: restaurant.location,
              title: restaurant.name,
              content: pinView,
              gmpClickable: true,
            });

            marker.addListener('click', () => {
              onMarkerClick(restaurant);
            });

            markersRef.current.set(restaurant.id, marker);
            newMarkers.push(marker);
          }
        });

        // Add new markers to clusterer
        if (newMarkers.length > 0) {
          clustererRef.current.addMarkers(newMarkers);
        }

        // B. Remove Deleted Markers
        const markersToRemove: google.maps.marker.AdvancedMarkerElement[] = [];
        for (const [id, marker] of markersRef.current) {
          if (!currentIds.has(id)) {
            markersToRemove.push(marker);
            marker.map = null; // Detach from map just in case
            markersRef.current.delete(id);
          }
        }

        if (markersToRemove.length > 0) {
          clustererRef.current.removeMarkers(markersToRemove);
        }

      } catch (e) {
        console.error("Error updating markers", e);
      }
    };

    updateMarkers();
  }, [mapInstance, restaurants, onMarkerClick]);

  if (authError) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center p-8">
        <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-xl max-w-md text-center">
          <h3 className="text-red-400 font-bold text-lg mb-2">Map Loading Failed</h3>
          <p className="text-gray-300 mb-4">{authError}</p>
          <p className="text-xs text-gray-500">
             If you are in preview mode, go to Google Cloud Console and set restrictions to "None" temporarily.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapRef} className="w-full h-full bg-gray-900" />
  );
};

export default MapContainer;
