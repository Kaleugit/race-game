# 2026-09-21 — TASK-kaleugit-EP-006-01

- Profile API: createProfile(storage, listStages()) -> getGarage() {color,tire,gearbox} (no upgrades: feeds resolveCarParams directly), saveGarage, getUnlocked, isUnlocked, getBest(stageId), recordWin(stageId, time) -> {best, isNewBest, unlockedId}.
- Garage `color` is a CAR_COLORS id (default 'vermelho'); map to hex with getCarColor(id).hex for applyCarLook.
- profile.js must receive stages injected (stages/index.js uses import.meta.glob, Node-incompatible).
