# Shinobi Ascension — Storm of Legends

A playable ninja action RPG built for YouTube Playables. No frameworks, no external assets,
no dependencies. Every hero, icon, effect, and note is generated in code.

> **Original IP only.** This is not a Naruto game and cannot use Naruto characters, names,
> symbols, or music. See `DESIGN.md` section 4.

## Run it

```bash
node server.js
```

Open **http://localhost:4173**.

A server is required because the game uses ES modules. Opening `index.html` directly from
disk will not work.

## The game

Start by choosing one of six playable shinobi, then enter the camp:

| Hero | Role | Identity |
|---|---|---|
| **Kaito** | Assassin | Storm dashes, chain lightning, blade beams, Thunderfall Judgment |
| **Mira** | Guardian | Heavy slams, shockwaves, iron defense, Worldbreaker |
| **Ren** | Fire Arts | Embers, flame fans, burning zones, Pyre Requiem |
| **Sora** | Controller | Silk needles, binding chains, slowing webs, Silk Requiem |
| **Yuki** | Ranger | Piercing arrows, arrow rain, gale traps, Skyfall Final Hunt |
| **Aster** | Mage | Arcane bolts, frost, meteors, a singularity, Starfall Requiem |

Each hero has six techniques: one movement dash, four regular actives, and one signature
**Execution**. The Execution unlocks at level 6. Once unlocked, it is auto-equipped in the
four-slot loadout; choose the other three techniques around it in the camp.

Auto-attacks are hero-specific: Kaito and Mira strike in melee, Ren throws embers, Sora lashes
with silk, Yuki fires arrows from long range, and Aster casts arcane bolts from range.

### Run structure

- **7 chapters**, each with **4 waves + a boss**
- Defeat a chapter boss to unlock the next chapter on that hero's map
- Waves hold 8–12 initial enemies plus a reinforcement pack, for roughly 13–21 enemies per wave; elites appear in the last wave
- After a wave, a short **wave-cleared** beat plays, then the upgrade cards open
- After the boss falls, time slows for a **boss-death sequence** with fireworks and a chapter-clear banner
- Results show rank, stars, rewards, and buttons to continue, return to camp, replay, or change hero

### Camp

- **Campaign** — the chapter map, boss preview, clear count, best rank, first-clear reward, and Deploy
- **Arsenal** — upgrade techniques with skill points, arrange your four-slot loadout around the Execution once it unlocks at level 6, view passives and evolutions
- **Shop** — hero skins, blade skins, and early technique unlocks
- **Evolve** — choose one of two permanent paths at level 10
- **Change Hero** — return to the character-select screen

## Controls

| Action | Input |
|---|---|
| Move | WASD / arrow keys, or drag anywhere on screen (touch) |
| Auto-attack | automatic (nearest enemy) |
| Dash | Space |
| Techniques | 1–4 |
| Execution | F (or its equipped slot) |
| Rage / Rage Art | R |
| Pause | Esc |

Hits fill the **rage column** on the left. When it is full, press **R** to transform.
While raging, press **R** again to spend the Rage Art, a hero-specific finisher.

The signature **Execution** unlocks at level 6, so the early chapters are fought without it.
Once unlocked, press **F** when charged. It starts empty each run and fills from hits and kills.
At 100% it freezes the arena for a cinematic finisher: normal enemies are destroyed, bosses take
heavy damage and are stunned, and the HUD returns when the animation ends. The Execution then
resets to empty and has a long cooldown.

### Per-hero progress

Each shinobi has an independent save profile:

- level and XP
- coins and skill points
- attributes
- techniques and ranked skills
- four-slot loadout and evolution
- chapter clears, best ranks, run stats, and lifetime kills

Hero select shows each hero's level on their roster card. Swapping heroes swaps the active
save, so leveling Kaito does not level Mira. Skins, blade skins, and settings remain
account-wide cosmetic/configuration choices.

### Character select showcase

The selected hero now physically holds their weapon. The idle showcase loops a signature
weapon move: Kaito's katana slash, Mira's hammer lift, Ren's fan flourish, Sora's whip sway,
Yuki's bow draw, and Aster's spinning staff and orb. Reduced-motion mode keeps the pose but drops
the looping animation.

