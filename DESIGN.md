# SHINOBI ASCENSION
### Game Design Document — v0.1 (vertical slice)

**Genre:** top-down action RPG / arena fighter
**Platform:** YouTube Playables (HTML5), mobile + desktop
**Session length:** 5–9 minute runs, 10–15 minute sessions
**Status:** playable prototype in this folder

---

## 1. One-page pitch

You are a young ninja with a borrowed blade and a storm in your blood. Fight through
cursed lands, level up, unlock techniques one by one, and choose what kind of legend
you become.

**Core fantasy:** start as a nobody, end as a one-ninja army.

**Core loop:**

> Enter a zone → clear 3 waves → defeat the boss → earn XP + coins → unlock a skill →
> upgrade attributes → open the next area → repeat.

Every run makes you visibly stronger. Every level gives a new tool. Every area opens
because *you* grew, not because a menu said so.

---

## 2. Design pillars

1. **Instant power fantasy.** The player is dangerous from second one. Auto-attack,
   one movement input, three buttons.
2. **Visible growth.** Bigger damage numbers, new skills, new areas, new title.
3. **One more run.** Short runs, fast restarts, a rank to beat.
4. **Original world.** A ninja fantasy built from original clans, characters, art, and
   language — not a licensed anime.

---

## 3. Platform and constraints

YouTube Playables runs HTML5 games inside YouTube, on web and in the Android/iOS apps.

| Constraint | Target |
|---|---|
| Initial bundle (load → `gameReady`) | **< 15 MiB** (hard cap 30 MiB) |
| Total bundle | **< 250 MiB** |
| Single file | < 512 KiB preferred (hard cap 30 MiB) |
| Load to interactive | < 5 seconds |
| JS heap | < 512 MB |
| Save data | < 500 KiB preferred (hard cap 3 MiB) |
| External calls | None (no CDN, analytics, or game servers) |
| Purchases | None (no IAP, no third-party ads) |
| Aspect ratios | 1:1, 16:9, 9:16 |
| Input | touch + mouse + keyboard |

**Implication:** single-player only. No accounts, no backend, no live ops. All content
ships in the bundle.

---

## 4. IP boundary (critical)

*Naruto* is owned by Masashi Kishimoto / Shueisha; game rights are licensed to Bandai
Namco. Characters, names, costumes, clan symbols, jutsu names, music, and story are
protected. A Naruto fan game cannot be published on YouTube Playables — it will fail
IP review and can be taken down elsewhere.

**This project uses 100% original IP.** The ninja genre, "grow stronger by fighting,"
and "unlock skills by leveling" are free to use. Anything recognizable from a specific
anime is not.

Rules for the team:

- No character names, likenesses, costumes, or voice impersonations from existing anime.
- No clan crests, headband symbols, or village names from existing works.
- No "chakra," "jutsu," "Hokage," or other franchise-specific terminology.
- No music that sounds like a known theme.
- If a reference is "close enough that a fan would recognize it," redesign it.

---

## 5. Core loop and session flow

```
TITLE
  └─ DOJO (hub)
       ├─ MAP      choose an unlocked zone
       ├─ SKILLS   spend skill points
       ├─ SHOP     spend coins on attributes
       └─ EVOLVE   choose a specialization at Lv. 10
             │
             ▼
          RUN (5–9 min)
             3 waves + boss
             XP, coins, level-ups, new skills
             │
             ▼
          RESULT (rank S/A/B/C)
             │
             └──────────────► DOJO
```

**First-session target:** reach level 4 and unlock the second area in under 8 minutes.

---

## 6. Controls

| Action | Desktop | Mobile |
|---|---|---|
| Move | WASD / arrow keys | virtual joystick (left) |
| Attack | automatic (nearest target) | automatic |
| Dash | Space | dash button |
| Skill 1 | 1 | button |
| Skill 2 | 2 | button |
| Skill 3 | 3 | button |
| Ultimate | 4 | button |
| Pause | Esc | pause button |

Auto-attack is intentional: it keeps the game playable with one thumb and removes
aiming frustration on small screens. Skill shots auto-target the nearest enemy.

---

## 7. Heroes

### 7.1 Kaito, the Stormstep (vertical slice)

**Role:** assassin / burst damage
**Fantasy:** a blade that moves faster than thought.

| Stat | Base | Per level |
|---|---|---|
| Health | 120 | +6 |
| Damage | 12 | +1.2 |
| Move speed | 220 | — |
| Crit chance | 5% | — |
| Energy | 100 | — |
| Energy regen | 12/s | — |

