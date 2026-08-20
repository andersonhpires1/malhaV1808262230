import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Compass, Search, X, Plane, ChevronLeft
} from 'lucide-react';
import { FlightRadarFlightCard, formatMalhaFlightNumber } from './FlightRadarFlightCard';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  // Leaflet states & refs
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh] = useState(true);
  const [refreshInterval] = useState(10);

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

      const malhaCode = formatMalhaFlightNumber(f.flight, f.callsign, f.airline);

      return (
        f.flight.toLowerCase().includes(searchTerm.toLowerCase()) ||
        malhaCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.callsign.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.aircraft_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [flights, searchTerm]);

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
      zoomControl: false,
      attributionControl: false
    }).setView([SBGR_LAT, SBGR_LON], 11);

    // Zoom control estilizado no canto inferior esquerdo para não obstruir
    L.control.zoom({ position: 'bottomleft' }).addTo(mapInstance);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18
    }).addTo(mapInstance);

    const airportIcon = L.divIcon({
      html: `<div class="bg-emerald-500 border-2 border-white rounded-full w-[18px] h-[18px] flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-pulse"><div class="bg-white w-[7px] h-[7px] rounded-full"></div></div>`,
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
    }, 150);

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
      const flightId = f.flight_id || `${f.flight}-${f.registration}`;
      const isSelected = selectedFlight && (selectedFlight.flight_id === f.flight_id || selectedFlight.flight === f.flight);
      
      const malhaCode = formatMalhaFlightNumber(f.flight, f.callsign, f.airline);

      const flightIcon = L.divIcon({
        html: `
          <div class="relative flex flex-col items-center group cursor-pointer transition-transform duration-200 hover:scale-115">
            <div style="transform: rotate(${f.track}deg);" class="transition-transform duration-300 flex items-center justify-center">
              <div class="${isSelected ? 'text-amber-400 scale-120 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse' : 'text-emerald-400 hover:text-emerald-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]'} transition-all">
                <svg width="26" height="26" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M50 2 C47.5 2 45.5 5 45.5 11 L45.5 40 L8 60 L8 68 L45.5 56 L45.5 82 L33 90 L33 96 L50 92 L67 96 L67 90 L54.5 82 L54.5 56 L92 68 L92 60 L54.5 40 L54.5 11 C54.5 5 52.5 2 50 2 Z"/>
                </svg>
              </div>
            </div>
            <div class="mt-1 bg-slate-950/90 backdrop-blur-sm border border-slate-800/90 text-[8px] font-mono font-bold ${isSelected ? 'text-amber-400 border-amber-500/60 font-black scale-105 shadow-amber-500/20' : 'text-slate-200'} px-1.5 py-0.5 rounded-md shadow-lg whitespace-nowrap">
              ${malhaCode}
            </div>
          </div>
        `,
        className: 'custom-flight-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
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
            setIsSidebarOpen(true);
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

  // Redimensionamento automático do Leaflet ao expandir/recolher o sidebar
  useEffect(() => {
    if (mapRef.current && leafletLoaded) {
      const timer1 = setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 50);
      const timer2 = setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 250);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isSidebarOpen, leafletLoaded]);

  return (
    <div className="w-full h-full min-h-0 relative overflow-hidden bg-slate-950 text-slate-100 font-sans flex flex-row">
      
      {/* =========================================================================
          MAPA RADAR EM TELA CHEIA (100% DA ÁREA ÚTIL SEM BORDAS OU RODAPÉS VAZIOS)
          ========================================================================= */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        {!leafletLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 z-20">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin"></div>
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest animate-pulse">Carregando bases cartográficas radar...</span>
          </div>
        )}
        
        <div id="leaflet-map-element" className="w-full h-full" style={{ height: '100%', width: '100%' }} />

        {/* GATILHO COMPACTO E ELEGANTE NO TOPO DIREITO: ABRE O SIDEBAR SOB DEMANDA */}
        <div className="absolute top-4 right-4 z-[900]">
          <button
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl shadow-2xl backdrop-blur-md text-slate-200 hover:text-white transition-all group cursor-pointer"
            title={isSidebarOpen ? "Recolher painel" : "Abrir busca e lista de aeronaves"}
          >
            <Search size={14} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold font-sans">
              {isSidebarOpen ? 'Fechar Painel' : 'Buscar & Aeronaves'}
            </span>
            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-mono font-black">
              {filteredFlights.length}
            </span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SIDEBAR RETRÁTIL (DRAWER LATERAL SOB DEMANDA COM BUSCA E TELEMETRIA)
          ========================================================================= */}
      {isSidebarOpen && (
        <div className="w-full sm:w-[400px] lg:w-[430px] h-full shrink-0 bg-slate-950 border-l border-slate-800/90 shadow-2xl flex flex-col z-[1000] animate-in slide-in-from-right duration-200">
          
          {/* CABEÇALHO DO SIDEBAR */}
          <div className="p-3.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Plane size={15} />
              </div>
              <div>
                <h2 className="text-xs font-black tracking-wider text-slate-100 uppercase">Radar de Aproximação</h2>
                <p className="text-[10px] font-mono text-emerald-400 font-bold">SBGR • {filteredFlights.length} voos em aproximação</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setIsSidebarOpen(false);
                setSelectedFlight(null);
              }}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 rounded-lg transition-colors cursor-pointer"
              title="Recolher painel lateral"
            >
              <X size={16} />
            </button>
          </div>

          {/* FERRAMENTA DE BUSCA DENTRO DO SIDEBAR */}
          <div className="p-3 bg-slate-950 border-b border-slate-800/80 shrink-0">
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-500 pointer-events-none">
                <Search size={14} />
              </span>
              <input 
                type="text"
                placeholder="Buscar voo (ex: LA1234, PR-XTB, A320)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-mono"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                  title="Limpar busca"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* CORPO DO SIDEBAR: TELEMETRIA OU LISTA DE AERONAVES */}
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-slate-700 space-y-3">
            {selectedFlight ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedFlight(null)}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-emerald-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={13} />
                    <span>Voltar à lista de voos</span>
                  </button>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Telemetria ao Vivo</span>
                </div>

                <FlightRadarFlightCard 
                  flight={selectedFlight}
                  onClose={() => setSelectedFlight(null)}
                  onIntegrate={(f) => {
                    console.log("Integrado ao SSoT calços:", f);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  <span>Aeronaves em Aproximação</span>
                  <span className="text-[10px] font-mono text-slate-500">{filteredFlights.length} ativas</span>
                </div>

                {filteredFlights.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/50 border border-slate-800/80 rounded-2xl">
                    <Compass size={28} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-xs font-bold text-slate-300">Nenhum voo encontrado</p>
                    <p className="text-[10px] text-slate-500 mt-1">Tente ajustar os termos da pesquisa.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredFlights.map((f) => {
                      const malhaCode = formatMalhaFlightNumber(f.flight, f.callsign, f.airline);
                      const distNM = getDistanceNM(f.lat, f.lon);

                      return (
                        <div
                          key={f.flight_id || `${f.flight}-${f.registration}`}
                          onClick={() => {
                            setSelectedFlight(f);
                            if (mapRef.current) {
                              mapRef.current.setView([f.lat, f.lon], 12);
                            }
                          }}
                          className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/30 shrink-0">
                              <Plane size={15} style={{ transform: `rotate(${f.track}deg)` }} className="transition-transform duration-300" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black font-mono text-amber-400 tracking-tight">{malhaCode}</span>
                                <span className="text-[10px] font-mono text-slate-400">{f.registration}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                <span className="font-bold text-slate-300">{f.origin}</span>
                                <span>➔</span>
                                <span className="font-bold text-emerald-400">SBGR</span>
                                <span className="text-slate-600">•</span>
                                <span className="font-mono text-slate-400">{f.aircraft_type}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-mono font-black text-slate-200">{f.alt.toLocaleString()} <span className="text-[9px] text-slate-500 font-sans">ft</span></div>
                            <div className="text-[10px] font-mono text-emerald-400 font-bold">{distNM} <span className="text-[9px] text-slate-500 font-sans">NM</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

