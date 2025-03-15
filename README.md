# Decibel Defense

A musical tower defense prototype exploring gameplay ideas for a future full-fledged project.

## Play Online

**[Play Decibel Defense Now](https://lydianmelody.github.io/DecibelDefense/)**

## Concept

Decibel Defense combines tower defense gameplay with musical creation, similar to "My Singing Monsters." Each tower will be represented by a cute creature that contributes a unique musical element to the overall soundtrack. As players strategically place towers to defend against enemy waves, they're simultaneously composing an evolving musical piece.

Each level in the game will feature a unique song, setting the musical theme and tempo. Each creature maintains its characteristic instrument but will perform different loops depending on the stage.

## Overview

This is an HTML5 prototype exploring the gameplay concepts of Decibel Defense. It is not a complete game but rather a technical demonstration to test core mechanics. Each tower contributes a unique musical element to the overall soundtrack, allowing players to experiment with different musical combinations.

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

This prototype is intended to test and refine gameplay mechanics that may be incorporated into a full game in the future. It serves as a technical proof of concept and not as a finished product.

To make changes to the prototype:

1. Edit the JavaScript files in the `js/` directory
2. Refresh the browser to see changes
3. Check the browser console for debug information

### Future Development Goals

- Create unique creature designs for each tower type
- Implement more sophisticated audio layering
- Add level progression with different musical themes
- Build a fully-featured musical tower defense game
- Potentially port to other platforms beyond the web