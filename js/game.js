/**
 * Main Game class for Decibel Defense
 * Manages game state, updates, and rendering
 */
class Game {
    /**
     * Initialize the game
     */
    constructor() {
        // Get the canvas and its context
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas dimensions
        this.resizeCanvas();
        
        // Game state
        this.towers = [];
        this.enemies = [];
        this.scheduledEnemies = [];
        this.selectedTowerType = null;
        this.money = CONFIG.STARTING_MONEY;
        this.lives = CONFIG.STARTING_LIVES;
        this.wave = 0;
        this.gameOver = false;
        this.paused = false;
        this.gameStarted = false;
        
        // Grid offset for centering the grid
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        
        // Set initial effective tile size
        this.effectiveTileSize = CONFIG.TILE_SIZE;
        
        // Initialize components
        this.audioManager = new AudioManager();
        this.ui = new UI(this);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Timing variables
        this.lastFrameTime = 0;
        this.enemySpawnTimer = 0;
        this.frameCounter = 0;
        
        // Add scaling factor for responsive design
        this.scale = 1.0;
        this.effectiveTileSize = CONFIG.TILE_SIZE;
        this.lastLoggedScale = 1.0; // For scale change logging
        
        // Load assets
        this.loadAssets();
        
        console.log("Game initialized with lives:", this.lives);
    }
    
