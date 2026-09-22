# 2026-09-21 — TASK-kaleugit-EP-006-03

- UI API: showGarage({selection, colors: CAR_COLORS, tires: TIRES, gearboxes: GEARBOXES, onChange, onConfirm}) / hideGarage; showStageMap({stages: listStages(), isUnlocked, onSelect, onBack?}) / hideStageMap; showResult({won, playerTime, botTime, bestTime, isNewBest?, onRematch, onMap, onGarage}) / hideResult; formatTime, formatDelta in src/ui/format.js.
- Overlays toggle via .show; buttons without callbacks are hidden; handlers assigned via onclick (safe to reopen every race).
- #end-lobby-btn is hidden but still present because src/main.js binds it at load — EP-006-04 removes both.
