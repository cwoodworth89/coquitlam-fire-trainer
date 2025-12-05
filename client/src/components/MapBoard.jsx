import React, { useEffect, useState } from 'react';
import { MapContainer, Polygon, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
import L from 'leaflet';

// Import from your other components
// Ensure these files exist and are in the same folder, or adjust path
import { BASE_LAYERS, MODE_DEFAULTS, BaseMap, CoquitlamOverlays, StationsLayer } from './MapLayers';
import { MapClickEvents, SmartZoom, ZoomToFeedback } from './MapActions';
import { Header, Sidebar, UNIT_COLORS } from './GameHUD';

// ⚠️ THIS IS THE CRITICAL PART: "export default"
export default function MapBoard() {
  const [map, setMap] = useState(null);

  // DATA STATE
  const [zones, setZones] = useState([]);
  const [intersections, setIntersections] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [addresses, setAddresses] = useState([]);
  
  // GAME STATE
  const [gameMode, setGameMode] = useState("EXPLORE"); 
  const [mapStyle, setMapStyle] = useState("GREY"); 
  const [showLabels, setShowLabels] = useState(false); 
  
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  
  const [userGuess, setUserGuess] = useState(null);
  const [distanceOff, setDistanceOff] = useState(0); 
  const [clickedBlockData, setClickedBlockData] = useState(null);

  // LOAD DATA (Ensure these files exist in your /public/data/ folder)
  useEffect(() => {
    fetch('/data/zones.json?v=2').then(r => r.json()).then(setZones).catch(e => console.error("Missing zones.json", e));
    fetch('/data/intersections.json?v=1').then(r => r.json()).then(setIntersections).catch(e => console.error("Missing intersections.json", e));
    fetch('/data/blocks.json?v=2').then(r => r.json()).then(setBlocks).catch(e => console.error("Missing blocks.json", e));
    fetch('/data/addresses.json?v=2').then(r => r.json()).then(setAddresses).catch(e => console.error("Missing addresses.json", e));
  }, []);

  // --- CONTROLLER LOGIC ---
  const startMode = (mode) => {
      setGameMode(mode);
      setScore(0);
      setFeedback(null);
      setUserGuess(null);
      setMapStyle(MODE_DEFAULTS[mode]); 
      
      if (mode === "QUIZ_ADDRESSES") {
          setShowLabels(true); 
      } else if (mode === "QUIZ_INTERSECTIONS") {
          setShowLabels(false); 
      } else {
          setShowLabels(true); 
      }
      
      if (mode === "QUIZ_ZONES") nextQuestion(zones);
      if (mode === "QUIZ_INTERSECTIONS") nextQuestion(intersections);
      if (mode === "QUIZ_BLOCKS") nextBlockQuestion();
      if (mode === "QUIZ_ADDRESSES") nextQuestion(addresses);
  };

  const nextQuestion = (dataset) => {
      if (!dataset || dataset.length === 0) return;
      setCurrentQuestion(dataset[Math.floor(Math.random() * dataset.length)]);
      setFeedback(null);
      setUserGuess(null);
  };

  const nextBlockQuestion = () => {
    if (!blocks || blocks.length === 0) return;
    const valid = blocks.filter(b => b.block > 0);
    setCurrentQuestion(valid[Math.floor(Math.random() * valid.length)]);
    setFeedback(null);
    setClickedBlockData(null);
  };

  // --- HANDLERS ---
  const handleZoneGuess = (unitId) => {
    if (unitId === currentQuestion.unit_id) { setFeedback("CORRECT"); setScore(s => s + 1); setTimeout(() => nextQuestion(zones), 1000); } 
    else { setFeedback("WRONG"); }
  };

  const handleMapClick = (latlng) => {
    if ((gameMode !== "QUIZ_INTERSECTIONS" && gameMode !== "QUIZ_ADDRESSES") || feedback) return;
    setUserGuess(latlng);
    
    const from = turf.point([latlng.lng, latlng.lat]);
    const to = turf.point([currentQuestion.lng, currentQuestion.lat]);
    let distMeters = Math.round(turf.distance(from, to, { units: 'kilometers' }) * 1000);
    
    const tolerance = gameMode === "QUIZ_ADDRESSES" ? 15 : 50;
    if (distMeters <= tolerance) distMeters = 0;
    
    setDistanceOff(distMeters);
    const points = Math.max(0, 500 - distMeters);
    setScore(s => s + points);
    setFeedback(distMeters === 0 ? "PERFECT" : points > 0 ? "OKAY" : "MISS");
  };

  const handleBlockClick = (blockData) => {
    if (gameMode !== "QUIZ_BLOCKS" || feedback) return;
    setClickedBlockData(blockData);
    const diff = Math.abs(currentQuestion.block - blockData.block);
    if (diff === 0) { setFeedback("PERFECT"); setScore(s => s + 1); setTimeout(nextBlockQuestion, 1500); }
    else { setFeedback("WRONG"); setDistanceOff(diff); }
  };

  // --- RENDER HELPERS ---
  const getBlockStyle = (block) => {
    if (!feedback) return { color: mapStyle === "ORTHO" ? "#38bdf8" : "#64748b", weight: 8, opacity: 0.9 }; 
    const isTarget = block.block === currentQuestion.block;
    const isClicked = clickedBlockData && block.block === clickedBlockData.block;
    if (isTarget) return { color: "#22c55e", weight: 14, opacity: 1 }; 
    if (isClicked) return { color: "#ef4444", weight: 14, opacity: 1 }; 
    return { color: "#94a3b8", weight: 4, opacity: 0.2 }; 
  };

  const getZoneStyle = (zone) => {
    if (gameMode === "EXPLORE") {
        return { color: UNIT_COLORS[zone.unit_id], fillOpacity: 0.4, weight: 1 };
    }
    if (gameMode === "QUIZ_ZONES") {
        if (currentQuestion && zone.zone_id === currentQuestion.zone_id) {
            return { color: "#06b6d4", fillOpacity: 0.6, weight: 4 }; 
        }
        return { color: "#475569", fillOpacity: 0.1, weight: 1 }; 
    }
    return { color: "#475569", fillOpacity: 0.05, weight: 1 };
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 overflow-hidden">
      
      <Header 
        gameMode={gameMode} score={score} mapStyle={mapStyle} setMapStyle={setMapStyle} 
        startMode={startMode} toggleBlocks={setShowLabels} showBlocks={showLabels} 
      />

      <div className="flex-grow relative">
        <MapContainer 
            center={[49.28, -122.80]} 
            zoom={12} 
            style={{ height: "100%", width: "100%" }} 
            className="bg-slate-900" zoomControl={false} maxZoom={22} ref={setMap}
        >
          {/* LAYERS */}
          <BaseMap style={mapStyle} />
          
          <CoquitlamOverlays visible={showLabels} />
          
          <StationsLayer />
          <MapClickEvents onMapClick={handleMapClick} />
          
          {/* HELPERS */}
          {!feedback && currentQuestion && (
             <SmartZoom target={currentQuestion} mode={gameMode} allBlocks={blocks} allZones={zones} />
          )}
          {feedback === "WRONG" && gameMode === "QUIZ_BLOCKS" && clickedBlockData && (
             <ZoomToFeedback guessBlock={clickedBlockData} targetBlock={blocks.find(b => b.block === currentQuestion.block && b.street === currentQuestion.street)} mode={gameMode} />
          )}

          {/* GAME VISUALS: ZONES */}
          {(gameMode === "EXPLORE" || gameMode === "QUIZ_ZONES") && zones.map((zone) => (
            <Polygon 
                key={zone.zone_id} 
                positions={zone.geometry.coordinates[0].map(c => [c[1], c[0]])} 
                pathOptions={getZoneStyle(zone)} 
            />
          ))}

          {/* GAME VISUALS: BLOCKS */}
          {gameMode === "QUIZ_BLOCKS" && currentQuestion && blocks && blocks.length > 0 && 
            blocks.filter(b => b.street === currentQuestion.street).map((block, i) => (
                <Polyline 
                    key={`${block.street}-${block.block}-${i}`} 
                    positions={block.coordinates} 
                    eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); handleBlockClick(block); } }} 
                    pathOptions={getBlockStyle(block)}
                >
                    <Tooltip sticky direction="top" className="font-bold text-xs bg-slate-900 text-white border-0">{feedback ? `Block ${block.block}` : "Block ???"}</Tooltip>
                </Polyline>
          ))}

          {/* GAME VISUALS: PINS */}
          {(gameMode === "QUIZ_INTERSECTIONS" || gameMode === "QUIZ_ADDRESSES") && userGuess && (
             <>
                <CircleMarker center={userGuess} radius={6} pathOptions={{ color: "white", fillColor: feedback === "PERFECT" ? "#22c55e" : "#ef4444", fillOpacity: 1, weight: 2 }} />
                {feedback !== "PERFECT" && (
                    <>
                        <CircleMarker center={[currentQuestion.lat, currentQuestion.lng]} radius={6} pathOptions={{ color: "white", fillColor: "#22c55e", fillOpacity: 1, weight: 2 }} />
                        <Polyline positions={[userGuess, [currentQuestion.lat, currentQuestion.lng]]} pathOptions={{ color: "#ef4444", dashArray: '10, 10', weight: 2, opacity: 0.8 }} />
                    </>
                )}
             </>
          )}
        </MapContainer>

        {/* SIDEBAR */}
        <Sidebar 
            gameMode={gameMode} currentQuestion={currentQuestion} feedback={feedback} 
            distanceOff={distanceOff} clickedBlockData={clickedBlockData} map={map}
            onNext={() => {
                if(gameMode === "QUIZ_ZONES") nextQuestion(zones);
                if(gameMode === "QUIZ_INTERSECTIONS") nextQuestion(intersections);
                if(gameMode === "QUIZ_BLOCKS") nextBlockQuestion();
                if(gameMode === "QUIZ_ADDRESSES") nextQuestion(addresses);
            }} 
            onZoneGuess={handleZoneGuess}
        />

      </div>
    </div>
  );
}