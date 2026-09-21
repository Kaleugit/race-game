// Stage discovery: every src/stages/*.stage.js file becomes a stage (Vite only).
import { createRegistry } from './registry.js';

const registry = createRegistry(import.meta.glob('./*.stage.js', { eager: true }));

export const { getStage, listStages, getDefaultStage } = registry;
