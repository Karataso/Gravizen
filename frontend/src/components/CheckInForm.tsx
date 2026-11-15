import React, { useEffect, useRef, useState } from 'react';
import type { SymptomChecklist } from '../types/vitalis';
import { saveCheckInOffline, saveReportOffline } from '../db/offlineStore';
import { TrafficLight } from '../components';

interface CheckInFormProps {
  crewId: string;
  currentDay: number;
  isOnline: boolean;
  onSaved: () => void | Promise<void>;
}

const INITIAL_SYMPTOMS: SymptomChecklist = {
  headache: false,
  vision_change: false,
  dizziness: false,
  nausea: false,
  back_pain: false,
  fever: false,
  self_harm: false,
};

const SYMPTOM_LABELS: { key: keyof SymptomChecklist; label: string; critical?: boolean }[] = [
  { key: 'headache', label: 'Dolor de cabeza nuevo o persistente' },
  { key: 'vision_change', label: 'Visión borrosa o cambio al leer de cerca' },
  { key: 'dizziness', label: 'Mareo al ponerse de pie' },
  { key: 'nausea', label: 'Náuseas o desorientación' },
  { key: 'back_pain', label: 'Dolor de espalda, cadera o huesos' },
  { key: 'fever', label: 'Fiebre, tos o malestar general' },
  { key: 'self_harm', label: 'Pensamientos de hacerse daño', critical: true },
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
  const [saving, setSaving] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const emergencyButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showEmergencyModal) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    emergencyButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowEmergencyModal(false);
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [showEmergencyModal]);

  const toggleSymptom = (key: keyof SymptomChecklist) => {
    setSymptoms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedMessage(null);

    const parsedSleep = parseFloat(sleepHours);
    if (isNaN(parsedSleep) || parsedSleep < 3 || parsedSleep > 12) {
      setError('Ingresa horas de sueño válidas entre 3 y 12.');
      return;
    }

    const now = new Date().toISOString();

    setSaving(true);
    try {
      await saveCheckInOffline({
        ...symptoms,
        crew_id: crewId,
        day: currentDay,
        sleep_h: parsedSleep,
        mood,
        stress,
        note: notes.trim() || undefined,
        recorded_at: now,
      });

      if (symptoms.self_harm) {
        await saveReportOffline({
          crew_id: crewId,
          day: currentDay,
          hazard: 'iso',
          level: 'emergency',
          message:
            'EMERGENCIA DE SALUD MENTAL: Check-in reporta pensamientos de hacerse daño. ' +
            'Acción tomada: protocolo de apoyo inmediato a bordo y alerta urgente al médico de vuelo.',
          created_at: now,
        });
        setShowEmergencyModal(true);
      } else if (symptoms.vision_change) {
        await saveReportOffline({
          crew_id: crewId,
          day: currentDay,
          hazard: 'grav',
          level: 'act',
          message:
            'Síntoma ocular reportado: visión borrosa / cambio al leer de cerca (posible SANS). ' +
            'Acción tomada: solicitado examen ocular de agudeza y fondo de ojo.',
          created_at: now,
        });
      }

      await onSaved();
      setSavedMessage(
        isOnline
          ? 'Check-in guardado correctamente.'
          : 'Sin conexión: Check-in guardado en IndexedDB. Se sincronizará al volver la red.'
      );
      setSymptoms(INITIAL_SYMPTOMS);
      setNotes('');
    } catch {
      setError('No se pudo guardar el check-in. Revisa el almacenamiento del navegador e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="checkin-form">
      <div className="checkin-header">
        <h2 className="checkin-title">Check-in Diario · Día {currentDay}</h2>
        {!isOnline && (
          <span className="offline-badge">
            <span className="offline-dot" aria-hidden="true" /> Modo Offline
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="checkin-form-inner" noValidate>
        <div className="form-group">
          <label htmlFor="sleep-hours" className="form-label">
            Horas de sueño (3 - 12 h)
          </label>
          <input
            id="sleep-hours"
            type="number"
            step="0.5"
            min="3"
            max="12"
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Estado de ánimo: <span className="mood-value">{mood} / 5</span>
          </label>
          <div className="mood-scale" role="radiogroup" aria-label="Estado de ánimo">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                type="button"
                key={val}
                onClick={() => setMood(val)}
                className={`mood-btn ${mood === val ? 'active' : ''}`}
                role="radio"
                aria-checked={mood === val}
                aria-label={`${val} de 5`}
              >
                {val}
              </button>
            ))}
          </div>
          <div className="scale-labels">
            <span>1 = Muy bajo</span>
            <span>5 = Óptimo</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Nivel de estrés: <span className="stress-value">{stress} / 5</span>
          </label>
          <div className="stress-scale" role="radiogroup" aria-label="Nivel de estrés">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                type="button"
                key={val}
                onClick={() => setStress(val)}
                className={`stress-btn ${stress === val ? 'active' : ''}`}
                role="radio"
                aria-checked={stress === val}
                aria-label={`${val} de 5`}
              >
                {val}
              </button>
            ))}
          </div>
          <div className="scale-labels">
            <span>1 = Tranquilo</span>
            <span>5 = Estrés extremo</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Síntomas observados hoy</label>
          <div className="symptoms-grid">
            {SYMPTOM_LABELS.map(({ key, label, critical }) => (
              <label
                key={key}
                className={`symptom-item ${symptoms[key] ? 'checked' : ''} ${critical ? 'critical' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={symptoms[key]}
                  onChange={() => toggleSymptom(key)}
                  className="symptom-checkbox"
                />
                <span className="symptom-label">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes" className="form-label">Notas o contexto (opcional)</label>
          <textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Turno nocturno, ejercicio intenso antes de medir..."
            className="form-textarea"
          />
        </div>

        {error && (
          <div className="form-error" role="alert">
            <span className="error-icon" aria-hidden="true">!</span>
            {error}
          </div>
        )}

        {savedMessage && (
          <div className="form-success" role="status">
            <span className="success-icon" aria-hidden="true">✓</span>
            {savedMessage}
          </div>
        )}

        <button type="submit" className="submit-btn" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar Check-in'}
        </button>
      </form>

      {showEmergencyModal && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="emergency-title"
          aria-describedby="emergency-description"
          className="emergency-modal-overlay"
        >
          <div className="emergency-modal">
            <div className="emergency-header">
              <div>
                <span className="emergency-severity">
                  <TrafficLight severity="emergency" size={12} ariaLabel="Emergencia" />
                  <span>Emergencia</span>
                </span>
                <h3 id="emergency-title">No estás solo · Protocolo de Apoyo Activo</h3>
              </div>
            </div>
            <p id="emergency-description" className="emergency-text">
              Hemos activado una alerta prioritaria con el médico de vuelo y el comandante de a bordo.
            </p>
            <ul className="emergency-guidance">
              <li>Contacta de inmediato al oficial médico de la tripulación.</li>
              <li>Mantente acompañado en el módulo común; no te aísles.</li>
              <li>El canal privado con psicología de tierra ya fue marcado como urgente.</li>
            </ul>
            <button
              ref={emergencyButtonRef}
              type="button"
              onClick={() => setShowEmergencyModal(false)}
              className="emergency-btn"
            >
              Entendido · mantener protocolo activo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};