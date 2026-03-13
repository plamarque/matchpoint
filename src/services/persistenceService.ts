import type { StorageSchemaV1 } from "@/types/match";

const DB_NAME = "matchpoint-db";
const STORE_NAME = "settings";
const SETTINGS_KEY = "storage_v1";

const openDb = async (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const loadStorage = async (): Promise<StorageSchemaV1 | null> => {
  try {
    const db = await openDb();
    const data = await new Promise<StorageSchemaV1 | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(SETTINGS_KEY);

      request.onsuccess = () => resolve((request.result as StorageSchemaV1) ?? null);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return data;
  } catch {
    const local = localStorage.getItem(SETTINGS_KEY);
    return local ? (JSON.parse(local) as StorageSchemaV1) : null;
  }
};

export const saveStorage = async (payload: StorageSchemaV1): Promise<void> => {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(payload, SETTINGS_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
  }
};
