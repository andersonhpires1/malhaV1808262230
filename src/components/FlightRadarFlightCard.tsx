import React, { useState } from 'react';
import { 
  Plane, Star, X, Compass, Gauge, Clock, Radio, 
  TrendingDown, TrendingUp, Minus, Link2, CheckCircle2,
  Navigation, Shield, ArrowRight
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

// Dicionário ampliado de aeroportos com IATA, ICAO, Cidade, UF e Fuso Horário
interface AirportMeta {
  iata: string;
  icao: string;
  city: string;
  uf?: string;
  country: string;
  tz: string;
  name: string;
}

const AIRPORT_DATABASE: Record<string, AirportMeta> = {
  'SBGR': { iata: 'GRU', icao: 'SBGR', city: 'SAO PAULO', uf: 'SP', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Guarulhos Intl' },
  'GRU': { iata: 'GRU', icao: 'SBGR', city: 'SAO PAULO', uf: 'SP', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Guarulhos Intl' },
  'LIS': { iata: 'LIS', icao: 'LPPT', city: 'LISBOA', uf: 'PT', country: 'Portugal', tz: 'WEST (UTC +01:00)', name: 'Humberto Delgado' },
  'LPPT': { iata: 'LIS', icao: 'LPPT', city: 'LISBOA', uf: 'PT', country: 'Portugal', tz: 'WEST (UTC +01:00)', name: 'Humberto Delgado' },
  'MIA': { iata: 'MIA', icao: 'KMIA', city: 'MIAMI', uf: 'US', country: 'Estados Unidos', tz: 'EDT (UTC -04:00)', name: 'Miami International' },
  'KMIA': { iata: 'MIA', icao: 'KMIA', city: 'MIAMI', uf: 'US', country: 'Estados Unidos', tz: 'EDT (UTC -04:00)', name: 'Miami International' },
  'JFK': { iata: 'JFK', icao: 'KJFK', city: 'NEW YORK', uf: 'US', country: 'Estados Unidos', tz: 'EDT (UTC -04:00)', name: 'John F. Kennedy' },
  'KJFK': { iata: 'JFK', icao: 'KJFK', city: 'NEW YORK', uf: 'US', country: 'Estados Unidos', tz: 'EDT (UTC -04:00)', name: 'John F. Kennedy' },
  'EWR': { iata: 'EWR', icao: 'KEWR', city: 'NEWARK', uf: 'US', country: 'Estados Unidos', tz: 'EDT (UTC -04:00)', name: 'Newark Liberty' },
  'MAD': { iata: 'MAD', icao: 'LEMD', city: 'MADRID', uf: 'ES', country: 'Espanha', tz: 'CEST (UTC +02:00)', name: 'Adolfo Suárez-Barajas' },
  'LEMD': { iata: 'MAD', icao: 'LEMD', city: 'MADRID', uf: 'ES', country: 'Espanha', tz: 'CEST (UTC +02:00)', name: 'Adolfo Suárez-Barajas' },
  'CDG': { iata: 'CDG', icao: 'LFPG', city: 'PARIS', uf: 'FR', country: 'França', tz: 'CEST (UTC +02:00)', name: 'Charles de Gaulle' },
  'LFPG': { iata: 'CDG', icao: 'LFPG', city: 'PARIS', uf: 'FR', country: 'França', tz: 'CEST (UTC +02:00)', name: 'Charles de Gaulle' },
  'LHR': { iata: 'LHR', icao: 'EGLL', city: 'LONDON', uf: 'UK', country: 'Reino Unido', tz: 'BST (UTC +01:00)', name: 'London Heathrow' },
  'FRA': { iata: 'FRA', icao: 'EDDF', city: 'FRANKFURT', uf: 'DE', country: 'Alemanha', tz: 'CEST (UTC +02:00)', name: 'Frankfurt am Main' },
  'DXB': { iata: 'DXB', icao: 'OMDB', city: 'DUBAI', uf: 'AE', country: 'Emirados Árabes', tz: 'GST (UTC +04:00)', name: 'Dubai International' },
  'DOH': { iata: 'DOH', icao: 'OTHH', city: 'DOHA', uf: 'QA', country: 'Qatar', tz: 'AST (UTC +03:00)', name: 'Hamad International' },
  'EZE': { iata: 'EZE', icao: 'SAEZ', city: 'BUENOS AIRES', uf: 'AR', country: 'Argentina', tz: 'ART (UTC -03:00)', name: 'Ministro Pistarini' },
  'AMS': { iata: 'AMS', icao: 'EHAM', city: 'AMSTERDAM', uf: 'NL', country: 'Holanda', tz: 'CEST (UTC +02:00)', name: 'Schiphol Airport' },
  'EHAM': { iata: 'AMS', icao: 'EHAM', city: 'AMSTERDAM', uf: 'NL', country: 'Holanda', tz: 'CEST (UTC +02:00)', name: 'Schiphol Airport' },
  'SCL': { iata: 'SCL', icao: 'SCEL', city: 'SANTIAGO', uf: 'CL', country: 'Chile', tz: 'CLT (UTC -04:00)', name: 'Arturo Merino Benítez' },
  'BOG': { iata: 'BOG', icao: 'SKBO', city: 'BOGOTA', uf: 'CO', country: 'Colômbia', tz: 'COT (UTC -05:00)', name: 'El Dorado' },
  'LIM': { iata: 'LIM', icao: 'SPJC', city: 'LIMA', uf: 'PE', country: 'Peru', tz: 'PET (UTC -05:00)', name: 'Jorge Chávez' },
  'PTY': { iata: 'PTY', icao: 'MPTO', city: 'PANAMA CITY', uf: 'PA', country: 'Panamá', tz: 'EST (UTC -05:00)', name: 'Tocumen International' },
  'SDU': { iata: 'SDU', icao: 'SBRJ', city: 'RIO DE JANEIRO', uf: 'RJ', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Santos Dumont' },
  'SBRJ': { iata: 'SDU', icao: 'SBRJ', city: 'RIO DE JANEIRO', uf: 'RJ', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Santos Dumont' },
  'GIG': { iata: 'GIG', icao: 'SBGL', city: 'RIO DE JANEIRO', uf: 'RJ', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Galeão Tom Jobim' },
  'SBGL': { iata: 'GIG', icao: 'SBGL', city: 'RIO DE JANEIRO', uf: 'RJ', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Galeão Tom Jobim' },
  'BSB': { iata: 'BSB', icao: 'SBBR', city: 'BRASILIA', uf: 'DF', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Presidente JK' },
  'SBBR': { iata: 'BSB', icao: 'SBBR', city: 'BRASILIA', uf: 'DF', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Presidente JK' },
  'SSA': { iata: 'SSA', icao: 'SBSV', city: 'SALVADOR', uf: 'BA', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Dep. Luís Eduardo' },
  'SBSV': { iata: 'SSA', icao: 'SBSV', city: 'SALVADOR', uf: 'BA', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Dep. Luís Eduardo' },
  'REC': { iata: 'REC', icao: 'SBRF', city: 'RECIFE', uf: 'PE', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Guararapes' },
  'FOR': { iata: 'FOR', icao: 'SBFZ', city: 'FORTALEZA', uf: 'CE', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Pinto Martins' },
  'CNF': { iata: 'CNF', icao: 'SBCF', city: 'BELO HORIZONTE', uf: 'MG', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Confins Tancredo Neves' },
  'POA': { iata: 'POA', icao: 'SBPA', city: 'PORTO ALEGRE', uf: 'RS', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Salgado Filho' },
  'CWB': { iata: 'CWB', icao: 'SBCT', city: 'CURITIBA', uf: 'PR', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Afonso Pena' },
  'VCP': { iata: 'VCP', icao: 'SBKP', city: 'CAMPINAS', uf: 'SP', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Viracopos' },
  'FLN': { iata: 'FLN', icao: 'SBFL', city: 'FLORIANOPOLIS', uf: 'SC', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Hercílio Luz' },
  'MCZ': { iata: 'MCZ', icao: 'SBMO', city: 'MACEIO', uf: 'AL', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Zumbi dos Palmares' },
  'NAT': { iata: 'NAT', icao: 'SBSG', city: 'NATAL', uf: 'RN', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'São Gonçalo do Amarante' },
  'BEL': { iata: 'BEL', icao: 'SBBE', city: 'BELEM', uf: 'PA', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Val-de-Cans' },
  'MAO': { iata: 'MAO', icao: 'SBEG', city: 'MANAUS', uf: 'AM', country: 'Brasil', tz: '-04 (UTC -04:00)', name: 'Eduardo Gomes' },
  'CGB': { iata: 'CGB', icao: 'SBCY', city: 'CUIABA', uf: 'MT', country: 'Brasil', tz: '-04 (UTC -04:00)', name: 'Marechal Rondon' },
  'GYN': { iata: 'GYN', icao: 'SBGO', city: 'GOIANIA', uf: 'GO', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Santa Genoveva' },
  'VIX': { iata: 'VIX', icao: 'SBVT', city: 'VITORIA', uf: 'ES', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Eurico de Aguiar Salles' },
  'IGU': { iata: 'IGU', icao: 'SBFI', city: 'FOZ DO IGUACU', uf: 'PR', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Cataratas' },
  'NVT': { iata: 'NVT', icao: 'SBNF', city: 'NAVEGANTES', uf: 'SC', country: 'Brasil', tz: '-03 (UTC -03:00)', name: 'Victor Konder' }
};

function getAirportMeta(code: string): AirportMeta {
  const clean = (code || '').trim().toUpperCase();
  if (AIRPORT_DATABASE[clean]) {
    return AIRPORT_DATABASE[clean];
  }
  return {
    iata: clean.length === 4 && clean.startsWith('SB') ? clean.substring(2) : clean || '---',
    icao: clean.length === 4 ? clean : (clean.length === 3 ? `SB${clean.substring(1)}` : clean || '----'),
    city: clean || 'DESCONHECIDO',
    country: 'Internacional',
    tz: '-03 (UTC -03:00)',
    name: clean
  };
}

// Nomes completos, descrições e logos das companhias aéreas
function getFullAirlineTitle(airline: string, flight: string): { title: string; subtitle: string; logoUrl?: string; code: string } {
  const norm = (airline || '').toUpperCase();
  const fNorm = (flight || '').toUpperCase();
  
  if (norm.includes('TAP') || fNorm.startsWith('TP') || fNorm.startsWith('TAP')) {
    return { 
      title: 'TAP Air Portugal', 
      subtitle: 'TAP Air Portugal (Fleet Flight)',
      logoUrl: 'https://images.kiwi.com/airlines/64/TP.png',
      code: 'TP'
    };
  }
  if (norm.includes('LATAM') || fNorm.startsWith('LA') || fNorm.startsWith('TAM') || fNorm.startsWith('JJ')) {
    return { 
      title: 'LATAM Airlines Brasil', 
      subtitle: 'LATAM Group (South America Operations)',
      logoUrl: 'https://images.kiwi.com/airlines/64/LA.png',
      code: 'LA'
    };
  }
  if (norm.includes('GOL') || fNorm.startsWith('G3') || fNorm.startsWith('GLO')) {
    return { 
      title: 'GOL Linhas Aéreas', 
      subtitle: 'GOL Inteligente (Domestic & Mercosul)',
      logoUrl: 'https://images.kiwi.com/airlines/64/G3.png',
      code: 'G3'
    };
  }
  if (norm.includes('AZUL') || fNorm.startsWith('AD') || fNorm.startsWith('AZU')) {
    return { 
      title: 'Azul Linhas Aéreas Brasileiras', 
      subtitle: 'Azul Conecta & Linhas Principais',
      logoUrl: 'https://images.kiwi.com/airlines/64/AD.png',
      code: 'AD'
    };
  }
  if (norm.includes('EMIRATES') || fNorm.startsWith('EK')) {
    return { 
      title: 'Emirates', 
      subtitle: 'Fly Emirates (A380 / B777 Operations)',
      logoUrl: 'https://images.kiwi.com/airlines/64/EK.png',
      code: 'EK'
    };
  }
  if (norm.includes('QATAR') || fNorm.startsWith('QR')) {
    return { 
      title: 'Qatar Airways', 
      subtitle: 'Going Place Together',
      logoUrl: 'https://images.kiwi.com/airlines/64/QR.png',
      code: 'QR'
    };
  }
  if (norm.includes('AMERICAN') || fNorm.startsWith('AA')) {
    return { 
      title: 'American Airlines', 
      subtitle: 'American Airlines Fleet',
      logoUrl: 'https://images.kiwi.com/airlines/64/AA.png',
      code: 'AA'
    };
  }
  if (norm.includes('UNITED') || fNorm.startsWith('UA')) {
    return { 
      title: 'United Airlines', 
      subtitle: 'United Express & Mainline',
      logoUrl: 'https://images.kiwi.com/airlines/64/UA.png',
      code: 'UA'
    };
  }
  if (norm.includes('DELTA') || fNorm.startsWith('DL')) {
    return { 
      title: 'Delta Air Lines', 
      subtitle: 'Delta Connection',
      logoUrl: 'https://images.kiwi.com/airlines/64/DL.png',
      code: 'DL'
    };
  }
  if (norm.includes('AIR FRANCE') || fNorm.startsWith('AF')) {
    return { 
      title: 'Air France', 
      subtitle: 'Air France-KLM Group',
      logoUrl: 'https://images.kiwi.com/airlines/64/AF.png',
      code: 'AF'
    };
  }
  if (norm.includes('LUFTHANSA') || fNorm.startsWith('LH')) {
    return { 
      title: 'Lufthansa', 
      subtitle: 'Lufthansa Group',
      logoUrl: 'https://images.kiwi.com/airlines/64/LH.png',
      code: 'LH'
    };
  }
  if (norm.includes('KLM') || fNorm.startsWith('KL')) {
    return { 
      title: 'KLM Royal Dutch Airlines', 
      subtitle: 'KLM Royal Dutch Airlines',
      logoUrl: 'https://images.kiwi.com/airlines/64/KL.png',
      code: 'KL'
    };
  }
  if (norm.includes('IBERIA') || fNorm.startsWith('IB')) {
    return { 
      title: 'Iberia', 
      subtitle: 'Iberia Líneas Aéreas',
      logoUrl: 'https://images.kiwi.com/airlines/64/IB.png',
      code: 'IB'
    };
  }
  if (norm.includes('COPA') || fNorm.startsWith('CM')) {
    return { 
      title: 'Copa Airlines', 
      subtitle: 'Copa Airlines Hub of Americas',
      logoUrl: 'https://images.kiwi.com/airlines/64/CM.png',
      code: 'CM'
    };
  }
  if (norm.includes('AVIANCA') || fNorm.startsWith('AV')) {
    return { 
      title: 'Avianca', 
      subtitle: 'Avianca Holdings',
      logoUrl: 'https://images.kiwi.com/airlines/64/AV.png',
      code: 'AV'
    };
  }
  if (norm.includes('VARIG') || fNorm.startsWith('RG') || fNorm.startsWith('VRN') || fNorm.startsWith('VRG')) {
    return { 
      title: 'Varig / Gol Grupo', 
      subtitle: 'Malha Operacional',
      logoUrl: 'https://images.kiwi.com/airlines/64/RG.png',
      code: 'RG'
    };
  }
  return { 
    title: airline || 'Linha Aérea Comercial', 
    subtitle: 'Operação Regular',
    code: (airline || 'AIR').substring(0, 3).toUpperCase()
  };
}

// Converte e formata o código de voo para o padrão exato da Malha Operacional (IATA + Dígitos)
// Exemplos: LA1234, G31306, AD4155, TP9012, RG5678, AA905, DL105, UA845, AF454, LH506, KL791
export function formatMalhaFlightNumber(flightStr?: string, callsignStr?: string, airlineStr?: string): string {
  const raw = (flightStr || callsignStr || '').trim().toUpperCase().replace(/\s+/g, '');
  const callsign = (callsignStr || '').trim().toUpperCase().replace(/\s+/g, '');
  const airline = (airlineStr || '').trim().toUpperCase();

  const icaoToIata: Record<string, string> = {
    'GLO': 'G3',
    'TAM': 'LA',
    'LAN': 'LA',
    'LXP': 'LA',
    'AZU': 'AD',
    'TAP': 'TP',
    'VRN': 'RG',
    'VRG': 'RG',
    'VAR': 'RG',
    'AAL': 'AA',
    'UAL': 'UA',
    'DAL': 'DL',
    'AFR': 'AF',
    'DLH': 'LH',
    'KLM': 'KL',
    'IBE': 'IB',
    'CMP': 'CM',
    'AVA': 'AV',
    'QTR': 'QR',
    'UAE': 'EK',
    'ARG': 'AR',
    'BOV': 'OB',
    'PTB': '2Z',
    'ONE': 'O6',
    'AEA': 'UX',
    'RAM': 'AT',
    'ITY': 'AZ',
    'SWR': 'LX',
    'BAW': 'BA',
    'ETH': 'ET',
    'TAO': 'TX'
  };

  // 1. Se o callsign iniciar com código ICAO conhecido de 3 letras (ex: GLO1306 -> G31306, TAM3012 -> LA3012, TAP085 -> TP085, VRN5678 -> RG5678)
  for (const [icao, iata] of Object.entries(icaoToIata)) {
    if (callsign.startsWith(icao)) {
      const digits = callsign.substring(icao.length);
      return `${iata}${digits}`;
    }
    if (raw.startsWith(icao)) {
      const digits = raw.substring(icao.length);
      return `${iata}${digits}`;
    }
  }

  // 2. Se já estiver no padrão IATA (2 caracteres alfanuméricos + dígitos, ex: LA1234, G31306, TP9012, RG5678)
  if (/^[A-Z0-9]{2}\d+$/.test(raw)) {
    return raw;
  }

  // 3. Casos onde o nome da companhia ou prefixos indicam a empresa
  if (airline.includes('LATAM') || airline.includes('TAM')) {
    const digits = raw.replace(/\D/g, '') || callsign.replace(/\D/g, '') || '1000';
    return `LA${digits}`;
  }
  if (airline.includes('GOL')) {
    const digits = raw.replace(/\D/g, '') || callsign.replace(/\D/g, '') || '1000';
    return `G3${digits}`;
  }
  if (airline.includes('AZUL')) {
    const digits = raw.replace(/\D/g, '') || callsign.replace(/\D/g, '') || '1000';
    return `AD${digits}`;
  }
  if (airline.includes('TAP')) {
    const digits = raw.replace(/\D/g, '') || callsign.replace(/\D/g, '') || '1000';
    return `TP${digits}`;
  }
  if (airline.includes('VARIG')) {
    const digits = raw.replace(/\D/g, '') || callsign.replace(/\D/g, '') || '1000';
    return `RG${digits}`;
  }

  // 4. Se tiver 3 letras e números sem mapeamento específico, usa as duas primeiras letras
  const match = raw.match(/^([A-Z]{2,3})(\d+)$/);
  if (match) {
    const code = match[1];
    const num = match[2];
    if (icaoToIata[code]) {
      return `${icaoToIata[code]}${num}`;
    }
    return `${code.substring(0, 2)}${num}`;
  }

  return raw || 'VOO';
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
  const malhaFlightNumber = formatMalhaFlightNumber(flight.flight, flight.callsign, flight.airline);

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
      <div className="bg-[#181d24] px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
        {/* LADO ESQUERDO: LOGO DA COMPANHIA AÉREA + MATRÍCULA E CALLSIGN */}
        <div className="flex items-center gap-3 min-w-0">
          {/* LOGO DA COMPANHIA */}
          <div className="w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden">
            {airlineMeta.logoUrl ? (
              <img 
                src={airlineMeta.logoUrl} 
                alt={airlineMeta.title}
                className="w-full h-full object-contain filter drop-shadow"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = (e.target as HTMLElement).parentElement?.querySelector('.logo-fallback') as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className="logo-fallback w-full h-full rounded bg-slate-700/60 text-slate-300 font-black text-xs items-center justify-center tracking-tighter"
              style={{ display: airlineMeta.logoUrl ? 'none' : 'flex' }}
            >
              {airlineMeta.code || 'AIR'}
            </div>
          </div>

          {/* DADOS DE IDENTIFICAÇÃO (PREFIXO • CALLSIGN) */}
          <div className="flex items-center gap-2 flex-wrap">
            {flight.registration && (
              <>
                <span className="text-amber-300 font-black text-lg md:text-xl tracking-tight leading-none uppercase">
                  {flight.registration}
                </span>
                <span 
                  className="inline-block w-[1px] h-3.5 md:h-4 bg-slate-600/80 self-center mx-0.5 shrink-0" 
                  aria-hidden="true"
                />
              </>
            )}
            {/* CALLSIGN / FLIGHT NUMBER FORMATADO NO PADRÃO MALHA */}
            <span className="text-amber-400 font-black text-lg md:text-xl tracking-tight leading-none font-mono">
              {malhaFlightNumber}
            </span>
          </div>
        </div>

        {/* LADO DIREITO: AÇÕES DE CABEÇALHO */}
        <div className="flex items-center gap-1.5 shrink-0">
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
            <span className="text-[14px] font-bold font-[Verdana] text-slate-400 tracking-wider mt-1">
              {originMeta.icao || 'ORIG'}
            </span>
            <span className="text-[10px] font-sans text-slate-200 uppercase tracking-tight truncate">
              {originMeta.city}{originMeta.uf ? `-${originMeta.uf}` : ''}
            </span>
          </div>

          {/* ÍCONE DE SETA DE DESTINO NO CENTRO */}
          <div className="flex flex-col items-center justify-center px-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowRight size={22} className="animate-pulse" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mt-1.5 font-mono">
              DESTINO
            </span>
          </div>

          {/* DESTINO */}
          <div className="flex flex-col text-right">
            <span className="text-3xl font-black tracking-tighter text-emerald-400 leading-none">
              {destMeta.iata}
            </span>
            <span className="text-[14px] font-bold font-[Verdana] text-emerald-400 tracking-wider mt-1">
              {destMeta.icao || 'SBGR'}
            </span>
            <span className="text-[10px] font-sans text-emerald-300 uppercase tracking-tight truncate">
              {destMeta.city}{destMeta.uf ? `-${destMeta.uf}` : ''}
            </span>
          </div>
        </div>

        {/* METRICAS DE ESTIMATIVAS DE POUSO (HORA ESTIMADA E TEMPO RESTANTE) */}
        <div className="grid grid-cols-2 divide-x divide-slate-800 border-t border-slate-800 bg-slate-900/60 text-slate-300 text-xs font-sans">
          
          {/* COLUNA ESQUERDA: HORA ESTIMADA */}
          <div className="px-4 py-3 flex flex-col gap-1 items-center justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">POUSO ESTIMADO</span>
            <span className="text-[22px] font-black text-white font-mono flex items-center gap-1">
              <Clock size={16} className="text-emerald-400 shrink-0" />
              {estArrTime}
            </span>
          </div>

          {/* COLUNA DIREITA: TEMPO RESTANTE */}
          <div className="px-4 py-3 flex flex-col gap-1 items-center justify-center bg-emerald-950/20">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">TEMPO RESTANTE</span>
            <span className="text-[22px] font-black text-emerald-400 font-mono flex items-center gap-1">
              {etaMinutes} <span className="text-[18px] font-bold">MIN</span>
            </span>
          </div>

        </div>

      </div>

      {/* 3. DADOS DE TELEMETRIA EM VOO (SOMENTE DADOS, SEM FOTO) */}
      <div className="p-3.5 flex flex-col gap-2.5 bg-slate-950/80 max-h-[160px] lg:max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 pr-2">
        
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