    /**
     * Load game assets
     */
    async loadAssets() {
        try {
            await this.audioManager.loadSounds();
            console.log('Assets loaded successfully');
            this.startGame();
        } catch (error) {
            console.error('Error loading assets:', error);
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
        
        // Create a common handler for both mouse clicks and touch
        const handleInteraction = (clientX, clientY) => {
            // Don't allow tower placement if game is over or paused or not started
            if (this.gameOver || this.paused || !this.gameStarted) return;
            
            // Get click/touch position relative to canvas
            const rect = this.canvas.getBoundingClientRect();
            const canvasX = clientX - rect.left;
            const canvasY = clientY - rect.top;
            
            // Convert to canvas coordinates (0-1 range)
            const normalizedX = canvasX / this.canvas.offsetWidth;
            const normalizedY = canvasY / this.canvas.offsetHeight;
            
            // Directly map to grid coordinates
            const gridX = Math.floor(normalizedX * CONFIG.GRID_WIDTH);
            const gridY = Math.floor(normalizedY * CONFIG.GRID_HEIGHT);
            
            // For debugging
            console.log(`Interaction at canvas position: ${canvasX},${canvasY}`);
            console.log(`Normalized position: ${normalizedX.toFixed(2)},${normalizedY.toFixed(2)}`);
            console.log(`Grid cell: ${gridX},${gridY}`);
            
            // Make sure the interaction is within the grid
            if (gridX < 0 || gridY < 0 || 
                gridX >= CONFIG.GRID_WIDTH || 
                gridY >= CONFIG.GRID_HEIGHT) {
                console.log('Interaction outside the grid area');
                return; // Interaction outside the grid
            }
            
            // Check if valid placement
            const result = this.placeTower(gridX, gridY);
            console.log(`Tower placement result: ${result ? 'success' : 'failed'}`);
        };
        
        // Handle mouse clicks for tower placement
        this.canvas.addEventListener('click', (event) => {
            handleInteraction(event.clientX, event.clientY);
        });
        
        // Handle touch events for mobile/touch screens
        this.canvas.addEventListener('touchstart', (event) => {
            // Prevent default to avoid scrolling/zooming when playing
            event.preventDefault();
            
            // Use the first touch point
            if (event.touches.length > 0) {
                const touch = event.touches[0];
                handleInteraction(touch.clientX, touch.clientY);
            }
        }, { passive: false });
    }
    
    /**
     * Resize canvas to fit the container
     */
    resizeCanvas() {
        // Get the canvas container
        const canvasContainer = document.getElementById('canvas-container');
        
        // Get UI container to check its dimensions
        const uiContainer = document.getElementById('ui-container');
        
        // Get available space
        const containerWidth = canvasContainer.clientWidth;
        const containerHeight = canvasContainer.clientHeight;
        
        // Log the available space
        console.log(`Canvas container size: ${containerWidth}x${containerHeight}`);
        if (uiContainer) {
            console.log(`UI container size: ${uiContainer.clientWidth}x${uiContainer.clientHeight}`);
        }
        
        // Original grid size (unscaled)
        const originalGridSize = {
            width: CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE,
            height: CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE
        };
        
        // Calculate the scale to fit the grid while maintaining aspect ratio
        const scaleX = containerWidth / originalGridSize.width;
        const scaleY = containerHeight / originalGridSize.height;
        
        // Use the smaller scale to ensure the entire grid fits
        const scale = Math.min(scaleX, scaleY) * 0.95; // 95% to leave a small margin
        
        // Calculate the canvas size based on the grid size and scale
        const canvasWidth = originalGridSize.width * scale;
        const canvasHeight = originalGridSize.height * scale;
        
        // Set the canvas dimensions
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        
        // Update CSS size to match
        this.canvas.style.width = `${canvasWidth}px`;
        this.canvas.style.height = `${canvasHeight}px`;
        
        // Center the canvas if it doesn't fill the container
        const marginX = Math.max(0, (containerWidth - canvasWidth) / 2);
        const marginY = Math.max(0, (containerHeight - canvasHeight) / 2);
        this.canvas.style.margin = `${marginY}px ${marginX}px`;
        
        // Log the UI sidebar width for debugging (using the uiContainer variable already defined above)
        if (uiContainer) {
            console.log(`UI sidebar width: ${uiContainer.offsetWidth}px`);
        }
        
        // Store the effective tile size for drawing
        this.effectiveTileSize = CONFIG.TILE_SIZE * scale;
        
        // Store the scale for reference
        this.scale = scale;
        
        // Update offsets to center (these are now zero since we're using CSS centering)
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        
        // Recalculate positions of any existing enemies to ensure proper scaling
        if (this.enemies && this.enemies.length > 0) {
            for (const enemy of this.enemies) {
                // Ensure enemy positions use the correct scale
                // If the enemy is moving along the path, this maintains its relative position
                if (enemy && enemy.pathIndex !== undefined) {
                    // Keep the enemy on its correct path position during resize
                    if (enemy.pathIndex < CONFIG.PATH.length) {
                        const gridPos = CONFIG.PATH[enemy.pathIndex];
                        // Update grid position to ensure consistency
                        if (gridPos) {
                            enemy.gridX = gridPos[0];
                            enemy.gridY = gridPos[1];
                            // Update canvas position based on grid
                            enemy.x = enemy.gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                            enemy.y = enemy.gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                        }
                    }
                }
            }
            console.log(`Recalculated positions for ${this.enemies.length} enemies`);
        }
        
        // Log for debugging
        console.log(`Window size: ${containerWidth}x${containerHeight}`);
        console.log(`Canvas size: ${canvasWidth}x${canvasHeight}, Scale: ${scale}`);
        console.log(`Effective tile size: ${this.effectiveTileSize}px`);
    }
    
    /**
     * Start the game loop
     */
    startGame() {
        // Start the animation loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp from requestAnimationFrame
     */
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = (timestamp - this.lastFrameTime) / 1000; // in seconds
        this.lastFrameTime = timestamp;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Only update game if it's started
        if (this.gameStarted) {
            // Update and draw
            if (!this.gameOver && !this.paused) {
                this.update(deltaTime);
            }
            
            this.draw();
        } else {
            // Draw basic grid when not yet started
            this.drawGrid();
        }
        
        // Update UI (always, regardless of game state)
        this.ui.update();
        
        // Continue the game loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    /**
     * Update game state
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Frame counter for spawn timing
        this.frameCounter++;
        
        // Update enemy spawn timer
        this.enemySpawnTimer -= deltaTime;
        
        // Spawn enemies if timer expired, wave is active, and we have enemies scheduled
        if (this.enemySpawnTimer <= 0 && this.wave > 0 && this.scheduledEnemies && this.scheduledEnemies.length > 0) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0.5; // Spawn every 0.5 seconds
        }
        
        // Update enemies
        this.updateEnemies(deltaTime);
        
        // Update towers
        this.updateTowers(deltaTime);
        
        // Update audio and process beat callbacks
        this.audioManager.update(this.towers);
        this.audioManager.processBeatCallbacks();
    }
    