**Skills**

| Skill | Unlock | CD | Energy | Effect | Rank scaling |
|---|---|---|---|---|---|
| **Storm Dash** | 1 | 2.2s | 0 | Dash 150px, 0.35s invulnerable | +20px range, −0.08s CD per rank |
| **Spark Bolt** | 2 | 1.4s | 8 | Bolt at nearest enemy, 1.6× damage | +20% damage per rank |
| **Chain Lightning** | 4 | 5.0s | 22 | Hits up to 4 enemies within 280px, 1.2× each | +1 target at rank 3/5 |
| **Thunder Storm** | 6 | 8.0s | 30 | AoE 150px around player, 2.2× damage, knockback | +12% radius, +15% damage |
| **Thunderfall** | 10 | 18s | 55 | AoE 240px, 4× damage, 1.5s stun | +10% damage per rank |

**Passive — Static Charge (Lv. 8):** +10% crit chance.

**Upgrade ranks:** max 5. Each rank costs 1 skill point and adds roughly +20% power.
Skill points come from levels, so the player always has a reason to return to the dojo.

**Evolutions (Lv. 10)**

| Path | Bonus | Playstyle |
|---|---|---|
| **Thunder Assassin** | +25% damage, +10% crit, dash deals damage | delete one target at a time |
| **Wind Dancer** | +20% speed, −40% dash CD, −15% skill cost | untouchable hit-and-run |

The choice is permanent for the run of the prototype; final game can sell a reset for
coins (never real money).

### 7.2 Other heroes (post-slice)

| Hero | Role | Passive | Signature | Evolutions |
|---|---|---|---|---|
| **Mira, the Iron Lotus** | tank | 15% damage reduction | Stone Skin, Quake Slam | Iron Fortress / Mountain Breaker |
| **Ren, the Ashcaller** | ninjutsu | burn damage over time | Ember Wave, Smoke Clone | Pyre Sage / Ash Phantom |
| **Sora, the Threadweaver** | control | +20% energy regen | Binding Thread, Healing Pulse | Silk Warden / Puppet Master |

Each hero needs unique animation, VFX, and balance. Ship one at a time.

---

## 8. Progression

### 8.1 XP curve

```
xpToNext(level) = round(80 × 1.22^(level − 1))
```

| Level | XP to next | Unlock |
|---|---|---|
| 1 | 80 | Storm Dash |
| 2 | 98 | Spark Bolt |
| 3 | 119 | **Abandoned Village** |
| 4 | 146 | Chain Lightning |
| 5 | 178 | — |
| 6 | 217 | Thunder Storm, **Crystal Caverns** |
| 7 | 265 | — |
| 8 | 323 | Static Charge |
| 9 | 394 | — |
| 10 | 480 | Thunderfall, **evolution**, **Ember Volcano** |
| 11–14 | 586–1,066 | attribute scaling |
| 15 | 1,300 | **Shadow Fortress** |
| 16–20 | 1,586–3,515 | endgame |

XP sources: kills, boss kill, first clear bonus, repeat-clear bonus.

### 8.2 Skill points

- +1 skill point per level.
- Skills unlock **automatically** at milestone levels (no menu trip needed).
- Skill points are spent in the dojo to upgrade unlocked skills (rank 1 → 5).
- This separation keeps combat flow smooth while preserving build decisions.

### 8.3 Level gates

Areas open at **3, 6, 10, 15**. The first gate is deliberately early: the player must
see a new area in the first session. The level-15 gate is the "real" milestone and
should feel like an achievement.

---

## 9. Economy

### 9.1 Sources and sinks

| Source | Coins |
|---|---|
| Normal enemy | 3–20 |
| Elite / brute | 12–30 |
| Boss | 60–320 |
| First zone clear | 120–520 |
| Repeat clear | 40% of first-clear bonus |

| Sink | Cost |
|---|---|
| Attribute rank | `floor(30 × 1.32^rank)` |
| Skill upgrade | 1 skill point |
| Cosmetic (future) | 300–2,000 |

### 9.2 Attribute costs

| Rank | Cost | Rank | Cost |
|---|---|---|---|
| 0 → 1 | 30 | 6 → 7 | 158 |
| 1 → 2 | 39 | 7 → 8 | 209 |
| 2 → 3 | 52 | 8 → 9 | 276 |
| 3 → 4 | 69 | 9 → 10 | 364 |
| 4 → 5 | 91 | 10 → 11 | 481 |
| 5 → 6 | 120 | 11 → 12 | 635 |

