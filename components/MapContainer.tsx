
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
  
  // Store clusterer instance
  const clustererRef = useRef<MarkerClusterer | null>(null);
  // Store marker instances to manage updates
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());

  // 1. Load Map
  useEffect(() => {
    if (!apiKey) return;

    const loadMaps = async () => {
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
        disableDefaultUI: true, // Hide core default controls
        zoomControl: false,     // Explicitly disable Zoom control
        mapTypeControl: false,  // Explicitly disable Map Type control
        streetViewControl: false, // Explicitly disable Street View
        fullscreenControl: false, // Explicitly disable Fullscreen control
        rotateControl: false,     // Explicitly disable Rotate control
        gestureHandling: 'greedy', 
      });

      // Initialize MarkerClusterer with robust click handler
      clustererRef.current = new MarkerClusterer({ 
        map,
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
            // Create View
            const pinView = document.createElement("div");
            pinView.className = "marker-pin group relative flex items-center justify-center cursor-pointer";
            pinView.innerHTML = `
              <div class="w-6 h-6 bg-amber-500 rounded-full border-2 border-white shadow-lg transform transition-transform duration-200 group-hover:scale-125"></div>
              <div class="absolute -bottom-1 w-2 h-2 bg-black/20 rounded-full blur-[2px]"></div>
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

  return (
    <div ref={mapRef} className="w-full h-full bg-gray-900" />
  );
};

export default MapContainer;
