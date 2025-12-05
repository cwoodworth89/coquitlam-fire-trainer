import React, { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';

// COMPONENT: Handle Map Clicks
export function MapClickEvents({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

// COMPONENT: Smart Zoom Logic
export function SmartZoom({ target, mode, allBlocks, allZones }) {
  const map = useMap();
  
  useEffect(() => {
    if (!target) return;
    let bounds;
    
    // 1. ZONES: Show the WHOLE CITY context, not just the target
    if (mode === "QUIZ_ZONES" && allZones.length > 0) {
        // Collect coordinates from ALL zones to find the city limits
        const allCoords = allZones.flatMap(z => z.geometry.coordinates[0].map(c => [c[1], c[0]]));
        bounds = L.latLngBounds(allCoords);
        // Pad it generously so we see 3/4 of the city
        map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }

    // 2. BLOCKS: Zoom to the street segment
    else if (mode === "QUIZ_BLOCKS" && allBlocks.length > 0) {
      const streetSegments = allBlocks.filter(b => b.street === target.street);
      if (streetSegments.length > 0) {
        const allPoints = streetSegments.flatMap(s => s.coordinates);
        bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { paddingTopLeft: [50, 50], paddingBottomRight: [350, 50], maxZoom: 16, animate: true });
      }
    }

    // 3. ADDRESSES: Zoom to the parcel
    else if (mode === "QUIZ_ADDRESSES" && allZones.length > 0) {
        const pt = turf.point([target.lng, target.lat]);
        const parentZone = allZones.find(z => turf.booleanPointInPolygon(pt, z.geometry));
        if (parentZone) {
             const latLngs = parentZone.geometry.coordinates[0].map(c => [c[1], c[0]]);
             bounds = L.latLngBounds(latLngs);
             map.fitBounds(bounds, { paddingTopLeft: [50, 50], paddingBottomRight: [350, 50], maxZoom: 18, animate: true });
        } else {
             map.setView([target.lat, target.lng], 17, { animate: true });
        }
    }
  }, [target, map, mode, allBlocks, allZones]);
  return null;
}

// COMPONENT: Feedback Zoom
export function ZoomToFeedback({ guessBlock, targetBlock, mode }) {
  const map = useMap();
  useEffect(() => {
    if (mode === "QUIZ_BLOCKS" && guessBlock && targetBlock) {
      const points = [...guessBlock.coordinates, ...targetBlock.coordinates];
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { paddingTopLeft: [100, 100], paddingBottomRight: [350, 100], maxZoom: 17, animate: true });
    }
  }, [guessBlock, targetBlock, mode, map]);
  return null;
}