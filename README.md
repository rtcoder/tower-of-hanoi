# Tower of Hanoi

A browser-based Tower of Hanoi puzzle game with a modern dark UI, fully playable on both desktop and mobile.

## Rules

Move all discs from peg A to peg C following two rules:

1. Only one disc can be moved at a time (always the top disc of a peg).
2. A larger disc can never be placed on top of a smaller one.

The minimum number of moves required for *n* discs is **2ⁿ − 1**.

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Move a disc | Drag & drop | Tap disc, then tap target peg |
| Change disc count | ⬇ / ⬆ buttons | ⬇ / ⬆ buttons |
| Auto-solve | Solve button | Solve button |
| Restart | Restart button | Restart button |

## Features

- 1–12 discs
- Drag & drop on desktop
- Tap-to-select on touch devices — valid target pegs are highlighted
- Auto-solver with animation speed scaled to disc count
- Move counter
- Win screen with total move count

## Running locally

No build step required — open `index.html` directly in a browser.
