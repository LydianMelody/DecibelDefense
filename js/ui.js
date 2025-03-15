/**
 * UI Manager for Decibel Defense
 * Handles all user interface interactions and rendering
 */
class UI {
    /**
     * Initialize the UI
     * @param {Game} game - Reference to the main game object
     */
    constructor(game) {
        this.game = game;
        
        // Get UI elements from DOM
        this.moneyElement = document.getElementById('money');
        this.livesElement = document.getElementById('lives');
        this.waveElement = document.getElementById('wave');
        this.towerButtonsContainer = document.getElementById('tower-buttons');
        this.nextWaveButton = document.getElementById('next-wave-btn');
        this.testEnemyButton = document.getElementById('test-enemy-btn');
        this.gameOverScreen = document.getElementById('game-over');
        this.pauseButton = document.getElementById('pause-btn');
        this.restartSidebarButton = document.getElementById('restart-sidebar-btn');
        
        // Keep track of created tower buttons
        this.towerButtons = {};
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Generate tower buttons
        this.createTowerButtons();
    }
    
    /**
     * Initialize event listeners for UI elements
     */
    initEventListeners() {
        // Helper function to add both click and touch handlers to an element
        const addTouchAndClickHandlers = (element, handler) => {
            if (!element) return;
            
            // Add click handler for mouse
            element.addEventListener('click', (e) => {
                handler(e);
            });
            
            // Add touch handler for touch screens
            element.addEventListener('touchstart', (e) => {
                // Prevent default to avoid double events
                e.preventDefault();
                handler(e);
            }, { passive: false });
        };
        
        // Next wave button
        addTouchAndClickHandlers(this.nextWaveButton, () => {
            this.game.startNextWave();
        });
        
        // Test enemy button
        if (this.testEnemyButton) {
            addTouchAndClickHandlers(this.testEnemyButton, () => {
                if (this.game.gameStarted && !this.game.gameOver && !this.game.paused) {
                    this.game.spawnTestEnemy();
                    
                    // Add a visual feedback for the button click
                    this.testEnemyButton.classList.add('button-active');
                    setTimeout(() => {
                        this.testEnemyButton.classList.remove('button-active');
                    }, 200);
                }
            });
        }
        
        // Pause button
        if (this.pauseButton) {
            addTouchAndClickHandlers(this.pauseButton, () => {
                this.game.togglePause();
                this.updatePauseButton();
            });
        }
        
        // Restart button in sidebar
        const restartSidebarBtn = document.getElementById('restart-sidebar-btn');
        if (restartSidebarBtn) {
            addTouchAndClickHandlers(restartSidebarBtn, () => {
                console.log("Restart button clicked");
                if (typeof startGame === 'function') {
                    startGame();
                } else {
                    this.game.resetGame();
                    this.game.gameStarted = true;
                    this.game.gameOver = false;
                }
            });
        }
        
        // Keyboard controls for pause
        document.addEventListener('keydown', (event) => {
            if (event.key === 'p' || event.key === 'P') {
                this.game.togglePause();
                this.updatePauseButton();
            }
        });
        
        // Note: Start and restart buttons are now handled in main.js
        // Canvas click events are handled in the game class
    }
    
    /**
     * Update pause button text based on game state
     */
    updatePauseButton() {
        if (this.pauseButton) {
            this.pauseButton.textContent = this.game.paused ? "Resume" : "Pause";
        }
    }
    
    /**
     * Create tower selection buttons
     */
    createTowerButtons() {
        // Clear existing buttons
        this.towerButtonsContainer.innerHTML = '';
        this.towerButtons = {};
        
        // Create a button for each tower type
        for (const [towerName, towerInfo] of Object.entries(CONFIG.TOWER_TYPES)) {
            // Create button element
            const button = document.createElement('div');
            button.className = 'tower-button';
            button.dataset.towerType = towerName;
            
            // Tower info
            const infoDiv = document.createElement('div');
            infoDiv.className = 'tower-info';
            
            const nameSpan = document.createElement('div');
            nameSpan.className = 'tower-name';
            nameSpan.textContent = towerName.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
            
            const costSpan = document.createElement('div');
            costSpan.className = 'tower-cost';
            costSpan.textContent = `$${towerInfo.cost}`;
            
            infoDiv.appendChild(nameSpan);
            infoDiv.appendChild(costSpan);
            
            // Tower preview
            const previewDiv = document.createElement('div');
            previewDiv.className = 'tower-preview';
            previewDiv.style.backgroundColor = towerInfo.color;
            
            // Add elements to button
            button.appendChild(infoDiv);
            button.appendChild(previewDiv);
            
            // Add click and touch handlers
            button.addEventListener('click', () => {
                this.selectTower(towerName);
            });
            
            // Add touch handler for mobile
            button.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent default to avoid double events
                this.selectTower(towerName);
            }, { passive: false });
            
            // Add to container
            this.towerButtonsContainer.appendChild(button);
            
            // Store reference
            this.towerButtons[towerName] = button;
        }
    }
    
    /**
     * Select a tower type
     * @param {string} towerType - The type of tower to select
     */
    selectTower(towerType) {
        // Deselect all buttons
        for (const button of Object.values(this.towerButtons)) {
            button.classList.remove('selected');
        }
        
        // Select the clicked button
        if (towerType) {
            this.towerButtons[towerType].classList.add('selected');
        }
        
        // Update game state
        this.game.selectedTowerType = towerType;
    }
    
    /**
     * Update UI elements with current game state
     */
    update() {
        // Update money display (though it's infinite in testing)
        this.moneyElement.textContent = 'Money: INFINITE';
        
        // Update lives display with color based on health
        this.livesElement.textContent = `Lives: ${this.game.lives}`;
        this.livesElement.style.color = this.game.lives > 3 ? 'white' : 'red';
        
        // Update wave display
        this.waveElement.textContent = `Wave: ${this.game.wave}`;
        
        // Update pause button
        this.updatePauseButton();
        
        // Screen visibility is now handled in main.js
    }
}