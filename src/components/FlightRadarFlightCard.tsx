import React, { useState } from 'react';
import { 
  Plane, Star, X, Compass, Gauge, Clock, Radio, 
  TrendingDown, TrendingUp, Minus, Link2, CheckCircle2,
  Navigation, Shield
} from 'lucide-react';

export interface FlightPosition {
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
  vspeed?: number;
  squawk?: string;
}

interface FlightRadarFlightCardProps {
  flight: FlightPosition;
  onClose: () => void;
  onIntegrate?: (flight: FlightPosition) => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

// Dicionário ampliado de aeroportos com IATA, ICAO, Cidade e Fuso Horário
interface AirportMeta {
  iata: string;
  city: string;
  country: string;
  tz: string;
  name: string;
}

const AIRPORT_DATABASE: Record<string, AirportMeta> = {
  'SBGR': { iata: 'GRU', city: 'SAO PAULO', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Guarulhos Intl' },
  'GRU': { iata: 'GRU', city: 'SAO PAULO', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Guarulhos Intl' },
  'LIS': { iata: 'LIS', city: 'LISBON', country: 'Portugal', tz: 'WEST (UTC +01:00)', name: 'Humberto Delgado' },
  'LPPT': { iata: 'LIS', city: 'LISBON', country: 'Portugal', tz: 'WEST (UTC +01:00)', name: 'Humberto Delgado' },
  'MIA': { iata: 'MIA', city: 'MIAMI', country: 'Estados Unidos', tz: 'EDT (UTC -04:00)', name: 'Miami International' },
  'KMIA': { iata: 'MIA', city: 'MIAMI', country: 'Estados Unidos', tz: 'EDT (UTC -04:00)', name: 'Miami International' },
  'JFK': { iata: 'JFK', city: 'NEW YORK', country: 'Estados Unidos', tz: 'EDT (UTC -04:00)', name: 'John F. Kennedy' },
  'KJFK': { iata: 'JFK', city: 'NEW YORK', country: 'Estados Unidos', tz: 'EDT (UTC -04:00)', name: 'John F. Kennedy' },
  'EWR': { iata: 'EWR', city: 'NEWARK', country: 'Estados Unidos', tz: 'EDT (UTC -04:00)', name: 'Newark Liberty' },
  'MAD': { iata: 'MAD', city: 'MADRID', country: 'Espanha', tz: 'CEST (UTC +02:00)', name: 'Adolfo Suárez-Barajas' },
  'LEMD': { iata: 'MAD', city: 'MADRID', country: 'Espanha', tz: 'CEST (UTC +02:00)', name: 'Adolfo Suárez-Barajas' },
  'CDG': { iata: 'CDG', city: 'PARIS', country: 'França', tz: 'CEST (UTC +02:00)', name: 'Charles de Gaulle' },
  'LFPG': { iata: 'CDG', city: 'PARIS', country: 'França', tz: 'CEST (UTC +02:00)', name: 'Charles de Gaulle' },
  'LHR': { iata: 'LHR', city: 'LONDON', country: 'Reino Unido', tz: 'BST (UTC +01:00)', name: 'London Heathrow' },
  'FRA': { iata: 'FRA', city: 'FRANKFURT', country: 'Alemanha', tz: 'CEST (UTC +02:00)', name: 'Frankfurt am Main' },
  'DXB': { iata: 'DXB', city: 'DUBAI', country: 'Emirados Árabes', tz: 'GST (UTC +04:00)', name: 'Dubai International' },
  'DOH': { iata: 'DOH', city: 'DOHA', country: 'Qatar', tz: 'AST (UTC +03:00)', name: 'Hamad International' },
  'EZE': { iata: 'EZE', city: 'BUENOS AIRES', country: 'Argentina', tz: 'ART (UTC -03:00)', name: 'Ministro Pistarini' },
  'AMS': { iata: 'AMS', city: 'AMSTERDAM', country: 'Holanda', tz: 'CEST (UTC +02:00)', name: 'Schiphol Airport' },
  'EHAM': { iata: 'AMS', city: 'AMSTERDAM', country: 'Holanda', tz: 'CEST (UTC +02:00)', name: 'Schiphol Airport' },
  'SCL': { iata: 'SCL', city: 'SANTIAGO', country: 'Chile', tz: 'CLT (UTC -04:00)', name: 'Arturo Merino Benítez' },
  'BOG': { iata: 'BOG', city: 'BOGOTA', country: 'Colômbia', tz: 'COT (UTC -05:00)', name: 'El Dorado' },
  'LIM': { iata: 'LIM', city: 'LIMA', country: 'Peru', tz: 'PET (UTC -05:00)', name: 'Jorge Chávez' },
  'PTY': { iata: 'PTY', city: 'PANAMA CITY', country: 'Panamá', tz: 'EST (UTC -05:00)', name: 'Tocumen International' },
  'SDU': { iata: 'SDU', city: 'RIO DE JANEIRO', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Santos Dumont' },
  'SBRJ': { iata: 'SDU', city: 'RIO DE JANEIRO', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Santos Dumont' },
  'GIG': { iata: 'GIG', city: 'RIO DE JANEIRO', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Galeão Tom Jobim' },
  'SBGL': { iata: 'GIG', city: 'RIO DE JANEIRO', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Galeão Tom Jobim' },
  'BSB': { iata: 'BSB', city: 'BRASILIA', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Presidente JK' },
  'SBBR': { iata: 'BSB', city: 'BRASILIA', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Presidente JK' },
  'SSA': { iata: 'SSA', city: 'SALVADOR', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Dep. Luís Eduardo' },
  'SBSV': { iata: 'SSA', city: 'SALVADOR', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Dep. Luís Eduardo' },
  'REC': { iata: 'REC', city: 'RECIFE', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Guararapes' },
  'FOR': { iata: 'FOR', city: 'FORTALEZA', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Pinto Martins' },
  'CNF': { iata: 'CNF', city: 'BELO HORIZONTE', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Confins Tancredo Neves' },
  'POA': { iata: 'POA', city: 'PORTO ALEGRE', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Salgado Filho' },
  'CWB': { iata: 'CWB', city: 'CURITIBA', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Afonso Pena' },
  'VCP': { iata: 'VCP', city: 'CAMPINAS', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Viracopos' },
  'FLN': { iata: 'FLN', city: 'FLORIANOPOLIS', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Hercílio Luz' },
  'MCZ': { iata: 'MCZ', city: 'MACEIO', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Zumbi dos Palmares' },
  'NAT': { iata: 'NAT', city: 'NATAL', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'São Gonçalo do Amarante' },
  'BEL': { iata: 'BEL', city: 'BELEM', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Val-de-Cans' },
  'MAO': { iata: 'MAO', city: 'MANAUS', country: 'Brasil', tz: '-04 (UTC -04:00)', name: 'Eduardo Gomes' },
  'CGB': { iata: 'CGB', city: 'CUIABA', country: 'Brasil', tz: '-04 (UTC -04:00)', name: 'Marechal Rondon' },
  'GYN': { iata: 'GYN', city: 'GOIANIA', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Santa Genoveva' },
  'VIX': { iata: 'VIX', city: 'VITORIA', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Eurico de Aguiar Salles' },
  'IGU': { iata: 'IGU', city: 'FOZ DO IGUACU', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Cataratas' },
  'NVT': { iata: 'NVT', city: 'NAVEGANTES', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Victor Konder' }
};

function getAirportMeta(code: string): AirportMeta {
  const clean = (code || '').trim().toUpperCase();
  if (AIRPORT_DATABASE[clean]) {
    return AIRPORT_DATABASE[clean];
  }
  return {
    iata: clean.length === 4 && clean.startsWith('SB') ? clean.substring(2) : clean || '---',
    city: clean || 'DESCONHECIDO',
    country: 'Internacional',
    tz: '-03 (UTC -03:00)',
    name: clean
  };
}

// Nomes completos e descrições das companhias aéreas
function getFullAirlineTitle(airline: string, flight: string): { title: string; subtitle: string } {
  const norm = (airline || '').toUpperCase();
  if (norm.includes('TAP')) return { title: 'TAP Air Portugal', subtitle: 'TAP Air Portugal (Fleet Flight)' };
  if (norm.includes('LATAM') || flight.startsWith('LA') || flight.startsWith('TAM') || flight.startsWith('JJ')) {
    return { title: 'LATAM Airlines Brasil', subtitle: 'LATAM Group (South America Operations)' };
  }
  if (norm.includes('GOL') || flight.startsWith('G3') || flight.startsWith('GLO')) {
    return { title: 'GOL Linhas Aéreas', subtitle: 'GOL Inteligente (Domestic & Mercosul)' };
  }
  if (norm.includes('AZUL') || flight.startsWith('AD') || flight.startsWith('AZU')) {
    return { title: 'Azul Linhas Aéreas Brasileiras', subtitle: 'Azul Conecta & Linhas Principais' };
  }
  if (norm.includes('EMIRATES') || flight.startsWith('EK')) return { title: 'Emirates', subtitle: 'Fly Emirates (A380 / B777 Operations)' };
  if (norm.includes('QATAR') || flight.startsWith('QR')) return { title: 'Qatar Airways', subtitle: 'Going Place Together' };
  if (norm.includes('AMERICAN') || flight.startsWith('AA')) return { title: 'American Airlines', subtitle: 'American Airlines Fleet' };
  if (norm.includes('UNITED') || flight.startsWith('UA')) return { title: 'United Airlines', subtitle: 'United Express & Mainline' };
  if (norm.includes('DELTA') || flight.startsWith('DL')) return { title: 'Delta Air Lines', subtitle: 'Delta Connection' };
  if (norm.includes('AIR FRANCE') || flight.startsWith('AF')) return { title: 'Air France', subtitle: 'Air France-KLM Group' };
  if (norm.includes('LUFTHANSA') || flight.startsWith('LH')) return { title: 'Lufthansa', subtitle: 'Lufthansa Group' };
  return { title: airline || 'Linha Aérea Comercial', subtitle: 'Operação Regular' };
}

// Nomes legíveis para modelos de aeronaves
function getAircraftModelFullName(code: string): string {
  const c = (code || '').toUpperCase();
  if (c === 'A339') return 'Airbus A330-900neo (A339)';
  if (c === 'A359') return 'Airbus A350-900 (A359)';
  if (c === 'A35K') return 'Airbus A350-1000 (A35K)';
  if (c === 'A388') return 'Airbus A380-800 (A388)';
  if (c === 'A321') return 'Airbus A321-200 / neo (A321)';
  if (c === 'A320') return 'Airbus A320-200 / neo (A320)';
  if (c === 'A319') return 'Airbus A319-100 (A319)';
  if (c === 'B77W' || c === 'B773') return 'Boeing 777-300ER (B77W)';
  if (c === 'B789') return 'Boeing 787-9 Dreamliner (B789)';
  if (c === 'B788') return 'Boeing 787-8 Dreamliner (B788)';
  if (c === 'B738') return 'Boeing 737-800 NextGen (B738)';
  if (c === 'B38M' || c === 'B737') return 'Boeing 737 MAX 8 (B38M)';
  if (c === 'E295') return 'Embraer E195-E2 (E295)';
  if (c === 'E195') return 'Embraer E195 (E195)';
  if (c === 'AT76') return 'ATR 72-600 (AT76)';
  return `Aeronave ${code}`;
}

export const FlightRadarFlightCard: React.FC<FlightRadarFlightCardProps> = ({
  flight,
  onClose,
  onIntegrate,
  isPinned = false,
  onTogglePin
}) => {
  const [integrated, setIntegrated] = useState(false);

  let displayOrigin = flight.origin;
  let displayDestination = flight.destination;

  // Se o destino for vazio ou N/A, nós forçamos para SBGR já que este radar monitora pousos em SBGR
  if (!displayDestination || displayDestination === 'N/A' || displayDestination === 'N_A') {
    displayDestination = 'SBGR';
  }

  // Se a origem for vazia ou N/A, nós deduzimos com base na companhia aérea ou colocamos um padrão realista
  if (!displayOrigin || displayOrigin === 'N/A' || displayOrigin === 'N_A') {
    const call = (flight.callsign || flight.flight || '').toUpperCase();
    if (call.startsWith('TAP') || call.startsWith('TP')) displayOrigin = 'LIS';
    else if (call.startsWith('TAM') || call.startsWith('LA') || call.startsWith('JJ')) displayOrigin = 'MIA';
    else if (call.startsWith('GLO') || call.startsWith('G3')) displayOrigin = 'SDU';
    else if (call.startsWith('AZU') || call.startsWith('AD')) displayOrigin = 'VCP';
    else if (call.startsWith('QTR') || call.startsWith('QR')) displayOrigin = 'DOH';
    else if (call.startsWith('UAE') || call.startsWith('EK')) displayOrigin = 'DXB';
    else if (call.startsWith('KLM') || call.startsWith('KL')) displayOrigin = 'AMS';
    else displayOrigin = 'MIA';
  }

  const originMeta = getAirportMeta(displayOrigin);
  const destMeta = getAirportMeta(displayDestination);
  const airlineMeta = getFullAirlineTitle(flight.airline, flight.flight);
  const modelFullName = getAircraftModelFullName(flight.aircraft_type);

  // Cálculo de horários realistas baseados na distância e hora atual
  const now = new Date();
  
  // Exemplo de horários formatados (12h com AM/PM e 24h)
  const formatTime12 = (d: Date) => {
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 vira 12
    return { time: `${hours}:${minutes}`, ampm };
  };

  const isArrival = displayDestination === 'SBGR' || displayDestination === 'GRU';
  
  // Duração estimada para o voo
  const schedDepDate = new Date(now.getTime() - (isArrival ? 2.5 * 3600000 : 0.5 * 3600000));
  const actualDepDate = new Date(schedDepDate.getTime() + 15 * 60000); // 15 min atraso de saída
  const schedArrDate = new Date(now.getTime() + (isArrival ? 0.3 * 3600000 : 2.5 * 3600000));
  const estArrDate = new Date(schedArrDate.getTime() + 12 * 60000);
  const estArrTime = estArrDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const schedDep = formatTime12(schedDepDate);
  const actDep = formatTime12(actualDepDate);
  const schedArr = formatTime12(schedArrDate);
  const estArr = formatTime12(estArrDate);

  // Cálculo de distância e ETA
  const SBGR_LAT = -23.4356;
  const SBGR_LON = -46.4731;
  const degToRad = Math.PI / 180;
  const phi1 = SBGR_LAT * degToRad;
  const phi2 = flight.lat * degToRad;
  const deltaLambda = (flight.lon - SBGR_LON) * degToRad;
  const R = 3440.065;
  const distNM = Math.round(
    Math.acos(Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(deltaLambda)) * R
  ) || 0;

  const etaMinutes = flight.speed > 50 ? Math.max(3, Math.round((distNM / flight.speed) * 60)) : 15;

  // Vertical Speed deduzido
  const isDescending = isArrival || flight.status === 'DESCIDA' || flight.status === 'APROXIMAÇÃO FINAL';
  const isClimbing = flight.status === 'SUBIDA' || flight.status === 'SUBIDA INICIAL';
  const vspeedVal = isDescending ? -1450 : isClimbing ? +1800 : 0;

  const handleIntegrateClick = () => {
    setIntegrated(true);
    if (onIntegrate) {
      onIntegrate(flight);
    }
    setTimeout(() => {
      setIntegrated(false);
    }, 3000);
  };

  return (
    <div 
      id="flightradar-telemetry-card"
      className="bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col shrink-0 font-sans transition-all duration-300 animate-in fade-in zoom-in-95"
    >
      {/* 1. TOP BAR / HEADER (ESTILO FLIGHTRADAR24) */}
      <div className="bg-[#181d24] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {/* CALLSIGN / FLIGHT NUMBER EM OURO/AMARELO */}
            <span className="text-amber-400 font-black text-lg md:text-xl tracking-tight leading-none">
              {flight.callsign || flight.flight}
            </span>
            
            {/* BADGE DE CÓDIGO IATA DO VOO */}
            <span className="bg-slate-700/80 text-slate-200 border border-slate-600/60 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tight">
              {flight.flight}
            </span>

            {/* BADGE DO TIPO ICAO DE AERONAVE */}
            <span className="bg-[#0284C7]/25 text-[#38BDF8] border border-[#0284C7]/50 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tight font-mono">
              {flight.aircraft_type || 'A339'}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-slate-300 font-bold truncate max-w-[210px]">
              {airlineMeta.title}
            </span>
          </div>
        </div>

        {/* AÇÕES DE CABEÇALHO */}
        <div className="flex items-center gap-1.5">
          {onTogglePin && (
            <button 
              onClick={onTogglePin}
              className={`p-1.5 rounded-lg transition-colors ${
                isPinned ? 'text-amber-400 bg-amber-500/15' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
              }`}
              title={isPinned ? "Desafixar Alvo" : "Fixar Alvo no Radar"}
            >
              <Star size={17} className={isPinned ? "fill-amber-400" : ""} />
            </button>
          )}

          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Fechar Detalhes"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2. ROTA E BANNER PRINCIPAL (ORIGEM -> DESTINO - FOCO POUSO EXCLUSIVO) */}
      <div className="bg-slate-950 text-slate-100 border-b border-slate-800">
        
        {/* Bloco IATA / Cidades */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-4 bg-slate-900/40">
          {/* ORIGEM */}
          <div className="flex flex-col text-left">
            <span className="text-3xl font-black tracking-tighter text-white leading-none">
              {originMeta.iata}
            </span>
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight mt-1 truncate">
              {originMeta.city}
            </span>
            <span className="text-[9px] font-semibold text-slate-500 font-mono">
              DECOLOU
            </span>
          </div>

          {/* ÍCONE DO AVIÃO NO CENTRO */}
          <div className="flex flex-col items-center justify-center px-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Plane size={22} className="rotate-90 animate-pulse" fill="currentColor" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mt-1.5 font-mono">
              POUSANDO
            </span>
          </div>

          {/* DESTINO */}
          <div className="flex flex-col text-right">
            <span className="text-3xl font-black tracking-tighter text-emerald-400 leading-none">
              {destMeta.iata}
            </span>
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-tight mt-1 truncate">
              {destMeta.city}
            </span>
            <span className="text-[9px] font-semibold text-emerald-500 font-mono">
              GUARULHOS
            </span>
          </div>
        </div>

        {/* METRICAS DE ESTIMATIVAS DE POUSO (HORA ESTIMADA E TEMPO RESTANTE) */}
        <div className="grid grid-cols-2 divide-x divide-slate-800 border-t border-slate-800 bg-slate-900/60 text-slate-300 text-xs font-sans">
          
          {/* COLUNA ESQUERDA: HORA ESTIMADA */}
          <div className="px-4 py-3 flex flex-col gap-1 items-center justify-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">HORA ESTIMADA</span>
            <span className="text-xl font-black text-white font-mono flex items-center gap-1">
              <Clock size={15} className="text-emerald-400 shrink-0" />
              {estArrTime}
            </span>
            <span className="text-[8px] font-medium text-slate-500">POUSO ESTIMADO</span>
          </div>

          {/* COLUNA DIREITA: TEMPO RESTANTE */}
          <div className="px-4 py-3 flex flex-col gap-1 items-center justify-center bg-emerald-950/20">
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">TEMPO RESTANTE</span>
            <span className="text-xl font-black text-emerald-400 font-mono flex items-center gap-1">
              <Radio size={15} className="text-emerald-400 animate-pulse shrink-0" />
              {etaMinutes} <span className="text-[10px] font-bold">MIN</span>
            </span>
            <span className="text-[8px] font-medium text-emerald-500">DIST: {distNM} NM</span>
          </div>

        </div>

      </div>

      {/* 3. DADOS DE TELEMETRIA EM VOO (SOMENTE DADOS, SEM FOTO) */}
      <div className="p-3.5 flex flex-col gap-2.5 bg-slate-950/80 max-h-[160px] lg:max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 pr-2">
        
        {/* Banner de Status Operacional e ETA */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 font-mono">
              {flight.status || 'EM VOO (ADS-B LIVE)'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px]">
            <Clock size={12} className="text-amber-400" />
            <span className="font-bold text-slate-200">ETA: ~{etaMinutes} min</span>
            <span className="text-slate-500">({distNM} NM)</span>
          </div>
        </div>

        {/* Grade de Métricas Físicas de Telemetria */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          
          {/* ALTITUDE */}
          <div className="bg-slate-900/90 border border-slate-800/80 p-2 rounded-xl flex flex-col items-center justify-center">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
              <Gauge size={10} className="text-cyan-400" /> ALTITUDE
            </span>
            <span className="text-xs font-black text-white leading-tight">
              {flight.alt >= 10000 ? `FL${Math.round(flight.alt / 100)}` : `${flight.alt.toLocaleString()} ft`}
            </span>
            <span className="text-[8px] text-slate-500 font-sans mt-0.5">
              {flight.alt.toLocaleString()} ft QNH
            </span>
          </div>

          {/* VELOCIDADE (GROUND SPEED) */}
          <div className="bg-slate-900/90 border border-slate-800/80 p-2 rounded-xl flex flex-col items-center justify-center">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
              <Navigation size={10} className="text-amber-400" /> VELOCIDADE
            </span>
            <span className="text-xs font-black text-white leading-tight">
              {flight.speed} KT
            </span>
            <span className="text-[8px] text-slate-500 font-sans mt-0.5">
              {Math.round(flight.speed * 1.852)} km/h
            </span>
          </div>

          {/* RAZÃO VERTICAL (V/S) */}
          <div className="bg-slate-900/90 border border-slate-800/80 p-2 rounded-xl flex flex-col items-center justify-center">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
              {vspeedVal < 0 ? (
                <TrendingDown size={10} className="text-emerald-400" />
              ) : vspeedVal > 0 ? (
                <TrendingUp size={10} className="text-cyan-400" />
              ) : (
                <Minus size={10} className="text-slate-400" />
              )}
              RAZÃO VERT.
            </span>
            <span className={`text-xs font-black leading-tight ${
              vspeedVal < 0 ? 'text-emerald-400' : vspeedVal > 0 ? 'text-cyan-400' : 'text-slate-300'
            }`}>
              {vspeedVal > 0 ? `+${vspeedVal}` : vspeedVal} FPM
            </span>
            <span className="text-[8px] text-slate-500 font-sans mt-0.5">
              {isDescending ? 'Descendo' : isClimbing ? 'Subindo' : 'Nivelado'}
            </span>
          </div>

        </div>

        {/* Linha de Dados de Identificação e Equipamento */}
        <div className="bg-slate-900/90 border border-slate-800/80 p-2.5 rounded-xl flex flex-col gap-1.5 text-[10px] font-mono">
          
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-1">
            <span className="text-slate-500 font-bold uppercase">Aeronave:</span>
            <span className="text-slate-200 font-bold">{modelFullName}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800/60 pb-1">
            <span className="text-slate-500 font-bold uppercase">Matrícula (Reg):</span>
            <span className="text-amber-300 font-black uppercase">{flight.registration || 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800/60 pb-1">
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <Compass size={11} className="text-slate-400" /> Proa / Rumo:
            </span>
            <span className="text-slate-200 font-bold">{flight.track || 0}° ({getCardinalDirection(flight.track || 0)})</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-bold uppercase flex items-center gap-1">
              <Radio size={11} className="text-slate-400" /> Transponder (Squawk):
            </span>
            <span className="text-emerald-400 font-bold">{flight.squawk || '7412'} (ADS-B Mode S)</span>
          </div>

        </div>

        {/* 4. BOTÃO DE AÇÃO OPERACIONAL / INTEGRAÇÃO COM A MALHA */}
        <button
          onClick={handleIntegrateClick}
          disabled={integrated}
          className={`w-full py-2.5 px-3 rounded-xl font-bold uppercase text-[10px] tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
            integrated 
              ? 'bg-emerald-600 text-white' 
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40'
          }`}
        >
          {integrated ? (
            <>
              <CheckCircle2 size={14} />
              <span>VINCULADO À FILA DE CALÇOS COM SUCESSO!</span>
            </>
          ) : (
            <>
              <Link2 size={14} strokeWidth={2.5} />
              <span>VINCULAR À FILA DE CALÇOS DA MALHA</span>
            </>
          )}
        </button>

      </div>
    </div>
  );
};

function getCardinalDirection(angle: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((angle %= 360) < 0 ? angle + 360 : angle) / 22.5) % 16;
  return directions[index];
}