Max rank 12 per attribute in the slice. This caps runaway scaling and keeps future
content meaningful.

### 9.3 Attributes

| Attribute | Effect per rank |
|---|---|
| **Power** | +3 damage |
| **Vitality** | +14 max HP |
| **Agility** | +7 move speed |
| **Focus** | +4 energy, +0.8% crit |

### 9.4 Anti-inflation rules

- Coins are only earned in combat (no idle income).
- Attribute costs grow faster than income.
- Boss rewards are capped by zone tier.
- Cosmetics are the long-term sink, not stats.

---

## 10. Combat

### 10.1 Derived stats

```
maxHp    = 120 + 6×(level−1) + 14×vitality + evolution
damage   = 12 + 1.2×(level−1) + 3×power
speed    = 220 + 7×agility
crit     = 0.05 + 0.008×focus + passives + evolution
energy   = 100 + 4×focus
```

Damage variance: ±10%. Crit multiplier: 1.8×.

### 10.2 Rules

- Auto-attack every 0.55s against the nearest enemy within 85px.
- Player invulnerability: 0.6s after being hit; 0.35s during dash.
- Energy regenerates 12/s; skills cannot be cast below cost.
- Enemies have a 0.25–0.6s wind-up before melee damage. The wind-up is visible.
- Ranged enemies keep distance and fire projectiles; projectiles can be dodged.
- Bosses use telegraphed slams and radial projectile fans.
- Death ends the run; the player keeps 100% of earned XP and coins in the slice
  (final game: 50–70% coins on defeat).

### 10.3 Run rank

```
score = kills×12 + maxCombo×8 + (victory ? 200 : 0) + floor(time/10)
S ≥ 900 · A ≥ 650 · B ≥ 400 · C < 400
```

Rank is shown on the result screen and saved as the player's best per zone.

### 10.4 Combo

Every hit or kill adds to the combo. The combo decays after 3 seconds without a hit.
Max combo feeds the rank and the HUD.

---

## 11. World

One connected map, five zones. Each zone is an arena with a distinct palette, enemy
pool, and boss. "Opening" a zone is a level gate plus a first-clear reward.

| Zone | Unlock | Tier | Enemies | Boss | First-clear reward |
|---|---|---|---|---|---|
| **Bamboo Forest** | 1 | 1.0 | Bandit, Archer, Brute | Training Master | 120c / 100xp |
| **Abandoned Village** | 3 | 1.3 | Rogue, Archer, Brute | Bandit Chief | 220c / 180xp |
| **Crystal Caverns** | 6 | 1.6 | Crawler, Shard Mage, Golem | Stone Guardian | 360c / 300xp |
| **Ember Volcano** | 10 | 2.0 | Ember Imp, Shard Mage, Brute | Fire Oni | 520c / 450xp |
| **Shadow Fortress** | 15 | 2.5 | Shadow Blade, Void Archer, Golem | Shadow King | 700c / 650xp |

### 11.1 Wave structure

- 3 waves per zone. Wave size grows from 5 to 9 enemies.
- 1.5s breather between waves, with a banner.
- Boss after wave 3.
- Enemies spawn at the arena edge with a 0.6s portal telegraph.

### 11.2 Difficulty scaling

```
enemyHp  = baseHp  × (1 + 0.16×(playerLevel−1)) × zoneTier × (1 + 0.25×clears)
enemyDmg = baseDmg × (1 + 0.09×(playerLevel−1)) × zoneTier
```

Clears are capped at 5 for scaling. This keeps old zones relevant without turning them
into damage sponges.

---

## 12. Enemies

| Enemy | Type | HP | Damage | Speed | XP | Coins | Behavior |
|---|---|---|---|---|---|---|---|
| Bandit | melee | 30 | 8 | 88 | 10 | 4 | basic chaser |
| Archer | ranged | 24 | 6 | 70 | 12 | 5 | keeps distance, fires arrows |
| Brute | melee | 95 | 16 | 58 | 25 | 12 | slow, heavy wind-up |
| Rogue | melee | 42 | 10 | 128 | 14 | 6 | fast flanker |
| Shard Mage | ranged | 34 | 11 | 62 | 18 | 8 | slow AoE orb |
| Crawler | melee | 18 | 6 | 152 | 7 | 3 | swarm |
| Golem | melee | 170 | 20 | 46 | 40 | 20 | tank, ground slam |
| Ember Imp | ranged | 32 | 9 | 112 | 15 | 7 | fast projectile |
| Shadow Blade | melee | 70 | 14 | 120 | 24 | 11 | teleport-step |
| Void Archer | ranged | 50 | 12 | 80 | 26 | 12 | long-range volley |

