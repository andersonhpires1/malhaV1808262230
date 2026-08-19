import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Plus, Trash2, RefreshCw, Download, Search, AlertTriangle, CheckCircle2, ShieldAlert, FileSpreadsheet, Info, X, Plane } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { AirlineType, AircraftType } from '../types';
import { getNormalizedAirlineInfo } from './AirlineLogo';

interface AirlineFleetDetailProps {
  airline: AirlineType & { equipment_count?: number; flight_count?: number };
  isDarkMode: boolean;
  onBack: () => void;
  onAirlineUpdated: (updatedAirline: AirlineType & { equipment_count?: number; flight_count?: number }) => void;
}

type FleetField = 'logo' | 'prefix' | 'model' | 'missing_cap' | 'defective_door' | 'defective_panel' | 'no_autocut' | 'observations' | 'actions';

const FLEET_COLUMNS: { key: FleetField; label: string; width: string; isVariable: boolean }[] = [
  { key: 'logo', label: 'Logo', width: 'w-16', isVariable: false },
  { key: 'prefix', label: 'Prefixo', width: 'w-36', isVariable: true },
  { key: 'model', label: 'Modelo', width: 'w-36', isVariable: true },
  { key: 'missing_cap', label: 'S/ Tampa', width: 'w-28', isVariable: true },
  { key: 'defective_door', label: 'Portinhola Def.', width: 'w-32', isVariable: true },
  { key: 'defective_panel', label: 'Painel Def.', width: 'w-28', isVariable: true },
  { key: 'no_autocut', label: 'Falha Corte', width: 'w-28', isVariable: true },
  { key: 'observations', label: 'Observações / Restrições', width: 'w-auto min-w-[240px]', isVariable: true },
  { key: 'actions', label: 'Ações', width: 'w-20', isVariable: false },
];

const COMMON_MODELS = ['A320', 'A321', 'A330', 'A350', 'B737', 'B738', 'B777', 'B787', 'E195', 'ATR72'];

