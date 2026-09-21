// Node equivalent of src/stages/index.js (import.meta.glob only exists in Vite).
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { createRegistry } from '../../src/stages/registry.js';

export const STAGES_DIR = fileURLToPath(new URL('../../src/stages/', import.meta.url));

export async function loadStageModules() {
  const modules = {};
  for (const file of readdirSync(STAGES_DIR).filter((f) => f.endsWith('.stage.js')).sort()) {
    modules[`./${file}`] = await import(pathToFileURL(join(STAGES_DIR, file)).href);
  }
  return modules;
}

export async function loadStages() {
  return createRegistry(await loadStageModules());
}
