import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Compass, Search, Activity, RefreshCw, 
  AlertTriangle, SlidersHorizontal, Link2
} from 'lucide-react';
import { getNormalizedAirlineInfo } from './AirlineLogo';
import { FlightRadarFlightCard } from './FlightRadarFlightCard';

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
      // EXCLUSIVIDADE DE POUSOS (SÓ MOSTRA CHEGADAS EM SBGR / GRU)
      const isArrival = f.destination === 'SBGR' || f.destination === 'GRU';
      if (!isArrival) return false;

      const matchSearch = 
        f.flight.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.callsign.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.aircraft_type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchAirline = selectedAirline === 'ALL' || f.airline.toUpperCase() === selectedAirline;

      return matchSearch && matchAirline;
    });
  }, [flights, searchTerm, selectedAirline]);

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
    <div className="flex flex-col lg:flex-row gap-4 p-3 w-full h-[calc(100vh-120px)] min-h-0 overflow-hidden text-slate-100 bg-slate-950 font-sans">
      
      {/* SEÇÃO ESQUERDA: MAPA PRINCIPAL (DIRETO SEM DIVS ANINHADAS) */}
      <div className="flex-1 shrink-0 bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden min-h-[300px] h-full">
        {!leafletLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 z-20">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin"></div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest animate-pulse">Carregando bases cartográficas...</span>
          </div>
        ) : null}
        <div id="leaflet-map-element" className="w-full h-full min-h-[300px]" style={{ height: '100%', width: '100%' }} />
        
        <div className="absolute bottom-3 right-3 z-[1000] bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800/80 text-[10px] font-mono text-slate-400 shadow-lg">
          SBGR CTR • -23.4356° | -46.4731°
        </div>
      </div>

      {/* SEÇÃO DIREITA: LISTAGEM E PAINEL OPERACIONAL (RESPONSIVIDADE INTELIGENTE COM ALTURA LIMITADA EM VIEWS COMPACTAS E SCROLLBAR OPERACIONAL) */}
      <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-3 h-[420px] max-h-[420px] lg:h-full lg:max-h-full overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-slate-700">
        
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
                <div className="w-full p-1.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-black uppercase tracking-widest text-center">
                  Somente Pousos
                </div>
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

        {/* CONTEÚDO PRINCIPAL: DETALHES DE TELEMETRIA OU AVISO DE SELEÇÃO */}
        {selectedFlight ? (
          <FlightRadarFlightCard 
            flight={selectedFlight}
            onClose={() => setSelectedFlight(null)}
            onIntegrate={(f) => {
              console.log("Integrado ao SSoT calços:", f);
            }}
          />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center flex-1 flex flex-col items-center justify-center gap-3 min-h-[240px] animate-fade-in shadow-xl">
            <Compass size={32} className="text-slate-600 animate-pulse animate-duration-1000" />
            <div>
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Nenhuma Aeronave Selecionada</p>
              <p className="text-[10px] text-slate-500 mt-1.5 max-w-[220px] mx-auto leading-normal">
                Clique em qualquer aeronave no mapa radar ou utilize a pesquisa para exibir a telemetria do voo ao vivo.
              </p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
