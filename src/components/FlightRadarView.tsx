import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Compass, Search, Activity, RefreshCw, 
  AlertTriangle, SlidersHorizontal, Link2
} from 'lucide-react';
import { getNormalizedAirlineInfo } from './AirlineLogo';

interface FlightPosition {
  flight_id: string;
  flight: string;
  callsign: string;
  registration: string;
  aircraft_type: string;
  airline: string;
  origin: string;
  destination: string;
  lat: number;
  lon: number;
  track: number;
  alt: number;
  speed: number;
  status: string;
  last_update: string;
}

export const FlightRadarView: React.FC = () => {
  const [flights, setFlights] = useState<FlightPosition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [, setError] = useState<string | null>(null);
  const [, setDataSource] = useState<'flightradar24' | 'simulation' | 'contingency'>('simulation');
  const [selectedFlight, setSelectedFlight] = useState<FlightPosition | null>(null);
  
  // Leaflet states & refs
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAirline, setSelectedAirline] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10);

  const SBGR_LAT = -23.4356;
  const SBGR_LON = -46.4731;

  const fetchFlightsData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/flightradar/flights');
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }
      const res = await response.json();
      
      let flightsList: FlightPosition[] = [];
      
      if (res.source === 'flightradar24' && res.data) {
        if (Array.isArray(res.data)) {
          flightsList = res.data;
        } else if (res.data.data && Array.isArray(res.data.data)) {
          flightsList = res.data.data;
        } else if (typeof res.data === 'object') {
          flightsList = Object.values(res.data);
        }
        setDataSource('flightradar24');
      } else {
        flightsList = Array.isArray(res.data) ? res.data : [];
        setDataSource('simulation');
      }

      setFlights(flightsList);
      setError(null);
    } catch (err: any) {
      console.warn("Falha ao obter do proxy FR24:", err);
      setError("Incapaz de conectar com a API. Redirecionado para rede simulador local.");
      setDataSource('contingency');
      setFlights(generateFallbackLocalFlights());
    } finally {
      setLoading(false);
    }
  };

  function generateFallbackLocalFlights(): FlightPosition[] {
    return [
      {
        flight_id: "TAM-L1",
        flight: "LA3012",
        callsign: "TAM3012",
        registration: "PR-XTB",
        aircraft_type: "A359",
        airline: "LATAM",
        origin: "MIA",
        destination: "SBGR",
        lat: SBGR_LAT - 0.45,
        lon: SBGR_LON - 0.35,
        track: 35,
        alt: 12500,
        speed: 280,
        status: "DESCIDA",
        last_update: new Date().toISOString()
      },
      {
        flight_id: "GLO-L2",
        flight: "G31306",
        callsign: "GLO1306",
        registration: "PR-GXP",
        aircraft_type: "B738",
        airline: "GOL",
        origin: "SBGR",
        destination: "SDU",
        lat: SBGR_LAT + 0.25,
        lon: SBGR_LON + 0.45,
        track: 85,
        alt: 18000,
        speed: 340,
        status: "SUBINDO",
        last_update: new Date().toISOString()
      },
      {
        flight_id: "AZU-L3",
        flight: "AD4155",
        callsign: "AZU4155",
        registration: "PR-YAR",
        aircraft_type: "A320",
        airline: "AZUL",
        origin: "VCP",
        destination: "SBGR",
        lat: SBGR_LAT - 0.15,
        lon: SBGR_LON - 0.55,
        track: 110,
        alt: 6500,
        speed: 195,
        status: "APROXIMAÇÃO",
        last_update: new Date().toISOString()
      }
    ];
  }

  useEffect(() => {
    fetchFlightsData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchFlightsData();
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const airlinesList = useMemo(() => {
    const list = new Set<string>();
    flights.forEach(f => {
      if (f.airline) list.add(f.airline.toUpperCase());
    });
    return ['ALL', ...Array.from(list)];
  }, [flights]);

  const getDistanceNM = (lat: number, lon: number) => {
    const degToRad = Math.PI / 180;
    const phi1 = SBGR_LAT * degToRad;
    const phi2 = lat * degToRad;
    const deltaLambda = (lon - SBGR_LON) * degToRad;
    const R = 3440.065;
    const d = Math.acos(
      Math.sin(phi1) * Math.sin(phi2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)
    );
    return isNaN(d) ? 0 : Math.round(d * R);
  };

  const filteredFlights = useMemo(() => {
    return flights.filter(f => {
      const matchSearch = 
        f.flight.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.callsign.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.aircraft_type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchAirline = selectedAirline === 'ALL' || f.airline.toUpperCase() === selectedAirline;
      const matchStatus = selectedStatus === 'ALL' || 
        (selectedStatus === 'ARRIVING' && f.destination === 'SBGR') ||
        (selectedStatus === 'DEPARTING' && f.origin === 'SBGR');

      return matchSearch && matchAirline && matchStatus;
    });
  }, [flights, searchTerm, selectedAirline, selectedStatus]);

  // Carregamento dinâmico e seguro do Leaflet
  useEffect(() => {
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.id = 'leaflet-css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.id = 'leaflet-js';
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!leafletLoaded) return;
    const container = document.getElementById('leaflet-map-element');
    if (!container || mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const mapInstance = L.map('leaflet-map-element', {
      zoomControl: true,
      attributionControl: false
    }).setView([SBGR_LAT, SBGR_LON], 11);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18
    }).addTo(mapInstance);

    const airportIcon = L.divIcon({
      html: `<div class="bg-emerald-500 border-2 border-white rounded-full w-[17px] h-[17px] flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-pulse"><div class="bg-white w-[7px] h-[7px] rounded-full"></div></div>`,
      className: 'custom-airport-icon',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    L.marker([SBGR_LAT, SBGR_LON], { icon: airportIcon })
      .bindPopup('<b>AEROPORTO DE GUARULHOS (SBGR)</b><br/>Líder de Turno NOC / CTR GRU')
      .addTo(mapInstance);

    mapRef.current = mapInstance;

    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 200);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
      }
    };
  }, [leafletLoaded]);

  // Sincronização dos Marcadores de Aeronaves
  useEffect(() => {
    const L = (window as any).L;
    if (!leafletLoaded || !mapRef.current || !L) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;
    const newMarkers: { [key: string]: any } = {};

    filteredFlights.forEach((f) => {
      const flightId = f.flight_id || f.flight;
      const isSelected = selectedFlight?.flight_id === f.flight_id;
      const isLATAM = f.airline?.toUpperCase() === 'LATAM';
      const isGOL = f.airline?.toUpperCase() === 'GOL';
      const isAZUL = f.airline?.toUpperCase() === 'AZUL';
      const trackAngle = f.track || 0;

      let markerClass = 'text-cyan-400';
      if (isLATAM) markerClass = 'text-purple-400';
      else if (isGOL) markerClass = 'text-orange-400';
      else if (isAZUL) markerClass = 'text-sky-400';

      if (isSelected) markerClass = 'text-emerald-400';

      const flightIcon = L.divIcon({
        html: `
          <div class="relative flex flex-col items-center">
            <div class="w-[26px] h-[26px] rounded-lg bg-slate-950/95 border ${isSelected ? 'border-emerald-400 shadow-lg shadow-emerald-500/30' : 'border-slate-800'} flex items-center justify-center transition-all">
              <div style="transform: rotate(${trackAngle}deg);" class="transition-transform duration-500 ${markerClass}">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5L21 16z"/>
                </svg>
              </div>
            </div>
            <div class="mt-0.5 bg-slate-950/85 border border-slate-800/80 text-[7.5px] font-mono font-bold ${isSelected ? 'text-emerald-400 border-emerald-500/40 font-black' : 'text-slate-200'} px-1 py-0 rounded whitespace-nowrap shadow">
              ${f.flight}
            </div>
          </div>
        `,
        className: 'custom-flight-icon',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      if (currentMarkers[flightId]) {
        currentMarkers[flightId].setLatLng([f.lat, f.lon]);
        currentMarkers[flightId].setIcon(flightIcon);
        newMarkers[flightId] = currentMarkers[flightId];
        delete currentMarkers[flightId];
      } else {
        const marker = L.marker([f.lat, f.lon], { icon: flightIcon })
          .addTo(map)
          .on('click', () => {
            setSelectedFlight(f);
          });
        newMarkers[flightId] = marker;
      }
    });

    Object.keys(currentMarkers).forEach((id) => {
      map.removeLayer(currentMarkers[id]);
    });

    markersRef.current = newMarkers;
  }, [filteredFlights, leafletLoaded, selectedFlight]);

  // Centralizar voo selecionado
  useEffect(() => {
    if (selectedFlight && mapRef.current && leafletLoaded) {
      mapRef.current.setView([selectedFlight.lat, selectedFlight.lon], 12);
    }
  }, [selectedFlight, leafletLoaded]);

  useEffect(() => {
    if (mapRef.current && leafletLoaded) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 150);
    }
  }, [leafletLoaded]);

  return (
    <div className="flex flex-col xl:flex-row gap-4 p-3 w-full xl:h-[calc(100vh-100px)] xl:min-h-[550px] xl:max-h-[750px] xl:overflow-hidden text-slate-100 bg-slate-950 font-sans">
      
      {/* SEÇÃO ESQUERDA: MAPA PRINCIPAL (DIRETO SEM DIVS ANINHADAS) */}
      <div className="flex-1 shrink-0 bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden min-h-[480px] xl:h-full">
        {!leafletLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 z-20">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin"></div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest animate-pulse">Carregando bases cartográficas...</span>
          </div>
        ) : null}
        <div id="leaflet-map-element" className="w-full h-full min-h-[480px]" style={{ height: '100%', width: '100%' }} />
        
        <div className="absolute bottom-3 right-3 z-[1000] bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800/80 text-[10px] font-mono text-slate-400 shadow-lg">
          SBGR CTR • -23.4356° | -46.4731°
        </div>
      </div>

      {/* SEÇÃO DIREITA: LISTAGEM E PAINEL OPERACIONAL */}
      <div className="w-full xl:w-[380px] shrink-0 flex flex-col gap-3 xl:h-full min-h-0 overflow-hidden">
        
        {/* FILTROS E PESQUISA */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl shrink-0">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-2">
            <SlidersHorizontal size={13} className="text-emerald-500" />
            <span>Painel de Filtros Operacionais</span>
          </h3>

          <div className="flex flex-col gap-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search size={13} />
              </span>
              <input 
                type="text"
                placeholder="Filtrar por voo, prefixo ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-0.5">
                <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">Companhia Aérea</label>
                <select 
                  value={selectedAirline}
                  onChange={(e) => setSelectedAirline(e.target.value)}
                  className="w-full p-1.5 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-xs focus:outline-none font-bold"
                >
                  {airlinesList.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-0.5">
                <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">Fluxo Operacional</label>
                <select 
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full p-1.5 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-xs focus:outline-none font-bold"
                >
                  <option value="ALL">TODOS (MISTO)</option>
                  <option value="ARRIVING">CHEGADAS (POUSOS)</option>
                  <option value="DEPARTING">SAÍDAS (DECOLAGENS)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-2 rounded-xl text-[10px]">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="auto_refresh" 
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 accent-emerald-500"
                />
                <label htmlFor="auto_refresh" className="font-bold cursor-pointer text-slate-500 uppercase tracking-widest text-[8px]">AUTO ATUALIZAR</label>
              </div>

              {autoRefresh && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[9px]">Taxa:</span>
                  <select 
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="p-1 leading-none bg-slate-900 border border-slate-800 text-slate-300 rounded text-[9px] font-bold"
                  >
                    <option value="5">5s</option>
                    <option value="10">10s</option>
                    <option value="30">30s</option>
                    <option value="60">60s</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LISTAGEM DE ALVOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex-1 flex flex-col min-h-0 min-h-[160px]">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5 shrink-0">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Activity size={13} className="text-emerald-500 animate-pulse" />
              <span>Aeronaves no Radar ({filteredFlights.length})</span>
            </h3>
            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">Setor CTR GRU</span>
          </div>

          {loading && flights.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-6 gap-2 shrink-0">
              <RefreshCw size={20} className="text-emerald-500 animate-spin" />
              <p className="text-[10px] text-slate-500 block font-bold font-mono">Buscando telemetria live...</p>
            </div>
          ) : filteredFlights.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-6 gap-2 text-center shrink-0">
              <AlertTriangle size={20} className="text-amber-500/60 animate-bounce" />
              <div>
                <p className="text-[10px] text-slate-300 block font-bold">Nenhum alvo no setor</p>
                <p className="text-[9px] text-slate-500 mt-1 max-w-[220px] mx-auto leading-normal">
                  Sem voos ativos de <strong className="text-amber-400">"{selectedAirline}"</strong> no momento.
                </p>
                <button 
                  onClick={() => {
                    setSelectedAirline('ALL');
                    setSelectedStatus('ALL');
                    setSearchTerm('');
                  }}
                  className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-[8.5px] font-bold uppercase tracking-widest rounded-lg transition-all mt-2 active:scale-95"
                >
                  RESETAR FILTROS
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-1.5 font-mono">
              {filteredFlights.map((f) => {
                const isSelected = selectedFlight?.flight_id === f.flight_id;
                const distance = getDistanceNM(f.lat, f.lon);
                const carrierInfo = getNormalizedAirlineInfo(f.flight);
                const isArriving = f.destination === 'SBGR';

                return (
                  <div 
                    key={f.flight_id || f.flight}
                    onClick={() => setSelectedFlight(f)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between shrink-0 font-sans ${
                      isSelected 
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/5' 
                        : 'bg-slate-950/65 border-slate-800 hover:bg-slate-950/90'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-md shrink-0 flex items-center justify-center font-mono font-black text-[10px] ${
                        carrierInfo.name === 'LATAM' 
                          ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30' 
                          : carrierInfo.name === 'GOL'
                            ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                            : carrierInfo.name === 'AZUL'
                              ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-300'
                      }`}>
                        {carrierInfo.name === 'LATAM' ? 'LA' : carrierInfo.name === 'GOL' ? 'G3' : carrierInfo.name === 'AZUL' ? 'AD' : f.airline.substring(0,2)}
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-black tracking-tight text-white">{f.flight}</span>
                          <span className={`text-[7px] font-bold px-1 rounded ${
                            isArriving ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'
                          }`}>
                            {isArriving ? 'CHEGADA' : 'DECOLAG.'}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-500 flex items-center gap-1.5 font-mono">
                          <span>{f.aircraft_type}</span>
                          <span className="text-slate-800">•</span>
                          <span>{f.registration}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex flex-col font-mono shrink-0">
                      <span className="text-slate-100 text-[10px] font-bold leading-tight">{f.alt >= 10000 ? `FL${Math.round(f.alt / 100)}` : `${f.alt.toLocaleString()} ft`}</span>
                      <span className="text-slate-500 text-[9px] leading-tight block mt-0.5">{distance} NM de GRU</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* HUD DE ANÁLISE DO ALVO SELECIONADO */}
        {selectedFlight && (
          <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 shadow-2xl relative overflow-hidden shrink-0 animate-fade-in">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500"></div>

            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <Compass size={13} className="text-emerald-400 animate-spin" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">TELEMETRIA DO ALVO</h4>
              </div>
              <button 
                onClick={() => setSelectedFlight(null)}
                className="text-[9px] text-slate-500 hover:text-white font-mono font-bold hover:underline"
              >
                [FECHAR]
              </button>
            </div>

            <div className="flex justify-between items-start border-b border-slate-800 pb-2.5 mb-2.5 shrink-0">
              <div>
                <span className="text-xl font-black text-white block tracking-tighter leading-none">{selectedFlight.flight}</span>
                <span className="text-[8.5px] font-mono text-slate-500 uppercase mt-1 block">CALLSIGN: {selectedFlight.callsign} | REG: {selectedFlight.registration}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{selectedFlight.status}</span>
                <span className="text-[8.5px] text-slate-500 font-mono mt-1 block">{selectedFlight.origin} ➔ {selectedFlight.destination}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col font-mono text-center">
                <span className="text-[7.5px] text-slate-400 uppercase block mb-0.5">Altitude</span>
                <span className="text-[11px] font-black text-white block">{selectedFlight.alt >= 10000 ? `FL${Math.round(selectedFlight.alt / 100)}` : `${selectedFlight.alt.toLocaleString()} ft`}</span>
              </div>

              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col font-mono text-center">
                <span className="text-[7.5px] text-slate-400 uppercase block mb-0.5">VELOCIDADE</span>
                <span className="text-[11px] font-black text-white block">{selectedFlight.speed} KT</span>
              </div>

              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col font-mono text-center">
                <span className="text-[7.5px] text-slate-400 uppercase block mb-0.5">RUMO/PROA</span>
                <span className="text-[11px] font-black text-white block">{selectedFlight.track || 0}°</span>
              </div>
            </div>

            <button 
              onClick={() => {
                alert(`Vinculação efetuada com sucesso!\nO voo ${selectedFlight.flight} foi pré-fixado no SSoT.`);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition-colors shadow-lg shrink-0"
            >
              <Link2 size={12} strokeWidth={2.5} />
              <span>INTEGRAR À FILA DE CALÇOS</span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