    /**
     * Draw the game
     */
    draw() {
        // Clear the entire canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save the original context state
        this.ctx.save();
        
        // Apply scaling transformation consistently
        // Everything will be drawn in terms of the original TILE_SIZE but scaled proportionally
        const scale = this.effectiveTileSize / CONFIG.TILE_SIZE;
        
        // The whole grid is centered and scaled without offsets
        this.ctx.scale(scale, scale);
        
        // Debug: Log the current scale when it changes significantly
        if (Math.abs(this.lastLoggedScale - scale) > 0.05) {
            console.log(`Canvas scale updated: ${scale.toFixed(2)}`);
            console.log(`Canvas dimensions: ${this.canvas.width}x${this.canvas.height}`);
            this.lastLoggedScale = scale;
        }
        
        // Draw version text in top-left corner with improved visibility and pink theme
        this.ctx.fillStyle = 'rgba(255, 180, 220, 0.9)'; // Pink color with high opacity
        this.ctx.font = 'bold 14px Arial'; // Make text bold and slightly larger
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Pre-Alpha Version 0.2.0 ✨', 10, 20);
        
        // Draw a darker outline for better contrast
        this.ctx.strokeStyle = 'rgba(160, 100, 140, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeText('Pre-Alpha Version 0.2.0 ✨', 10, 20);
        
        // Draw background effects
        this.drawBackground();
        
        // Draw grid
        this.drawGrid();
        
        // Draw enemies with error handling
        const invalidEnemies = [];
        for (const enemy of this.enemies) {
            // Skip enemies with invalid positions to avoid console spam
            if (!enemy || !isFinite(enemy.x) || !isFinite(enemy.y)) {
                invalidEnemies.push(enemy);
                continue;
            }
            
            try {
                // Draw enemies at their original coordinates
                enemy.draw(this.ctx, 0, 0);
            } catch (error) {
                console.error('Error drawing enemy:', error);
                invalidEnemies.push(enemy);
            }
        }
        
        // Remove invalid enemies
        if (invalidEnemies.length > 0) {
            for (const enemy of invalidEnemies) {
                const index = this.enemies.indexOf(enemy);
                if (index > -1) {
                    this.enemies.splice(index, 1);
                }
            }
            console.log(`Removed ${invalidEnemies.length} invalid enemies`);
        }
        
        // Draw towers with error handling
        for (const tower of this.towers) {
            try {
                tower.draw(this.ctx, 0, 0);
            } catch (error) {
                console.error('Error drawing tower:', error);
            }
        }
        
        // Draw overlay effects
        this.drawOverlayEffects();
        
        // Restore the original context state
        this.ctx.restore();
    }
    
    /**
     * Draw background effects that respond to music
     */
    drawBackground() {
        // Create a grid of visual rhythm points
        this.drawRhythmGrid();
        
        // Use a static background instead of a pulsing one
        // Calculate the center of the game grid
        const gridCenterX = CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE / 2;
        const gridCenterY = CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE / 2;
        
        // Create a static gradient for the background
        const gradient = this.ctx.createRadialGradient(
            gridCenterX, gridCenterY, 0,
            gridCenterX, gridCenterY, CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE
        );
        
        // Very subtle pink gradient for the background
        gradient.addColorStop(0, 'rgba(255, 235, 245, 0.3)'); // Soft pink center
        gradient.addColorStop(1, 'rgba(255, 240, 245, 0.1)'); // Almost transparent pink at edges
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw rhythmic pulse waves from towers (only when towers are active)
        if (this.towers.some(tower => tower.active)) {
            this.drawTowerPulses();
        }
    }
    
    /**
     * Draw visual rhythm grid in the background
     */
    drawRhythmGrid() {
        // Commenting out the entire rhythm grid to stop any animation effects
        // This will make the game path completely static
        
        // If you want the dots back, uncomment this code:
        /*
        // Use a static dot size
        const dotSize = 1.5; // Fixed size
        
        this.ctx.fillStyle = 'rgba(220, 180, 220, 0.15)'; // Light pink-purple dots
        
        // Draw dots only within the game grid area - with proper grid scaling
        const gridWidth = CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE;
        const gridHeight = CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE;
        const spacing = CONFIG.TILE_SIZE;
        
        // Draw dots aligned with the grid cells
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
                // Calculate dot position at cell center
                const dotX = x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2;
                const dotY = y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2;
                
                // Don't draw dots on the path
                const isPath = CONFIG.PATH.some(p => p[0] === x && p[1] === y);
                if (!isPath) {
                    this.ctx.beginPath();
                    this.ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
        */
    }
    
