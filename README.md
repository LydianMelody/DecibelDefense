# Decibel Defense

A musical tower defense game where towers create layered music as they defend against waves of enemies.

## Play Online

**[Play Decibel Defense Now](https://lydianmelody.github.io/DecibelDefense/)**

## Overview

This is the HTML5 version of Decibel Defense. Each tower contributes a unique musical element to the overall soundtrack. As you place towers strategically to defend against enemy waves, you're simultaneously composing an evolving musical piece.

**Version**: 0.2.0 (Pre-Alpha)

## How to Play

1. **Access the Game**: 
   - Online: Visit [https://lydianmelody.github.io/DecibelDefense/](https://lydianmelody.github.io/DecibelDefense/)
   - Local: Open `index.html` in a modern web browser
   - Network: Run `python3 serve_network.py` and access from any device on your network
2. **Place Towers**: Select a tower type and tap/click on the grid to place it (not on the path)
3. **Start Waves**: Tap/click the "Next Wave" button to start enemy waves
4. **Test Enemy**: Use the "Test Enemy" button to spawn a single enemy for testing
5. **Win the Game**: Survive all waves of enemies

## Controls

- **Mouse/Touch**: Place towers, interact with UI
- **ESC**: Pause game
- **R**: Restart game (when game over)
- **P**: Pause/unpause game

## Playing on Mobile or Other Devices

To play the game on mobile phones, tablets, or other devices on your network:

1. Run the included server script:
   ```
   python3 serve_network.py
   ```
2. The script will display a URL (like http://192.168.1.x:8080)
3. On your other device, open a browser and go to that URL
4. The game is fully touch-compatible!

## Project Structure

```
DecibelDefense/
├── index.html        # Main HTML file
├── serve_network.py  # Network server script
├── css/
│   └── style.css     # Game styles and responsive design
├── js/
│   ├── main.js       # Entry point and initialization
│   ├── config.js     # Game configuration
│   ├── game.js       # Core game logic
│   ├── tower.js      # Tower classes
│   ├── enemy.js      # Enemy classes
│   ├── ui.js         # User interface
│   ├── bundle.js     # Combined JavaScript for performance
│   └── audioManager.js # Audio handling
├── .github/
│   └── workflows/    # GitHub Actions for deployment
├── assets/
│   ├── sounds/       # Audio files
│   └── images/       # Image files (future)
└── debug_screenshots/ # Development screenshots
```

## Technical Details

- Built with vanilla JavaScript and HTML5 Canvas
- Uses the Web Audio API for synchronized audio playback
- All game code organized in modular classes
- Responsive design that works on mobile, tablet, and desktop
- Touch-friendly interface for mobile gameplay
- Deployed on GitHub Pages for easy access

## Audio Synchronization

- All audio tracks play simultaneously but are muted/unmuted as towers are placed
- This ensures perfect synchronization between all musical elements
- Tracks are specially designed to layer together harmoniously

## Development

To make changes to the game:

1. Edit the JavaScript files in the `js/` directory
2. Refresh the browser to see changes
3. Check the browser console for debug information