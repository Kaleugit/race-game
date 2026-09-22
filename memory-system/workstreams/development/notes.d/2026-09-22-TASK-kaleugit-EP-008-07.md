# 2026-09-22 — TASK-kaleugit-EP-008-07

- UI tokens live on :root in index.html (--ui-font, --ui-fs, --ui-gold, --ui-muted, --ui-panel-bg, --ui-panel-border, --ui-glass-bg, --ui-face, --ui-bot...). Garage docks and race UI both use them; change the type scale there.
- Race layout: `.race-ui` sets --hud-gut / --hud-w (18.4em) / --act-w (9.6em); #race-bar left/right are computed from them. Resizing the gauges or buttons means updating these and re-running tests/e2e/hud-layout.spec.js.
- src/ui/race-hud.js owns #speed (SVG text), #dist, #bot-dist and the gauges; #turbobar no longer exists. Tank capacity is visible as `#turbo-gauge[data-segments]` + `.turbo-seg` count; `data-state` = idle|low|active|lockout, `data-filled` = lit segments.
- Touch controls are enabled by #mobiletoggle / TELA CHEIA (class .show on #touchpad), not auto-detected.
