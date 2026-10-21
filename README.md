# Shinobi Ascension

A playable vertical slice of an original ninja action RPG built for YouTube Playables.
No frameworks, no external assets, no dependencies. Everything is drawn and synthesized
in code.

> **Original IP only.** This is not a Naruto game and cannot use Naruto characters,
> names, symbols, or music. See `DESIGN.md` section 4.

## Run it

```bash
node server.js
```

Open **http://localhost:4173**.

A server is required because the game uses ES modules. Opening `index.html` directly
from disk will not work.

## Controls

| Action | Input |
|---|---|
| Move | WASD / arrow keys, or drag anywhere on screen (touch) |
| Auto-attack | automatic (nearest enemy) |
| Dash | Space |
| Spark Bolt | 1 |
| Chain Lightning | 2 |
| Thunder Storm | 3 |
| Thunderfall | 4 |
| Pause | Esc |

## What is implemented

- 5 zones with level gates: Bamboo Forest (1), Abandoned Village (3), Crystal Caverns (6),
  Ember Volcano (10), Shadow Fortress (15)
- 3 waves + boss per zone, 5 bosses, 18 enemy types
- **Between-wave intermission** with a shop, skill upgrades, and a heal option
- **Next Map** shortcut on the victory screen when the next zone is unlocked
- XP, levels, automatic skill unlocks at 2/4/6/8/10, skill-point upgrades
- Coins, 4 attributes, rank-up costs, 12 ranks each
- Level 10 evolution choice: Thunder Assassin or Wind Dancer
- Dojo with Map / Skills / Shop / Evolve tabs
- **Vector skill icons** (no emoji), MOBA-style skill fan on the bottom-right
- **Original procedural music** per zone, a boss theme, and a dojo theme
- **Louder SFX** with new blade, dash, lightning, and impact sounds
- **Redrawn hooded ninja** with walk, dash, and blade-swing animation
- **Lightning, wind, shockwave, meteor, and dragon-strike VFX**
- **New enemy abilities**: charges, volleys, guard, fire zones, and teleports
- **Per-boss attack patterns**: slams, fans, charges, spikes, meteor showers, rings,
  and shadow blinks
- Touch joystick that spawns **wherever you press**
- Save/load with `localStorage`, or YouTube cloud save when the SDK is active
- YouTube SDK hooks: `firstFrameReady`, `gameReady`, `onPause`/`onResume`,
  audio state, `sendScore`, `loadData`/`saveData`
- No external calls except the official Playables SDK script

## Project structure

```
index.html        screens, HUD, overlays
styles.css        UI system and responsive layout
src/data.js       heroes, skills, enemies, zones, formulas
src/game.js       state, progression, combat, rendering, UI
src/sdk.js        Playables SDK wrapper + local fallback
src/audio.js      WebAudio sound effects
server.js         zero-dependency static server
DESIGN.md         full game design document
```

## Dev helpers

The game exposes a debug API in the browser console:

```js
__shinobi.state              // current save state
__shinobi.addXp(500)         // grant XP, may level up
__shinobi.addCoins(1000)     // grant coins
__shinobi.setLevel(10)       // jump to level 10
__shinobi.start('volcano')   // enter a zone
__shinobi.tick(10)           // simulate 10 seconds of combat
__shinobi.finish(true)       // end the current run as a victory
__shinobi.reset()            // wipe save and reload
```

## Next steps

1. Replace code-drawn enemies with a hand-drawn sprite atlas.
2. Add music and more SFX variations.
3. Add the remaining three heroes.
4. Add cosmetics, achievements, and a daily first-run bonus.
5. Run the official Playables test suite and bundle analyzer, then submit through the
   interest form.

## Notes

- The initial bundle is tiny (code-only), well under the 15 MiB target.
- The game is single-player by design: Playables does not allow external game servers.
- The in-game SFX toggle is a prototype convenience. Production should rely on the
  platform mute setting; the SDK wrapper already respects it.
