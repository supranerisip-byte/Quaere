import React from 'react';
import { X, BookMarked, Check, ShieldCheck } from 'lucide-react';
import { SourceFilter } from '../types/chat';

interface EditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilter: SourceFilter;
  onSelectEdition: (filter: SourceFilter) => void;
}

export const EditionsModal: React.FC<EditionsModalProps> = ({
  isOpen,
  onClose,
  activeFilter,
  onSelectEdition,
}) => {
  if (!isOpen) return null;

  const EDITIONS = [
    {
      id: 'derecho_canonico' as SourceFilter,
      latinName: 'Codex Iuris Canonici (CIC 1983)',
      subtitle: 'Promulgatio Sancti Ioannis Pauli PP. II',
      description: 'El código canónico vigente de la Iglesia Latina (Const. Ap. Sacrae Disciplinae Leges). 1.752 cánones organizados en 7 libros, incluyendo el derecho matrimonial y procesal.',
      badge: 'Vigente',
      reference: 'AAS 75 (1983) II',
    },
    {
      id: 'derecho_canonico' as SourceFilter,
      latinName: 'Codex Iuris Canonici (CIC 1917 / Pio-Benedictinus)',
      subtitle: 'Codex Benedicti PP. XV & Card. Gasparri',
      description: 'La primera codificación sistemática moderna de la Iglesia Católica. 2.414 cánones. Fundamental para la historia del derecho canónico, jurisprudencia y fuentes clásicas.',
      badge: 'Histórico / Clásico',
      reference: 'Const. Ap. Providentissima Mater (1917)',
    },
    {
      id: 'magisterio' as SourceFilter,
      latinName: 'Magisterium Pontificium & Concilia Oecumenica',
      subtitle: 'Concilium Vaticanum II & Enchiridion Symbolorum',
      description: 'Colección dogmática y pastoral del Magisterio de la Iglesia: Concilio Vaticano II (Lumen Gentium, Gaudium et Spes), encíclicas pontificias y el Denzinger-Hünermann.',
      badge: 'Doctrinal',
      reference: 'Denzinger-Hünermann (DH)',
    },
    {
      id: 'todos' as SourceFilter,
      latinName: 'Corpus Integratum: Canon & Magisterium',
      subtitle: 'Syncretismus Canonicus & Doctrinalis',
      description: 'Cotejo transversal simultáneo entre las leyes canónicas procesales/sustantivas y las declaraciones doctrinales del Magisterio supremo.',
      badge: 'Completo',
      reference: 'Omnia Documenta',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a1a1a]/45 backdrop-blur-xs font-serif">
      <div className="bg-[#FAF7F0] rounded-2xl shadow-2xl border-2 border-[#e8dcc6] max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8dcc6] bg-[#f5efe2]">
          <div className="flex items-center gap-2.5">
            <BookMarked className="w-5 h-5 text-[#C9A86A]" />
            <div>
              <h2 className="text-lg font-bold text-[#1a1a1a] tracking-tight">
                Editiones Iuris Canonici & Magisterii
              </h2>
              <p className="text-xs text-[#786142] italic">
                Ediciones y fuentes accesibles en este RAG
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#786142] hover:text-[#1a1a1a] rounded-lg hover:bg-[#e8dcc6]/50 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Editions */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto sync-scroll">
          {EDITIONS.map((ed, idx) => {
            const isSelected = activeFilter === ed.id;
            return (
              <div
                key={idx}
                onClick={() => {
                  onSelectEdition(ed.id);
                  onClose();
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'border-[#C9A86A] bg-[#f4ece0] shadow-xs'
                    : 'border-[#e8dcc6] bg-[#fbf9f4] hover:border-[#C9A86A]/70 hover:bg-[#f6f0e4]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h3 className="text-sm font-bold text-[#1a1a1a]">
                      {ed.latinName}
                    </h3>
                    <div className="text-xs text-[#786142] italic">
                      {ed.subtitle}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#C9A86A]/40 text-[#786142] bg-[#FAF7F0] shrink-0">
                    {ed.badge}
                  </span>
                </div>

                <p className="text-xs text-[#3d3023] leading-relaxed mb-2 font-serif">
                  {ed.description}
                </p>

                <div className="flex items-center justify-between text-[11px] text-[#9b8364] border-t border-[#e8dcc6]/60 pt-1.5">
                  <span className="italic">{ed.reference}</span>
                  {isSelected && (
                    <span className="text-xs font-semibold text-[#8c6b2d] flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Electa
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#f5efe2] border-t border-[#e8dcc6] flex items-center justify-between text-xs text-[#786142]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#C9A86A]" />
            <span>Fidelitas fontium canonicarum</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#2e261e] text-[#FAF7F0] hover:text-[#C9A86A] text-xs font-semibold rounded-lg transition-colors border border-[#C9A86A]/40"
          >
            Claudere
          </button>
        </div>
      </div>
    </div>
  );
};
