import React, { useState, useEffect, useMemo } from 'react';
import { OperatorProfile, FlightData, Vehicle } from '../types';
import { UserPlus, X, Check, User, AlertTriangle, Truck } from 'lucide-react';
import { POSITIONS_METADATA } from '../constants/aerodromoConfig';

interface DesigOprProps {
  isOpen: boolean;
  onClose: () => void;
  flight?: FlightData | null;
  vehicle?: Vehicle | null;
  operators: OperatorProfile[];
  onConfirm: (operatorId: string) => void;
  flights?: FlightData[];
  vehicles?: Vehicle[];
}

type Tab = 'SRV' | 'CTA';

export const DesigOpr: React.FC<DesigOprProps> = ({ 
  isOpen, 
  onClose, 
  flight, 
  vehicle, 
  operators, 
  onConfirm,
  flights = [],
  vehicles = []
}) => {
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('SRV');

  const isCtaMandatory = useMemo(() => {
    if (!flight) return false;
    const posId = flight.positionId || flight.parkingPosition;
    const posType = posId ? POSITIONS_METADATA[posId]?.type : null;
    return flight.vehicleType === 'CTA' || 
           flight.fleetType === 'CTA' || 
           flight.positionType === 'CTA' || 
           posType === 'REMOTA';
  }, [flight]);

  const operatorsWithVehicle = useMemo(() => {
    return operators.filter(op => {
      const isLinked = (op.assignedVehicle && op.assignedVehicle.trim() !== '') || 
                       (vehicles && vehicles.some(v => v.operatorId === op.id));
      return !!isLinked;
    });
  }, [operators, vehicles]);

  const filteredOperators = useMemo(() => {
    return operatorsWithVehicle.filter(op => {
      if (activeTab === 'CTA') {
        return op.habilitationCTA || op.role?.includes('CTA') || op.vehicleType === 'CTA';
      }
      return true;
    });
  }, [operatorsWithVehicle, activeTab]);

  useEffect(() => {
    if (isOpen) {
      setSelectedOperatorId(null);
      if (isCtaMandatory) {
        setActiveTab('CTA');
      } else {
        setActiveTab('SRV');
      }
    }
  }, [isOpen, isCtaMandatory]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedOperatorId) {
      onConfirm(selectedOperatorId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9995] backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                {flight ? `Designar Operador — Voo ${flight.flightNumber}` : vehicle ? `Designar Operador — Viatura ${vehicle.id}` : 'Designar Operador'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {flight?.parkingPosition ? `Posição: ${flight.parkingPosition} • ` : ''}
                {operatorsWithVehicle.length} operador(es) ativo(s) com viatura
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80 font-mono text-xs">
          <button
            onClick={() => setActiveTab('SRV')}
            className={`flex-1 py-2 rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-2 ${
              activeTab === 'SRV'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User size={14} /> SRV / Geral
          </button>
          <button
            onClick={() => setActiveTab('CTA')}
            className={`flex-1 py-2 rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-2 ${
              activeTab === 'CTA'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck size={14} /> Habilitados CTA
            {isCtaMandatory && (
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Banner Informativo de Regras */}
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl p-3.5 flex gap-3 text-[11px] leading-relaxed font-mono">
          <AlertTriangle size={18} className="shrink-0 text-amber-450 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider block text-amber-200">Requisito de Designação</span>
            <p>
              Não é possível designar um colaborador para atendimento de voo sem que ele tenha uma viatura/frota agregada ao seu nome.
            </p>
            <p className="text-slate-400">
              Caso o operador desejado não apareça listado abaixo, certifique-se de primeiramente vincular o colaborador à respectiva viatura na seção <strong className="text-slate-200">Mesa de Operadores (Escala / HUD de Equipe)</strong> para depois designá-lo ao voo.
            </p>
          </div>
        </div>

        {/* Operators List */}
        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
          {filteredOperators.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-mono text-xs">
              Nenhum operador disponível para este filtro
            </div>
          ) : (
            filteredOperators.map((op) => {
              const isSelected = selectedOperatorId === op.id;
              const vehicleDisplay = op.assignedVehicle 
                ? op.assignedVehicle.replace('SRV-', '').replace('CTA-', '')
                : (vehicles && vehicles.find(v => v.operatorId === op.id)?.id);

              return (
                <button
                  key={op.id}
                  onClick={() => setSelectedOperatorId(op.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                      : 'bg-slate-950/40 hover:bg-slate-800/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-black text-xs border ${
                      isSelected ? 'bg-blue-500 text-white border-blue-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {op.warName?.substring(0, 2).toUpperCase() || 'OP'}
                    </div>
                    <div>
                      <div className="text-xs font-black font-mono tracking-wide text-white flex items-center gap-1.5 flex-wrap">
                        <span>{op.warName}</span>
                        {vehicleDisplay && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-mono font-black uppercase tracking-wider">
                            VTR: {vehicleDisplay}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{op.name} • {op.role || 'Operador'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {op.habilitationCTA && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-mono font-bold">CTA</span>
                    )}
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedOperatorId}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-slate-950 py-3 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all shadow-md"
          >
            Confirmar
          </button>
        </div>

      </div>
    </div>
  );
};
