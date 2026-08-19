import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'motion/react';
import { FlightData, FlightLog, OperatorProfile, Vehicle, FlightStatus } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { findMatchingAircraft } from '../utils/aircraftMatcher';
import { getCityName } from '../utils/destinos';
import { getDestinos } from '../services/supabaseService';
import { 
  Plane, X, MapPin, Clock, Hash, Anchor, AlertCircle, Globe, GripHorizontal,
  Plus, FileText, CheckCircle, UserPlus, Users, Pen
} from 'lucide-react';

interface FlightDetailsModalProps {
  flight: FlightData;
  onClose: () => void;
  onUpdate: (updatedFlight: FlightData) => void;
  vehicles: Vehicle[];
  operators: OperatorProfile[];
  onOpenAssignSupport?: (flight: FlightData) => void;
  onOpenAssign?: (flight: FlightData) => void;
}

const abbreviateCityName = (cityName: string): string => {
  if (!cityName) return '--';
  let clean = cityName.split('-')[0].split('/')[0].trim();
  
  const words = clean.split(/\s+/);
  if (words.length > 1) {
    const lastWord = words[words.length - 1].toUpperCase();
    if (lastWord.length === 2 && /^[A-Z]{2}$/.test(lastWord)) {
      words.pop();
      clean = words.join(' ');
    }
  }

  const upper = clean.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
  
  if (upper === "CAMPO GRANDE") {
    return "C. GRANDE";
  }
  if (upper === "SAO JOSE DOS CAMPOS" || upper === "SAO JOSE CAMPOS") {
    return "SJ CAMPOS";
  }
  if (upper === "SAO PAULO") {
    return "S. PAULO";
  }
  if (upper === "BELO HORIZONTE") {
    return "B. HORIZONTE";
  }
  if (upper === "RIO DE JANEIRO") {
    return "R. JANEIRO";
  }
  if (upper === "PORTO ALEGRE") {
    return "P. ALEGRE";
  }
  if (upper === "FOZ DO IGUACU") {
    return "F. IGUACU";
  }
  
  if (clean.toUpperCase().startsWith("SÃO ")) {
    return "S. " + clean.toUpperCase().substring(4);
  }
  if (clean.toUpperCase().startsWith("SAO ")) {
    return "S. " + clean.toUpperCase().substring(4);
  }

  return clean.toUpperCase();
};

