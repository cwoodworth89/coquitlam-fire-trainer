import React, { useEffect, useRef } from 'react';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

// Import Esri libraries
import { vectorBasemapLayer } from 'esri-leaflet-vector';
import { dynamicMapLayer } from 'esri-leaflet';

// 🔑 API KEY
const API_KEY = "AAPTxy8BH1VEsoebNVZXo8HurAtUqBEibvXQ49H44V9cLFsdZhqOdxezMGzrZ2QiYfHHlb9zkcacxXvSeuIsHOvLLbUB_MFqDvT-evdF8PKDKmuIayqymwswn09IzC3tH_aL0s9G-CZSWBAaOS2tOZdHdLNA0L34rW0z4wZBQVpKrYKWKYNr4AltUWCw28T5qZB2E7so0ek3jRLAEKbqPgXmr844piY3S6xgI-2oBoj9rBM19tqk-YakklhymszucwtRAT1_ZmlRyAzl";

// 🗺️ CONFIGURATION
export const BASE_LAYERS = {
    GREY: {
        type: "esri-custom", 
        id: "38786e137dea4eb5a240ef85cb1390a2" 
    },
    DARK: {
        type: "esri-enum",   
        id: "arcgis/dark-gray" 
    }
};

// 🎮 DEFAULTS
export const MODE_DEFAULTS = {
    EXPLORE: "GREY",
    QUIZ_ZONES: "DARK",       
    QUIZ_INTERSECTIONS: "GREY", 
    QUIZ_BLOCKS: "GREY",      
    QUIZ_ADDRESSES: "GREY" 
};

// 🚒 STATIONS
// Coordinates verified against official Coquitlam Fire Hall addresses
const STATIONS = [
    { id: "1", name: "Hall 1", coords: [49.291329039026046, -122.79161362016414] },
    { id: "2", name: "Hall 2", coords: [49.26223510671969, -122.81725512755891] },
    { id: "3", name: "Hall 3", coords: [49.24804277980424, -122.86566519365569] },
    { id: "4", name: "Hall 4", coords: [49.2952132946437, -122.7425391041921] }
];

// 🎨 TUNED ICON (Fixed anchor centering)
const stationIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="
    background-color: white; 
    border: 2px solid #ef4444; 
    border-radius: 50%; 
    width: 30px; 
    height: 30px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    box-shadow: 0 2px 5px rgba(0,0,0,0.3); 
    font-size: 18px;
    box-sizing: content-box; 
  ">🚒</div>`,
  iconSize: [34, 34],   // Width (30) + Border (4)
  iconAnchor: [17, 17], // Center (17)
  popupAnchor: [0, -20]
});

// 🛠️ BASEMAP COMPONENT
export function BaseMap({ style }) {
    const map = useMap();
    const layerRef = useRef(null);

    useEffect(() => {
        const cleanup = () => {
            if (layerRef.current) {
                try {
                    if (map.hasLayer(layerRef.current)) {
                        map.removeLayer(layerRef.current);
                    }
                } catch (error) {
                    console.warn("Suppressed Esri layer cleanup error:", error);
                }
                layerRef.current = null;
            }
        };

        cleanup();

        try {
            const config = BASE_LAYERS[style];
            const layer = vectorBasemapLayer(config.id, {
                apikey: API_KEY,
                token: API_KEY
            });

            if (layer) {
                layer.addTo(map);
                layerRef.current = layer;
            }
        } catch (err) {
            console.error("Esri Basemap Init Error:", err);
        }

        return cleanup;
    }, [map, style]);

    return null; 
}

// 🏗️ COQUITLAM ROADS/PARCELS
export function CoquitlamOverlays({ visible }) {
    const map = useMap();
    useEffect(() => {
      if (!visible) return;
      
      const overlayLayer = dynamicMapLayer({
          url: "https://geodata.coquitlam.ca/arcgis/rest/services/DynamicServices/Cadastral/MapServer",
          opacity: 0.9,
          layers: [0, 1, 16], // Roads, Addresses, Parcels
          f: 'image'
      }).addTo(map);

      return () => { 
          map.removeLayer(overlayLayer);
      };
    }, [map, visible]);
    
    return null;
}

// 🚒 NEW: FIRE ZONES (Official GIS Layer)
// Updated to accept a 'pane' prop
export function FireZonesLayer({ visible, pane }) {
    const map = useMap();
    useEffect(() => {
      if (!visible) return;
      
      const layer = dynamicMapLayer({
          url: "https://geodata.coquitlam.ca/arcgis/rest/services/DynamicServices/Planning/MapServer",
          layers: [6], 
          opacity: 0.8,
          f: 'image',
          pane: pane || 'overlayPane' // 👈 THIS IS THE FIX
      }).addTo(map);

      return () => { 
          map.removeLayer(layer);
      };
    }, [map, visible, pane]); // Add pane to dependencies
    
    return null;
}

export function StationsLayer() {
    return (
        <>
            {STATIONS.map(stn => (
                <Marker key={stn.id} position={stn.coords} icon={stationIcon}>
                    <Tooltip direction="top" offset={[0, -15]} className="font-bold text-xs">{stn.name}</Tooltip>
                </Marker>
            ))}
        </>
    );
}