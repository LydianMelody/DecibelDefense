/**
 * Main entry point for Decibel Defense
 */
// Define game as a global variable
window.game = null;

// Wait for the page to fully load before initializing
window.addEventListener('load', () => {
    console.log('Decibel Defense - Starting initialization...');
    
    try {
        // Initialize the game
        window.game = new Game();
        console.log('Game object created successfully');
        
        // Add resize handler for responsive layout
        let resizeTimeout;
        
        // Function to handle resize
        const handleResize = () => {
            if (window.game) {
                // Update the UI container to make sure it adapts properly
                const uiContainer = document.getElementById('ui-container');
                const canvasContainer = document.getElementById('canvas-container');
                
                if (uiContainer && canvasContainer) {
                    // Log container sizes for debugging
                    console.log(`Window size: ${window.innerWidth}x${window.innerHeight}`);
                    console.log(`UI container width: ${uiContainer.offsetWidth}px`);
                    console.log(`Canvas container width: ${canvasContainer.offsetWidth}px`);
                }
                
                // Call resizeCanvas immediately for responsive feel
                window.game.resizeCanvas();
                
                // Give the browser a moment to settle the new layout, then resize again
                // This ensures proper scaling after the layout stabilizes
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    window.game.resizeCanvas();
                    console.log("Final resize applied after layout stabilization");
                }, 300);
            }
        };
        
        // Listen for window resize events
        window.addEventListener('resize', handleResize);
        
        // Also call resize when the UI container size might change
        // This helps when the sidebar width changes due to CSS transitions
        const uiContainer = document.getElementById('ui-container');
        if (uiContainer) {
            // Use ResizeObserver if available (modern browsers)
            if (typeof ResizeObserver !== 'undefined') {
                const resizeObserver = new ResizeObserver(handleResize);
                resizeObserver.observe(uiContainer);
                console.log("ResizeObserver attached to UI container");
            }
        }
    } catch (error) {
        console.error('Error initializing game:', error);
    }
    
    // Helper function for adding both mouse and touch events
    const addTouchAndClickHandlers = (element, handler) => {
        if (!element) return;
        
        // Add click handler
        element.addEventListener('click', handler);
        
        // Add touch handler
        element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handler(e);
        }, { passive: false });
    };
    
    // Set up start button directly
    const startButton = document.getElementById('start-game-btn');
    if (startButton) {
        addTouchAndClickHandlers(startButton, () => {
            console.log('Start button clicked/touched');
            startGame();
        });
    }
    
    // Set up restart button directly
    const restartButton = document.getElementById('restart-btn');
    if (restartButton) {
        addTouchAndClickHandlers(restartButton, () => {
            console.log('Restart button clicked/touched');
            startGame();
        });
    }
    
    // Add keyboard controls
    document.addEventListener('keydown', (event) => {
        // ESC to quit/pause
        if (event.key === 'Escape') {
            if (game.gameStarted) {
                game.togglePause();
            }
        }
        
        // R to restart when game over
        if ((event.key === 'r' || event.key === 'R') && game.gameOver) {
            console.log("R key pressed - restarting game");
            startGame();
        }
    });
    
    console.log('Game initialized and ready!');
});

/**
 * Start a new game
 */
function startGame() {
    console.log('Starting new game...');
    
    // Make sure the game instance exists
    if (!window.game) {
        console.error('Game instance not found');
        try {
            // Create it if it doesn't exist yet, but wrap in try/catch
            window.game = new Game();
            console.log('Game created successfully on demand');
        } catch (error) {
            console.error('Failed to create game:', error);
            // Reload the page as a fallback
            alert('Game initialization failed. The page will reload.');
            window.location.reload();
            return;
        }
    }
    
    // Hide both screens - with some direct DOM manipulation for safety
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over');
    
    if (startScreen) {
        startScreen.style.display = 'none'; // Use style directly as backup
        startScreen.classList.add('hidden');
        console.log('Start screen hidden');
    }
    
    if (gameOverScreen) {
        gameOverScreen.style.display = 'none'; // Use style directly as backup
        gameOverScreen.classList.add('hidden');
        console.log('Game over screen hidden');
    }
    
    // Resume audio context (browsers require user interaction)
    if (game.audioManager && game.audioManager.audioContext) {
        if (game.audioManager.audioContext.state === 'suspended') {
            game.audioManager.audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully');
            });
        }
    }
    
    // Reset game state
    game.gameStarted = true;
    game.gameOver = false;
    game.resetGame();
    
    console.log('Game started successfully');
}