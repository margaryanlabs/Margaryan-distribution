import { sanitizeMotionProject, type MotionProject } from "./studio";

/**
 * Keyless local Film Vault — named, manually saved PROJECT SNAPSHOTS.
 * Browser localStorage only. Media files, audio bytes, credentials and user IDs
 * are intentionally never serialized. This is NOT a hosted account or backup.
 */
export const VAULT_KEY = "margaryan-motion-local-vault-v1";
export const VAULT_LIMIT = 18;
export const VAULT_ITEM_MAX_BYTES = 85_000;
export const VAULT_TOTAL_MAX_BYTES = 740_000;
export type LocalFilmSnapshot = {
  id: string;
  name: string;
  createdAt: string;
  savedAt: string;
  project: MotionProject;
};
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}
function decodeItem(source: unknown): LocalFilmSnapshot | null {
  if (!isRecord(source) || !isRecord(source.project) || !Array.isArray(source.project.scenes)) return null;
  if (source.project.scenes.length < 1 || source.project.scenes.length > 8) return null;
  if (typeof source.id !== "string" || !/^[a-zA-Z0-9_-]{8,90}$/.test(source.id)) return null;
  if (typeof source.name !== "string" || source.name.trim().length < 1 || source.name.length > 90) return null;
  if (typeof source.createdAt !== "string" || typeof source.savedAt !== "string" ||
      !Number.isFinite(Date.parse(source.createdAt)) || !Number.isFinite(Date.parse(source.savedAt))) return null;
  if (bytes(source) > VAULT_ITEM_MAX_BYTES) return null;
  try {
    const project = sanitizeMotionProject(source.project);
    // Reject malformed or truncated imports; don't silently keep bad scenes.
    if (project.scenes.length !== source.project.scenes.length) return null;
    // Never accept cloud pointers or arbitrary data as a named snapshot.
    return {
      id: source.id, name: source.name.trim(), createdAt: source.createdAt,
      savedAt: source.savedAt, project
    };
  } catch { return null; }
}
export function readLocalFilmVault(storage: StorageLike): LocalFilmSnapshot[] {
  const serialized = storage.getItem(VAULT_KEY);
  if (!serialized || serialized.length > VAULT_TOTAL_MAX_BYTES + 10_000) return [];
  try {
    const source: unknown = JSON.parse(serialized);
    if (!Array.isArray(source) || source.length > VAULT_LIMIT) return [];
    const items = source.map(decodeItem);
    if (items.some(item=>item === null)) return []; // Fail-closed on corruption.
    const seen = new Set<string>();
    for (const item of items as LocalFilmSnapshot[]) {
      if (seen.has(item.id)) return [];
      seen.add(item.id);
    }
    return (items as LocalFilmSnapshot[]).sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
  } catch { return []; }
}
function put(storage: StorageLike,items: LocalFilmSnapshot[]): void {
  const json = JSON.stringify(items);
  if (bytes(items) > VAULT_TOTAL_MAX_BYTES) throw Error("Local vault storage limit reached; delete older snapshots.");
  storage.setItem(VAULT_KEY,json); // Browser quota failures remain user-visible.
}
export function saveLocalFilmSnapshot(storage: StorageLike,project: MotionProject,name?:string): LocalFilmSnapshot {
  const items = readLocalFilmVault(storage);
  if (items.length >= VAULT_LIMIT) throw Error("Local vault holds 18 films. Delete one before saving.");
  const valid = sanitizeMotionProject(project);
  if (!Array.isArray(project.scenes) || valid.scenes.length !== project.scenes.length)
    throw Error("This film is invalid and cannot be saved.");
  const label = (name || valid.title).replace(/[\u0000-\u001f\u007f]/gu,"").trim().slice(0,80);
  if (!label) throw Error("Enter a film name.");
  const now = new Date().toISOString();
  const id = globalThis.crypto && typeof globalThis.crypto.randomUUID === "function" ?
    globalThis.crypto.randomUUID() : "film-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,13);
  const item = {id,name:label,createdAt:now,savedAt:now,project:valid};
  if(bytes(item)>VAULT_ITEM_MAX_BYTES)throw Error("Too many scene details for the Local Film Vault.");
  put(storage,[item,...items]);
  return item;
}
export function replaceLocalFilmSnapshot(storage:StorageLike,id:string,project:MotionProject):LocalFilmSnapshot {
  const items=readLocalFilmVault(storage);
  const current=items.find(item=>item.id===id);
  if(!current)throw Error("Selected film was not found in this browser.");
  const valid=sanitizeMotionProject(project);
  if (!Array.isArray(project.scenes)||valid.scenes.length!==project.scenes.length)
    throw Error("Invalid film; cannot overwrite a saved snapshot.");
  const updated={...current,project:valid,savedAt:new Date().toISOString()};
  if(bytes(updated)>VAULT_ITEM_MAX_BYTES)throw Error("Film exceeds the per-snapshot size limit.");
  put(storage,[updated,...items.filter(item=>item.id!==id)]);
  return updated;
}
export function deleteLocalFilmSnapshot(storage:StorageLike,id:string):void {
  const items=readLocalFilmVault(storage);
  if(!items.some(item=>item.id===id))throw Error("Film not found; no changes made.");
  put(storage,items.filter(item=>item.id!==id));
}
export function clearLocalFilmVault(storage:StorageLike):void {
  storage.removeItem(VAULT_KEY);
}
