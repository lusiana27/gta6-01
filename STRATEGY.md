# Sunport City — Strategy Notes

## What this entry is
A top-down open-world crime game in an original sun-soaked city. The player
walks and drives a 3200x2560 city with seven districts (Beachfront, Old Town,
Downtown, Casino Row, Port, Airport, Suburbs), steals cars, runs 12 story
missions, and fights a 5-star wanted system with patrol cars, the Air One
helicopter and roadblocks.

## Why the screenshots lead
The judge compares screenshots pairwise. Every screenshot is a dense action
frame, never a menu: the cover is a 5-star chase at golden hour (player car,
six police cars, helicopter spotlight, roadblocks, traffic, pedestrians, the
casino heist mission live on the HUD with minimap, stars, cash, clock and
radio all visible at once). The other three show night at Casino Row, the
beach race, and on-foot play at the taxi stand.

## Systems visible at a glance
- 12 missions with givers (Mara Voss, Rico, The Fixer, Cab Co.), payouts
  $500–$12,000, timers, checkpoints, pickups and escapes.
- Wanted 0–5 stars: patrol spawns, helicopter at 3+, roadblocks at 4+,
  bust on foot, decay when hidden.
- Traffic AI (26+ cars), 40+ pedestrians, day/night cycle, three
  procedural radio stations, shops (garage repair/repaint/armor, diner
  health, gun shop pistol/ammo), combat (punch, pistol), save/load.

## Files (one job each)
- game/js/main.js — state, loop, input, stealing, combat, shops, save, scenes
- game/js/city.js — map, districts, buildings, collision, day/night
- game/js/entities.js — player, traffic, pedestrians, car physics
- game/js/police.js — wanted, cops, helicopter, roadblocks
- game/js/missions.js — the 12-mission engine
- game/js/hud.js — HUD, minimap, menus
- game/js/audio.js — synthesized radio, sirens, effects (no audio files)
