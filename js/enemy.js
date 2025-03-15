/**
 * Enemy class and wave generation for Decibel Defense
 */
class Enemy {
    /**
     * Create a new enemy
     * @param {Array} path - Array of [x, y] grid coordinates defining the path
     * @param {number} speed - Movement speed in pixels per frame
     * @param {number} health - Starting health points
     */
    constructor(path, speed, health) {
        try {
            // Validate path
            if (!path || !Array.isArray(path) || path.length === 0) {
                console.error("Invalid path provided to Enemy constructor:", path);
                // Set default values to prevent errors
                this.path = [[0, 0], [1, 0]];
                this.pathIndex = 0;
                this.gridX = 0;
                this.gridY = 0;
                this.x = 0;
                this.y = 0;
                return;
            }
            
            this.path = path;
            this.pathIndex = 0;
            
            // Make sure path has valid coordinates
            if (!this.path[this.pathIndex] || !Array.isArray(this.path[this.pathIndex]) || this.path[this.pathIndex].length !== 2) {
                console.error("Invalid path coordinates at index 0:", this.path[this.pathIndex]);
                // Set default values
                this.gridX = 0;
                this.gridY = 0;
            } else {
                this.gridX = Number(this.path[this.pathIndex][0]);
                this.gridY = Number(this.path[this.pathIndex][1]);
            }
            
            // Store grid positions and calculate actual coordinates
            if (!isFinite(this.gridX) || !isFinite(this.gridY)) {
                console.error("Invalid grid coordinates:", this.gridX, this.gridY);
                this.gridX = 0;
                this.gridY = 0;
            }
            
            // x and y will be calculated during drawing based on current gridX and gridY
            // plus progress between current and next path point
            this.progressOnPath = 0;
            
            // Store precise position in terms of CONFIG.TILE_SIZE units
            // These values are in the canvas's coordinate system before any scaling transforms
            this.x = this.gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            this.y = this.gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            
            // Log initial position for debugging
            console.log(`Enemy initialized at grid (${this.gridX},${this.gridY}), canvas coords (${this.x},${this.y})`);
        } catch (error) {
            console.error("Error in Enemy constructor:", error);
            // Set failsafe values
            this.path = [[0, 0], [1, 0]];
            this.pathIndex = 0;
            this.gridX = 0;
            this.gridY = 0;
            this.x = 0;
            this.y = 0;
        }
        
        this.lastX = this.x; // Track previous position for animation
        this.lastY = this.y;
        this.speed = speed;
        this.health = health;
        this.maxHealth = health;
        this.reachedEnd = false;
        this.isDead = false;
        
        // Visual properties
        this.color = '#00FF7F'; // Brighter green for better visibility
        this.size = CONFIG.TILE_SIZE / 3;
        this.animationFrame = 0;
        this.hitEffects = []; // For visual hit effects
    }
    
