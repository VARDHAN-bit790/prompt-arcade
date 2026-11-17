# Prompt Arcade — Advanced Expedition

A browser game for practicing the habits behind effective prompts: clear instructions, relevant context, constraints, ordered rules, and revision based on feedback.

**[Play the public game](https://prompt-arcade-lab.racingbadger3.chatgpt.site)**

Eight worlds contain three stages each: **Explorer, Operator, and Architect**. Play 24 missions and earn up to 72 stars. Each level is an interactive game with a visible simulation, controls, goals, and feedback.

## Run locally

Install Node.js 18 or later, download or clone this repository, and run:

```sh
npm start
```

Open **http://127.0.0.1:3000**. No dependency installation, API key, account, or build step is required. Set `PORT` to change the port; `HOST` defaults to the local machine only.

Alternatively, with Python 3:

```sh
python3 -m http.server 3000 --bind 127.0.0.1 --directory dist
```

## How to play and what you learn

Choose a world and start with Explorer. Read its mission goal and controls, try an instruction, observe the result, and adjust one part at a time. Use the in-game help for stage-specific requirements and the Field guide for command examples.

| World | How to complete a mission | Skill to carry into prompting |
| --- | --- | --- |
| Rover Run | Write a route that takes the rover through the required objectives to the exit without hitting obstacles. | Break a task into precise, ordered steps. |
| Prism Catch | Steer the collector and apply inclusion/exclusion rules to catch the required shapes while avoiding mistakes. | Define what belongs in the output and what should be excluded. |
| Bridgeworks | Choose materials and slots, stay within the available budget, and build a crossing that supports the rover. | State constraints and check them together. |
| Drone Garden | Set a destination, spacing, and hazard avoidance so the swarm reaches the required formation. | Give context and boundaries as well as a goal. |
| Laser Loom | Rotate mirrors, fire the beam, and revise the path until it reaches the receiver. | Make targeted edits and use feedback to diagnose failures. |
| Factory Flow | Order routing rules so the batch reaches the correct destinations with the required accuracy. | Put specific exceptions before broad rules. |
| Signal Defense | Place towers and tune targeting priorities to survive the incoming waves. | Make tradeoffs and specify which goal has priority. |
| Escape Protocol | Inspect the room, collect clues and items, and solve dependencies to unlock the exit. | Ground decisions in observed evidence. |

After a mission, the debrief connects your game strategy to a prompting habit. Replay to improve your result or move to the next stage. The field guide, run journal, command notebook, and reflection notes support practice between attempts.

These games use deterministic command parsers and simulations. They do not send prompts to an AI model or evaluate unrestricted natural language. The lessons practice transferable habits; the commands follow each game's documented syntax.

## Features

- Eight Canvas game worlds, three stages per world, and best-result tracking.
- Command drafts, a run journal, a reusable command notebook with remove/undo, and reflection notes.
- Focus mode, optional sound, milestones, and progress export/import.
- Browser-local progress with migration from the previous game version.
- Responsive layout, keyboard navigation for interface controls, and touch controls where the game supports them.

## Progress and privacy

Progress, drafts, notes, settings, and the notebook are stored in this browser's `localStorage` under `prompt-arcade-expedition-v3`. They do not automatically sync between devices. Use **Your progress → Export** to make a backup and import it on another device. Imports merge best results and preserve existing notes.

There is no application backend or analytics code. Google Fonts is used for typography, with system fallbacks if the fonts cannot load. Hosting services may keep their own access logs. If browser storage is unavailable, progress lasts only for the current session.

## Test

```sh
npm test
```

Five dependency-free Node test suites exercise the 24 missions, command parsing and errors, action-game lifecycle, persistence/migration, completion handling, notebook undo, and backup merging. They use simulated browser APIs and are logic checks; they do not replace testing rendering and interaction in real browsers.

## Project structure

```text
dist/
  index.html          Page shell and asset loading
  styles.css          Interface and responsive styles
  app.js              Navigation, game mounting, journal, and debriefs
  progress.js         Validated persistence and migration
  games-world.js      Rover Run, Bridgeworks, Laser Loom
  games-action.js     Prism Catch, Drone Garden, Signal Defense
  games-puzzles.js    Factory Flow, Escape Protocol
scripts/
  serve.cjs           Local static development server
  run-tests.cjs       Portable test runner
tests/                Five game and application test suites
```

`dist/` contains the editable application source as well as the deployable site. Game modules register on `window.PromptGames` and receive the mount root, stage, event/completion callbacks, and sound callback. Each returns a cleanup function to release its timers and listeners when the player leaves.

## Hosting

Upload the contents of `dist/` to any static HTTPS host. No build command or server runtime is required. Navigation uses URL hashes, so no special route rewrites are necessary. The existing public game is hosted separately; pushing this repository alone does not update that deployment.

This portable export contains the current published game, documentation, and tests. It intentionally excludes hosting account configuration, credentials, and browser progress data.
