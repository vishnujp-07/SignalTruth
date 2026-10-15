import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Activity, MapPin, Search, LocateFixed, Wifi, Gauge, ShieldCheck, Info, Signal, Layers3, ChevronDown } from 'lucide-react';

type Place = { lat: number; lon: number; label: string };
type Zone = { lat: number; lon: number; color: string; radius: number; label: string; quality: string };
const demoZones: Zone[] = [
  {lat:12.9716,lon:77.5946,color:'#47ef54',radius:650,label:'Central area',quality:'High reliability'},
  {lat:12.978,lon:77.606,color:'#f6ef20',radius:500,label:'East district',quality:'Moderate reliability'},
  {lat:12.961,lon:77.581,color:'#ff9c16',radius:430,label:'South-west area',quality:'Weak reliability'},
  {lat:12.989,lon:77.574,color:'#ff302d',radius:360,label:'North-west area',quality:'Very poor reliability'},
  {lat:12.951,lon:77.608,color:'#49ed4d',radius:560,label:'South-east area',quality:'High reliability'},
  {lat:12.998,lon:77.601,color:'#ffb21c',radius:470,label:'Outer area',quality:'Weak reliability'},
  {lat:12.965,lon:77.617,color:'#f4ef25',radius:350,label:'East side',quality:'Moderate reliability'},
  {lat:12.943,lon:77.59,color:'#ff302d',radius:310,label:'Southern pocket',quality:'Very poor reliability'},
];
const pin = new L.DivIcon({className:'tower-pin', html:'<div class="tower-ring"><span>⌁</span></div>', iconSize:[36,36], iconAnchor:[18,18]});
function Recenter({place}:{place:Place}) { const map=useMap(); useEffect(()=>{map.flyTo([place.lat,place.lon],13,{duration:1.1});},[place,map]); return null; }
function ZoomWatcher({onZoom}:{onZoom:(zoom:number)=>void}) {
  const map=useMap();
  useEffect(()=>{const update=()=>onZoom(map.getZoom()); update(); map.on('zoomend',update); return ()=>{map.off('zoomend',update);};},[map,onZoom]);
  return null;
}
// Fine-grained illustrative cells appear at closer zoom levels; they are not live data.
function makeFineZones(place:Place): Zone[] {
  const cells:Zone[]=[];
  const colors=['#47ef54','#47ef54','#f6ef20','#ff9c16','#ff302d','#f6ef20','#47ef54'];
  for(let row=-9;row<=9;row++) for(let col=-10;col<=10;col++) {
    const n=Math.abs((row*17+col*31+row*col*7)%19); if(n<3) continue;
    const color=colors[Math.abs(row*13+col*7+row*col)%colors.length];
    cells.push({lat:place.lat+row*0.00075,lon:place.lon+col*0.00085,color,radius:24,label:'Detailed demo patch',quality:color==='#47ef54'?'High reliability':color==='#f6ef20'?'Moderate reliability':color==='#ff9c16'?'Weak reliability':'Very poor reliability'});
  }
  return cells;
}
export default function App(){
  const [query,setQuery]=useState('Bengaluru, Karnataka');
  const [place,setPlace]=useState<Place>({lat:12.9716,lon:77.5946,label:'Bengaluru, Karnataka'});
  const [status,setStatus]=useState('Showing illustrative demo layer');
  const [searching,setSearching]=useState(false);
  const [selectedTask,setSelectedTask]=useState('Online exams');
  const [showZones,setShowZones]=useState(true);
  const [zoomLevel,setZoomLevel]=useState(13);
  const [selectedZone,setSelectedZone]=useState<Zone|null>(null);
  const [testResult,setTestResult]=useState<{download:number;upload:number;latency:number}|null>(null);
  async function searchLocation(){
    if(!query.trim())return; setSearching(true); setStatus('Searching for location…');
    try { const response=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`); const results=await response.json();
      if(!results.length) {setStatus('Location not found. Try a city, town, or address.');return;}
      const p={lat:Number(results[0].lat),lon:Number(results[0].lon),label:results[0].display_name.split(',').slice(0,3).join(',')}; setPlace(p); setStatus('Location found · map moved to selected area'); setSelectedZone(null);
    } catch {setStatus('Could not search right now. Check your internet connection.');} finally {setSearching(false);}
  }
  function useMyLocation(){ if(!navigator.geolocation){setStatus('Location is not supported by this browser.');return;} setStatus('Requesting location permission…'); navigator.geolocation.getCurrentPosition(pos=>{const p={lat:pos.coords.latitude,lon:pos.coords.longitude,label:'Your current location'};setPlace(p);setQuery('My current location');setStatus('Showing your location · demo overlay only');},()=>setStatus('Location permission was unavailable. Search for a place instead.'),{enableHighAccuracy:true,timeout:10000}); }
  async function runTest(){setStatus('Testing your current internet connection…');setTestResult(null);const start=performance.now();try{await fetch('https://www.google.com/favicon.ico?signaltruth='+Date.now(),{mode:'no-cors',cache:'no-store'});const latency=Math.round(performance.now()-start);setTestResult({download:0,upload:0,latency});setStatus('Basic browser reachability check completed. Speed values require a dedicated test endpoint.');}catch{setStatus('Test request failed. Check your connection and try again.');}}
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark"><Signal size={22}/></span><span><strong>SignalTruth</strong><small>REAL CONNECTIVITY, REAL LIFE</small></span></a><nav><a className="active" href="#map">Connectivity map</a><a href="#how">How it works</a></nav><div className="header-right"><span className="live-dot"/> <span>Evidence-first mapping</span></div></header>
    <main id="top"><section className="intro"><div><div className="eyebrow"><span/> LOCAL CONNECTIVITY INTELLIGENCE</div><h1>Know your connection.<br/><em>Know your location.</em></h1><p>Explore how reliable internet may be across your area — beyond the signal bars.</p></div><div className="intro-note"><ShieldCheck size={18}/><span><b>Evidence matters</b><small>Demo heatmap is illustrative, not live network data.</small></span></div></section>
    <section className="search-panel"><div className="search-label"><MapPin size={16}/> <span>EXPLORE A LOCATION</span></div><div className="search-row"><div className="search-box"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchLocation()} placeholder="Enter a city, town, village or address"/><button onClick={searchLocation} disabled={searching}>{searching?'Searching…':'Search location'}</button></div><button className="location-btn" onClick={useMyLocation}><LocateFixed size={17}/> Use my location</button></div><div className="search-foot"><span className="place-label"><MapPin size={13}/>{place.label}</span><span>{status}</span></div></section>
    <section className="workspace" id="map"><div className="map-heading"><div><div className="section-kicker">LOCATION VIEW</div><h2>Connectivity reliability map</h2><p>Zoom in to reveal finer illustrative connectivity patches; select a zone for details.</p></div><button className={`layer-toggle ${showZones?'on':''}`} onClick={()=>setShowZones(v=>!v)}><Layers3 size={16}/>{showZones?'Heatmap on':'Heatmap off'}<ChevronDown size={14}/></button></div>
      <div className="map-frame"><MapContainer center={[place.lat,place.lon]} zoom={13} scrollWheelZoom className="leaflet-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Recenter place={place}/><ZoomWatcher onZoom={setZoomLevel}/>{showZones&&zoomLevel>=15&&makeFineZones(place).map((z,i)=><Circle key={`fine-${i}`} center={[z.lat,z.lon]} radius={z.radius} pathOptions={{color:z.color,fillColor:z.color,fillOpacity:.62,weight:.4,opacity:.55}} eventHandlers={{click:()=>setSelectedZone(z)}}><Popup><b>{z.quality}</b><br/><small>Fine-grained illustrative demo patch — not measured data</small></Popup></Circle>)}{showZones&&demoZones.map((z,i)=><Circle key={i} center={[place.lat+(z.lat-12.9716),place.lon+(z.lon-77.5946)]} radius={z.radius} pathOptions={{color:z.color,fillColor:z.color,fillOpacity:.36,weight:1,opacity:.65}} eventHandlers={{click:()=>setSelectedZone(z)}}><Popup><b>{z.label}</b><br/>{z.quality}<br/><small>Illustrative demo zone — not measured data</small></Popup></Circle>)}{[[-.012,-.012],[.014,.012],[-.006,.021],[.021,-.02]].map((offset,i)=><Marker key={i} position={[place.lat+offset[0],place.lon+offset[1]]} icon={pin}><Popup>Illustrative infrastructure marker<br/><small>No tower or carrier data is being claimed.</small></Popup></Marker>)}<Marker position={[place.lat,place.lon]}><Popup><b>{place.label}</b><br/>Selected search location</Popup></Marker></MapContainer>
        <div className="map-badge"><span className="pulse"/> INTERACTIVE MAP <span className="badge-divider"/> {zoomLevel>=15?'DETAILED DEMO LAYER':'DEMO LAYER'}</div><div className="legend"><div className="legend-title">RELIABILITY KEY <span>Illustrative</span></div><div className="legend-row"><i className="green"/>High reliability</div><div className="legend-row"><i className="yellow"/>Moderate reliability</div><div className="legend-row"><i className="orange"/>Weak reliability</div><div className="legend-row"><i className="red"/>Very poor reliability</div><div className="legend-row"><i className="grey"/>Insufficient data</div></div><div className="map-zoom-hint">Scroll to zoom · drag to explore · {zoomLevel>=15?'Detailed demo patches visible':'Zoom in for finer map detail'}</div></div>
      <div className="map-caption"><Info size={15}/><span><b>Demo mode:</b> Colored areas are sample visuals to demonstrate the interface. They are not actual measured connectivity results. Real coverage should appear only after valid tests and location-consented observations.</span></div>
      {selectedZone&&<div className="selected-zone"><div><span className="section-kicker">SELECTED DEMO ZONE</span><h3>{selectedZone.label}</h3><p>{selectedZone.quality}</p></div><button onClick={()=>setSelectedZone(null)}>Clear selection</button></div>}
    </section>
    <section className="below-grid"><div className="card task-card"><div className="card-top"><div className="icon-tile"><Gauge size={19}/></div><div><h3>What do you need internet for?</h3><p>Explore suitability by activity</p></div></div><div className="task-options">{['Online exams','Video consultation','Remote work','Browsing'].map(task=><button key={task} onClick={()=>setSelectedTask(task)} className={selectedTask===task?'selected':''}>{task}</button>)}</div><div className="task-result"><div><span>SELECTED ACTIVITY</span><b>{selectedTask}</b></div><span className="demo-pill">Demo preview</span></div><p className="fine-print">A real suitability score needs measured latency, speed, stability, and activity-specific thresholds.</p></div>
      <div className="card test-card"><div className="card-top"><div className="icon-tile"><Activity size={19}/></div><div><h3>Quick connection check</h3><p>Basic browser reachability check</p></div></div><p className="test-description">Check whether a test request can reach an external service. This is not a full speed test.</p><button className="primary-btn" onClick={runTest}><Wifi size={17}/> Run connection check</button>{testResult&&<div className="latency-result"><span>Request round-trip estimate</span><strong>{testResult.latency} ms</strong></div>}</div></section>
    <section className="how-section" id="how"><div><div className="section-kicker">HOW IT WORKS</div><h2>From measurements to meaningful insight.</h2></div><div className="steps"><div><span>01</span><b>Measure</b><p>Collect valid speed, latency, and stability results.</p></div><div><span>02</span><b>Map</b><p>Associate results with consented, approximate locations.</p></div><div><span>03</span><b>Understand</b><p>Show task suitability, sample counts, and confidence.</p></div></div></section>
    </main><footer><div className="brand footer-brand"><span className="brand-mark"><Signal size={19}/></span><span><strong>SignalTruth</strong><small>REAL CONNECTIVITY, REAL LIFE</small></span></div><p>Built for clearer connectivity insights, including underserved areas.</p><span className="footer-tag">MEASURED EVIDENCE · CLEAR LIMITS · USER PRIVACY</span></footer>
  </div>
}
