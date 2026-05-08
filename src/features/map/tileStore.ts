import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface TileDB extends DBSchema {
  tiles: { key: string; value: ArrayBuffer };
}

let dbPromise: Promise<IDBPDatabase<TileDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<TileDB>("friluftskompis-tiles", 1, {
      upgrade(db) {
        db.createObjectStore("tiles");
      },
    });
  }
  return dbPromise;
}

export async function getTile(key: string): Promise<ArrayBuffer | undefined> {
  return (await getDB()).get("tiles", key);
}

export async function putTile(key: string, data: ArrayBuffer): Promise<void> {
  await (await getDB()).put("tiles", data, key);
}
