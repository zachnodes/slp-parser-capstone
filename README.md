# Melee SLP Parser

## Purpose

This parser reads `.slp` (Slippi replay) files and converts the raw binary event
stream into structured data that powers two features of the tracker system:

1. **Replay playback** — reconstructing a Melee game frame-by-frame so it can be
   rendered in the browser (HTML canvas), including character positions,
   animations, and stage effects.
2. **Analytics** — deriving statistics from a parsed game (stocks, percent,
   combos, punishes, L-cancel rate, etc.) for display alongside playback.

The parser is a standalone component. It takes a `.slp` file as input and
produces structured output (JSON) as its result — it does not depend on the
queue, S3, or either database to function, so it can be built and tested in
isolation before being wired into the rest of the system.

### Where it fits in the system

Uploaded `.slp` files are stored in S3. A queue worker (RabbitMQ, to be
implemented later) will pull parse jobs, fetch the raw file from S3, run it
through this parser, and persist the output to the Parser DB. The browser then
reads from Parser DB to render playback and display stats when a user selects
a game.

## Goals

Goals are ordered so each is independently buildable and testable before the
next depends on it.

### Goal 0 — Decode the raw event stream (foundation)

- Read a `.slp` file and isolate the `raw` element from its UBJSON wrapper.
- Parse the **Event Payloads** event (`0x35`), which is always first in the
  stream, to build an `{ eventCode: payloadSize }` lookup table.
- Loop through the byte stream dispatching each event by code (payload
  contents can be ignored for now).
- **Done when:** every event in a real replay file can be iterated over
  without crashing, using sizes read from the file itself rather than
  hardcoded.

### Goal 1 — Produce a canonical parsed-game structure

- Decode **Game Start** (`0x36`): characters, stage, stock count, settings.
- Decode **Post-Frame Update** (`0x38`) for every frame/character into a
  structured array, e.g. `frames[i].players[p] = { x, y, percent, stocks,
actionStateId, facingDirection, ... }`.
- Decode **Game End** (`0x39`): end method, placements.
- Output one in-memory object (or JSON document) per game. This is the shared
  foundation both downstream goals build on.
- **Done when:** a human-readable summary can be printed for any real replay
  file — characters, stage, duration, final stocks.

### Goal 2 — Playback: transform canonical data into browser-renderable frames

- Define a compact frame format for the browser (likely narrower than the
  full canonical structure).
- Map `actionStateId` / `animationIndex` to renderable animation state (this
  touches a separate character animation/sprite table, not the binary parser
  itself).
- Add **Pre-Frame Update** (`0x37`) if control-stick/button display is wanted.
- Add **Item Update** (`0x3B`) and stage-specific events (FOD Platforms,
  Whispy Blow Direction, Stadium Transformations) for items/stage animation.
- **Done when:** a JSON output exists that tells a canvas renderer, frame by
  frame, where every character is and what they're doing.

### Goal 3 — Analytics: derive stats from canonical data

- Basic stats first (no cross-frame logic needed): stock counts, final
  percent, characters/stage used, game length.
- Stateful stats next (require watching sequences of frames): combos,
  punishes, L-cancel success rate, tech chases, neutral wins — derived by
  watching hitstun/hurtbox-state/percent transitions across consecutive
  Post-Frame events.
- **Done when:** a stats object can be produced per game (and ideally per
  player) summarizing performance beyond the final score.

### Goal 4 — Metadata parsing (low priority, independent)

- Parse the `metadata` UBJSON block for `startAt`, `playedOn`, player display
  names, and connect codes.
- Standalone — doesn't touch the binary event stream, can be done at any
  point.

## Suggested build order

`0 → 1 → 3 (basic stats) → 2 (playback) → 3 (stateful stats)`

Goals 0 and 1 are prerequisites for everything else. Goals 2 and 3 are
independent consumers of the same canonical frame data and can be built in
either order once Goal 1 exists. Goal 4 can slot in whenever.