## Systems

### Progression

- XP curve: `round(150 × 1.3^(level − 1))`
- Skill points: +1 per level; each skill has five ranks
- Skill auto-unlock levels: **1 / 3 / 5 / 8 / 10**
- Execution unlock: **level 6**
- Evolution at level 10, permanent per hero
- Max level 60
- **Chapters unlock by defeating the previous chapter's boss**, not by player level
- All level, XP, coin, attribute, skill-point, chapter, and stats progression is per hero

### Five attributes, twelve stars each

| Attribute | Effect per rank |
|---|---|
| **Power** | +2 damage |
| **Vitality** | +8 max health |
| **Agility** | +4 move speed |
| **Focus** | +2 energy, +0.5% crit |
| **Armor** | +1.5% damage reduction |

Attribute cards are shown as five vertical cards after every wave, but you may claim **only one
upgrade per intermission**. Costs rise with rank, and the effects are deliberately modest. Every
point fills a star and changes the card art; Power also changes the hero's blade, Armor changes
the shoulders, Agility lengthens the scarf, Focus intensifies the aura, and Vitality adds a chest
sigil.

### Shop and cosmetics

- 12 hero skins (2 per hero)
- 4 blade skins that change weapon shape and glow
- Technique scrolls that unlock skills before their level gate
- All purchases use coins earned in combat

### Rage

- Hits fill the rage column; kills fill it faster
- Rage grants +35% damage, +10% crit, +10% speed, +50% energy regen, and −25% skill cost
- Rage resets skill cooldowns
- Each hero has a unique Rage Art
- The column shows the normal portrait at the bottom and the rage portrait at the top

### Element identity

Every hero has its own combat language and visual effects:

- Kaito: lightning chains, strikes and storm fields
- Mira: stone spikes, shockwaves, hammer impacts and Worldbreaker
- Ren: burning embers, flame fans, fire zones and Pyre Requiem
- Sora: silk lines, webs, slows and Silk Requiem
- Yuki: arrows, piercing line shots, gale traps and Skyfall Final Hunt
- Aster: arcane sigils, frost, meteors and Starfall Requiem

## Project structure

```
index.html        screens, HUD, overlays
styles.css        game UI system and responsive layout
src/data.js       heroes, skills, rage arts, enemies, bosses, zones, cosmetics, formulas
src/game.js       state, input, combat, rendering, UI
src/sdk.js        YouTube Playables SDK wrapper + local save fallback
src/audio.js      WebAudio SFX + procedural music (7 themes + boss + dojo)
src/icons.js      inline SVG icons, portraits, skill art, blade art, card art
server.js         zero-dependency static server
DESIGN.md         full design document (v0.2 history + v0.3 addendum)
```

## Save data

- Save key: `shinobi-ascension-save-v3`
- Legacy `v1` saves are read and migrated on boot
- Local storage is used outside YouTube; `loadData`/`saveData` is used inside Playables
- Saves are normalized and merged with defaults, so added content does not break old profiles
- Each hero owns a profile under `state.heroProgress[heroId]`; legacy shared progress is copied to every hero once on migration, then diverges

## Dev helpers

The game exposes a debug API in the browser console:

```js
__shinobi.state              // current save state (active hero + heroProgress)
__shinobi.run                // current run, if any
__shinobi.addXp(500)
__shinobi.addCoins(1000)
__shinobi.setLevel(10)
__shinobi.start('volcano')
__shinobi.tick(10)
__shinobi.clearWave()
__shinobi.finish(true)
__shinobi.showResult()
__shinobi.openDojo('map')
__shinobi.openHeroSelect()
__shinobi.activateRage()
__shinobi.castRageArt()
__shinobi.castSkill('k_ult')
__shinobi.reset()
```

## Notes

- Initial bundle is tiny because all art and audio are generated at runtime.
- The game is single-player by design; Playables does not allow external game servers.
- No IAP, no third-party ads, no external links.
- The YouTube SDK is the only external request.
