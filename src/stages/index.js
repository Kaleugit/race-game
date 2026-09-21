/**
 * @module stages/index
 * @summary Stage discovery: every src/stages/*.stage.js file becomes a stage (Vite import.meta.glob).
 */
import { createRegistry } from './registry.js';

const registry = createRegistry(import.meta.glob('./*.stage.js', { eager: true }));

export const { getStage, listStages, getDefaultStage } = registry;