export const FlightDetailsModal: React.FC<FlightDetailsModalProps> = ({ 
  flight, 
  onClose, 
  onUpdate, 
  vehicles, 
  operators, 
  onOpenAssignSupport,
  onOpenAssign
}) => {
  const { isDarkMode } = useTheme();
  const [localFlight, setLocalFlight] = useState<FlightData>(flight);
  
  const [aircrafts, setAircrafts] = useState<any[]>([]);
  const [destinosDB, setDestinosDB] = useState<any[]>([]);
  
  useEffect(() => {
    const cached = localStorage.getItem('supabase_cache_aircrafts');
    if (cached) {
      setAircrafts(JSON.parse(cached));
    } else {
      import('../lib/supabase').then(({ supabase }) => {
        supabase.from('aeronaves').select('*').then(res => {
          if (res.data) setAircrafts(res.data);
        });
      });
    }
    getDestinos().then(destinos => {
      setDestinosDB(destinos);
    });
  }, []);

  // Drag Control
  const dragControls = useDragControls();
  const modalRef = useRef<HTMLDivElement>(null);

  // Editing States
  const [isEditingDest, setIsEditingDest] = useState(false);
  const [destInput, setDestInput] = useState(flight.destination);

  const [isEditingReg, setIsEditingReg] = useState(false);
  const [regInput, setRegInput] = useState(flight.registration);

  const [isEditingPos, setIsEditingPos] = useState(false);
  const [posInput, setPosInput] = useState(flight.positionId);
  
  const [isEditingEtd, setIsEditingEtd] = useState(false);
  const [etdInput, setEtdInput] = useState(flight.etd); 

  const [isEditingDepFlight, setIsEditingDepFlight] = useState(false);
  const [depFlightInput, setDepFlightInput] = useState(flight.departureFlightNumber || '');

  const [isEditingChock, setIsEditingChock] = useState(false);
  const [chockInput, setChockInput] = useState(flight.actualArrivalTime || ''); 

  const [obsInput, setObsInput] = useState(flight.observations || flight.report?.observations || '');

  // Countdown States
  const [timeRemaining, setTimeRemaining] = useState<string>('--m');
  const [timeDelay, setTimeDelay] = useState<string>('--m');

  // Sync effect
  useEffect(() => {
    setLocalFlight(flight);
    setDestInput(flight.destination);
    setRegInput(flight.registration);
    setPosInput(flight.positionId);
    setEtdInput(flight.etd);
    setDepFlightInput(flight.departureFlightNumber || '');
    setChockInput(flight.actualArrivalTime || '');
    setObsInput(flight.observations || flight.report?.observations || '');
  }, [flight]);

  // Handle countdown
  useEffect(() => {
    const updateTime = () => {
      if (!localFlight.etd) {
        setTimeRemaining('--m');
        setTimeDelay('--m');
        return;
      }
      
      const now = new Date();
      const [h, m] = localFlight.etd.split(':').map(Number);
      const target = new Date();
      target.setHours(h, m, 0, 0);
      
      let diffMs = target.getTime() - now.getTime();
      
      if (diffMs < -12 * 60 * 60 * 1000) {
        diffMs += 24 * 60 * 60 * 1000;
      } else if (diffMs > 12 * 60 * 60 * 1000) {
        diffMs -= 24 * 60 * 60 * 1000;
      }

      const diffMinsTotal = Math.floor(diffMs / 60000);
      
      if (diffMinsTotal >= 0) {
        const hours = Math.floor(diffMinsTotal / 60);
        const mins = diffMinsTotal % 60;
        if (hours > 0) {
          setTimeRemaining(`${hours}h${mins.toString().padStart(2, '0')}m`);
        } else {
          setTimeRemaining(`${mins}m`);
        }
        setTimeDelay('--m');
      } else {
        setTimeRemaining('0m');
        const absMins = Math.abs(diffMinsTotal);
        const hours = Math.floor(absMins / 60);
        const mins = absMins % 60;
        if (hours > 0) {
          setTimeDelay(`${hours}h${mins.toString().padStart(2, '0')}m`);
        } else {
          setTimeDelay(`${mins}m`);
        }
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [localFlight.etd]);

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const generateAuditLog = (field: string, oldValue: string | number | undefined, newValue: string | number | undefined): FlightLog => ({
    id: Date.now().toString(),
    timestamp: new Date(),
    type: 'MANUAL',
    message: `${field} alterado: ${oldValue || '--'} > ${newValue || '--'}`,
    author: 'GESTOR_MESA'
  });

  const handleSaveDest = () => {
    const formatted = destInput.toUpperCase().slice(0, 4);
    if (formatted === localFlight.destination) { setIsEditingDest(false); return; }

    const newLog = generateAuditLog('Destino', localFlight.destination, formatted);
    const updated = { 
      ...localFlight, 
      destination: formatted,
      logs: [...(localFlight.logs || []), newLog]
    };
    
    setLocalFlight(updated);
    onUpdate(updated);
    setIsEditingDest(false);
  };

  const handleSaveDepFlight = () => {
    const formatted = depFlightInput.toUpperCase();
    if (formatted === localFlight.departureFlightNumber) { setIsEditingDepFlight(false); return; }

    const newLog = generateAuditLog('Nº Voo (Saída)', localFlight.departureFlightNumber || '--', formatted);
    const updated = { 
      ...localFlight, 
      departureFlightNumber: formatted,
      logs: [...(localFlight.logs || []), newLog]
    };
    
    setLocalFlight(updated);
    onUpdate(updated);
    setIsEditingDepFlight(false);
  };

  const handleSaveReg = () => {
    if (regInput === localFlight.registration) { setIsEditingReg(false); return; }

    const match = findMatchingAircraft(
      aircrafts,
      regInput,
      localFlight.airline,
      localFlight.airlineCode
    );

    const finalReg = match ? match.prefix : regInput.toUpperCase();
    const finalModel = match && match.model && match.model !== '--' ? match.model : localFlight.model;

    const newLog = generateAuditLog('Prefixo', localFlight.registration, finalReg);
    const logs = [...(localFlight.logs || []), newLog];

    if (finalModel !== localFlight.model) {
      const modelLog = generateAuditLog('Modelo (Auto)', localFlight.model || '--', finalModel);
      logs.push(modelLog);
    }

    const updated = { 
      ...localFlight, 
      registration: finalReg,
      model: finalModel,
      logs
    };

    setLocalFlight(updated);
    onUpdate(updated);
    setIsEditingReg(false);
  };

  const handleSavePos = () => {
    if (posInput === localFlight.positionId) { setIsEditingPos(false); return; }

    const newLog = generateAuditLog('Posição', localFlight.positionId, posInput);
    const updated = {
      ...localFlight,
      positionId: posInput,
      logs: [...(localFlight.logs || []), newLog]
    };

    setLocalFlight(updated);
    onUpdate(updated);
    setIsEditingPos(false);
  };

  const handleSaveEtd = () => {
    if (etdInput === localFlight.etd) { setIsEditingEtd(false); return; }

    const newLog = generateAuditLog('ETD', localFlight.etd, etdInput);
    const updated = { 
      ...localFlight, 
      etd: etdInput,
      logs: [...(localFlight.logs || []), newLog]
    };

    setLocalFlight(updated);
    onUpdate(updated);
    setIsEditingEtd(false);
  };

  const handleSaveChock = () => {
    if (chockInput === localFlight.actualArrivalTime) { setIsEditingChock(false); return; }

    const newLog = generateAuditLog('Calço', localFlight.actualArrivalTime || '--', chockInput);
    const updated = { 
      ...localFlight, 
      actualArrivalTime: chockInput,
      logs: [...(localFlight.logs || []), newLog]
    };

    setLocalFlight(updated);
    onUpdate(updated);
    setIsEditingChock(false);
  };

  const handleSaveObservations = (value: string) => {
    const val = value;
    const currentObs = localFlight.observations || localFlight.report?.observations || '';
    if (val === currentObs) return;

    const currentReport = localFlight.report || {};
    const updated = {
      ...localFlight,
      observations: val,
      report: {
        ...currentReport,
        observations: val
      }
    };

    setLocalFlight(updated);
    onUpdate(updated);
  };

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9990] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 pointer-events-auto bg-black/40 backdrop-blur-[2px] cursor-default" 
            onClick={onClose}
          />
          <motion.div 
            ref={modalRef}
            drag
            dragListener={false}
            dragControls={dragControls}
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`relative pointer-events-auto w-[460px] max-h-[90vh] rounded-xl overflow-hidden flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border ${
              isDarkMode 
                ? 'bg-slate-950/95 border-emerald-500/30' 
                : 'bg-white/95 border-slate-200'
            } backdrop-blur-xl select-none`}
          >
            {/* HEADER */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className={`px-4 py-3 cursor-grab active:cursor-grabbing flex justify-between items-center border-b transition-colors select-none ${
                isDarkMode 
                  ? 'bg-slate-950/60 border-slate-800' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <GripHorizontal size={14} className={`${isDarkMode ? 'text-slate-600' : 'text-slate-400'} shrink-0`} />
                
                <div className="w-9 h-9 flex items-center justify-center bg-white rounded-md shadow-inner p-1">
                  <img 
                    src={
                      (localFlight.airlineCode === 'RG' || localFlight.airlineCode === 'G3') 
                      ? 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Gol_Linhas_A%C3%A9reas_logo.svg/320px-Gol_Linhas_A%C3%A9reas_logo.svg.png'
                      : `https://images.kiwi.com/airlines/64/${localFlight.airlineCode || 'G3'}.png`
                    }
                    alt={localFlight.airline}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <div className="flex flex-col justify-center">
                  <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${isDarkMode ? 'text-emerald-500/80' : 'text-slate-500'}`}>
                    {localFlight.airline}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-lg font-black font-mono leading-none tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {localFlight.flightNumber}
                    </span>
                    <span className={`text-[9px] font-bold font-mono px-1 py-0.2 rounded border uppercase font-black ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800 text-slate-400' 
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>
                      FILA
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-black text-emerald-500 font-mono tracking-wider leading-none">
                    {localFlight.registration || '--'}
                  </span>
                  <span className={`text-[7px] font-black uppercase tracking-widest mt-1 leading-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    PREFIXO
                  </span>
                </div>
                
                <button 
                  onClick={onClose}
                  className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                    isDarkMode ? 'bg-slate-900/40 hover:bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-200/50 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* BODY */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {/* SECTION 1: dados do voo */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
                    dados do voo
                  </h3>
                  <div className={`h-px flex-1 ${isDarkMode ? 'bg-slate-850' : 'bg-slate-150'}`} />
                </div>

                {/* PRIMEIRA LINHA */}
                <div className="grid grid-cols-4 gap-2">
                  {/* VOO SAÍDA */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                      VOO SAÍDA
                    </span>
                    {isEditingDepFlight ? (
                      <input 
                        value={depFlightInput}
                        onChange={(e) => setDepFlightInput(e.target.value)}
                        onBlur={handleSaveDepFlight}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDepFlight(); if (e.key === 'Escape') setIsEditingDepFlight(false); }}
                        className="w-full font-mono bg-slate-100 dark:bg-slate-900 border border-emerald-500 text-slate-900 dark:text-slate-100 font-bold px-1.5 py-1 rounded text-xs text-center outline-none"
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => { setDepFlightInput(localFlight.departureFlightNumber || ''); setIsEditingDepFlight(true); }}
                        className="cursor-pointer font-mono bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all font-bold px-2 py-1 rounded text-xs text-center shadow-sm"
                      >
                        {localFlight.departureFlightNumber || '--'}
                      </div>
                    )}
                  </div>

                  {/* ICAO */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                      ICAO
                    </span>
                    {isEditingDest ? (
                      <input 
                        value={destInput} 
                        onChange={(e) => setDestInput(e.target.value)} 
                        onBlur={handleSaveDest}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDest(); if (e.key === 'Escape') setIsEditingDest(false); }}
                        className="w-full font-mono bg-slate-100 dark:bg-slate-900 border border-emerald-500 text-slate-900 dark:text-slate-100 font-bold px-1.5 py-1 rounded text-xs text-center outline-none"
                        maxLength={4}
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => { setDestInput(localFlight.destination); setIsEditingDest(true); }}
                        className="cursor-pointer font-mono bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all font-bold px-2 py-1 rounded text-xs text-center shadow-sm"
                      >
                        {localFlight.destination || '--'}
                      </div>
                    )}
                  </div>

                  {/* CIDADE */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                      CIDADE
                    </span>
                    <div className="font-mono bg-slate-100/40 dark:bg-slate-900/20 border border-slate-200/50 dark:border-slate-800/50 text-slate-500 dark:text-slate-400 font-bold px-1 py-1 rounded text-xs text-center uppercase truncate shadow-sm">
                      {localFlight.destination ? abbreviateCityName(getCityName(localFlight.destination, destinosDB)) : '--'}
                    </div>
                  </div>

                  {/* PREFIXO */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                      PREFIXO
                    </span>
                    {isEditingReg ? (
                      <input 
                        value={regInput} 
                        onChange={(e) => setRegInput(e.target.value)} 
                        onBlur={handleSaveReg}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveReg(); if (e.key === 'Escape') setIsEditingReg(false); }}
                        className="w-full font-mono bg-slate-100 dark:bg-slate-900 border border-emerald-500 text-slate-900 dark:text-slate-100 font-bold px-1.5 py-1 rounded text-xs text-center outline-none"
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => { setRegInput(localFlight.registration); setIsEditingReg(true); }}
                        className="cursor-pointer font-mono bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all font-bold px-2 py-1 text-xs text-center shadow-sm truncate border"
                      >
                        {localFlight.registration || '--'}
                      </div>
                    )}
                  </div>
                </div>

                {/* SEGUNDA LINHA */}
                <div className="grid grid-cols-4 gap-2 pt-1 font-mono">
                  {/* POSIÇÃO */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                      POSIÇÃO
                    </span>
                    {isEditingPos ? (
                      <input 
                        value={posInput} 
                        onChange={(e) => setPosInput(e.target.value)} 
                        onBlur={handleSavePos}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSavePos(); if (e.key === 'Escape') setIsEditingPos(false); }}
                        className="w-full font-mono bg-slate-100 dark:bg-slate-900 border border-emerald-500 text-slate-900 dark:text-slate-100 font-bold px-1.5 py-1 rounded text-xs text-center outline-none"
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => { setPosInput(localFlight.positionId || ''); setIsEditingPos(true); }}
                        className={`cursor-pointer font-mono border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all font-bold px-2 py-1 rounded text-xs text-center shadow-sm truncate ${
                          localFlight.positionType === 'CTA' 
                            ? 'bg-amber-500/10 border-amber-550/30 text-amber-500 dark:text-amber-400' 
                            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {localFlight.positionId || '--'}
                      </div>
                    )}
                  </div>

                  {/* ETD */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                      ETD
                    </span>
                    {isEditingEtd ? (
                      <input 
                        value={etdInput} 
                        onChange={(e) => setEtdInput(e.target.value)} 
                        onBlur={handleSaveEtd}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEtd(); if (e.key === 'Escape') setIsEditingEtd(false); }}
                        className="w-full font-mono bg-slate-100 dark:bg-slate-900 border border-emerald-500 text-slate-900 dark:text-slate-100 font-bold px-1.5 py-1 rounded text-xs text-center outline-none"
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => { setEtdInput(localFlight.etd); setIsEditingEtd(true); }}
                        className="cursor-pointer font-mono bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all font-bold px-2 py-1 rounded text-xs text-center shadow-sm truncate border"
                      >
                        {localFlight.etd || '--:--'}
                      </div>
                    )}
                  </div>

                  {/* CALÇO */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                      CALÇO
                    </span>
                    {isEditingChock ? (
                      <input 
                        value={chockInput} 
                        onChange={(e) => setChockInput(e.target.value)} 
                        onBlur={handleSaveChock}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveChock(); if (e.key === 'Escape') setIsEditingChock(false); }}
                        className="w-full font-mono bg-slate-100 dark:bg-slate-900 border border-emerald-500 text-slate-900 dark:text-slate-100 font-bold px-1.5 py-1 rounded text-xs text-center outline-none"
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => { setChockInput(localFlight.actualArrivalTime || ''); setIsEditingChock(true); }}
                        className="cursor-pointer font-mono bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all font-bold px-2 py-1 rounded text-xs text-center shadow-sm truncate border"
                      >
                        {localFlight.actualArrivalTime || '--:--'}
                      </div>
                    )}
                  </div>

                  {/* TEMPO REST */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                      TEM. REST.
                    </span>
                    <div className="font-mono bg-blue-500/10 border border-blue-500/20 text-blue-550 dark:text-blue-400 font-bold px-2 py-1 rounded text-xs text-center shadow-sm uppercase truncate h-[26px] flex items-center justify-center">
                      {timeRemaining}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Espaço vazio com a legenda "Em edição" */}
              <div className="pt-2.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                    Controle de Pendências
                  </h3>
                  <div className={`h-px flex-1 ${isDarkMode ? 'bg-slate-850' : 'bg-slate-150'}`} />
                </div>

                <div className={`p-8 text-center rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 ${
                  isDarkMode ? 'bg-slate-900/20 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-450'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDarkMode ? 'bg-slate-900 text-slate-500' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Pen size={12} className="animate-pulse text-amber-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Em edição</span>
                </div>
              </div>

              {/* SECTION 3: Observações */}
              <div className="pt-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-450' : 'text-emerald-800'}`}>
                    Observações gerais
                  </h3>
                  <div className={`h-px flex-1 ${isDarkMode ? 'bg-slate-850' : 'bg-slate-150'}`} />
                </div>
                
                <textarea
                  rows={2}
                  value={obsInput}
                  onChange={(e) => setObsInput(e.target.value)}
                  onBlur={() => handleSaveObservations(obsInput)}
                  className={`w-full text-xs p-2.5 rounded-lg border focus:ring-1 transition-all resize-none outline-none font-medium leading-relaxed ${
                    isDarkMode 
                      ? 'bg-slate-900/40 border-slate-800 text-slate-200 focus:border-amber-500/50 focus:ring-amber-500/20 placeholder:text-slate-600 shadow-inner' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-amber-500 focus:ring-amber-500/20 placeholder:text-slate-400'
                  }`}
                  placeholder="Digitar observações do voo... (clique fora para salvar)"
                />
              </div>
            </div>

            {/* FOOTER: EQUIPE DESIGNADA & BOTÕES HABILITADOS */}
            <div className={`p-4 border-t ${
              isDarkMode ? 'bg-slate-950/80 border-slate-900' : 'bg-slate-50/80 border-slate-150'
            }`}>
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                {/* LÍDER DESIGNADO */}
                <div className="flex flex-col gap-1.5 font-mono">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <UserPlus size={10} className="text-indigo-400" /> OPERADOR LÍDER
                  </span>
                  
                  {localFlight.operator ? (
                    <div 
                      onClick={() => onOpenAssign && onOpenAssign(localFlight)}
                      className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-505/5 transition-all transition-colors ${
                        isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-200 hover:bg-slate-900' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black bg-indigo-500/15 text-indigo-400 font-mono">
                        {localFlight.operator.charAt(0)}
                      </div>
                      <div className="truncate flex flex-col justify-center flex-1">
                        <span className="text-[10px] uppercase font-black tracking-tight">{localFlight.operator}</span>
                        <span className="text-[7px] font-mono font-bold tracking-widest opacity-60">
                          {localFlight.fleet ? `FLUXO ${localFlight.fleet}` : 'S/ TRATOR'}
                        </span>
                      </div>
                      <Pen size={10} className="text-slate-450 mr-1" />
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => onOpenAssign && onOpenAssign(localFlight)}
                      className={`h-11 border border-dashed rounded-lg flex flex-col items-center justify-center hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all select-none cursor-pointer ${
                        isDarkMode ? 'bg-slate-900/20 border-slate-850 text-slate-500 hover:text-indigo-400' : 'bg-slate-50 border-slate-250 text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      <UserPlus size={12} className="text-indigo-400 mb-0.5" />
                      <span className="text-[7px] font-black tracking-widest uppercase">Designar Operador</span>
                    </button>
                  )}
                </div>

                {/* AUXILIAR DE APOIO */}
                <div className="flex flex-col gap-1.5 font-mono">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Users size={10} className="text-emerald-500" /> APOIO AUXILIAR
                  </span>

                  {localFlight.supportOperator ? (
                    <div 
                      onClick={() => onOpenAssignSupport && onOpenAssignSupport(localFlight)}
                      className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-505/5 transition-all transition-colors ${
                        isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-200 hover:bg-slate-900' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black bg-emerald-500/15 text-emerald-400 font-mono">
                        {localFlight.supportOperator.charAt(0)}
                      </div>
                      <div className="truncate flex flex-col justify-center flex-1">
                        <span className="text-[10px] uppercase font-black tracking-tight">{localFlight.supportOperator}</span>
                        <span className="text-[7px] font-mono font-bold tracking-widest opacity-60">CO-PILOTO</span>
                      </div>
                      <Pen size={10} className="text-slate-450 mr-1" />
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => onOpenAssignSupport && onOpenAssignSupport(localFlight)}
                      className={`h-11 border border-dashed rounded-lg flex flex-col items-center justify-center hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all select-none cursor-pointer ${
                        isDarkMode ? 'bg-slate-900/20 border-slate-850 text-slate-500 hover:text-emerald-450' : 'bg-slate-50 border-slate-250 text-slate-600 hover:text-emerald-650'
                      }`}
                    >
                      <Plus size={12} className="text-emerald-500 mb-0.5" />
                      <span className="text-[7px] font-black tracking-widest uppercase">Vincular Apoio</span>
                    </button>
                  )}
                </div>
              </div>

              {/* BOTÕES DE CONFIRMAÇÃO DO MODAL */}
              <div className="flex gap-2.5">
                <button 
                  type="button"
                  onClick={onClose}
                  className={`flex-1 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-95 text-center ${
                    isDarkMode 
                      ? 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    onUpdate(localFlight);
                    onClose();
                  }}
                  className="flex-1 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] transition-all hover:scale-[1.01] active:scale-95 shadow-[0_4px_12px_rgba(16,185,129,0.2)] text-center flex items-center justify-center gap-1"
                >
                  <CheckCircle size={11} />
                  Concluído
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
};