    /**
     * Draw pulsating waves emanating from towers
     */
    drawTowerPulses() {
        for (const tower of this.towers) {
            if (tower.active) {
                // Get tower position - directly from grid coords without offset
                const towerX = tower.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                const towerY = tower.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                
                // Create pulsating waves based on frame counter
                const waveCount = 3; // Number of concurrent waves
                
                for (let i = 0; i < waveCount; i++) {
                    // Calculate phase - spread waves out evenly
                    const phase = (this.frameCounter / 60 + i / waveCount) % 1;
                    
                    // Radius increases with phase - ensure it's always positive
                    const maxRadius = tower.range * CONFIG.TILE_SIZE * 2;
                    const radius = Math.max(1, phase * maxRadius); // Minimum radius of 1
                    
                    // Opacity decreases as radius increases
                    const opacity = 0.3 * (1 - phase);
                    
                    // Draw the wave only if opacity and radius are valid
                    if (opacity > 0.01 && radius > 0) {
                        this.ctx.beginPath();
                        this.ctx.arc(towerX, towerY, radius, 0, Math.PI * 2);
                        this.ctx.strokeStyle = `rgba(${this._hexToRgb(tower.color).r}, ${this._hexToRgb(tower.color).g}, ${this._hexToRgb(tower.color).b}, ${opacity})`;
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                    }
                }
            }
        }
    }
    
    /**
     * Draw overlay effects
     */
    drawOverlayEffects() {
        // Draw wave start effect
        if (this.wave > 0 && this.frameCounter % 120 < 30) {
            const alpha = 0.3 * (1 - (this.frameCounter % 120) / 30);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Calculate center of grid area in grid coordinates
            const centerX = CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE / 2;
            const centerY = CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE / 2;
            
            this.ctx.fillText(`WAVE ${this.wave}`, centerX, centerY);
        }
    }
    
