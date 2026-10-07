# FLAPPY NEXUS: SKYBREAK

A futuristic arcade flying game inspired by endless side-scrolling flappers, reimagined with neon cyberpunk visuals, original mechanics, boss events, power-ups, and progression systems.

## Features

- Smooth side-scrolling flight gameplay
- Original futuristic obstacle sets and procedural generation
- Coins, combo rewards, near misses, and score multipliers
- Multiple game modes: Classic, Time Attack, Hardcore, Zen, Chaos, Boss Rush, and Infinite
- Power-ups: Shield, Slow Motion, Magnet, Double Score, Ghost Mode, Time Warp, and Energy Boost
- Dynamic difficulty and adaptive progression
- Day/night and weather system with environment cycling
- Boss encounters and special rare events
- Local achievements, missions, statistics, and leaderboard
- Character, trail, and wing customization
- Audio generated through the Web Audio API
- Local save support with LocalStorage
- Responsive canvas layout for desktop and mobile devices

## Run the game

Option 1:

- Open `index.html` directly in a modern browser.

Option 2:

- From this folder, run a local static server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Controls

- Space / mouse click / touch: flap
- P: pause or resume
- R: restart after game over

## Project structure

```text
.
├── index.html
├── style.css
├── game.js
├── README.md
```

## Notes

This project is designed to run offline with no backend dependencies. It uses browser APIs only and stores data locally in the browser.

## Future upgrades

- Add sprite sheets and richer art assets
- Add a true boss fight arena with laser patterns and attack phases
- Expand the mission system with rotating weekly objectives
- Add a more advanced character progression system
- Add sound/music assets and richer procedural themes

## License

This project was created for educational, portfolio, and hackathon demonstration purposes.
