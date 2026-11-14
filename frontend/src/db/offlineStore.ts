import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { OfflineCheckIn, EarthReport } from '../types/vitalis';

interface VitalisDB extends DBSchema {
  checkins: {
    key: number;
    value: OfflineCheckIn;
    indexes: { 'by-synced': number };
  };
  reports: {
    key: number;
    value: EarthReport;
    indexes: { 'by-synced': number };
  };
}

const DB_NAME = 'vitalis-offline-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<VitalisDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<VitalisDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const checkinStore = db.createObjectStore('checkins', {
          keyPath: 'local_id',
          autoIncrement: true,
        });
        checkinStore.createIndex('by-synced', 'synced');

        const reportStore = db.createObjectStore('reports', {
          keyPath: 'local_id',
          autoIncrement: true,
        });
        reportStore.createIndex('by-synced', 'synced');
      },
    });
  }
  return dbPromise;
}

// --- CHECK-INS ---

export async function saveCheckInOffline(
  data: Omit<OfflineCheckIn, 'local_id' | 'synced'>
): Promise<number> {
  const db = await getDB();
  return db.add('checkins', { ...data, synced: false });
}

export async function getAllLocalCheckIns(): Promise<OfflineCheckIn[]> {
  const db = await getDB();
  return db.getAll('checkins');
}

export async function syncPendingCheckIns(apiBaseUrl: string): Promise<number> {
  const db = await getDB();
  const all = await db.getAll('checkins');
  const pending = all.filter((item) => !item.synced);
  let syncedCount = 0;

  for (const item of pending) {
    try {
      // crew_id va en la URL y recorded_at es local. El resto es el body de la API.
      const payload = {
        day: item.day,
        sleep_h: item.sleep_h,
        mood: item.mood,
        stress: item.stress,
        headache: item.headache,
        vision_change: item.vision_change,
        dizziness: item.dizziness,
        nausea: item.nausea,
        back_pain: item.back_pain,
        fever: item.fever,
        self_harm: item.self_harm,
        note: item.note,
      };
      const res = await fetch(`${apiBaseUrl}/api/crew/${item.crew_id}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok && item.local_id !== undefined) {
        await db.put('checkins', { ...item, synced: true });
        syncedCount++;
      }
    } catch {
      // Sigue sin red; se reintentará en el próximo evento 'online'
      break;
    }
  }
  return syncedCount;
}

// --- REPORTES A TIERRA ---

export async function saveReportOffline(
  data: Omit<EarthReport, 'local_id' | 'synced' | 'status'>
): Promise<number> {
  const db = await getDB();
  return db.add('reports', {
    ...data,
    status: 'transit',
    synced: false,
  });
}

export async function getAllLocalReports(): Promise<EarthReport[]> {
  const db = await getDB();
  return db.getAll('reports');
}

export async function syncPendingReports(apiBaseUrl: string): Promise<number> {
  const db = await getDB();
  const all = await db.getAll('reports');
  const pending = all.filter((item) => !item.synced);
  let syncedCount = 0;

  for (const item of pending) {
    try {
      // El reporte de la API solo lleva day, level, hazard y message.
      const payload = {
        day: item.day,
        level: item.level,
        hazard: item.hazard,
        message: item.message,
      };
      const res = await fetch(`${apiBaseUrl}/api/crew/${item.crew_id}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok && item.local_id !== undefined) {
        await db.put('reports', { ...item, synced: true });
        syncedCount++;
      }
    } catch {
      break;
    }
  }
  return syncedCount;
}