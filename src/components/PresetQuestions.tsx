import React from 'react';
import { SourceFilter } from '../types/chat';

interface PresetQuestionsProps {
  onSelect: (question: string, filter: SourceFilter) => void;
}

const PRESETS: Array<{
  latinKicker: string;
  title: string;
  question: string;
  filter: SourceFilter;
}> = [
  {
    latinKicker: 'Can. 1055–1057 · De Matrimonio',
    title: 'De Consensu et Validitate Matrimoniali',
    question: '¿Cuáles son los requisitos esenciales de validez del consentimiento matrimonial según los cánones 1055 y 1057 del CIC?',
    filter: 'derecho_canonico',
  },
  {
    latinKicker: 'Can. 1752 · Suprema Lex Ecclesiae',
    title: 'De Salute Animarum et Aequitate Canonica',
    question: '¿Qué es el principio rector de la salvación de las almas ("salus animarum") en el canon 1752 y la equidad canónica?',
    filter: 'derecho_canonico',
  },
  {
    latinKicker: 'Concilium Vaticanum II · Gaudium et Spes',
    title: 'De Doctrina Socialis et Bono Communi',
    question: '¿Cómo fundamenta el Magisterio de la Iglesia Católica el principio del bien común y el destino universal de los bienes?',
    filter: 'magisterio',
  },
  {
    latinKicker: 'Traditio Theologico-Iuridica',
    title: 'Distinctio inter Ius Divinum et Ecclesiasticum',
    question: '¿Cuál es la distinción teológico-jurídica entre derecho divino natural, derecho divino positivo y leyes puramente eclesiásticas?',
    filter: 'todos',
  },
];

export const PresetQuestions: React.FC<PresetQuestionsProps> = ({ onSelect }) => {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 text-center font-serif">
      {/* Golden Classical Seal Spark */}
      <div className="w-12 h-12 mx-auto rounded-full bg-[#f4ece0] text-[#C9A86A] flex items-center justify-center mb-5 border border-[#C9A86A]/40 shadow-xs">
        <span className="text-xl font-bold">§</span>
      </div>

      {/* Headings Specification: 'Lora', serif, bold, 32px, letter-spacing -0.5px, color #1a1a1a */}
      <h1
        className="text-[28px] sm:text-[32px] font-bold text-[#1a1a1a] mb-3 leading-tight tracking-[-0.5px]"
        style={{
          fontFamily: "'Lora', serif",
        }}
      >
        Corpus Iuris Canonici & Magisterium
      </h1>

      <p className="text-sm text-[#786142] max-w-lg mx-auto mb-10 leading-relaxed italic">
        Consultatio hermeneutica bilinguis: textus authenticus latinus et interpretatio hispanica.
        Ingrese su consulta jurídica o seleccione un canon fundamental.
      </p>

      {/* Welcoming Query Suggestions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(p.question, p.filter)}
            className="p-4 bg-[#fdfcf9] border border-[#e8dcc6] rounded-xl hover:border-[#C9A86A] hover:bg-[#f6f0e4] hover:shadow-xs transition-all text-left group cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#C9A86A]"
          >
            <div className="flex items-center gap-1.5 mb-1 text-[11px] text-[#8c6b2d] font-bold uppercase tracking-wider">
              <span className="text-[#C9A86A]">✦</span>
              <span>{p.latinKicker}</span>
            </div>
            <div className="text-sm font-bold text-[#1a1a1a] group-hover:text-[#8c6b2d] mb-1.5 transition-colors">
              {p.title}
            </div>
            <div className="text-xs text-[#524435] leading-relaxed line-clamp-2">
              {p.question}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