export const AirlineFleetDetail: React.FC<AirlineFleetDetailProps> = ({
  airline,
  isDarkMode,
  onBack,
  onAirlineUpdated,
}) => {
  const [currentAirline, setCurrentAirline] = useState(airline);
  const [aircrafts, setAircrafts] = useState<AircraftType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [damageFilter, setDamageFilter] = useState<'ALL' | 'DAMAGED' | 'CLEAN'>('ALL');
  
  const [sortField, setSortField] = useState<FleetField>('prefix');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [feedback, setFeedback] = useState<{ msg: string; isError: boolean } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Modal para Nova Aeronave
  const [isNewAircraftModalOpen, setIsNewAircraftModalOpen] = useState(false);
  const [newPrefix, setNewPrefix] = useState('');
  const [newModel, setNewModel] = useState('A320');
  const [isSavingAircraft, setIsSavingAircraft] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [focusedCell, setFocusedCell] = useState<{ rowId: string; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: number } | null>(null);

  const tableRef = useRef<HTMLTableElement>(null);

  // Logo URL generator
  const getLogoUrl = (code: string) => {
    if (!code) return '';
    const info = getNormalizedAirlineInfo(code);
    return info.logoUrl || `https://images.kiwi.com/airlines/64/${info.iata || code.toUpperCase()}.png`;
  };

  // Carregar aeronaves específicas desta companhia
  const fetchFleet = async () => {
    setIsLoading(true);
    try {
      const codeUpper = (currentAirline.airline_code || '').trim().toUpperCase();
      const nameUpper = (currentAirline.airline || '').trim().toUpperCase();
      const legalUpper = (currentAirline.legal_name || '').trim().toUpperCase();

      // Busca na tabela aeronaves comparando airline ou companhia_id
      let query = supabase.from('aeronaves').select('*');
      
      if (currentAirline.id && !currentAirline.id.startsWith('temp-')) {
        query = query.or(`companhia_id.eq.${currentAirline.id},airline.ilike.${codeUpper},airline.ilike.${nameUpper},airline.ilike.${legalUpper}`);
      } else {
        query = query.or(`airline.ilike.${codeUpper},airline.ilike.${nameUpper},airline.ilike.${legalUpper}`);
      }

      const { data, error } = await query.order('prefix');
      
      if (error) {
        console.error('Erro ao carregar frota da companhia', error);
      } else if (data) {
        const mapped = data.map((item: any) => ({
          ...item,
          model: item.model || item.modelo || item.modelo_id || '--',
        }));
        setAircrafts(mapped as AircraftType[]);
        
        // Atualiza a contagem no objeto da cia
        const updated = {
          ...currentAirline,
          equipment_count: mapped.length
        };
        setCurrentAirline(updated);
        onAirlineUpdated(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, [currentAirline.id]);

  // Alternar status Ativo / Inativo
  const handleToggleContract = async () => {
    const newStatus = !currentAirline.is_active;
    const updated = { ...currentAirline, is_active: newStatus };
    setCurrentAirline(updated);
    onAirlineUpdated(updated);

    if (!newStatus) {
      setIsNewAircraftModalOpen(false);
      setEditingCell(null);
      setConfirmDeleteId(null);
    }

    try {
      const { error } = await supabase
        .from('companhias')
        .update({ is_active: newStatus })
        .eq('id', currentAirline.id);

      if (error) {
        console.error('Erro ao atualizar status', error);
        setFeedback({ msg: `Erro ao atualizar status: ${error.message}`, isError: true });
        // Rollback
        const rollback = { ...currentAirline, is_active: !newStatus };
        setCurrentAirline(rollback);
        onAirlineUpdated(rollback);
      } else {
        setFeedback({
          msg: newStatus
            ? `🟢 Status Ativo: A companhia ${currentAirline.airline || currentAirline.legal_name} está ativa na operação.`
            : `⚪ Contrato Inativo: A companhia ${currentAirline.airline || currentAirline.legal_name} foi desmarcada (atendida por outras distribuidoras ou sem operação).`,
          isError: false,
        });
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ msg: `Erro inesperado: ${err?.message}`, isError: true });
    }
  };

  // Salvar Nova Aeronave através do Modal
  const handleSaveNewAircraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAirline.is_active) {
      setModalError('Ações bloqueadas: A companhia está inativa. Ative o contrato para cadastrar novas aeronaves.');
      return;
    }
    if (!newPrefix.trim()) {
      setModalError('Por favor, informe o prefixo da aeronave (ex: PR-GGB).');
      return;
    }
    if (!newModel.trim()) {
      setModalError('Por favor, informe o modelo da aeronave (ex: A320, B738).');
      return;
    }

    setIsSavingAircraft(true);
    setModalError(null);

    const airlineCode = (currentAirline.airline_code || currentAirline.airline || 'CIA').trim().toUpperCase();
    const prefixFormatted = newPrefix.trim().toUpperCase();
    const modelFormatted = newModel.trim().toUpperCase();

    try {
      let insertPayload: any = {
        airline: airlineCode,
        prefix: prefixFormatted,
        model: modelFormatted,
        missing_cap: false,
        defective_door: false,
        defective_panel: false,
        no_autocut: false,
        observations: '',
      };

      let { data, error } = await supabase.from('aeronaves').insert(insertPayload).select().single();

      // Fallback se a coluna for modelo_id em vez de model
      if (error && (error.message.includes('column "model"') || error.message.includes('não existe'))) {
        delete insertPayload.model;
        insertPayload.modelo_id = modelFormatted;
        const retryRes = await supabase.from('aeronaves').insert(insertPayload).select().single();
        data = retryRes.data;
        error = retryRes.error;
      }

      // Fallback se a coluna for modelo
      if (error && (error.message.includes('modelo_id') || error.message.includes('não existe'))) {
        delete insertPayload.modelo_id;
        insertPayload.modelo = modelFormatted;
        const retryRes = await supabase.from('aeronaves').insert(insertPayload).select().single();
        data = retryRes.data;
        error = retryRes.error;
      }

      if (error) {
        setModalError(`Erro ao cadastrar aeronave no banco: ${error.message}`);
        setIsSavingAircraft(false);
        return;
      }

      setIsNewAircraftModalOpen(false);
      setNewPrefix('');
      setNewModel('A320');
      setFeedback({
        msg: `✅ Aeronave ${prefixFormatted} (${modelFormatted}) cadastrada com sucesso na frota da ${currentAirline.airline || currentAirline.legal_name}!`,
        isError: false,
      });

      await fetchFleet();
    } catch (err: any) {
      setModalError(`Exceção ao salvar: ${err?.message || 'Erro inesperado'}`);
    } finally {
      setIsSavingAircraft(false);
    }
  };

  // Excluir aeronave
  const handleDeleteAircraft = async (id: string) => {
    if (!currentAirline.is_active) {
      setFeedback({ msg: 'Ações bloqueadas: A companhia está inativa. Ative o contrato para realizar exclusões.', isError: true });
      setConfirmDeleteId(null);
      return;
    }
    setAircrafts(prev => prev.filter(a => a.id !== id));
    setConfirmDeleteId(null);
    try {
      const { error } = await supabase.from('aeronaves').delete().eq('id', id);
      if (error) {
        console.error('Erro ao excluir aeronave', error);
        setFeedback({ msg: `Erro ao excluir: ${error.message}`, isError: true });
        fetchFleet();
      } else {
        setFeedback({ msg: 'Aeronave excluída com sucesso.', isError: false });
        const updated = {
          ...currentAirline,
          equipment_count: Math.max(0, aircrafts.length - 1)
        };
        setCurrentAirline(updated);
        onAirlineUpdated(updated);
      }
    } catch (e) {
      console.error(e);
      fetchFleet();
    }
  };

  // Atualizar campo inline
  const handleUpdateField = async (id: string, field: keyof AircraftType, value: any) => {
    if (!currentAirline.is_active) {
      setFeedback({ msg: 'Ações bloqueadas: A companhia está inativa. Ative o contrato para editar dados.', isError: true });
      return;
    }
    setAircrafts(prev =>
      prev.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );

    try {
      const dbPayload: any = { [field]: value };
      if (field === 'model') {
        dbPayload.model = value;
      }

      let { error } = await supabase.from('aeronaves').update(dbPayload).eq('id', id);

      if (error && field === 'model' && (error.message.includes('column "model"') || error.message.includes('não existe'))) {
        const retry = await supabase.from('aeronaves').update({ modelo_id: value }).eq('id', id);
        error = retry.error;
      }

      if (error) {
        console.error('Erro ao salvar edição', error);
        setFeedback({ msg: `Erro ao salvar alteração: ${error.message}`, isError: true });
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  // Exportar frota da companhia para Excel
  const handleExportExcel = () => {
    const formattedData = displayedAircrafts.map(a => ({
      Companhia: currentAirline.airline || currentAirline.legal_name,
      'Código Cia': currentAirline.airline_code || '',
      Prefixo: a.prefix,
      Modelo: a.model,
      'Sem Tampa': a.missing_cap ? 'SIM' : 'NÃO',
      'Portinhola Defeituosa': a.defective_door ? 'SIM' : 'NÃO',
      'Painel Defeituoso': a.defective_panel ? 'SIM' : 'NÃO',
      'Falha no Corte': a.no_autocut ? 'SIM' : 'NÃO',
      Observações: a.observations || '',
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Frota');
    const filename = `Frota_${(currentAirline.airline_code || currentAirline.airline || 'CIA').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Contagem de avarias
  const damagedCount = useMemo(() => {
    return aircrafts.filter(a => a.missing_cap || a.defective_door || a.defective_panel || a.no_autocut).length;
  }, [aircrafts]);

  // Lista filtrada e ordenada
  const displayedAircrafts = useMemo(() => {
    let list = [...aircrafts];

    // Busca textual
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        a =>
          a.prefix.toLowerCase().includes(q) ||
          (a.model && a.model.toLowerCase().includes(q)) ||
          (a.observations && a.observations.toLowerCase().includes(q))
      );
    }

    // Filtro de avarias
    if (damageFilter === 'DAMAGED') {
      list = list.filter(a => a.missing_cap || a.defective_door || a.defective_panel || a.no_autocut);
    } else if (damageFilter === 'CLEAN') {
      list = list.filter(a => !a.missing_cap && !a.defective_door && !a.defective_panel && !a.no_autocut);
    }

    // Ordenação
    list.sort((a, b) => {
      let valA = a[sortField as keyof AircraftType];
      let valB = b[sortField as keyof AircraftType];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'boolean') {
        return sortOrder === 'asc' ? (valA === valB ? 0 : valA ? -1 : 1) : valA === valB ? 0 : valA ? 1 : -1;
      }

      return sortOrder === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return list;
  }, [aircrafts, searchTerm, damageFilter, sortField, sortOrder]);

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (editingCell) {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        setEditingCell(null);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setFocusedCell({ rowId: displayedAircrafts[rowIndex - 1].id, col: colIndex });
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < displayedAircrafts.length - 1) {
          setFocusedCell({ rowId: displayedAircrafts[rowIndex + 1].id, col: colIndex });
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (colIndex > 0) {
          setFocusedCell({ rowId: displayedAircrafts[rowIndex].id, col: colIndex - 1 });
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (colIndex < FLEET_COLUMNS.length - 1) {
          setFocusedCell({ rowId: displayedAircrafts[rowIndex].id, col: colIndex + 1 });
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (currentAirline.is_active) {
          setEditingCell({ rowId: displayedAircrafts[rowIndex].id, col: colIndex });
        }
        break;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* CABEÇALHO DA COMPANHIA */}
      <div className={`p-4 border-b flex flex-col md:flex-row items-center justify-between gap-4 z-20 shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        
        {/* LADO ESQUERDO: VOLTAR + IDENTIFICAÇÃO DA COMPANHIA */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onBack}
            className={`px-3 py-2 rounded-lg border flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
            title="Voltar para a lista mestre de companhias"
          >
            <ArrowLeft size={14} />
            <span>Voltar</span>
          </button>

          <div className={`flex items-center gap-3 transition-all duration-200 ${!currentAirline.is_active ? 'opacity-65 grayscale-[35%]' : ''}`}>
            <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center p-1 shadow-xs border border-slate-200 shrink-0">
              {currentAirline.logo_url ? (
                <img src={currentAirline.logo_url} alt="Logo" className="w-full h-full object-contain bg-white" />
              ) : currentAirline.airline_code ? (
                <img
                  src={getLogoUrl(currentAirline.airline_code)}
                  alt="Logo"
                  className="w-full h-full object-contain bg-white"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="text-slate-400 font-bold text-xs">{currentAirline.airline_code || 'CIA'}</div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black uppercase tracking-tight">{currentAirline.airline || currentAirline.legal_name}</h1>
                {currentAirline.airline_code && (
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    !currentAirline.is_active
                      ? isDarkMode ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-300'
                      : isDarkMode ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  }`}>
                    {currentAirline.airline_code}
                  </span>
                )}
                {currentAirline.country && (
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    • {currentAirline.country}
                  </span>
                )}
              </div>
              <p className={`text-[11px] font-medium truncate max-w-[280px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{currentAirline.legal_name || 'Companhia Aérea'}</p>
            </div>
          </div>
        </div>

        {/* CENTRO: CONTADORES CENTRALIZADOS (FROTA E VOOS / DIA) */}
        <div className={`flex items-center justify-center gap-3 w-full md:w-auto transition-all duration-200 ${!currentAirline.is_active ? 'opacity-60 grayscale-[30%]' : ''}`}>
          {/* CARD FROTA */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border shadow-xs ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Frota:</span>
            <span className={`text-xs font-mono font-black ${!currentAirline.is_active ? 'text-slate-400' : 'text-emerald-500'}`}>{aircrafts.length} Equip.</span>
          </div>

          {/* CARD VOOS/DIA */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border shadow-xs ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Voos / Dia:</span>
            <span className={`text-xs font-mono font-black ${!currentAirline.is_active ? 'text-slate-400' : 'text-blue-500'}`}>{currentAirline.flight_count || 0} Voos</span>
          </div>

          {damagedCount > 0 && (
            <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border ${isDarkMode ? 'bg-amber-950/40 border-amber-500/40 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
              <AlertTriangle size={13} className="text-amber-500" />
              <span className="text-xs font-mono font-black">{damagedCount} c/ Avarias</span>
            </div>
          )}
        </div>

        {/* LADO DIREITO: ATIVO / INATIVO (À ESQUERDA) + BOTÃO NOVA AERONAVE (EXTREMO DIREITO) */}
        <div className="flex items-center justify-end gap-2.5 w-full md:w-auto">
          {/* TOGGLE ATIVO / INATIVO */}
          <button
            onClick={handleToggleContract}
            type="button"
            className={`flex items-center gap-2 px-3.5 py-1.5 h-8 rounded-lg font-black uppercase tracking-wider text-[11px] transition-all shadow-sm active:scale-95 cursor-pointer border ${
              currentAirline.is_active
                ? 'bg-[#FEDC00] hover:bg-[#e5c600] text-slate-900 border-[#FEDC00]'
                : isDarkMode
                ? 'bg-red-950/40 hover:bg-red-900/50 text-red-400 border-red-800/50 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300 shadow-[0_0_8px_rgba(239,68,68,0.08)]'
            }`}
            title="Alternar status Ativo / Inativo da companhia"
          >
            <div className={`w-2.5 h-2.5 rounded-full transition-all ${
              currentAirline.is_active
                ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]'
                : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'
            }`} />
            <span>{currentAirline.is_active ? 'Ativo' : 'Inativo'}</span>
          </button>

          {/* BOTÃO NOVA AERONAVE NO EXTREMO DIREITO */}
          <button
            onClick={() => {
              if (!currentAirline.is_active) return;
              setNewPrefix('');
              setNewModel('A320');
              setModalError(null);
              setIsNewAircraftModalOpen(true);
            }}
            disabled={!currentAirline.is_active}
            type="button"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 h-8 rounded-lg font-black uppercase tracking-wider text-[11px] bg-[#FEDC00] hover:bg-[#e5c600] text-slate-900 border border-[#FEDC00] shadow-sm transition-all shrink-0 ${
              !currentAirline.is_active
                ? 'opacity-35 cursor-not-allowed grayscale pointer-events-none'
                : 'cursor-pointer active:scale-95'
            }`}
            title={!currentAirline.is_active ? 'Companhia inativa. Ative o status para cadastrar novas aeronaves.' : 'Cadastrar nova aeronave nesta frota'}
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Nova Aeronave</span>
          </button>
        </div>

      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div className={`p-3.5 ${feedback.isError ? 'bg-red-500/10 text-red-500 border-b border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-b border-emerald-500/20'} flex justify-between items-center shrink-0`}>
          <span className="text-xs font-medium">{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} className="text-xs uppercase font-bold hover:underline opacity-80 cursor-pointer">
            Fechar
          </button>
        </div>
      )}

      {/* BANNER DE STATUS INATIVO */}
      {!currentAirline.is_active && (
        <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-semibold shrink-0 ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <div className="flex items-center gap-2">
            <Info size={14} className="text-amber-500 shrink-0" />
            <span>
              <strong>Companhia Inativa:</strong> Esta empresa não possui contrato de abastecimento ativo (atendida por terceiros ou sem malha regular). Todas as ações de cadastro, edição e exclusão estão bloqueadas.
            </span>
          </div>
        </div>
      )}

      {/* TOOLBAR DA FROTA */}
      <div className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex flex-wrap items-center gap-2">
          {/* BUSCA */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar prefixo, modelo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`pl-9 pr-3 py-1.5 rounded-md text-xs font-medium border outline-none focus:ring-1 focus:ring-emerald-500 w-52 md:w-64 ${
                isDarkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
              }`}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* FILTROS DE AVARIA */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDamageFilter('ALL')}
              className={`px-2.5 py-1.5 rounded text-[10px] font-black uppercase tracking-wider border transition-colors cursor-pointer ${
                damageFilter === 'ALL'
                  ? isDarkMode
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-[#2D8E48] text-white border-[#2D8E48]'
                  : isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({aircrafts.length})
            </button>
            <button
              onClick={() => setDamageFilter('DAMAGED')}
              className={`px-2.5 py-1.5 rounded text-[10px] font-black uppercase tracking-wider border transition-colors cursor-pointer ${
                damageFilter === 'DAMAGED'
                  ? isDarkMode
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-amber-500 text-white border-amber-500'
                  : isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              Com Avarias ({damagedCount})
            </button>
            <button
              onClick={() => setDamageFilter('CLEAN')}
              className={`px-2.5 py-1.5 rounded text-[10px] font-black uppercase tracking-wider border transition-colors cursor-pointer ${
                damageFilter === 'CLEAN'
                  ? isDarkMode
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-700 text-white border-slate-700'
                  : isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              Sem Avarias ({aircrafts.length - damagedCount})
            </button>
          </div>
        </div>

        {/* BOTOES DE AÇÃO */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition-colors cursor-pointer ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
            }`}
            title="Exportar frota para planilha Excel"
          >
            <Download size={13} />
            <span>Exportar Frota</span>
          </button>

          <button
            onClick={fetchFleet}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition-colors cursor-pointer ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
            }`}
            title="Recarregar dados"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* TABELA 100% FULL-WIDTH DA FROTA */}
      <div className={`w-full flex-1 overflow-auto relative custom-scrollbar ${isDarkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
        <table ref={tableRef} className="w-full text-left border-separate border-spacing-0">
          <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-[#2D8E48] text-white shadow-sm'}`}>
            <tr>
              {FLEET_COLUMNS.map((col, idx) => {
                const isSortable = col.key !== 'logo' && col.key !== 'actions';
                return (
                  <th
                    key={idx}
                    onClick={() => {
                      if (!isSortable) return;
                      if (sortField === col.key) {
                        setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setSortField(col.key);
                        setSortOrder('asc');
                      }
                    }}
                    className={`px-2 py-3 text-[10px] font-black uppercase tracking-widest border-b border-r last:border-r-0 ${
                      isDarkMode ? 'border-slate-800' : 'border-[#29824a]'
                    } text-center ${col.width} ${isSortable ? 'cursor-pointer select-none hover:bg-black/10 transition-colors' : ''}`}
                    title={isSortable ? `Clique para ordenar por ${col.label}` : undefined}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{col.label}</span>
                      {sortField === col.key && (
                        <span className="text-[9px] text-amber-300 font-black">{sortOrder === 'desc' ? '▼' : '▲'}</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayedAircrafts.length === 0 ? (
              <tr>
                <td
                  colSpan={FLEET_COLUMNS.length}
                  className={`px-4 py-12 text-center text-xs uppercase tracking-widest font-black ${
                    isDarkMode ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'
                  }`}
                >
                  Nenhuma aeronave encontrada na frota desta companhia
                </td>
              </tr>
            ) : (
              displayedAircrafts.map((aircraft, rowIndex) => (
                <tr
                  key={aircraft.id}
                  data-row={rowIndex}
                  className={`group transition-all duration-150 h-10 border-b ${
                    !currentAirline.is_active ? 'opacity-65 grayscale-[35%] hover:opacity-100 hover:grayscale-0' : ''
                  } ${
                    isDarkMode ? 'hover:bg-slate-800/50 border-slate-800/50' : 'hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  {FLEET_COLUMNS.map((col, colIndex) => {
                    const isFocused = focusedCell?.rowId === aircraft.id && focusedCell?.col === colIndex;
                    const focusClasses = isFocused ? 'ring-2 ring-emerald-500 ring-inset z-10 shadow-[inset_0_0_0_2px_rgba(16,185,129,0.5)]' : '';

                    if (col.key === 'logo') {
                      return (
                        <td
                          key={`${aircraft.id}-logo`}
                          className={`px-2 border-y border-l ${
                            isDarkMode ? 'border-slate-700/50 bg-slate-800/20' : 'border-slate-200 bg-white group-hover:bg-slate-50'
                          } text-center align-middle ${focusClasses}`}
                        >
                          <div className="w-6 h-6 rounded bg-white overflow-hidden mx-auto flex items-center justify-center p-0.5 shadow-xs border border-slate-200">
                            {currentAirline.logo_url ? (
                              <img src={currentAirline.logo_url} alt="Logo" className="w-full h-full object-contain bg-white" />
                            ) : currentAirline.airline_code ? (
                              <img
                                src={getLogoUrl(currentAirline.airline_code)}
                                alt="Logo"
                                className="w-full h-full object-contain bg-white"
                                onError={e => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400">{currentAirline.airline_code || 'CIA'}</span>
                            )}
                          </div>
                        </td>
                      );
                    }

                    if (col.key === 'actions') {
                      return (
                        <td
                          key={`${aircraft.id}-actions`}
                          data-col={colIndex}
                          tabIndex={0}
                          onClick={() => setFocusedCell({ rowId: aircraft.id, col: colIndex })}
                          onKeyDown={e => handleKeyDown(e, rowIndex, colIndex)}
                          className={`px-2 border-y border-l ${
                            isDarkMode ? 'border-slate-700/50 bg-slate-800/20' : 'border-slate-200 bg-white group-hover:bg-slate-50'
                          } text-center actions-container align-middle outline-none ${focusClasses}`}
                        >
                          <div className="flex justify-center">
                            <button
                              onClick={() => {
                                if (currentAirline.is_active) setConfirmDeleteId(aircraft.id);
                              }}
                              disabled={!currentAirline.is_active}
                              className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                                !currentAirline.is_active
                                  ? 'opacity-20 cursor-not-allowed pointer-events-none text-slate-500'
                                  : isDarkMode
                                  ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer'
                                  : 'hover:bg-red-500/10 text-slate-400 hover:text-red-500 cursor-pointer'
                              }`}
                              title={!currentAirline.is_active ? 'Companhia inativa. Ações bloqueadas.' : 'Excluir aeronave da frota'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      );
                    }

                    const isBooleanField = ['missing_cap', 'defective_door', 'defective_panel', 'no_autocut'].includes(col.key);
                    const value = aircraft[col.key as keyof AircraftType];
                    const isEditing = editingCell?.rowId === aircraft.id && editingCell?.col === colIndex;

                    if (isBooleanField) {
                      return (
                        <td
                          key={`${aircraft.id}-${col.key}-${colIndex}`}
                          data-col={colIndex}
                          tabIndex={0}
                          onClick={() => setFocusedCell({ rowId: aircraft.id, col: colIndex })}
                          onKeyDown={e => handleKeyDown(e, rowIndex, colIndex)}
                          className={`px-2 border-y border-l ${
                            isDarkMode ? 'border-slate-700/50 bg-slate-800/20' : 'border-slate-200 bg-white group-hover:bg-slate-50'
                          } text-center align-middle outline-none ${focusClasses}`}
                        >
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={!!value}
                              disabled={!currentAirline.is_active}
                              onChange={e => handleUpdateField(aircraft.id, col.key as keyof AircraftType, e.target.checked)}
                              className={`w-4 h-4 rounded ${
                                !currentAirline.is_active
                                  ? 'cursor-not-allowed opacity-35'
                                  : 'cursor-pointer'
                              } ${
                                isDarkMode ? 'accent-amber-500 bg-slate-900 border-slate-700' : 'accent-amber-600 bg-white border-slate-300'
                              }`}
                            />
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={`${aircraft.id}-${col.key}-${colIndex}`}
                        data-col={colIndex}
                        tabIndex={0}
                        onClick={() => setFocusedCell({ rowId: aircraft.id, col: colIndex })}
                        onDoubleClick={() => {
                          if (currentAirline.is_active) {
                            setEditingCell({ rowId: aircraft.id, col: colIndex });
                          }
                        }}
                        onKeyDown={e => handleKeyDown(e, rowIndex, colIndex)}
                        className={`px-2 border-y border-l ${
                          isDarkMode ? 'border-slate-700/50 bg-slate-800/20 text-slate-300' : 'border-slate-200 bg-white group-hover:bg-slate-50 text-slate-800'
                        } align-middle ${currentAirline.is_active ? 'cursor-pointer' : 'cursor-default'} outline-none ${focusClasses}`}
                      >
                        {isEditing && currentAirline.is_active ? (
                          <input
                            type="text"
                            autoFocus
                            defaultValue={(value as string) || ''}
                            onBlur={e => {
                              handleUpdateField(aircraft.id, col.key as keyof AircraftType, col.key === 'observations' ? e.target.value : e.target.value.toUpperCase());
                              setEditingCell(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleUpdateField(aircraft.id, col.key as keyof AircraftType, col.key === 'observations' ? e.currentTarget.value : e.currentTarget.value.toUpperCase());
                                setEditingCell(null);
                              } else if (e.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            className={`w-full px-2 py-1 rounded text-xs font-mono font-bold ${
                              col.key === 'observations' ? 'text-left' : 'text-center uppercase'
                            } outline-none focus:ring-1 ${
                              isDarkMode ? 'bg-slate-950 text-emerald-400 border border-emerald-500/50 focus:ring-emerald-500' : 'bg-slate-100 text-emerald-700 border border-emerald-500/30 focus:ring-emerald-600'
                            }`}
                          />
                        ) : (
                          <div className={`font-mono text-xs font-bold w-full ${col.key === 'observations' ? 'justify-start' : 'justify-center uppercase'} flex items-center min-h-[24px]`}>
                            {col.key === 'prefix' ? (
                              <span className="text-emerald-500 dark:text-emerald-400">{value || '--'}</span>
                            ) : (
                              <span>{value !== undefined && value !== '' ? (value as string) : '--'}</span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL SIMPLES: NOVA AERONAVE */}
      {isNewAircraftModalOpen && currentAirline.is_active &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className={`w-full max-w-md p-6 rounded-xl shadow-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
              
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                    <Plane size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-wide">Cadastrar Nova Aeronave</h3>
                    <p className="text-[11px] font-medium text-slate-400">
                      Frota de: <strong className="text-emerald-400">{currentAirline.airline || currentAirline.legal_name}</strong> ({currentAirline.airline_code || 'CIA'})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewAircraftModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {modalError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleSaveNewAircraft} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider mb-1.5 opacity-80">
                    Prefixo da Aeronave <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="Ex: PR-GGB, PT-MSF, N123AA"
                    value={newPrefix}
                    onChange={e => setNewPrefix(e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-mono font-bold tracking-wider uppercase border outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDarkMode ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider mb-1.5 opacity-80">
                    Modelo da Aeronave <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: A320, B738, B77W, E195"
                    value={newModel}
                    onChange={e => setNewModel(e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-mono font-bold tracking-wider uppercase border outline-none focus:ring-2 focus:ring-emerald-500 mb-2 ${
                      isDarkMode ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />

                  {/* Atalhos rápidos para modelos comuns */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Comuns:</span>
                    {COMMON_MODELS.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNewModel(m)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          newModel === m
                            ? 'bg-emerald-500 text-white'
                            : isDarkMode
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700/40">
                  <button
                    type="button"
                    onClick={() => setIsNewAircraftModalOpen(false)}
                    disabled={isSavingAircraft}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAircraft}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-wider bg-[#FEDC00] hover:bg-[#e5c600] text-slate-900 border border-[#FEDC00] rounded-lg shadow-md transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {isSavingAircraft ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} className="stroke-[2.5]" />}
                    <span>{isSavingAircraft ? 'Salvando...' : 'Adicionar Aeronave'}</span>
                  </button>
                </div>
              </form>

            </div>
          </div>,
          document.body
        )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {confirmDeleteId &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className={`w-full max-w-md p-6 rounded-xl shadow-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-500/10 text-red-500 rounded-full">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wide">Excluir Aeronave</h3>
                  <p className="text-xs text-slate-500">Tem certeza que deseja remover esta aeronave da frota?</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className={`px-4 py-2 text-xs font-bold uppercase rounded-lg border cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancelar
                </button>
                <button onClick={() => handleDeleteAircraft(confirmDeleteId)} className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md cursor-pointer">
                  Excluir Definitivamente
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
