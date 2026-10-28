import React, { useState } from 'react';
import { X, Check, Globe, Shield, RefreshCw, Activity } from 'lucide-react';
import { DEFAULT_ENDPOINT } from '../utils/sse';
import { StreamConfig } from '../types/chat';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StreamConfig;
  onSaveConfig: (newConfig: StreamConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [endpoint, setEndpoint] = useState(config.endpoint);
  const [supabaseKey, setSupabaseKey] = useState(config.supabaseKey);
  const [useSimulation, setUseSimulation] = useState(config.useSimulation);
  const [probeStatus, setProbeStatus] = useState<{
    running: boolean;
    result?: { status: number; text: string; latencyMs: number; ok: boolean };
  }>({ running: false });

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      ...config,
      endpoint: endpoint.trim() || DEFAULT_ENDPOINT,
      supabaseKey: supabaseKey.trim(),
      useSimulation,
    });
    onClose();
  };

  const handleProbe = async () => {
    setProbeStatus({ running: true });
    const start = performance.now();
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (supabaseKey.trim()) {
        headers['apikey'] = supabaseKey.trim();
        headers['Authorization'] = `Bearer ${supabaseKey.trim()}`;
      }

      const res = await fetch(endpoint.trim() || DEFAULT_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: 'ping', matchCount: 1 }),
        signal: AbortSignal.timeout(6000),
      });
      const end = performance.now();
      const text = await res.text();

      setProbeStatus({
        running: false,
        result: {
          status: res.status,
          text: text.slice(0, 300),
          latencyMs: Math.round(end - start),
          ok: res.ok,
        },
      });
    } catch (err: any) {
      setProbeStatus({
        running: false,
        result: {
          status: 0,
          text: err?.message || 'Error de conexión / CORS o red inalcanzable',
          latencyMs: 0,
          ok: false,
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">Configuración de Conexión y Stream</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 text-sm">
          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Modo de Ejecución del Stream:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseSimulation(false)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  !useSimulation
                    ? 'border-amber-500 bg-amber-50/50 text-slate-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div className="text-xs font-bold mb-0.5">Supabase En Vivo</div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  Envía POST directo a la Edge Function de Supabase
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUseSimulation(true)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  useSimulation
                    ? 'border-amber-500 bg-amber-50/50 text-slate-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div className="text-xs font-bold mb-0.5">Simulador SSE Determinista</div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  Prueba reactiva local con fragmentación TCP simulada
                </div>
              </button>
            </div>
          </div>

          {/* Endpoint Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="endpoint-input" className="text-xs font-semibold text-slate-700">
                Endpoint Supabase Edge Function:
              </label>
              <button
                type="button"
                onClick={() => setEndpoint(DEFAULT_ENDPOINT)}
                className="text-[11px] text-amber-700 hover:underline"
              >
                Restablecer default
              </button>
            </div>
            <input
              id="endpoint-input"
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full font-mono text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              placeholder="https://..."
            />
          </div>

          {/* Optional Supabase Key */}
          <div>
            <label htmlFor="supabase-key-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Supabase Anon / Bearer Key (Opcional):
            </label>
            <div className="relative">
              <input
                id="supabase-key-input"
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full font-mono text-xs p-2.5 pl-8 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
              <Shield className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>

          {/* Probe connection button */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs text-slate-500">Diagnóstico de conectividad:</span>
              <button
                type="button"
                onClick={handleProbe}
                disabled={probeStatus.running}
                className="px-2.5 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md font-medium flex items-center gap-1.5 transition-colors"
              >
                {probeStatus.running ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Activity className="w-3 h-3 text-amber-600" />
                )}
                <span>Probar Respuesta HTTP</span>
              </button>
            </div>

            {probeStatus.result && (
              <div
                className={`p-2.5 rounded-lg text-xs font-mono border ${
                  probeStatus.result.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>Código HTTP: {probeStatus.result.status}</span>
                  <span>{probeStatus.result.latencyMs}ms</span>
                </div>
                <div className="text-[11px] break-all max-h-20 overflow-y-auto">
                  {probeStatus.result.text}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Guardar Ajustes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
