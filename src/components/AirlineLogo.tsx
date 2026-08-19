import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Plane, Building2, Globe2 } from 'lucide-react';

export interface AirlineData {
  iata: string;
  icao?: string;
  name: string;
  fullName: string;
  country: string;
  flag?: string;
  logoUrl?: string;
  fallbackColor?: string;
  hub?: string;
}

export interface AirlineLogoProps {
  airlineCode: string;
  className?: string;
  showName?: boolean;
  showTooltip?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'cell' | 'full';
}

export const AIRLINE_INFO: Record<string, AirlineData> = {
  'RG': { iata: 'G3', icao: 'GLO', name: 'GOL', fullName: 'GOL Linhas Aéreas Inteligentes', country: 'Brasil', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/G3.png', fallbackColor: '#FF5A00', hub: 'SBGR / SBSP / SBRJ' },
  'G3': { iata: 'G3', icao: 'GLO', name: 'GOL', fullName: 'GOL Linhas Aéreas Inteligentes', country: 'Brasil', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/G3.png', fallbackColor: '#FF5A00', hub: 'SBGR / SBSP / SBRJ' },
  'GOL': { iata: 'G3', icao: 'GLO', name: 'GOL', fullName: 'GOL Linhas Aéreas Inteligentes', country: 'Brasil', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/G3.png', fallbackColor: '#FF5A00', hub: 'SBGR / SBSP / SBRJ' },
  'GLO': { iata: 'G3', icao: 'GLO', name: 'GOL', fullName: 'GOL Linhas Aéreas Inteligentes', country: 'Brasil', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/G3.png', fallbackColor: '#FF5A00', hub: 'SBGR / SBSP / SBRJ' },
  
  'LA': { iata: 'LA', icao: 'TAM', name: 'LATAM', fullName: 'LATAM Airlines Brasil', country: 'Brasil / Chile', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/LA.png', fallbackColor: '#E60000', hub: 'SBGR / SBSP / SBBR' },
  'TAM': { iata: 'LA', icao: 'TAM', name: 'LATAM', fullName: 'LATAM Airlines Brasil', country: 'Brasil / Chile', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/LA.png', fallbackColor: '#E60000', hub: 'SBGR / SBSP / SBBR' },
  'LATAM': { iata: 'LA', icao: 'TAM', name: 'LATAM', fullName: 'LATAM Airlines Brasil', country: 'Brasil / Chile', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/LA.png', fallbackColor: '#E60000', hub: 'SBGR / SBSP / SBBR' },
  'LAT': { iata: 'LA', icao: 'TAM', name: 'LATAM', fullName: 'LATAM Airlines Brasil', country: 'Brasil / Chile', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/LA.png', fallbackColor: '#E60000', hub: 'SBGR / SBSP / SBBR' },
  'JJ': { iata: 'LA', icao: 'TAM', name: 'LATAM', fullName: 'LATAM Airlines Brasil', country: 'Brasil / Chile', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/LA.png', fallbackColor: '#E60000', hub: 'SBGR / SBSP / SBBR' },
  
  'AD': { iata: 'AD', icao: 'AZU', name: 'AZUL', fullName: 'Azul Linhas Aéreas Brasileiras', country: 'Brasil', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/AD.png', fallbackColor: '#00256C', hub: 'SBKP / SBGR / SBCF' },
  'AZUL': { iata: 'AD', icao: 'AZU', name: 'AZUL', fullName: 'Azul Linhas Aéreas Brasileiras', country: 'Brasil', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/AD.png', fallbackColor: '#00256C', hub: 'SBKP / SBGR / SBCF' },
  'AZU': { iata: 'AD', icao: 'AZU', name: 'AZUL', fullName: 'Azul Linhas Aéreas Brasileiras', country: 'Brasil', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/AD.png', fallbackColor: '#00256C', hub: 'SBKP / SBGR / SBCF' },
  
  'TP': { iata: 'TP', icao: 'TAP', name: 'TAP', fullName: 'TAP Air Portugal', country: 'Portugal', flag: '🇵🇹', logoUrl: 'https://images.kiwi.com/airlines/64/TP.png', fallbackColor: '#7BB318', hub: 'LPPT (Lisboa)' },
  'TAP': { iata: 'TP', icao: 'TAP', name: 'TAP', fullName: 'TAP Air Portugal', country: 'Portugal', flag: '🇵🇹', logoUrl: 'https://images.kiwi.com/airlines/64/TP.png', fallbackColor: '#7BB318', hub: 'LPPT (Lisboa)' },
  
  'AF': { iata: 'AF', icao: 'AFR', name: 'AIR FRANCE', fullName: 'Air France', country: 'França', flag: '🇫🇷', logoUrl: 'https://images.kiwi.com/airlines/64/AF.png', fallbackColor: '#002157', hub: 'LFPG (Paris CDG)' },
  'AIR FRANCE': { iata: 'AF', icao: 'AFR', name: 'AIR FRANCE', fullName: 'Air France', country: 'França', flag: '🇫🇷', logoUrl: 'https://images.kiwi.com/airlines/64/AF.png', fallbackColor: '#002157', hub: 'LFPG (Paris CDG)' },
  'AFR': { iata: 'AF', icao: 'AFR', name: 'AIR FRANCE', fullName: 'Air France', country: 'França', flag: '🇫🇷', logoUrl: 'https://images.kiwi.com/airlines/64/AF.png', fallbackColor: '#002157', hub: 'LFPG (Paris CDG)' },
  
  'LH': { iata: 'LH', icao: 'DLH', name: 'LUFTHANSA', fullName: 'Deutsche Lufthansa AG', country: 'Alemanha', flag: '🇩🇪', logoUrl: 'https://images.kiwi.com/airlines/64/LH.png', fallbackColor: '#05164D', hub: 'EDDF (Frankfurt)' },
  'LUFTHANSA': { iata: 'LH', icao: 'DLH', name: 'LUFTHANSA', fullName: 'Deutsche Lufthansa AG', country: 'Alemanha', flag: '🇩🇪', logoUrl: 'https://images.kiwi.com/airlines/64/LH.png', fallbackColor: '#05164D', hub: 'EDDF (Frankfurt)' },
  'DLH': { iata: 'LH', icao: 'DLH', name: 'LUFTHANSA', fullName: 'Deutsche Lufthansa AG', country: 'Alemanha', flag: '🇩🇪', logoUrl: 'https://images.kiwi.com/airlines/64/LH.png', fallbackColor: '#05164D', hub: 'EDDF (Frankfurt)' },
  
  'CM': { iata: 'CM', icao: 'CMP', name: 'COPA', fullName: 'Copa Airlines (Compañía Panameña)', country: 'Panamá', flag: '🇵🇦', logoUrl: 'https://images.kiwi.com/airlines/64/CM.png', fallbackColor: '#004A97', hub: 'MPTO (Cidade do Panamá)' },
  'COPA': { iata: 'CM', icao: 'CMP', name: 'COPA', fullName: 'Copa Airlines (Compañía Panameña)', country: 'Panamá', flag: '🇵🇦', logoUrl: 'https://images.kiwi.com/airlines/64/CM.png', fallbackColor: '#004A97', hub: 'MPTO (Cidade do Panamá)' },
  'COPA AIRLINES': { iata: 'CM', icao: 'CMP', name: 'COPA', fullName: 'Copa Airlines (Compañía Panameña)', country: 'Panamá', flag: '🇵🇦', logoUrl: 'https://images.kiwi.com/airlines/64/CM.png', fallbackColor: '#004A97', hub: 'MPTO (Cidade do Panamá)' },
  'CMP': { iata: 'CM', icao: 'CMP', name: 'COPA', fullName: 'Copa Airlines (Compañía Panameña)', country: 'Panamá', flag: '🇵🇦', logoUrl: 'https://images.kiwi.com/airlines/64/CM.png', fallbackColor: '#004A97', hub: 'MPTO (Cidade do Panamá)' },
  
  'UA': { iata: 'UA', icao: 'UAL', name: 'UNITED', fullName: 'United Airlines, Inc.', country: 'Estados Unidos', flag: '🇺🇸', logoUrl: 'https://images.kiwi.com/airlines/64/UA.png', fallbackColor: '#002244', hub: 'KIAH / KORD' },
  'UNITED': { iata: 'UA', icao: 'UAL', name: 'UNITED', fullName: 'United Airlines, Inc.', country: 'Estados Unidos', flag: '🇺🇸', logoUrl: 'https://images.kiwi.com/airlines/64/UA.png', fallbackColor: '#002244', hub: 'KIAH / KORD' },
  'UAL': { iata: 'UA', icao: 'UAL', name: 'UNITED', fullName: 'United Airlines, Inc.', country: 'Estados Unidos', flag: '🇺🇸', logoUrl: 'https://images.kiwi.com/airlines/64/UA.png', fallbackColor: '#002244', hub: 'KIAH / KORD' },
  
  'AA': { iata: 'AA', icao: 'AAL', name: 'AMERICAN', fullName: 'American Airlines, Inc.', country: 'Estados Unidos', flag: '🇺🇸', logoUrl: 'https://images.kiwi.com/airlines/64/AA.png', fallbackColor: '#0078D2', hub: 'KMIA / KDFW' },
  'AMERICAN': { iata: 'AA', icao: 'AAL', name: 'AMERICAN', fullName: 'American Airlines, Inc.', country: 'Estados Unidos', flag: '🇺🇸', logoUrl: 'https://images.kiwi.com/airlines/64/AA.png', fallbackColor: '#0078D2', hub: 'KMIA / KDFW' },
  'AMERICAN AIRLINES': { iata: 'AA', icao: 'AAL', name: 'AMERICAN', fullName: 'American Airlines, Inc.', country: 'Estados Unidos', flag: '🇺🇸', logoUrl: 'https://images.kiwi.com/airlines/64/AA.png', fallbackColor: '#0078D2', hub: 'KMIA / KDFW' },
  'AAL': { iata: 'AA', icao: 'AAL', name: 'AMERICAN', fullName: 'American Airlines, Inc.', country: 'Estados Unidos', flag: '🇺🇸', logoUrl: 'https://images.kiwi.com/airlines/64/AA.png', fallbackColor: '#0078D2', hub: 'KMIA / KDFW' },
  
  'KL': { iata: 'KL', icao: 'KLM', name: 'KLM', fullName: 'KLM Royal Dutch Airlines', country: 'Holanda', flag: '🇳🇱', logoUrl: 'https://images.kiwi.com/airlines/64/KL.png', fallbackColor: '#00A1DE', hub: 'EHAM (Amsterdam)' },
  'KLM': { iata: 'KL', icao: 'KLM', name: 'KLM', fullName: 'KLM Royal Dutch Airlines', country: 'Holanda', flag: '🇳🇱', logoUrl: 'https://images.kiwi.com/airlines/64/KL.png', fallbackColor: '#00A1DE', hub: 'EHAM (Amsterdam)' },
  
  'DL': { iata: 'DL', icao: 'DAL', name: 'DELTA', fullName: 'Delta Air Lines', country: 'Estados Unidos', flag: '🇺🇸', logoUrl: 'https://images.kiwi.com/airlines/64/DL.png', fallbackColor: '#C8102E', hub: 'KATL (Atlanta)' },
  'DELTA': { iata: 'DL', icao: 'DAL', name: 'DELTA', fullName: 'Delta Air Lines', country: 'Estados Unidos', flag: '🇺🇸', logoUrl: 'https://images.kiwi.com/airlines/64/DL.png', fallbackColor: '#C8102E', hub: 'KATL (Atlanta)' },
  'DAL': { iata: 'DL', icao: 'DAL', name: 'DELTA', fullName: 'Delta Air Lines', country: 'Estados Unidos', flag: '🇺🇸', logoUrl: 'https://images.kiwi.com/airlines/64/DL.png', fallbackColor: '#C8102E', hub: 'KATL (Atlanta)' },
  
  'TT': { iata: 'TT', icao: 'TTL', name: 'TOTAL', fullName: 'Total Linhas Aéreas / Cargo', country: 'Brasil', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/TT.png', fallbackColor: '#1A365D', hub: 'SBGR / SBCF' },
  'TOTAL': { iata: 'TT', icao: 'TTL', name: 'TOTAL', fullName: 'Total Linhas Aéreas / Cargo', country: 'Brasil', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/TT.png', fallbackColor: '#1A365D', hub: 'SBGR / SBCF' },
  
  'QR': { iata: 'QR', icao: 'QTR', name: 'QATAR', fullName: 'Qatar Airways', country: 'Catar', flag: '🇶🇦', logoUrl: 'https://images.kiwi.com/airlines/64/QR.png', fallbackColor: '#5C0632', hub: 'OTHH (Doha)' },
  'QATAR': { iata: 'QR', icao: 'QTR', name: 'QATAR', fullName: 'Qatar Airways', country: 'Catar', flag: '🇶🇦', logoUrl: 'https://images.kiwi.com/airlines/64/QR.png', fallbackColor: '#5C0632', hub: 'OTHH (Doha)' },
  'QTR': { iata: 'QR', icao: 'QTR', name: 'QATAR', fullName: 'Qatar Airways', country: 'Catar', flag: '🇶🇦', logoUrl: 'https://images.kiwi.com/airlines/64/QR.png', fallbackColor: '#5C0632', hub: 'OTHH (Doha)' },
  
  'EK': { iata: 'EK', icao: 'UAE', name: 'EMIRATES', fullName: 'Emirates Airline', country: 'Emirados Árabes Unidos', flag: '🇦🇪', logoUrl: 'https://images.kiwi.com/airlines/64/EK.png', fallbackColor: '#D71921', hub: 'OMDB (Dubai)' },
  'EMIRATES': { iata: 'EK', icao: 'UAE', name: 'EMIRATES', fullName: 'Emirates Airline', country: 'Emirados Árabes Unidos', flag: '🇦🇪', logoUrl: 'https://images.kiwi.com/airlines/64/EK.png', fallbackColor: '#D71921', hub: 'OMDB (Dubai)' },
  'UAE': { iata: 'EK', icao: 'UAE', name: 'EMIRATES', fullName: 'Emirates Airline', country: 'Emirados Árabes Unidos', flag: '🇦🇪', logoUrl: 'https://images.kiwi.com/airlines/64/EK.png', fallbackColor: '#D71921', hub: 'OMDB (Dubai)' },
  
  'AR': { iata: 'AR', icao: 'ARG', name: 'AEROLINEAS', fullName: 'Aerolíneas Argentinas', country: 'Argentina', flag: '🇦🇷', logoUrl: 'https://images.kiwi.com/airlines/64/AR.png', fallbackColor: '#0080C6', hub: 'SAEZ / SABE (Buenos Aires)' },
  'AEROLINEAS': { iata: 'AR', icao: 'ARG', name: 'AEROLINEAS', fullName: 'Aerolíneas Argentinas', country: 'Argentina', flag: '🇦🇷', logoUrl: 'https://images.kiwi.com/airlines/64/AR.png', fallbackColor: '#0080C6', hub: 'SAEZ / SABE (Buenos Aires)' },
  'ARG': { iata: 'AR', icao: 'ARG', name: 'AEROLINEAS', fullName: 'Aerolíneas Argentinas', country: 'Argentina', flag: '🇦🇷', logoUrl: 'https://images.kiwi.com/airlines/64/AR.png', fallbackColor: '#0080C6', hub: 'SAEZ / SABE (Buenos Aires)' },
  
  'H2': { iata: 'H2', icao: 'SKU', name: 'SKY', fullName: 'SKY Airline', country: 'Chile', flag: '🇨🇱', logoUrl: 'https://images.kiwi.com/airlines/64/H2.png', fallbackColor: '#800080', hub: 'SCEL (Santiago)' },
  'SKY': { iata: 'H2', icao: 'SKU', name: 'SKY', fullName: 'SKY Airline', country: 'Chile', flag: '🇨🇱', logoUrl: 'https://images.kiwi.com/airlines/64/H2.png', fallbackColor: '#800080', hub: 'SCEL (Santiago)' },
  'SKU': { iata: 'H2', icao: 'SKU', name: 'SKY', fullName: 'SKY Airline', country: 'Chile', flag: '🇨🇱', logoUrl: 'https://images.kiwi.com/airlines/64/H2.png', fallbackColor: '#800080', hub: 'SCEL (Santiago)' },
  
  'AV': { iata: 'AV', icao: 'AVA', name: 'AVIANCA', fullName: 'Avianca', country: 'Colômbia', flag: '🇨🇴', logoUrl: 'https://images.kiwi.com/airlines/64/AV.png', fallbackColor: '#E20613', hub: 'SKBO (Bogotá)' },
  'AVIANCA': { iata: 'AV', icao: 'AVA', name: 'AVIANCA', fullName: 'Avianca', country: 'Colômbia', flag: '🇨🇴', logoUrl: 'https://images.kiwi.com/airlines/64/AV.png', fallbackColor: '#E20613', hub: 'SKBO (Bogotá)' },
  'AVA': { iata: 'AV', icao: 'AVA', name: 'AVIANCA', fullName: 'Avianca', country: 'Colômbia', flag: '🇨🇴', logoUrl: 'https://images.kiwi.com/airlines/64/AV.png', fallbackColor: '#E20613', hub: 'SKBO (Bogotá)' },
  
  'OB': { iata: 'OB', icao: 'BOV', name: 'BOA', fullName: 'Boliviana de Aviación (BoA)', country: 'Bolívia', flag: '🇧🇴', logoUrl: 'https://images.kiwi.com/airlines/64/OB.png', fallbackColor: '#002B49', hub: 'SLVR (Santa Cruz)' },
  'BOA': { iata: 'OB', icao: 'BOV', name: 'BOA', fullName: 'Boliviana de Aviación (BoA)', country: 'Bolívia', flag: '🇧🇴', logoUrl: 'https://images.kiwi.com/airlines/64/OB.png', fallbackColor: '#002B49', hub: 'SLVR (Santa Cruz)' },
  'BOV': { iata: 'OB', icao: 'BOV', name: 'BOA', fullName: 'Boliviana de Aviación (BoA)', country: 'Bolívia', flag: '🇧🇴', logoUrl: 'https://images.kiwi.com/airlines/64/OB.png', fallbackColor: '#002B49', hub: 'SLVR (Santa Cruz)' },
  
  'BA': { iata: 'BA', icao: 'BAW', name: 'BRITISH', fullName: 'British Airways', country: 'Reino Unido', flag: '🇬🇧', logoUrl: 'https://images.kiwi.com/airlines/64/BA.png', fallbackColor: '#075AAA', hub: 'EGLL (Londres Heathrow)' },
  'BRITISH': { iata: 'BA', icao: 'BAW', name: 'BRITISH', fullName: 'British Airways', country: 'Reino Unido', flag: '🇬🇧', logoUrl: 'https://images.kiwi.com/airlines/64/BA.png', fallbackColor: '#075AAA', hub: 'EGLL (Londres Heathrow)' },
  'BAW': { iata: 'BA', icao: 'BAW', name: 'BRITISH', fullName: 'British Airways', country: 'Reino Unido', flag: '🇬🇧', logoUrl: 'https://images.kiwi.com/airlines/64/BA.png', fallbackColor: '#075AAA', hub: 'EGLL (Londres Heathrow)' },
  
  'IB': { iata: 'IB', icao: 'IBE', name: 'IBERIA', fullName: 'Iberia Líneas Aéreas de España', country: 'Espanha', flag: '🇪🇸', logoUrl: 'https://images.kiwi.com/airlines/64/IB.png', fallbackColor: '#D71920', hub: 'LEMD (Madri Barajas)' },
  'IBERIA': { iata: 'IB', icao: 'IBE', name: 'IBERIA', fullName: 'Iberia Líneas Aéreas de España', country: 'Espanha', flag: '🇪🇸', logoUrl: 'https://images.kiwi.com/airlines/64/IB.png', fallbackColor: '#D71920', hub: 'LEMD (Madri Barajas)' },
  'IBE': { iata: 'IB', icao: 'IBE', name: 'IBERIA', fullName: 'Iberia Líneas Aéreas de España', country: 'Espanha', flag: '🇪🇸', logoUrl: 'https://images.kiwi.com/airlines/64/IB.png', fallbackColor: '#D71920', hub: 'LEMD (Madri Barajas)' },
  
  'LX': { iata: 'LX', icao: 'SWR', name: 'SWISS', fullName: 'Swiss International Air Lines', country: 'Suíça', flag: '🇨🇭', logoUrl: 'https://images.kiwi.com/airlines/64/LX.png', fallbackColor: '#E30613', hub: 'LSZH (Zurique)' },
  'SWISS': { iata: 'LX', icao: 'SWR', name: 'SWISS', fullName: 'Swiss International Air Lines', country: 'Suíça', flag: '🇨🇭', logoUrl: 'https://images.kiwi.com/airlines/64/LX.png', fallbackColor: '#E30613', hub: 'LSZH (Zurique)' },
  'SWR': { iata: 'LX', icao: 'SWR', name: 'SWISS', fullName: 'Swiss International Air Lines', country: 'Suíça', flag: '🇨🇭', logoUrl: 'https://images.kiwi.com/airlines/64/LX.png', fallbackColor: '#E30613', hub: 'LSZH (Zurique)' },
  
  'AZ': { iata: 'AZ', icao: 'ITY', name: 'ITA', fullName: 'ITA Airways (Italia Trasporto Aereo)', country: 'Itália', flag: '🇮🇹', logoUrl: 'https://images.kiwi.com/airlines/64/AZ.png', fallbackColor: '#003399', hub: 'LIRF (Roma Fiumicino)' },
  'ITA': { iata: 'AZ', icao: 'ITY', name: 'ITA', fullName: 'ITA Airways (Italia Trasporto Aereo)', country: 'Itália', flag: '🇮🇹', logoUrl: 'https://images.kiwi.com/airlines/64/AZ.png', fallbackColor: '#003399', hub: 'LIRF (Roma Fiumicino)' },
  'ITY': { iata: 'AZ', icao: 'ITY', name: 'ITA', fullName: 'ITA Airways (Italia Trasporto Aereo)', country: 'Itália', flag: '🇮🇹', logoUrl: 'https://images.kiwi.com/airlines/64/AZ.png', fallbackColor: '#003399', hub: 'LIRF (Roma Fiumicino)' },
  
  'TK': { iata: 'TK', icao: 'THY', name: 'TURKISH', fullName: 'Turkish Airlines', country: 'Turquia', flag: '🇹🇷', logoUrl: 'https://images.kiwi.com/airlines/64/TK.png', fallbackColor: '#C8102E', hub: 'LTFM (Istambul)' },
  'TURKISH': { iata: 'TK', icao: 'THY', name: 'TURKISH', fullName: 'Turkish Airlines', country: 'Turquia', flag: '🇹🇷', logoUrl: 'https://images.kiwi.com/airlines/64/TK.png', fallbackColor: '#C8102E', hub: 'LTFM (Istambul)' },
  'THY': { iata: 'TK', icao: 'THY', name: 'TURKISH', fullName: 'Turkish Airlines', country: 'Turquia', flag: '🇹🇷', logoUrl: 'https://images.kiwi.com/airlines/64/TK.png', fallbackColor: '#C8102E', hub: 'LTFM (Istambul)' },
  
  'ET': { iata: 'ET', icao: 'ETH', name: 'ETHIOPIAN', fullName: 'Ethiopian Airlines', country: 'Etiópia', flag: '🇪🇹', logoUrl: 'https://images.kiwi.com/airlines/64/ET.png', fallbackColor: '#008751', hub: 'HAAB (Adis Abeba)' },
  'ETHIOPIAN': { iata: 'ET', icao: 'ETH', name: 'ETHIOPIAN', fullName: 'Ethiopian Airlines', country: 'Etiópia', flag: '🇪🇹', logoUrl: 'https://images.kiwi.com/airlines/64/ET.png', fallbackColor: '#008751', hub: 'HAAB (Adis Abeba)' },
  'ETH': { iata: 'ET', icao: 'ETH', name: 'ETHIOPIAN', fullName: 'Ethiopian Airlines', country: 'Etiópia', flag: '🇪🇹', logoUrl: 'https://images.kiwi.com/airlines/64/ET.png', fallbackColor: '#008751', hub: 'HAAB (Adis Abeba)' },
  
  'AC': { iata: 'AC', icao: 'ACA', name: 'AIR CANADA', fullName: 'Air Canada', country: 'Canadá', flag: '🇨🇦', logoUrl: 'https://images.kiwi.com/airlines/64/AC.png', fallbackColor: '#E31837', hub: 'CYYZ (Toronto)' },
  'AIR CANADA': { iata: 'AC', icao: 'ACA', name: 'AIR CANADA', fullName: 'Air Canada', country: 'Canadá', flag: '🇨🇦', logoUrl: 'https://images.kiwi.com/airlines/64/AC.png', fallbackColor: '#E31837', hub: 'CYYZ (Toronto)' },
  'ACA': { iata: 'AC', icao: 'ACA', name: 'AIR CANADA', fullName: 'Air Canada', country: 'Canadá', flag: '🇨🇦', logoUrl: 'https://images.kiwi.com/airlines/64/AC.png', fallbackColor: '#E31837', hub: 'CYYZ (Toronto)' },
  
  'AM': { iata: 'AM', icao: 'AMX', name: 'AEROMEXICO', fullName: 'Aeroméxico', country: 'México', flag: '🇲🇽', logoUrl: 'https://images.kiwi.com/airlines/64/AM.png', fallbackColor: '#0B2341', hub: 'MMMX (Cidade do México)' },
  'AEROMEXICO': { iata: 'AM', icao: 'AMX', name: 'AEROMEXICO', fullName: 'Aeroméxico', country: 'México', flag: '🇲🇽', logoUrl: 'https://images.kiwi.com/airlines/64/AM.png', fallbackColor: '#0B2341', hub: 'MMMX (Cidade do México)' },
  'AMX': { iata: 'AM', icao: 'AMX', name: 'AEROMEXICO', fullName: 'Aeroméxico', country: 'México', flag: '🇲🇽', logoUrl: 'https://images.kiwi.com/airlines/64/AM.png', fallbackColor: '#0B2341', hub: 'MMMX (Cidade do México)' },
  
  '2Z': { iata: '2Z', icao: 'PTB', name: 'VOEPASS', fullName: 'Voepass Linhas Aéreas', country: 'Brasil', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/2Z.png', fallbackColor: '#E65100', hub: 'SBRP / SBGR / SBSP' },
  'VOEPASS': { iata: '2Z', icao: 'PTB', name: 'VOEPASS', fullName: 'Voepass Linhas Aéreas', country: 'Brasil', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/2Z.png', fallbackColor: '#E65100', hub: 'SBRP / SBGR / SBSP' },
  'PTB': { iata: '2Z', icao: 'PTB', name: 'VOEPASS', fullName: 'Voepass Linhas Aéreas', country: 'Brasil', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/2Z.png', fallbackColor: '#E65100', hub: 'SBRP / SBGR / SBSP' },
  'PASSAREDO': { iata: '2Z', icao: 'PTB', name: 'VOEPASS', fullName: 'Voepass Linhas Aéreas', country: 'Brasil', flag: '🇧🇷', logoUrl: 'https://images.kiwi.com/airlines/64/2Z.png', fallbackColor: '#E65100', hub: 'SBRP / SBGR / SBSP' },
  
  'UX': { iata: 'UX', icao: 'AEA', name: 'AIR EUROPA', fullName: 'Air Europa Líneas Aéreas', country: 'Espanha', flag: '🇪🇸', logoUrl: 'https://images.kiwi.com/airlines/64/UX.png', fallbackColor: '#0072CE', hub: 'LEMD (Madri Barajas)' },
  'AIR EUROPA': { iata: 'UX', icao: 'AEA', name: 'AIR EUROPA', fullName: 'Air Europa Líneas Aéreas', country: 'Espanha', flag: '🇪🇸', logoUrl: 'https://images.kiwi.com/airlines/64/UX.png', fallbackColor: '#0072CE', hub: 'LEMD (Madri Barajas)' },
  'AEA': { iata: 'UX', icao: 'AEA', name: 'AIR EUROPA', fullName: 'Air Europa Líneas Aéreas', country: 'Espanha', flag: '🇪🇸', logoUrl: 'https://images.kiwi.com/airlines/64/UX.png', fallbackColor: '#0072CE', hub: 'LEMD (Madri Barajas)' },
  
  '5Y': { iata: '5Y', icao: 'GTI', name: 'ATLAS', fullName: 'Atlas Air Worldwide', country: 'Estados Unidos', flag: '🇺🇸', logoUrl: 'https://images.kiwi.com/airlines/64/5Y.png', fallbackColor: '#002B49', hub: 'KMIA / KORD / SBGR' },
  'ATLAS': { iata: '5Y', icao: 'GTI', name: 'ATLAS', fullName: 'Atlas Air Worldwide', country: 'Estados Unidos', flag: '🇺🇸', logoUrl: 'https://images.kiwi.com/airlines/64/5Y.png', fallbackColor: '#002B49', hub: 'KMIA / KORD / SBGR' },
  
  'AT': { iata: 'AT', icao: 'RAM', name: 'ROYAL AIR', fullName: 'Royal Air Maroc', country: 'Marrocos', flag: '🇲🇦', logoUrl: 'https://images.kiwi.com/airlines/64/AT.png', fallbackColor: '#A30014', hub: 'GMMN (Casablanca)' },
  'ROYAL AIR': { iata: 'AT', icao: 'RAM', name: 'ROYAL AIR', fullName: 'Royal Air Maroc', country: 'Marrocos', flag: '🇲🇦', logoUrl: 'https://images.kiwi.com/airlines/64/AT.png', fallbackColor: '#A30014', hub: 'GMMN (Casablanca)' },
  
  'CV': { iata: 'CV', icao: 'CLX', name: 'CARGOLUX', fullName: 'Cargolux Airlines International', country: 'Luxemburgo', flag: '🇱🇺', logoUrl: 'https://images.kiwi.com/airlines/64/CV.png', fallbackColor: '#D50032', hub: 'ELLX (Luxemburgo)' },
  'CARGOLUX': { iata: 'CV', icao: 'CLX', name: 'CARGOLUX', fullName: 'Cargolux Airlines International', country: 'Luxemburgo', flag: '🇱🇺', logoUrl: 'https://images.kiwi.com/airlines/64/CV.png', fallbackColor: '#D50032', hub: 'ELLX (Luxemburgo)' },
};

export const getNormalizedAirlineInfo = (code: string): AirlineData => {
  const upperCode = code?.toUpperCase()?.trim() || '';
  if (!upperCode) {
    return { 
      iata: '', 
      icao: '', 
      name: 'N/A', 
      fullName: 'Companhia Não Especificada', 
      country: 'Desconhecido', 
      flag: '✈️', 
      logoUrl: '', 
      fallbackColor: '#4A5568' 
    };
  }

  if (upperCode.includes('LA') && upperCode.includes('TAM') || upperCode.includes('LATAM') || upperCode === 'JJ') {
    return AIRLINE_INFO['LA'];
  }
  if (upperCode.includes('GOL') || upperCode.includes('G3') || upperCode.includes('GLO') || upperCode === 'RG') {
    return AIRLINE_INFO['G3'];
  }
  if (upperCode.includes('AZUL') || upperCode.includes('AD') || upperCode.includes('AZU')) {
    return AIRLINE_INFO['AD'];
  }
  if (upperCode.includes('TAP') || upperCode.includes('TP')) {
    return AIRLINE_INFO['TP'];
  }
  if (upperCode.includes('FRANCE') || upperCode.includes('AFR') || upperCode === 'AF') {
    return AIRLINE_INFO['AF'];
  }
  if (upperCode.includes('LUFTHANSA') || upperCode.includes('DLH') || upperCode === 'LH') {
    return AIRLINE_INFO['LH'];
  }
  if (upperCode.includes('COPA') || upperCode.includes('CM') || upperCode.includes('CMP')) {
    return AIRLINE_INFO['CM'];
  }
  if (upperCode.includes('UNITED') || upperCode.includes('UA') || upperCode.includes('UAL')) {
    return AIRLINE_INFO['UA'];
  }
  if (upperCode.includes('AMERICAN') || upperCode.includes('AA') || upperCode.includes('AAL')) {
    return AIRLINE_INFO['AA'];
  }
  if (upperCode.includes('KLM') || upperCode === 'KL') {
    return AIRLINE_INFO['KL'];
  }
  if (upperCode.includes('DELTA') || upperCode.includes('DAL') || upperCode === 'DL') {
    return AIRLINE_INFO['DL'];
  }
  if (upperCode.includes('TOTAL') || upperCode.includes('TTL') || upperCode === 'TT') {
    return AIRLINE_INFO['TT'];
  }
  if (upperCode.includes('QATAR') || upperCode.includes('QTR') || upperCode === 'QR') {
    return AIRLINE_INFO['QR'];
  }
  if (upperCode.includes('EMIRATES') || upperCode.includes('UAE') || upperCode === 'EK') {
    return AIRLINE_INFO['EK'];
  }
  if (upperCode.includes('AEROLINEAS') || upperCode.includes('ARG') || upperCode === 'AR') {
    return AIRLINE_INFO['AR'];
  }
  if (upperCode.includes('SKY') || upperCode.includes('SKU') || upperCode === 'H2') {
    return AIRLINE_INFO['H2'];
  }
  if (upperCode.includes('AVIANCA') || upperCode.includes('AVA') || upperCode === 'AV') {
    return AIRLINE_INFO['AV'];
  }
  if (upperCode.includes('BOA') || upperCode.includes('BOV') || upperCode === 'OB') {
    return AIRLINE_INFO['OB'];
  }
  if (upperCode.includes('BRITISH') || upperCode.includes('BAW') || upperCode === 'BA') {
    return AIRLINE_INFO['BA'];
  }
  if (upperCode.includes('IBERIA') || upperCode.includes('IBE') || upperCode === 'IB') {
    return AIRLINE_INFO['IB'];
  }
  if (upperCode.includes('SWISS') || upperCode.includes('SWR') || upperCode === 'LX') {
    return AIRLINE_INFO['LX'];
  }
  if (upperCode.includes('ITA') || upperCode.includes('ITY') || upperCode === 'AZ') {
    return AIRLINE_INFO['AZ'];
  }
  if (upperCode.includes('TURKISH') || upperCode.includes('THY') || upperCode === 'TK') {
    return AIRLINE_INFO['TK'];
  }
  if (upperCode.includes('ETHIOPIAN') || upperCode.includes('ETH') || upperCode === 'ET') {
    return AIRLINE_INFO['ET'];
  }
  if (upperCode.includes('AIR CANADA') || upperCode.includes('ACA') || upperCode === 'AC') {
    return AIRLINE_INFO['AC'];
  }
  if (upperCode.includes('AEROMEXICO') || upperCode.includes('AMX') || upperCode === 'AM') {
    return AIRLINE_INFO['AM'];
  }
  if (upperCode.includes('VOEPASS') || upperCode.includes('PASSAREDO') || upperCode === '2Z' || upperCode === 'PTB') {
    return AIRLINE_INFO['2Z'];
  }
  if (upperCode.includes('EUROPA') || upperCode === 'UX' || upperCode === 'AEA') {
    return AIRLINE_INFO['UX'];
  }
  if (upperCode.includes('ATLAS') || upperCode === '5Y' || upperCode === 'GTI') {
    return AIRLINE_INFO['5Y'];
  }

  const directMatch = AIRLINE_INFO[upperCode];
  if (directMatch) return directMatch;

  // Fallback inteligente
  const cleanIata = upperCode.substring(0, 2);
  const cleanName = upperCode.split(' ')[0] || upperCode;
  return {
    iata: cleanIata,
    name: cleanName,
    fullName: upperCode,
    country: 'Internacional / Brasil',
    flag: '✈️',
    logoUrl: `https://images.kiwi.com/airlines/64/${cleanIata}.png`,
    fallbackColor: '#475569'
  };
};

export const AirlineLogo: React.FC<AirlineLogoProps> = ({ 
  airlineCode, 
  className = '', 
  showName = false, 
  showTooltip = true,
  size = 'cell' 
}) => {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useTheme();
  
  const info = getNormalizedAirlineInfo(airlineCode);
  const iconUrl = info.logoUrl || `https://images.kiwi.com/airlines/64/${info.iata}.png`;

  const handleMouseEnter = () => {
    if (!showTooltip || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const placeAbove = rect.top > 120;
    setTooltipPos({
      top: placeAbove ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
      placeAbove
    });
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const sizeContainerClasses = {
    xs: 'w-5 h-4.5 p-0.5',
    sm: 'w-8 h-6 p-0.5',
    md: 'w-10 h-7 p-0.5',
    lg: 'w-12 h-8 p-1',
    xl: 'w-14 h-9 p-1',
    cell: 'w-full h-full p-1',
    full: 'w-full h-full p-0.5'
  };

  const imgSizeClasses = {
    xs: 'max-h-3.5 max-w-full',
    sm: 'max-h-5 max-w-full',
    md: 'max-h-6 max-w-full',
    lg: 'max-h-7 max-w-full',
    xl: 'max-h-8 max-w-full',
    cell: 'w-full h-full max-h-[32px] object-contain',
    full: 'max-h-full max-w-full'
  };

  return (
    <>
      <div 
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-flex items-center justify-center relative w-full h-full cursor-pointer select-none group/logo ${className}`}
      >
        <div 
          className={`
            ${sizeContainerClasses[size]} 
            flex items-center justify-center shrink-0 
            ${size === 'cell' 
              ? 'bg-transparent w-full h-full p-0 border-none shadow-none rounded-none' 
              : 'bg-white rounded shadow-[0_1px_3px_rgba(0,0,0,0.12)] border border-slate-200/90 dark:border-slate-700/80'
            } 
            transition-all duration-150 group-hover/logo:scale-105 overflow-hidden
          `}
        >
          {!imgError && iconUrl ? (
            <img 
              src={iconUrl} 
              alt={info.name} 
              className={`${imgSizeClasses[size]} object-contain`}
              onError={() => setImgError(true)}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center font-black font-mono tracking-tighter text-[9px] text-white rounded-xs px-0.5"
              style={{ backgroundColor: info.fallbackColor || '#334155' }}
            >
              {info.iata || airlineCode?.substring(0, 2) || '??'}
            </div>
          )}
        </div>

        {showName && (
          <span className={`ml-1.5 font-extrabold uppercase text-[11px] tracking-tight truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {info.name}
          </span>
        )}
      </div>

      {/* BALÃO FLUTUANTE SOFISTICADO (TOOLTIP PORTAL) */}
      {showTooltip && isHovered && tooltipPos && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: tooltipPos.placeAbove 
              ? 'translate(-50%, -100%)' 
              : 'translate(-50%, 0)',
            pointerEvents: 'none',
            zIndex: 99999
          }}
          className="animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="relative bg-slate-950/95 text-white backdrop-blur-md border border-emerald-500/40 rounded-xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.65)] min-w-[210px] max-w-[280px]">
            {/* Header com mini logo + nome comercial */}
            <div className="flex items-center gap-2.5 pb-2 mb-2 border-b border-white/10">
              <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-inner shrink-0 border border-slate-300">
                {!imgError && iconUrl ? (
                  <img src={iconUrl} alt={info.name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="font-mono font-black text-slate-900 text-[10px]">{info.iata || '??'}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-black text-[12px] tracking-tight text-white uppercase truncate">
                    {info.name}
                  </h4>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {info.iata}
                  </span>
                </div>
                {info.icao && (
                  <span className="text-[9px] font-mono text-slate-400">
                    ICAO: {info.icao}
                  </span>
                )}
              </div>
            </div>

            {/* Nome Corporativo Completo */}
            <div className="text-[10px] font-medium text-slate-300 leading-tight mb-2">
              {info.fullName}
            </div>

            {/* País de Origem e HUB */}
            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1.5 border-t border-white/5">
              <div className="flex items-center gap-1">
                <span>{info.flag || '✈️'}</span>
                <span className="font-semibold text-slate-200">{info.country}</span>
              </div>
              <span className="text-emerald-400 font-bold text-[8px] uppercase tracking-wider">
                HOMOLOGADA SBGR
              </span>
            </div>

            {/* Setinha direcional */}
            <div 
              className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-slate-950 border-emerald-500/40 rotate-45 ${
                tooltipPos.placeAbove 
                  ? 'bottom-[-6px] border-r border-b' 
                  : 'top-[-6px] border-l border-t'
              }`} 
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
