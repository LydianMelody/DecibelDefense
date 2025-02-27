# DecibelDefense
LydianMelody's protype for a musical tower defense game where towers create layered music as they defend against waves of enemies.

## Concept

Decibel Defense combines tower defense gameplay with musical creation, similar to "My Singing Monsters." Each tower is represented by a cute creature that contributes a unique musical element to the overall soundtrack. As players strategically place towers to defend against enemy waves, they're simultaneously composing an evolving musical piece.

## Features

- **Musical Towers**: Each tower contributes a unique sound to the overall composition
- **Rhythmic Combat**: Towers attack in sync with the music
- **Wave Progression**: Increasingly difficult enemy waves that match musical intensity
- **Harmony System**: Complementary towers placed together create bonus effects
- **Creative Mode**: Create music without enemies (planned feature)

## Getting Started

### Prerequisites

- Python 3.8+
- Required packages are listed in `requirements.yaml`

### Installation

1. Clone this repository:
   ```
   git clone [repository-url]
   cd "Decibel Defense"
   ```

2. Install dependencies:
   ```
   pip install -r requirements.yaml
   ```

3. Run the game:
   ```
   python main.py
   ```

### Controls

- **Left Mouse Button**: Place towers, interact with UI
- **ESC**: Exit game
- **R**: Restart game (when game over)

## Project Structure

```
Decibel Defense/
├── main.py                # Game entry point
├── README.md              # This file
├── requirements.yaml      # Dependencies
├── assets/                # Game assets
│   ├── sounds/            # Audio files
│   └── images/            # Image files (future)
└── src/                   # Source code
    ├── __init__.py        # Package initialization
    ├── game.py            # Core game logic
    ├── tower.py           # Tower classes
    ├── enemy.py           # Enemy classes
    ├── ui.py              # User interface
    └── audio_manager.py   # Audio handling
```

## Adding Your Own Music

To add custom sound loops:

1. Place audio files in the `assets/sounds/` directory
2. Use WAV format for best compatibility
3. Ensure loops are the same length and properly aligned for seamless layering
4. Update the `SOUND_MAPPINGS` in `audio_manager.py` to reference your new files

## Development Roadmap

- [x] Basic gameplay prototype
- [ ] Complete audio layering system
- [ ] Custom character designs
- [ ] Additional tower types and enemy types
- [ ] Creative mode
- [ ] VRChat implementation

## Credits

- Game Concept: [Your Name]
- Programming: [Your Name]
- Audio: [Your Name and Contributors]

## License

[License information]
