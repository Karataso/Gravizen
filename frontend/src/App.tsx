import { useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useSyncQueue } from './hooks/useSyncQueue';
import { CheckInForm } from './components/CheckInForm';
import { EarthLinkPanel } from './components/EarthLinkPanel';

export function App() {
  const { isOnline, pendingCount, isSyncing, triggerSync, refreshPendingCount } = useSyncQueue();
  const [tab, setTab] = useState<'checkin' | 'earth'>('checkin');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      {/* Barra de estado de conexión y cola offline */}
      <header className="max-w-2xl mx-auto mb-6 flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-emerald-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-amber-400" />
          )}
          <span className="text-sm font-medium">
            {isOnline ? 'Conectado' : 'Sin conexión (Offline)'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full">
              {pendingCount} pendiente(s) de sincronizar
            </span>
          )}
          <button
            onClick={triggerSync}
            disabled={!isOnline || isSyncing}
            className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-3 py-1.5 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
      </header>

      {/* Navegación del módulo */}
      <nav className="max-w-2xl mx-auto mb-6 grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setTab('checkin')}
          className={`py-2 rounded-lg text-sm font-medium transition ${
            tab === 'checkin' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Check-in Diario
        </button>
        <button
          onClick={() => setTab('earth')}
          className={`py-2 rounded-lg text-sm font-medium transition ${
            tab === 'earth' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Enlace con Tierra
        </button>
      </nav>

      {/* Vista activa */}
      {tab === 'checkin' ? (
        <CheckInForm
          crewId="astro-01"
          currentDay={98}
          isOnline={isOnline}
          onSaved={() => {
            refreshPendingCount();
            triggerSync();
          }}
        />
      ) : (
        <EarthLinkPanel
          crewId="astro-01"
          currentDay={98}
          onReportCreated={() => {
            refreshPendingCount();
            triggerSync();
          }}
        />
      )}
    </div>
  );
}

export default App;