    /**
     * Utility to convert hex color to RGB object
     * @param {string} hex - Hex color like '#FF0000'
     * @returns {Object} RGB object with r,g,b properties
     */
    _hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16)
        };
    }
    
    /**
     * Draw the game grid and path
     */
    drawGrid() {
        // Draw the path with glow effect - no offset needed with new scaling approach
        this._drawPath(0, 0);
        
        // Add a light blue grid overlay
        this.ctx.strokeStyle = 'rgba(180, 210, 240, 0.5)'; // Light blue lines with increased opacity
        this.ctx.lineWidth = 0.7; // Slightly thicker lines for better visibility
        
        // Draw grid with subtle effect
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
                const rect = {
                    x: x * CONFIG.TILE_SIZE,
                    y: y * CONFIG.TILE_SIZE,
                    width: CONFIG.TILE_SIZE,
                    height: CONFIG.TILE_SIZE
                };
                
                // Check if this is a path tile or endpoint (already drawn)
                const isPath = CONFIG.PATH.some(p => p[0] === x && p[1] === y);
                const isEndpoint = CONFIG.ENDPOINT[0] === x && CONFIG.ENDPOINT[1] === y;
                
                if (!isPath && !isEndpoint) {
                    // Draw subtly animated grid cells with pink tint
                    const beatPhase = (this.frameCounter / 120 + (x + y) / 10) % 1;
                    const beatIntensity = Math.sin(beatPhase * Math.PI * 2) * 0.05 + 0.05;
                    
                    // Draw a grid cell with subtle pink illumination
                    this.ctx.fillStyle = `rgba(255, 240, 245, ${beatIntensity})`; // Light pink background
                    this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
                }
                
                // Draw light blue grid lines
                this.ctx.strokeStyle = 'rgba(180, 210, 240, 0.5)'; // Light blue lines
                this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            }
        }
        
        // Highlight possible placement cells when a tower is selected
        if (this.selectedTowerType) {
            this._highlightValidPlacements(0, 0);
        }
    }
    
    /**
     * Draw the path with solid color (no animation)
     * @param {number} offsetX - X offset for centering
     * @param {number} offsetY - Y offset for centering
     * @private
     */
    _drawPath(offsetX, offsetY) {
        // Fill the entire path with a solid color
        this.ctx.save();
        
        // Create a path for filling (we'll use solid rectangles instead of strokes)
        for (const [x, y] of CONFIG.PATH) {
            // Draw a filled rectangle for each path tile
            this.ctx.fillStyle = 'rgba(230, 200, 230, 0.8)'; // Solid light pink path
            this.ctx.fillRect(
                x * CONFIG.TILE_SIZE + 2, 
                y * CONFIG.TILE_SIZE + 2, 
                CONFIG.TILE_SIZE - 4, 
                CONFIG.TILE_SIZE - 4
            );
            
            // Add a subtle border
            this.ctx.strokeStyle = 'rgba(200, 180, 220, 0.9)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(
                x * CONFIG.TILE_SIZE + 2, 
                y * CONFIG.TILE_SIZE + 2, 
                CONFIG.TILE_SIZE - 4, 
                CONFIG.TILE_SIZE - 4
            );
        }
        
        // Draw start point (entry) - in light blue
        const [startX, startY] = CONFIG.PATH[0];
        const startCenterX = startX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const startCenterY = startY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        
        this.ctx.fillStyle = 'rgba(150, 200, 255, 0.9)'; // Solid blue color
        this.ctx.beginPath();
        this.ctx.arc(startCenterX, startCenterY, CONFIG.TILE_SIZE * 0.35, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw endpoint (base to defend) - in pink
        const [endX, endY] = CONFIG.PATH[CONFIG.PATH.length - 1];
        const endCenterX = endX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const endCenterY = endY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        
        this.ctx.fillStyle = 'rgba(255, 140, 200, 0.9)'; // Solid pink color
        this.ctx.beginPath();
        this.ctx.arc(endCenterX, endCenterY, CONFIG.TILE_SIZE * 0.35, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    /**
     * Highlight valid tower placement cells
     * @param {number} offsetX - X offset for centering
     * @param {number} offsetY - Y offset for centering  
     * @private
     */
    _highlightValidPlacements(offsetX, offsetY) {
        // Draw highlights on valid placement cells
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
                // Check if this is a valid placement
                const isPath = CONFIG.PATH.some(p => p[0] === x && p[1] === y);
                const towerExists = this.towers.some(t => t.x === x && t.y === y);
                
                if (!isPath && !towerExists) {
                    const rect = {
                        x: x * CONFIG.TILE_SIZE,
                        y: y * CONFIG.TILE_SIZE,
                        width: CONFIG.TILE_SIZE,
                        height: CONFIG.TILE_SIZE
                    };
                    
                    // Pulsating highlight
                    const pulse = Math.sin(this.frameCounter * 0.1) * 0.2 + 0.4;
                    
                    // Get color based on selected tower
                    const towerColor = CONFIG.TOWER_TYPES[this.selectedTowerType].color;
                    const rgbColor = this._hexToRgb(towerColor);
                    
                    // Draw highlight
                    this.ctx.fillStyle = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${pulse * 0.3})`;
                    this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
                    
                    // Draw a subtle border
                    this.ctx.strokeStyle = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${pulse * 0.8})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4);
                }
            }
        }
    }
    
    /**
     * Update all enemies
     * @param {number} deltaTime - Time since last frame
     */
    updateEnemies(deltaTime) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime);
            
            if (enemy.reachedEnd) {
                this.lives--;
                this.enemies.splice(i, 1);
                
                if (this.lives <= 0 && !this.gameOver) {
                    console.log("Player lost all lives - Game Over!");
                    this.gameOver = true;
                    
                    // Show game over screen
                    const gameOverScreen = document.getElementById('game-over');
                    const startScreen = document.getElementById('start-screen');
                    
                    if (gameOverScreen) gameOverScreen.classList.remove('hidden');
                    if (startScreen) startScreen.classList.add('hidden');
                    
                    this.audioManager.onGameOver();
                }
            } else if (enemy.isDead) {
                this.money += 25; // Reward for killing an enemy
                this.enemies.splice(i, 1);
            }
        }
    }
    
    /**
     * Update all towers
     * @param {number} deltaTime - Time since last frame
     */
    updateTowers(deltaTime) {
        const currentTime = performance.now();
        for (const tower of this.towers) {
            tower.update(this.enemies, currentTime, this.audioManager);
        }
    }
    
    /**
     * Attempt to place a tower at the specified grid position
     * @param {number} gridX - Grid x-coordinate
     * @param {number} gridY - Grid y-coordinate
     * @returns {boolean} True if tower was placed
     */
    placeTower(gridX, gridY) {
        // Check if we have a selected tower type
        if (!this.selectedTowerType) return false;
        
        // Check if position is within the game board
        if (gridX < 0 || gridX >= CONFIG.GRID_WIDTH || gridY < 0 || gridY >= CONFIG.GRID_HEIGHT) {
            console.log('Tower placement out of bounds');
            return false;
        }
        
        // Check if it's a valid position (not on the path)
        const isPath = CONFIG.PATH.some(p => p[0] === gridX && p[1] === gridY);
        if (isPath) return false;
        
        // Check if there's already a tower here
        const towerExists = this.towers.some(t => t.x === gridX && t.y === gridY);
        if (towerExists) return false;
        
        // Check if we can afford it (though money is infinite in testing)
        const towerCost = CONFIG.TOWER_TYPES[this.selectedTowerType].cost;
        if (this.money < towerCost) return false;
        
        // Place the tower
        const tower = new Tower(gridX, gridY, this.selectedTowerType);
        this.towers.push(tower);
        this.money -= towerCost;
        
        // Play a placement sound effect
        if (this.audioManager) {
            this.audioManager.onTowerPlace();
        }
        
        return true;
    }
    
    /**
     * Start a new wave of enemies
     */
    startNextWave() {
        this.wave++;
        
        // Notify audio manager
        this.audioManager.onWaveStart();
        
        // Create new enemies for this wave
        const newEnemies = createEnemyWave(
            CONFIG.PATH,
            this.wave,
            5 + this.wave * 2,
            50 + this.wave * 10,
            1 + this.wave * 0.1
        );
        
        // Add first enemy immediately
        if (newEnemies.length > 0) {
            this.enemies.push(newEnemies.shift());
        }
        
        // Schedule the rest
        this.scheduledEnemies = newEnemies;
        this.enemySpawnTimer = 0.5;
    }
    
    /**
     * Spawn a new enemy
     * @param {boolean} testEnemy - If true, spawn a special test enemy
     */
    spawnEnemy(testEnemy = false) {
        try {
            if (testEnemy) {
                // Create a special test enemy with distinct appearance
                // Make sure the path is valid
                if (!CONFIG.PATH || CONFIG.PATH.length === 0) {
                    console.error("Cannot spawn test enemy: path is invalid");
                    return;
                }
                
                const enemy = new Enemy(
                    CONFIG.PATH,
                    2, // Fixed speed for testing
                    100 // Fixed health
                );
                
                // Verify enemy was properly initialized
                if (!isFinite(enemy.x) || !isFinite(enemy.y)) {
                    console.error("Test enemy has invalid initial position:", enemy.x, enemy.y);
                    return;
                }
                
                enemy.color = '#D73BFF'; // Bright purple for high visibility on light background
                enemy.size = CONFIG.TILE_SIZE / 2.2; // Make it larger
                console.log("Test enemy created with color:", enemy.color);
                this.enemies.push(enemy);
                
                // Add a visual effect for the test spawn
                console.log("Test enemy spawned!", enemy);
                return;
            }
            
            if (this.scheduledEnemies && this.scheduledEnemies.length > 0) {
                // Spawn next scheduled enemy
                const enemy = this.scheduledEnemies.shift();
                if (enemy && isFinite(enemy.x) && isFinite(enemy.y)) {
                    this.enemies.push(enemy);
                }
            } else if (this.wave > 0) {
                // Only create new enemies if a wave has started
                const enemy = new Enemy(
                    CONFIG.PATH,
                    1 + this.wave * 0.1,
                    50 + this.wave * 10
                );
                
                if (isFinite(enemy.x) && isFinite(enemy.y)) {
                    this.enemies.push(enemy);
                }
            }
        } catch (error) {
            console.error("Error spawning enemy:", error);
        }
    }
    
    /**
     * Spawn a single test enemy
     */
    spawnTestEnemy() {
        this.spawnEnemy(true);
    }
    
    /**
     * This method is now handled in main.js
     * Kept for compatibility
     */
    startNewGame() {
        console.log("Game.startNewGame called - delegating to resetGame");
        this.gameStarted = true;
        this.gameOver = false;
        this.resetGame();
    }

    /**
     * Reset the game
     */
    resetGame() {
        console.log("Resetting game state");
        
        // Reset game state
        this.towers = [];
        this.enemies = [];
        this.scheduledEnemies = [];
        this.selectedTowerType = null;
        this.money = CONFIG.STARTING_MONEY;
        this.lives = CONFIG.STARTING_LIVES;
        this.wave = 0;
        this.gameOver = false;
        this.paused = false;
        
        // Reset audio
        this.audioManager.reset();
        
        // Reset UI
        this.ui.selectTower(null);
        this.ui.update();
        
        console.log("Game reset complete. Lives:", this.lives);
    }
    
    /**
     * Toggle the game pause state
     */
    togglePause() {
        this.paused = !this.paused;
    }
}