Bosses: 380–1,600 HP, 14–28 damage, telegraphed slam + projectile fan, enrage below 40%.

---

## 13. UI / UX

### Screens

1. **Title** — logo, hero card, controls, "Enter the Dojo."
2. **Dojo** — persistent header (level, XP, coins), four tabs: Map / Skills / Shop / Evolve.
3. **Map** — five nodes on one connected path; locked nodes show the required level.
4. **Skills** — cards for each skill, rank pips, unlock level, upgrade button.
5. **Shop** — four attribute rows with current effect, next effect, cost, buy button.
6. **Evolve** — two path cards at level 10, confirmation modal.
7. **Run** — HUD: HP, energy, XP, level, coins, wave, boss bar, combo, skill bar.
8. **Result** — victory/defeat, rank stamp, kills, coins, XP, buttons.

### Principles

- One primary action per screen.
- No nested menus deeper than two levels.
- All touch targets ≥ 44px.
- Readable at 360px width and at 1920px.
- Buttons show why they are disabled (cost, level, points).

---

## 14. Art and audio

### Art direction

- **Palette:** deep navy base, cyan lightning, gold coins, crimson enemies.
- **Shape language:** strong silhouettes, rounded bodies, sharp weapons.
- **Camera:** top-down, slight y-sorting, no perspective distortion.
- **VFX:** slash arcs, lightning chains, shockwave rings, hit sparks, floating numbers.
- **UI:** dark glass panels, thin cyan borders, gold accents, angular tabs.

All art is generated in code (Canvas 2D) for the prototype: original, tiny, and easy to
restyle. Production can replace it with a hand-drawn atlas without changing the logic.

### Audio

- WebAudio-generated SFX (no external files): slash, hit, coin, level-up, dash, chain,
  boss roar, UI click.
- No licensed music. A ambient loop can be added later as an original track.
- Respect YouTube mute at all times; no in-game master mute in production.

---

## 15. Monetization

Playables currently allows **YouTube-provided ads only**. No IAP, no banners, no
off-platform monetization.

| Placement | Type | Trigger |
|---|---|---|
| Revive | rewarded | once per run, after death |
| Double coins | rewarded | result screen, next run |
| Skill reset | rewarded | evolve screen (future) |
| Run end | interstitial | after result screen, max once per 3 runs |

Rules:

- Never interrupt combat.
- No countdown before an ad.
- Always check ad availability and fail gracefully.
- Rewards must be granted even if the ad fails (prototype behavior).
- Do not gate core progression behind ads.

Revenue is unproven. Treat ads as upside, not the business plan.

---

## 16. Retention and metrics

### In-session hooks

- First area unlock at level 3.
- New skill at levels 2, 4, 6, 8, 10.
- Evolution choice at 10.
- Rank and best-clear per zone.
- "One more run" because runs are 5–9 minutes.

### Targets (first 30 days)

| Metric | Target |
|---|---|
| Tutorial completion | > 80% |
| Level 3 reached | > 70% |
| First run completed | > 55% |
| Average session | 8–12 min |
| Runs per session | 1.8+ |
| Crash-free sessions | > 99.5% |

### Future

- Daily first-run bonus (no notifications needed).
- Character mastery and skins.
- Endless mode after the campaign.
- Weekly challenge modifier.

---

## 17. Technical design

### Prototype stack

- **Vanilla JavaScript + Canvas 2D**, ES modules, no dependencies.
- One canvas for gameplay; DOM/CSS for menus and HUD.
- WebAudio for SFX.
- `localStorage` fallback; YouTube SDK cloud save when available.
- Static server (`server.js`) for local development.

Why not Phaser for the slice: zero dependencies, a tiny bundle, and full control over
rendering. The game logic is engine-agnostic; production can keep this stack or port to
Phaser without changing the design.

### Modules

```
index.html        shell + screens
styles.css        UI system
src/data.js       heroes, skills, enemies, zones, formulas
src/sdk.js        YouTube Playables wrapper + save fallback
src/audio.js      WebAudio SFX
src/game.js       state, input, combat, rendering, UI
server.js         tiny static server
```

### Save schema