    /**
     * Draw the enemy
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {number} offsetX - X offset for centering the grid
     * @param {number} offsetY - Y offset for centering the grid
     */
    draw(ctx, offsetX = 0, offsetY = 0) {
        // Declare variables in function scope so they're accessible throughout the method
        let pulseSize, glowSize, innerRadius, gradient;
        // Declare draw coordinates at the top level so they're accessible in all try blocks
        let drawX, drawY;
        
        try {
            // Validate grid position
            if (!isFinite(this.gridX) || !isFinite(this.gridY)) {
                console.warn('Enemy has invalid grid position:', this.gridX, this.gridY);
                return;
            }
            
            // Make sure positions are using the correct scaling
            // These should be in direct grid coordinates since the canvas context is already scaled
            drawX = this.x;
            drawY = this.y;
            
            // Log enemy position for debugging
            console.log(`Drawing enemy at: ${drawX},${drawY} with grid position ${this.gridX},${this.gridY}`);
            
            // Wobble animation
            this.animationFrame = (this.animationFrame + 1) % 20;
            const sizeMod = Math.sin(this.animationFrame * Math.PI / 10) * 2;
            pulseSize = Math.max(5, this.size + sizeMod); // Ensure minimum size
            
            // Draw shadow
            ctx.beginPath();
            ctx.ellipse(drawX, drawY + pulseSize - 2, pulseSize, pulseSize/2, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fill();
            
            // Draw a solid enemy base first to ensure visibility
            ctx.beginPath();
            ctx.arc(drawX, drawY, pulseSize, 0, Math.PI * 2);
            ctx.fillStyle = this.color;  // Use the enemy's base color
            ctx.fill();
            
            // Draw enemy glow
            glowSize = Math.max(1, pulseSize + 5);
            innerRadius = Math.max(1, pulseSize * 0.8); // Ensure minimum inner radius
            
            // Check for valid coordinates
            if (!isFinite(drawX) || !isFinite(drawY) || !isFinite(innerRadius) || !isFinite(glowSize)) {
                console.warn('Invalid coordinates for enemy glow gradient:', drawX, drawY, innerRadius, glowSize);
                return; // Skip drawing this enemy if coordinates are invalid
            }
            
            // Draw enemy outer glow
            gradient = ctx.createRadialGradient(
                drawX, drawY, pulseSize * 0.9, // Start glow from near the edge of the enemy
                drawX, drawY, glowSize
            );
            
            // Color depends on health
            const healthPercent = this.health / this.maxHealth;
            let glowColor = this.color;
            
            if (healthPercent < 0.3) {
                // Low health, red glow
                glowColor = '#FF0000';
            }
            
            gradient.addColorStop(0, glowColor);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.beginPath();
            ctx.arc(drawX, drawY, glowSize, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Draw enemy body with 3D effect gradient on top of the base
            const bodyGradient = ctx.createRadialGradient(
                drawX - pulseSize/4, drawY - pulseSize/4, 0,
                drawX, drawY, pulseSize
            );
            
            bodyGradient.addColorStop(0, '#FFFFFF'); // Highlight
            bodyGradient.addColorStop(0.3, this.color);
            bodyGradient.addColorStop(0.7, this.color); // Extend the solid color
            bodyGradient.addColorStop(1, this._darkenColor(this.color, 0.8)); // Slightly darker edge
            
            ctx.beginPath();
            ctx.arc(drawX, drawY, pulseSize, 0, Math.PI * 2);
            ctx.fillStyle = bodyGradient;
            ctx.fill();
            
            // Add a subtle outline for better visibility
            ctx.beginPath();
            ctx.arc(drawX, drawY, pulseSize, 0, Math.PI * 2);
            ctx.strokeStyle = this._darkenColor(this.color, 0.5);
            ctx.lineWidth = 1;
            ctx.stroke();
        } catch (error) {
            console.error('Error drawing enemy:', error);
            return;
        }
        
        try {
            // Draw eyes
            const eyeSize = CONFIG.TILE_SIZE / 10;
            const eyeOffset = CONFIG.TILE_SIZE / 8;
            
            // Animate eyes based on health and movement
            let eyeAngle, lookX, lookY;
            
            if (isFinite(this.y) && isFinite(this.lastY) && isFinite(this.x) && isFinite(this.lastX)) {
                eyeAngle = Math.atan2(this.y - this.lastY, this.x - this.lastX);
                lookX = Math.cos(eyeAngle) * (eyeSize / 4);
                lookY = Math.sin(eyeAngle) * (eyeSize / 4);
            } else {
                // Default if position is invalid
                lookX = 0;
                lookY = 0;
            }
            
            // Check for valid coordinates
            if (!isFinite(drawX) || !isFinite(drawY) || !isFinite(eyeSize) || !isFinite(eyeOffset)) {
                console.warn('Invalid eye drawing coordinates:', drawX, drawY, eyeSize, eyeOffset);
                return;
            }
            
            // Eye whites
            ctx.beginPath();
            ctx.arc(drawX - eyeOffset, drawY - eyeOffset, eyeSize, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(drawX + eyeOffset, drawY - eyeOffset, eyeSize, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            
            // Pupils - move in direction of travel
            ctx.beginPath();
            ctx.arc(drawX - eyeOffset + lookX, drawY - eyeOffset + lookY, eyeSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = 'black';
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(drawX + eyeOffset + lookX, drawY - eyeOffset + lookY, eyeSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = 'black';
            ctx.fill();
            
            const healthPercent = this.health / this.maxHealth;
            
            // Angry eyebrows when health is low
            if (healthPercent < 0.5) {
                ctx.beginPath();
                ctx.moveTo(drawX - eyeOffset - eyeSize, drawY - eyeOffset - eyeSize);
                ctx.lineTo(drawX - eyeOffset + eyeSize, drawY - eyeOffset - eyeSize/2);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(drawX + eyeOffset - eyeSize, drawY - eyeOffset - eyeSize/2);
                ctx.lineTo(drawX + eyeOffset + eyeSize, drawY - eyeOffset - eyeSize);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        } catch (error) {
            console.error('Error drawing enemy eyes:', error);
            return;
        }
        
        try {
            const healthPercent = this.health / this.maxHealth;
            const eyeOffset = CONFIG.TILE_SIZE / 8;
            
            // Check for valid coordinates
            if (!isFinite(drawX) || !isFinite(drawY) || !isFinite(eyeOffset)) {
                console.warn('Invalid mouth drawing coordinates:', drawX, drawY, eyeOffset);
                return;
            }
            
            // Draw mouth - changes with health
            ctx.beginPath();
            if (healthPercent > 0.7) {
                // Happy mouth
                ctx.arc(drawX, drawY + eyeOffset/2, eyeOffset, 0, Math.PI);
            } else if (healthPercent > 0.3) {
                // Neutral mouth
                ctx.moveTo(drawX - eyeOffset, drawY + eyeOffset/2);
                ctx.lineTo(drawX + eyeOffset, drawY + eyeOffset/2);
            } else {
                // Sad/angry mouth
                ctx.arc(drawX, drawY + eyeOffset, eyeOffset, Math.PI, Math.PI * 2);
            }
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw health bar with gradient
            const healthRatio = Math.max(0, this.health / this.maxHealth);
            const barWidth = CONFIG.TILE_SIZE * 0.8;
            const barHeight = 5;
            const barX = drawX - barWidth / 2;
            const barY = drawY - CONFIG.TILE_SIZE / 2 - 10;
            
            // Check for valid health bar coordinates
            if (!isFinite(barX) || !isFinite(barY) || !isFinite(barWidth) || !isFinite(barHeight)) {
                console.warn('Invalid health bar coordinates:', barX, barY, barWidth, barHeight);
                return;
            }
            
            // Bar background with rounded corners
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth, barHeight, 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fill();
            
            // Health fill
            if (healthRatio > 0) {
                // Create gradient based on health
                const healthGradient = ctx.createLinearGradient(barX, barY, barX + barWidth * healthRatio, barY);
                
                if (healthRatio > 0.7) {
                    healthGradient.addColorStop(0, '#00FF00');
                    healthGradient.addColorStop(1, '#AAFFAA');
                } else if (healthRatio > 0.3) {
                    healthGradient.addColorStop(0, '#FFFF00');
                    healthGradient.addColorStop(1, '#FFFFAA');
                } else {
                    healthGradient.addColorStop(0, '#FF0000');
                    healthGradient.addColorStop(1, '#FFAAAA');
                }
                
                ctx.beginPath();
                ctx.roundRect(barX, barY, barWidth * healthRatio, barHeight, 2);
                ctx.fillStyle = healthGradient;
                ctx.fill();
            }
        } catch (error) {
            console.error('Error drawing enemy mouth and health bar:', error);
            return;
        }
    }
    
    /**
     * Utility to darken a color
     * @param {string} color - Hex color to darken
     * @param {number} factor - Amount to darken (0-1)
     * @returns {string} Darkened color
     */
    _darkenColor(color, factor) {
        // Remove # if present
        color = color.replace('#', '');
        
        const r = Math.floor(parseInt(color.substring(0, 2), 16) * factor);
        const g = Math.floor(parseInt(color.substring(2, 4), 16) * factor);
        const b = Math.floor(parseInt(color.substring(4, 6), 16) * factor);
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    /**
     * Update enemy position and state
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    update(deltaTime) {
        try {
            // Validation check - if we have invalid position, don't try to update
            if (!isFinite(this.x) || !isFinite(this.y)) {
                console.warn("Enemy has invalid position, skipping update:", this.x, this.y);
                this.isDead = true; // Mark for removal
                return;
            }
            
            // Store previous position for animation
            this.lastX = this.x;
            this.lastY = this.y;
            
            // Validate path index and path length
            if (!this.path || !Array.isArray(this.path) || this.pathIndex < 0 || this.pathIndex >= this.path.length) {
                console.warn("Enemy has invalid path or path index:", this.pathIndex, this.path?.length);
                this.isDead = true; // Mark for removal
                return;
            }
            
            if (this.pathIndex < this.path.length - 1) {
                // Validate next path point
                if (!Array.isArray(this.path[this.pathIndex + 1]) || this.path[this.pathIndex + 1].length !== 2) {
                    console.warn("Enemy has invalid next path point:", this.path[this.pathIndex + 1]);
                    this.isDead = true; // Mark for removal
                    return;
                }
                
                // Calculate target position (next point on path)
                const nextX = Number(this.path[this.pathIndex + 1][0]);
                const nextY = Number(this.path[this.pathIndex + 1][1]);
                
                if (!isFinite(nextX) || !isFinite(nextY)) {
                    console.warn("Enemy has invalid next path coordinates:", nextX, nextY);
                    this.isDead = true; // Mark for removal
                    return;
                }
                
                // Convert from grid coordinates to canvas coordinates
                // This uses the base TILE_SIZE because the canvas context will apply scaling
                const targetX = nextX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                const targetY = nextY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                
                // Calculate direction vector
                const dx = targetX - this.x;
                const dy = targetY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Move towards target at speed adjusted for frame time - capped to avoid huge jumps
                const frameSpeed = Math.min(this.speed * deltaTime * 60, distance); 
                
                if (distance < frameSpeed) {
                    // Reached the current path point, move to the next one
                    this.pathIndex += 1;
                    if (this.pathIndex >= this.path.length - 1) {
                        // Reached the end of the path
                        this.reachedEnd = true;
                    }
                } else if (isFinite(distance) && distance > 0) {
                    // Calculate normalized progress per frame (in terms of CONFIG.TILE_SIZE)
                    const progressX = (dx / distance) * frameSpeed;
                    const progressY = (dy / distance) * frameSpeed;
                    
                    // Move along path - only if distance is valid
                    this.x += progressX;
                    this.y += progressY;
                } else if (distance === 0) {
                    // Special case: We're exactly at the target point
                    // Just advance to the next path point without logging an error
                    this.pathIndex += 1;
                    if (this.pathIndex >= this.path.length - 1) {
                        // Reached the end of the path
                        this.reachedEnd = true;
                    }
                } else {
                    // Log only if it's not the common case of distance=0
                    console.warn("Enemy has invalid movement distance:", distance);
                }
            }
            
            // Update grid position for tower targeting
            if (isFinite(this.x) && isFinite(this.y) && isFinite(CONFIG.TILE_SIZE) && CONFIG.TILE_SIZE > 0) {
                this.gridX = Math.floor(this.x / CONFIG.TILE_SIZE);
                this.gridY = Math.floor(this.y / CONFIG.TILE_SIZE);
            }
            
            // Update hit effects
            for (let i = this.hitEffects.length - 1; i >= 0; i--) {
                const effect = this.hitEffects[i];
                effect.life -= deltaTime * 2;
                
                if (effect.life <= 0) {
                    this.hitEffects.splice(i, 1);
                }
            }
        } catch (error) {
            console.error("Error updating enemy:", error);
            this.isDead = true; // Mark for removal to prevent further errors
        }
    }
    
    /**
     * Reduce enemy health when damaged by towers
     * @param {number} amount - Amount of damage to apply
     */
    takeDamage(amount) {
        this.health -= amount;
        
        // Add visual hit effect
        this.hitEffects.push({
            x: this.x + (Math.random() * 10 - 5),
            y: this.y + (Math.random() * 10 - 5),
            size: 8 + Math.random() * 5,
            life: 1.0,
            color: '#FFFFFF'
        });
        
        if (this.health <= 0) {
            this.isDead = true;
            
            // Add death effect particles
            for (let i = 0; i < 10; i++) {
                this.hitEffects.push({
                    x: this.x + (Math.random() * 20 - 10),
                    y: this.y + (Math.random() * 20 - 10),
                    size: 10 + Math.random() * 8,
                    life: 1.0 + Math.random() * 0.5,
                    color: this.color
                });
            }
        }
    }
}

/**
 * Boss enemy with more health and special abilities
 */
class BossEnemy extends Enemy {
    /**
     * Create a new boss enemy
     * @param {Array} path - Path for the boss to follow
     * @param {number} speed - Movement speed
     * @param {number} health - Health points
     */
    constructor(path, speed, health) {
        super(path, speed * 0.7, health * 3);
        this.color = '#800000'; // Dark red
        this.size = CONFIG.TILE_SIZE / 2; // Larger than regular enemies
        this.spawnCooldown = 0;
    }
    
    /**
     * Update boss movement and abilities
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        super.update(deltaTime);
        
        // Boss special ability: spawn mini enemies (for future implementation)
        this.spawnCooldown -= deltaTime;
    }
    
    /**
     * Draw the boss enemy with unique appearance
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        // Draw base enemy
        super.draw(ctx);
        
        // Add crown to make it look like a boss
        const crownHeight = this.size / 2;
        const crownWidth = this.size;
        
        ctx.beginPath();
        ctx.moveTo(this.x - crownWidth/2, this.y - this.size - crownHeight/2);
        ctx.lineTo(this.x - crownWidth/3, this.y - this.size - crownHeight);
        ctx.lineTo(this.x, this.y - this.size - crownHeight/2);
        ctx.lineTo(this.x + crownWidth/3, this.y - this.size - crownHeight);
        ctx.lineTo(this.x + crownWidth/2, this.y - this.size - crownHeight/2);
        ctx.closePath();
        
        ctx.fillStyle = '#FFD700'; // Gold crown
        ctx.fill();
    }
}

/**
 * Create a wave of enemies with gradually increasing difficulty
 * @param {Array} path - Path for enemies to follow
 * @param {number} wave - Current wave number
 * @param {number} count - Number of enemies to create
 * @param {number} health - Base health for enemies
 * @param {number} speed - Base speed for enemies
 * @returns {Array} List of Enemy objects
 */
function createEnemyWave(path, wave, count, health, speed) {
    const enemies = [];
    
    // Add a boss every 5 waves
    if (wave % 5 === 0) {
        const boss = new BossEnemy(path, speed, health);
        enemies.push(boss);
        count -= 2; // Boss counts as multiple regular enemies
    }
    
    // Create regular enemies with slight variations
    for (let i = 0; i < count; i++) {
        // Add slight randomness to make each enemy a bit different
        const healthVar = (0.9 + Math.random() * 0.2) * health;
        const speedVar = (0.8 + Math.random() * 0.4) * speed;
        
        const enemy = new Enemy(path, speedVar, healthVar);
        enemies.push(enemy);
    }
    
    return enemies;
}