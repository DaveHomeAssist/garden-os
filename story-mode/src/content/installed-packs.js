/**
 * Player-installed content packs.
 *
 * A pack is a JSON file the player picks from their device (Content Packs in
 * the pause menu). Accepted packs are kept in localStorage under one
 * namespaced key and loaded at boot, so the set travels with the browser
 * profile like saves do. Packs are data only: nothing in a pack is executed,
 * and every pack passes validateContentPack before it is stored.
 */
import { validateContentPack } from '../game/pack-validator.js';

const STORAGE_KEY = 'gos-content-packs';
const MAX_PACKS = 12;
const MAX_PACK_BYTES = 64 * 1024;

function getStorage(storage) {
  return storage ?? globalThis.localStorage ?? null;
}

function readStore(storage) {
  const store = getStorage(storage);
  if (!store) return [];
  try {
    const parsed = JSON.parse(store.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((pack) => pack && typeof pack === 'object') : [];
  } catch {
    return [];
  }
}

function writeStore(packs, storage) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(packs));
    return true;
  } catch {
    return false;
  }
}

/** Installed packs, oldest first. */
function loadInstalledPacks(storage) {
  return readStore(storage);
}

/**
 * Validate and store a pack from file text. Replaces an installed pack with
 * the same id. Returns { ok, pack } or { ok: false, errors }.
 */
function installPackFromText(text, { storage, isOfficial } = {}) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, errors: ['The file is empty.'] };
  if (new TextEncoder().encode(text).length > MAX_PACK_BYTES) {
    return { ok: false, errors: [`Packs are limited to ${MAX_PACK_BYTES / 1024} KB.`] };
  }
  let pack;
  try {
    pack = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['The file is not valid JSON.'] };
  }
  const validation = validateContentPack(pack, { isOfficial });
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const installed = readStore(storage).filter((existing) => existing.id !== pack.id);
  if (installed.length >= MAX_PACKS) {
    return { ok: false, errors: [`Remove a pack first. Up to ${MAX_PACKS} packs can be installed.`] };
  }
  if (!writeStore([...installed, pack], storage)) {
    return { ok: false, errors: ['This browser would not save the pack. Storage may be full or blocked.'] };
  }
  return { ok: true, pack };
}

function removeInstalledPack(packId, { storage } = {}) {
  const installed = readStore(storage);
  const next = installed.filter((pack) => pack.id !== packId);
  if (next.length === installed.length) return false;
  return writeStore(next, storage);
}

export {
  MAX_PACKS,
  MAX_PACK_BYTES,
  STORAGE_KEY as INSTALLED_PACKS_STORAGE_KEY,
  installPackFromText,
  loadInstalledPacks,
  removeInstalledPack,
};
