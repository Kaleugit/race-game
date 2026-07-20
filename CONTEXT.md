# Race Game

Ubiquitous language for the race-game project. Only terms not already defined in docs/briefing.md belong here.

## Language

**Tela Cheia**:
The player-facing action to maximize the play area. On platforms without a fullscreen API (iPhone), it means best-effort fill of the visible viewport; true fullscreen there requires Standalone Mode.
_Avoid_: Fullscreen mode (ambiguous across platforms)

**Standalone Mode**:
The game running from a home-screen icon as an installed web app, with no browser chrome. The only way to achieve true fullscreen on iPhone.
_Avoid_: PWA mode, app mode