```json
{
  "version": 1,
  "level": 4,
  "xp": 32,
  "coins": 180,
  "skillPoints": 2,
  "attributes": { "power": 1, "vitality": 0, "agility": 0, "focus": 0 },
  "skillRanks": { "dash": 1, "spark": 1, "chain": 1 },
  "evolution": null,
  "zoneClears": { "forest": 1 },
  "stats": { "kills": 42, "runs": 3, "bestCombo": 18 }
}
```

Saves are versioned and merged with defaults on load. Saves must survive content
updates (new skills, new zones).

### YouTube SDK integration

- Load `https://www.youtube.com/game_api/v1` before game code.
- `firstFrameReady()` after the first rendered frame.
- `gameReady()` when the title screen is interactive.
- `onPause` / `onResume` pause all rendering and simulation.
- `isAudioEnabled` / `onAudioEnabledChange` control audio.
- `loadData` / `saveData` for cloud saves (await load before save).
- `sendScore` on run completion (score = total XP or zone best).
- `requestInterstitialAd` / `requestRewardedAd` guarded by availability.

### Performance budget

- 60 FPS target, 30 FPS floor on low-end phones.
- Max 40 enemies, 80 projectiles, 300 particles.
- Pre-rendered zone backgrounds, one `drawImage` per frame.
- Object reuse for projectiles and particles.
- DPR capped at 2.

### Accessibility

- Keyboard navigation for all menus.
- Focus rings and ARIA labels on buttons.
- Reduced-motion mode disables screen shake.
- Color is never the only signal (locked nodes also show a lock and level).
- Text contrast ≥ 4.5:1.

---

## 18. Vertical slice scope

**In:**

- Kaito, 5 active skills + 1 passive, 2 evolutions.
- 5 zones, 5 bosses, 10 enemy types.
- XP, levels, skill points, auto-unlocks.
- Shop with 4 attributes.
- Map with level gates.
- 3-wave + boss run structure.
- HUD, pause, result screen, rank.
- Save/load, keyboard + touch controls.
- YouTube SDK hooks (guarded for local play).

**Out:**

- Other heroes (shown as locked).
- Cosmetics, achievements, daily bonuses.
- Ads UI (hooks only).
- Online features (not allowed).
- Final art/audio.

---

## 19. Roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| **0. Slice** | this build | fun in 5 minutes, no crashes |
| **1. Feel** | combat tuning, VFX, audio, 3 heroes | 20-minute playtest without boredom |
| **2. Content** | 8 zones, 8 bosses, 30 enemies, 6 skills/hero | 2-hour progression |
| **3. Meta** | cosmetics, mastery, daily bonus, ranks | D1 retention target |
| **4. Submission** | SDK, test suite, bundle analyzer, certification | approved build |

---

## 20. Playables certification checklist

- [ ] SDK loads before game code.
- [ ] `firstFrameReady()` then `gameReady()` only when interactive.
- [ ] Pause/resume stops rendering, audio, and logic.
- [ ] Audio respects platform mute and device volume.
- [ ] Cloud save via `loadData`/`saveData`, < 3 MiB, versioned.
- [ ] `sendScore` integer and consistent with in-game best.
- [ ] Initial bundle < 30 MiB (target < 15).
- [ ] Total bundle < 250 MiB.
- [ ] Every file < 30 MiB (target < 512 KiB).
- [ ] Relative paths only, safe filenames, ≤ 8,000 files.
- [ ] 1:1, 16:9, 9:16 layouts.
- [ ] Chrome, Edge, Firefox, Safari, Android, iOS.
- [ ] No external network calls.
- [ ] No IAP, no third-party ads, no external links.
- [ ] Original IP and assets.
- [ ] Accessibility and localization pass.
- [ ] Test suite and bundle analyzer clean.

---

## 21. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **IP infringement** | rejection / takedown | strict original IP; legal review before submission |
| Scope creep | never ships | one hero, five zones, fixed slice scope |
| Combat feels flat | low retention | prioritize hit feedback, dash, combos |
| Bundle bloat | fails certification | code-generated art, audio synth, budget checks |
| Discovery | few plays | portfolio strategy; short hooks; YouTube-native theme |
| Ad revenue unproven | low ROI | treat as upside; keep costs small |

---

## 22. Open questions

1. Is the final game 2D top-down (slice) or 3D isometric?
2. How many heroes at launch — 3 or 4?
3. Permanent evolution or respec for coins?
4. Endless mode after the five zones, or a new campaign+?
5. Localization at launch: English only, or EN/ES/PT/ID?
6. Controller support (Playables primarily touch/mouse)?
