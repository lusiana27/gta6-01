# Sunport City — 12 Missions · 5-Star Wanted · Open-World Crime Game

[![make.fun](https://make.fun/badge/competition/gta6-01)](https://make.fun/c/gta6-01)
[![make.fun](https://make.fun/badge/entry/gta6-01)](https://make.fun/c/gta6-01)
[![make.fun](https://make.fun/badge/bounty/gta6-01)](https://make.fun/c/gta6-01)

An original open-world crime game for the [Make GTA 6 bounty](https://make.fun/c/gta6-01)
on make.fun — built from scratch in plain HTML5 Canvas and JavaScript, no
libraries, no network, no copied assets. Enter the bounty with referral code
`j11vkafs`.

## The game

Sunport City is a sun-soaked coastal city you explore on foot and by car:
seven districts from Palm Beach to the Neon Palms Casino, traffic and
pedestrians on every street, cars to steal, and a police force that answers
your wanted level with patrol cars, the Air One helicopter and roadblocks.

- **12 story missions** — jobs from Mara Voss, Rico and The Fixer. Steal the
  getaway car, run the taxi, race the beach checkpoints, smuggle the crate,
  burn the evidence and rob the casino vault — then escape with five stars.
  Payouts run from $500 to $12,000 for the final run, King of Sunport.
- **5-star wanted system** — cops chase and ram your car, the Air One
  helicopter hunts you from 3 stars, roadblocks seal the roads from 4.
  Get busted on foot or wasted and you pay for it; go dark and the heat
  cools off star by star.
- **A living city** — 26+ traffic cars with intersection AI, 40+ pedestrians
  who panic and run, a day/night cycle with street lamps, three procedural
  radio stations (Sun FM 101, Bay 98 Chill, Static X) synthesized live in
  WebAudio, shops (garage repair/repaint/armor, Palm Diner health, Ironworks
  Guns), combat (punch, pistol) and save/load.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk or drive |
| E | Enter & exit a car, or use a shop |
| F | Punch |
| Mouse click | Shoot (buy a pistol at Ironworks Guns first) |
| Enter | Start the next mission |
| Q / M | Switch radio station / mute |
| S | Save game |
| P / Esc | Pause / menu |

## Play it

No build step and no network: open `game/index.html` in desktop Chrome, or
serve the folder with any static server (`python3 -m http.server` in this
directory, then open `http://localhost:8000/game/`).

## How it is built

`game/js/` is split by job — `main.js` (state, loop, input), `city.js` (map
and day/night), `entities.js` (player, traffic, pedestrians), `police.js`
(wanted, cops, helicopter, roadblocks), `missions.js` (the 12-mission
engine), `hud.js` (HUD, minimap, menus), `audio.js` (synthesized radio and
effects). `main.ts` hands the game in to make.fun.

## License

MIT — see [LICENSE](LICENSE).
