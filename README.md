# 3al Lebnene — Beirut Times

A Wordle-style daily word game built around Lebanese Arabizi vocabulary.

## Status

🚧 In progress — main menu page complete. Game board, word list, and internal pages coming next.

## Structure

```
index.html        Main menu (topbar, animated hero, info modal)
css/style.css      Hand-written CSS3 (design tokens, animations, responsive rules)
js/main.js         ES6 classes: ThemeManager, SparkleField, TileTitle, StartTrigger, InfoModal
```

## Main menu features

- Animated night-sky backdrop (drifting gradient + sparkle particles + skyline silhouette) — ready to swap in a real background photo.
- Dark/light theme toggle, persisted in `localStorage`.
- "3AL LEBNENE" title rendered as Wordle-style tiles that flip in on load.
- Pulsing "press anywhere to start game" prompt — currently logs `game started` to the console; real game start wired up later.
- "؟" info button opens a modal with loading/error states and a 3-page pager (Gameplay / History / Description) — currently backed by mock data in `InfoModal.fetchSections()`, ready to be pointed at the real API endpoint(s).

## AI-use appendix

_To be filled in as the project progresses — will track prompts used and specific mistakes caught and fixed._
