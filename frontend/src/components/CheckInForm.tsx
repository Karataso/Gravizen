import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, HeartHandshake, WifiOff } from 'lucide-react';
import type { SymptomChecklist } from '../types/vitalis';
import { saveCheckInOffline, saveReportOffline } from '../db/offlineStore';

interface CheckInFormProps {
  crewId: string;
  currentDay: number;
  isOnline: boolean;
  onSaved: () => void;
}

const INITIAL_SYMPTOMS: SymptomChecklist = {
  headache: false,
  blurred_vision: false,
  dizziness: false,
  nausea: false,
  back_bone_pain: false,
  fever_malaise: false,
  self_harm_thoughts: false,
};

const SYMPTOM_LABELS: { key: keyof SymptomChecklist; label: string; critical?: boolean }[] = [
  { key: 'headache', label: 'Dolor de cabeza nuevo o persistente' },
  { key: 'blurred_vision', label: 'Visión borrosa o cambio al leer de cerca' },
  { key: 'dizziness', label: 'Mareo al ponerse de pie' },
  { key: 'nausea', label: 'Náuseas o desorientación' },
  { key: 'back_bone_pain', label: 'Dolor de espalda, cadera o huesos' },
  { key: 'fever_malaise', label: 'Fiebre, tos o malestar general' },
  { key: 'self_harm_thoughts', label: 'Pensamientos de hacerse daño', critical: true },
];

export const CheckInForm: React.FC<CheckInFormProps> = ({
  crewId,
  currentDay,
  isOnline,
  onSaved,
}) => {
  const [sleepHours, setSleepHours] = useState<string>('7.0');
  const [mood, setMood] = useState<number>(4);
  const [stress, setStress] = useState<number>(2);
  const [symptoms, setSymptoms] = useState<SymptomChecklist>(INITIAL_SYMPTOMS);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);

  const toggleSymptom = (key: keyof SymptomChecklist) => {
    setSymptoms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedMessage(null);

    const parsedSleep = parseFloat(sleepHours);
    if (isNaN(parsedSleep) || parsedSleep < 0 || parsedSleep > 16) {
      setError('Ingresa horas de sueño válidas entre 0 y 16.');
      return;
    }

    const now = new Date().toISOString();

    await saveCheckInOffline({
      crew_id: crewId,
      day: currentDay,
      sleep_hours: parsedSleep,
      mood,
      stress,
      symptoms,
      notes: notes.trim() || undefined,
      recorded_at: now,
    });

    // Protocolo crítico: pensamientos de hacerse daño -> Emergencia inmediata + modal de apoyo
    if (symptoms.self_harm_thoughts) {
      await saveReportOffline({
        crew_id: crewId,
        day: currentDay,
        hazard_id: 'isolation',
        level: 'emergency',
        summary: 'EMERGENCIA DE SALUD MENTAL: Check-in reporta pensamientos de hacerse daño.',
        action_taken: 'Activado protocolo de apoyo inmediato a bordo y alerta urgente al médico de vuelo.',
        created_at: now,
      });
      setShowEmergencyModal(true);
    } else if (symptoms.blurred_vision) {
      // Visión borrosa -> Alerta Actuar siempre (posible SANS)
      await saveReportOffline({
        crew_id: crewId,
        day: currentDay,
        hazard_id: 'gravity',
        level: 'act',
        summary: 'Síntoma ocular reportado: visión borrosa / cambio al leer de cerca (posible SANS).',
        action_taken: 'Solicitado examen ocular de agudeza y fondo de ojo.',
        created_at: now,
      });
    }

    setSavedMessage(
      isOnline
        ? 'Check-in guardado y enviado al servidor.'
        : 'Sin conexión: Check-in guardado en IndexedDB. Se sincronizará al volver la red.'
    );
    setSymptoms(INITIAL_SYMPTOMS);
    setNotes('');
    onSaved();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Check-in Diario · Día {currentDay}</h2>
        {!isOnline && (
          <span className="flex items-center gap-1.5 text-xs bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full">
            <WifiOff className="w-3.5 h-3.5" /> Modo Offline
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Horas de sueño */}
        <div>
          <label className="block text-sm text-slate-300 mb-1">Horas de sueño (0 - 16 h)</label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="16"
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Estado de ánimo (1 a 5) */}
        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Estado de ánimo: <span className="font-bold text-sky-400">{mood} / 5</span>
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                type="button"
                key={val}
                onClick={() => setMood(val)}
                className={`py-2 rounded-lg font-medium border transition ${
                  mood === val
                    ? 'bg-sky-600 border-sky-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1 = Muy bajo</span>
            <span>5 = Óptimo</span>
          </div>
        </div>

        {/* Nivel de estrés (1 a 5) */}
        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Nivel de estrés: <span className="font-bold text-amber-400">{stress} / 5</span>
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                type="button"
                key={val}
                onClick={() => setStress(val)}
                className={`py-2 rounded-lg font-medium border transition ${
                  stress === val
                    ? 'bg-amber-600 border-amber-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1 = Tranquilo</span>
            <span>5 = Estrés extremo</span>
          </div>
        </div>

        {/* Lista de síntomas */}
        <div>
          <label className="block text-sm text-slate-300 mb-2">Síntomas observados hoy</label>
          <div className="space-y-2">
            {SYMPTOM_LABELS.map(({ key, label, critical }) => (
              <label
                key={key}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                  symptoms[key]
                    ? critical
                      ? 'bg-red-950/60 border-red-500 text-red-200'
                      : 'bg-slate-800 border-sky-500 text-white'
                    : 'bg-slate-800/50 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={symptoms[key]}
                  onChange={() => toggleSymptom(key)}
                  className="w-4 h-4 accent-sky-500"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notas opcionales */}
        <div>
          <label className="block text-sm text-slate-300 mb-1">Notas o contexto (opcional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Turno nocturno, ejercicio intenso antes de medir..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/40 border border-red-800 p-3 rounded-lg">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {savedMessage && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-800 p-3 rounded-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {savedMessage}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg transition"
        >
          Guardar Check-in
        </button>
      </form>

      {/* Modal obligatorio de apoyo inmediato si marca pensamientos de hacerse daño */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border-2 border-red-500 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <HeartHandshake className="w-8 h-8 shrink-0" />
              <h3 className="text-lg font-bold">No estás solo · Protocolo de Apoyo Activo</h3>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              Hemos activado una alerta prioritaria de <strong>Emergencia</strong> con el médico de vuelo y el comandante de a bordo.
            </p>
            <div className="bg-slate-800 p-3 rounded-lg text-xs text-slate-300 space-y-1.5">
              <p>• Contacta de inmediato al oficial médico de la tripulación.</p>
              <p>• Mantente acompañado en el módulo común; no te aísles.</p>
              <p>• El canal privado con psicología de tierra ya fue marcado como urgente.</p>
            </div>
            <button
              onClick={() => setShowEmergencyModal(false)}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg"
            >
              Entendido, solicitar apoyo ahora
            </button>
          </div>
        </div>
      )}
    </div>
  );
};