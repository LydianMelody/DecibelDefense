/**
 * Tower class for Decibel Defense
 * Handles tower creation, drawing, and attack logic
 */
class Tower {
    /**
     * Create a new tower
     * @param {number} x - Grid x-coordinate
     * @param {number} y - Grid y-coordinate
     * @param {string} towerType - Type of tower from CONFIG.TOWER_TYPES
     */
    constructor(x, y, towerType) {
        this.x = x;
        this.y = y;
        this.type = towerType;
        this.id = `tower_${x}_${y}_${Date.now()}`;
        
        // Load properties from tower type
        const towerProps = CONFIG.TOWER_TYPES[towerType];
        this.color = towerProps.color;
        this.range = towerProps.range;
        
        // Apply damage multipliers based on fire rate
        // Slower firing towers do more damage, this will be further adjusted by beat division
        this.baseDamage = towerProps.damage;
        this.damage = this.baseDamage;
        this.fireRate = towerProps.fireRate;
        this.soundKey = towerProps.sound;
        
        // Tower state
        this.lastFireTime = 0;
        this.target = null;
        this.active = false; // For tracking if tower is attacking
        this.animationFrame = 0;
        this.pulseTime = 0;
        this.size = CONFIG.TILE_SIZE * 0.8; // Base size for the tower
        this.readyToFire = true; // Whether this tower is ready to fire on next beat
        
        // Beat information
        this.beatDivision = null; // Will be set when registered with audio manager
        
        // Visual effects
        this.projectiles = [];
        this.particles = [];
        this.pulsating = false;
        this.pulseSize = 0;
        this.glowing = false;
        
        // Upgrades (for future implementation)
        this.level = 1;
        this.maxLevel = 3;
    }
    
    /**
     * Draw the tower and its range indicator
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {number} offsetX - X offset for centering the grid (generally 0 with new scaling approach)
     * @param {number} offsetY - Y offset for centering the grid (generally 0 with new scaling approach)
     */
    draw(ctx, offsetX = 0, offsetY = 0) {
        // Calculate center position - the canvas is already scaled, so we use standard CONFIG.TILE_SIZE
        const centerX = this.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const centerY = this.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        
        // Draw range with pulsating effect if active
        if (this.active) {
            // Pulsating range indicator
            this.animationFrame = (this.animationFrame + 1) % 20;
            const animationScale = 1.0 + 0.1 * Math.sin(this.animationFrame * Math.PI / 10);
            
            // Outer glow effect
            const gradient = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, this.range * CONFIG.TILE_SIZE * animationScale
            );
            
            gradient.addColorStop(0, 'rgba(' + this._hexToRgb(this.color) + ',0.0)');
            gradient.addColorStop(0.7, 'rgba(' + this._hexToRgb(this.color) + ',0.05)');
            gradient.addColorStop(0.9, 'rgba(' + this._hexToRgb(this.color) + ',0.1)');
            gradient.addColorStop(1, 'rgba(' + this._hexToRgb(this.color) + ',0.0)');
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.range * CONFIG.TILE_SIZE * animationScale, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }
        
        // Draw non-pulsating range indicator
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.range * CONFIG.TILE_SIZE, 0, Math.PI * 2);
        ctx.strokeStyle = this.color + '80'; // 50% alpha
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw projectiles
        this._drawProjectiles(ctx);
        
        // Draw particles
        this._drawParticles(ctx);
        
        // Draw tower body with pulsating effect based on beats - ensure size is positive
        const pulseMultiplier = this.active ? Math.max(0.5, this.pulseSize) : 1.0;
        const readyToFireBonus = this.readyToFire && this.target ? 0.2 : 0; // Extra pulse when ready to fire
        const finalSize = Math.max(5, this.size / 2 * (pulseMultiplier + readyToFireBonus));
        
        // Draw glow effect if the tower just fired
        if (this.glowing) {
            const glowOuterRadius = Math.max(finalSize + 10, finalSize + 5);
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, glowOuterRadius, 0, Math.PI * 2);
            const glow = ctx.createRadialGradient(
                centerX, centerY, finalSize,
                centerX, centerY, glowOuterRadius
            );
            glow.addColorStop(0, this.color);
            glow.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = glow;
            ctx.fill();
        }
        
        // Main tower body
        ctx.beginPath();
        ctx.arc(centerX, centerY, finalSize, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Add a highlight for 3D effect
        const highlight = ctx.createRadialGradient(
            centerX - finalSize*0.3, centerY - finalSize*0.3, 0,
            centerX, centerY, finalSize
        );
        highlight.addColorStop(0, 'rgba(255,255,255,0.8)');
        highlight.addColorStop(0.5, 'rgba(255,255,255,0.1)');
        highlight.addColorStop(1, 'rgba(255,255,255,0)');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, finalSize, 0, Math.PI * 2);
        ctx.fillStyle = highlight;
        ctx.fill();
        
        // Add eyes to make it look like a creature
        const eyeSize = this.size / 8;
        const eyeOffset = this.size / 5;
        
        // Left eye
        ctx.beginPath();
        ctx.arc(centerX - eyeOffset, centerY - eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        
        // Left pupil
        ctx.beginPath();
        ctx.arc(centerX - eyeOffset, centerY - eyeOffset, eyeSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
        
        // Right eye
        ctx.beginPath();
        ctx.arc(centerX + eyeOffset, centerY - eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        
        // Right pupil
        ctx.beginPath();
        ctx.arc(centerX + eyeOffset, centerY - eyeOffset, eyeSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
        
        // Draw mouth based on tower type
        this._drawMouth(ctx, centerX, centerY, eyeOffset, eyeSize);
        
        // Add a "ready to fire" effect
        if (this.readyToFire && this.target) {
            // Draw a pulsing ring around the tower
            ctx.beginPath();
            const readyRingSize = finalSize * 1.3 + Math.sin(performance.now() / 100) * 5;
            ctx.arc(centerX, centerY, readyRingSize, 0, Math.PI * 2);
            ctx.strokeStyle = `${this.color}88`; // Semi-transparent
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Draw a line to the target if available
            if (this.target) {
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(this.target.x, this.target.y);
                ctx.strokeStyle = `${this.color}44`; // Very transparent
                ctx.lineDashOffset = -performance.now() / 50;
                ctx.setLineDash([5, 10]);
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.setLineDash([]); // Reset line dash
            }
        }
        
        // Show level indicator (for future upgrade system)
        if (this.level > 1) {
            const levelText = `Lvl ${this.level}`;
            ctx.font = '12px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(levelText, centerX, centerY + this.size / 2 + 10);
        }
    }
    
    /**
     * Draw all projectiles
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    _drawProjectiles(ctx) {
        for (const proj of this.projectiles) {
            try {
                // Calculate current position based on progress
                const x = proj.startX + (proj.endX - proj.startX) * proj.progress;
                const y = proj.startY + (proj.endY - proj.startY) * proj.progress;
                
                // Skip if invalid coordinates
                if (!isFinite(x) || !isFinite(y)) {
                    console.warn('Invalid projectile position:', x, y);
                    continue;
                }
                
                // Default size or use projectile's size if available
                const projSize = proj.size || (proj.isPowerful ? 12 : 8);
                const coreSize = proj.isPowerful ? 6 : 4;
                
                // Draw projectile as a glowing orb
                ctx.beginPath();
                
                // Outer glow with trail for powerful projectiles
                if (proj.isPowerful) {
                    // Draw trail
                    const trailLength = 0.2;  // 20% of the total distance
                    const trailStart = Math.max(0, proj.progress - trailLength);
                    
                    const gradient = ctx.createLinearGradient(
                        proj.startX + (proj.endX - proj.startX) * trailStart,
                        proj.startY + (proj.endY - proj.startY) * trailStart,
                        x, y
                    );
                    
                    gradient.addColorStop(0, 'rgba(255,255,255,0)');
                    gradient.addColorStop(0.5, proj.color + '40'); // 25% alpha
                    gradient.addColorStop(1, proj.color);
                    
                    ctx.beginPath();
                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = projSize * 0.8;
                    ctx.moveTo(
                        proj.startX + (proj.endX - proj.startX) * trailStart,
                        proj.startY + (proj.endY - proj.startY) * trailStart
                    );
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
                
                // Main projectile glow
                const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, projSize);
                
                // Special appearance for rapid fire projectiles
                if (proj.isRapidFire) {
                    // More elongated/streaky appearance for fast projectiles
                    const dx = proj.endX - proj.startX;
                    const dy = proj.endY - proj.startY;
                    const angle = Math.atan2(dy, dx);
                    
                    // Draw a streaking effect behind the projectile
                    ctx.beginPath();
                    ctx.moveTo(
                        x - Math.cos(angle) * projSize * 2,
                        y - Math.sin(angle) * projSize * 2
                    );
                    ctx.lineTo(x, y);
                    ctx.strokeStyle = proj.color;
                    ctx.lineWidth = projSize * 0.8;
                    ctx.stroke();
                    
                    // Brighter center for heavy guitar
                    glowGradient.addColorStop(0, 'white');
                    glowGradient.addColorStop(0.3, proj.color);
                    glowGradient.addColorStop(1, 'rgba(255,255,255,0)');
                } else {
                    glowGradient.addColorStop(0, proj.isPowerful ? 'white' : proj.color);
                    glowGradient.addColorStop(0.5, proj.color);
                    glowGradient.addColorStop(1, 'rgba(255,255,255,0)');
                }
                
                ctx.beginPath();
                ctx.arc(x, y, projSize, 0, Math.PI * 2);
                ctx.fillStyle = glowGradient;
                ctx.fill();
                
                // Inner core with pulsating effect for powerful projectiles
                const pulseSize = proj.isPowerful ? 
                    coreSize * (0.8 + 0.4 * Math.sin(performance.now() / 50)) : 
                    coreSize;
                
                ctx.beginPath();
                ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
                ctx.fillStyle = proj.isPowerful ? '#FFFFFF' : 'white';
                ctx.fill();
                
                // Add small sparkles for powerful projectiles
                if (proj.isPowerful && Math.random() < 0.4) {
                    const sparkCount = 2 + Math.floor(Math.random() * 3);
                    
                    for (let i = 0; i < sparkCount; i++) {
                        const sparkAngle = Math.random() * Math.PI * 2;
                        const sparkDist = projSize * (0.7 + Math.random() * 0.5);
                        
                        const sparkX = x + Math.cos(sparkAngle) * sparkDist;
                        const sparkY = y + Math.sin(sparkAngle) * sparkDist;
                        
                        const sparkSize = 1 + Math.random() * 2;
                        
                        ctx.beginPath();
                        ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
                        ctx.fillStyle = 'white';
                        ctx.fill();
                    }
                }
            } catch (error) {
                console.error('Error drawing projectile:', error);
            }
        }
    }
    
    /**
     * Draw all particles
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    _drawParticles(ctx) {
        for (const particle of this.particles) {
            // Ensure radius is positive
            const radius = Math.max(0.5, particle.size * particle.life);
            
            if (radius > 0) {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
                
                // Ensure alpha channel is valid
                const alpha = Math.max(0, Math.min(255, Math.floor(particle.life * 255)));
                ctx.fillStyle = particle.color + alpha.toString(16).padStart(2, '0');
                ctx.fill();
            }
        }
    }
    
    /**
     * Utility function to convert hex color to RGB
     * @param {string} hex - Hex color string like '#FF0000'
     * @returns {string} RGB values as 'R,G,B'
     */
    _hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Parse to RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `${r},${g},${b}`;
    }
    
    /**
     * Draw the mouth based on tower type
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {number} centerX - X-coordinate of tower center
     * @param {number} centerY - Y-coordinate of tower center
     * @param {number} eyeOffset - Offset used for eyes
     * @param {number} eyeSize - Size of eyes
     */
    _drawMouth(ctx, centerX, centerY, eyeOffset, eyeSize) {
        switch (this.type) {
            case 'drums':
                // Simple smile
                ctx.beginPath();
                ctx.arc(centerX, centerY + eyeOffset / 2, eyeOffset, 0, Math.PI);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
                
            case 'bass':
                // Bass has a wider mouth
                ctx.beginPath();
                ctx.arc(centerX, centerY + eyeOffset / 2, eyeOffset * 1.2, 0, Math.PI);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
                
            case 'heavy_guitar':
                // Heavy guitar has an angry zigzag mouth
                ctx.beginPath();
                ctx.moveTo(centerX - eyeOffset, centerY + eyeOffset);
                
                for (let i = 0; i < 5; i++) {
                    const xPos = centerX - eyeOffset + (eyeOffset * 2) * i / 4;
                    const yPos = centerY + eyeOffset + (i % 2) * (eyeSize * 0.8);
                    ctx.lineTo(xPos, yPos);
                }
                
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 3;
                ctx.stroke();
                break;
                
            case 'wiggly_guitar':
                // Wiggly guitar has a wavy mouth
                ctx.beginPath();
                ctx.moveTo(centerX - eyeOffset, centerY + eyeOffset);
                
                for (let i = 0; i < 7; i++) {
                    const xPos = centerX - eyeOffset + (eyeOffset * 2) * i / 6;
                    const yPos = centerY + eyeOffset - (i % 2) * eyeSize;
                    ctx.lineTo(xPos, yPos);
                }
                
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
                
            case 'synth1':
                // Synth1 has an 'O' mouth like it's singing
                ctx.beginPath();
                ctx.arc(centerX, centerY + eyeOffset, eyeSize, 0, Math.PI * 2);
                ctx.fillStyle = 'black';
                ctx.fill();
                break;
                
            case 'synth2':
                // Synth2 has a zigzag mouth
                ctx.beginPath();
                ctx.moveTo(centerX - eyeOffset, centerY + eyeOffset);
                
                for (let i = 0; i < 5; i++) {
                    const xPos = centerX - eyeOffset + (eyeOffset * 2) * i / 4;
                    const yPos = centerY + eyeOffset + (i % 2) * eyeSize;
                    ctx.lineTo(xPos, yPos);
                }
                
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
                
            case 'synth_stabs':
                // Synth stabs has a straight line with tiny spikes
                ctx.beginPath();
                ctx.moveTo(centerX - eyeOffset, centerY + eyeOffset);
                ctx.lineTo(centerX + eyeOffset, centerY + eyeOffset);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Add tiny spikes
                for (let i = 0; i < 5; i++) {
                    const xPos = centerX - eyeOffset + (eyeOffset * 2) * i / 4;
                    ctx.beginPath();
                    ctx.moveTo(xPos, centerY + eyeOffset);
                    ctx.lineTo(xPos, centerY + eyeOffset - eyeSize / 2);
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                break;
        }
    }
    
    /**
     * Update tower state, find targets and attack
     * @param {Array} enemies - List of Enemy objects to target
     * @param {number} currentTime - Current game time in milliseconds
     * @param {AudioManager} audioManager - Reference to the audio manager
     * @returns {boolean} True if tower fired at an enemy
     */
    update(enemies, currentTime, audioManager) {
        // Reset active state
        const wasActive = this.active;
        this.active = false;
        
        // Register with audio manager if this is the first update
        if (!this.beatDivision && audioManager) {
            this.beatDivision = audioManager.getBeatDivisionForTower(this.type);
            
            // Scale damage based on beat division (slower = more powerful)
            switch (this.beatDivision) {
                case '1/1': // Whole notes (very slow)
                    this.damage = this.baseDamage * 3.0;
                    break;
                case '1/2': // Half notes
                    this.damage = this.baseDamage * 2.0;
                    break;
                case '1/4': // Quarter notes
                    this.damage = this.baseDamage * 1.0;
                    break;
                case '1/8': // Eighth notes (faster)
                    this.damage = this.baseDamage * 0.7;
                    break;
                case '1/16': // Sixteenth notes (fastest)
                    this.damage = this.baseDamage * 0.5;
                    break;
            }
            
            // Register beat callback for this tower
            audioManager.addBeatCallback(this.beatDivision, (beatCount) => {
                this.onBeat(beatCount);
            }, this.id);
        }
        
        // Update pulsating effect based on beat phase, if we have an audio manager
        if (audioManager && this.beatDivision) {
            const beatPhase = audioManager.getCurrentBeatPhase(this.beatDivision);
            
            // Pulse size varies from 0.8 to 1.2 based on beat phase
            this.pulseSize = 0.8 + beatPhase * 0.4;
            
            // Make it more dramatic if it's about to fire
            if (beatPhase > 0.8 && this.readyToFire) {
                this.pulseSize += 0.3;
            }
        } else {
            // Fallback if no audio manager
            this.pulseTime += 0.1;
            this.pulseSize = Math.sin(this.pulseTime) * 0.2 + 1.0;
        }
        
        // Update existing projectiles
        this.updateProjectiles();
        
        // Update particles
        this.updateParticles();
        
        // Find a potential target in range
        let potentialTarget = null;
        let closestDistance = Infinity;
        
        for (const enemy of enemies) {
            const distance = Math.sqrt(
                Math.pow(this.x - enemy.gridX, 2) + 
                Math.pow(this.y - enemy.gridY, 2)
            );
            
            if (distance <= this.range && distance < closestDistance) {
                potentialTarget = enemy;
                closestDistance = distance;
            }
        }
        
        // Store potential target for use when the beat happens
        this.target = potentialTarget;
        
        // Ready to fire if we have a target
        this.readyToFire = !!this.target;
        
        // Active if we have a target
        this.active = !!this.target;
        
        // Gradually decrease glowing
        if (this.glowing && currentTime - this.lastFireTime > 300) {
            this.glowing = false;
        }
        
        return false;
    }
    
    /**
     * Called when this tower's beat occurs
     * @param {number} beatCount - Current beat number
     */
    onBeat(beatCount) {
        // Fire at the target if we have one and are ready
        if (this.target && this.readyToFire) {
            // Special behavior for Synth Stabs tower - powerful attack every two measures (8 beats)
            if (this.type === 'synth_stabs' && beatCount % 2 === 0) {
                console.log("Synth Stabs tower firing powerful projectile!");
                // Fire with 3x damage for special attacks
                this.fire(this.target, 3.0);
                
                // Create additional visual effects for the powerful shot
                this.createPowerfulProjectileEffect();
            } else {
                this.fire(this.target);
            }
            
            this.readyToFire = false; // Reset after firing
        }
    }
    
    /**
     * Fire at an enemy
     * @param {Enemy} enemy - Target enemy
     * @param {number} damageMultiplier - Optional multiplier for damage (default: 1.0)
     */
    fire(enemy, damageMultiplier = 1.0) {
        this.lastFireTime = performance.now();
        const finalDamage = this.damage * damageMultiplier;
        enemy.takeDamage(finalDamage);
        this.active = true;
        
        // Create a projectile effect
        this.createProjectile(enemy, damageMultiplier > 1.0);
        
        // Create particles for visual effect
        this.createAttackParticles(damageMultiplier);
        
        // Start glowing
        this.glowing = true;
    }
    
    /**
     * Create a projectile effect from tower to enemy
     * @param {Enemy} enemy - Target enemy
     * @param {boolean} isPowerful - Whether this is a powerful projectile
     */
    createProjectile(enemy, isPowerful = false) {
        const [startX, startY] = this.getPosition();
        const endX = enemy.x;
        const endY = enemy.y;
        
        // Special properties for heavy guitar (faster projectiles)
        const isHeavyGuitar = this.type === 'heavy_guitar';
        const projectileSpeed = isHeavyGuitar ? 0.2 : 0.1; // Twice as fast for heavy guitar
        
        this.projectiles.push({
            startX,
            startY,
            endX,
            endY,
            progress: 0,
            color: this.color,
            enemy: enemy,
            isPowerful: isPowerful,
            isRapidFire: isHeavyGuitar,
            size: isPowerful ? 10 : (isHeavyGuitar ? 3 : 4), // Smaller for rapid fire
            speed: projectileSpeed // Custom speed property
        });
    }
    
    /**
     * Create a powerful special effect for synth stabs tower
     */
    createPowerfulProjectileEffect() {
        const [centerX, centerY] = this.getPosition();
        
        // Create a wave effect around the tower
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const distance = 20 + Math.random() * 10;
            
            this.particles.push({
                x: centerX + Math.cos(angle) * distance,
                y: centerY + Math.sin(angle) * distance,
                vx: Math.cos(angle) * 1.5,
                vy: Math.sin(angle) * 1.5,
                size: 8 + Math.random() * 5,
                color: this.color,
                life: 1.0,
                decay: 0.01 + Math.random() * 0.02
            });
        }
    }
    
    /**
     * Update all projectiles
     */
    updateProjectiles() {
        // Update existing projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Use custom speed if defined, otherwise default speed
            const speed = proj.speed || 0.1;
            proj.progress += speed;
            
            // Remove completed projectiles
            if (proj.progress >= 1.0) {
                this.projectiles.splice(i, 1);
                
                // Create impact particles
                this.createImpactParticles(proj.endX, proj.endY);
            }
        }
    }
    
    /**
     * Create particles when tower attacks
     * @param {number} multiplier - Effect multiplier (for powerful attacks)
     */
    createAttackParticles(multiplier = 1.0) {
        const [centerX, centerY] = this.getPosition();
        
        // More particles for stronger attacks
        const particleCount = Math.floor(8 * multiplier);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (1 + Math.random() * 2) * Math.sqrt(multiplier);
            const size = (3 + Math.random() * 5) * Math.sqrt(multiplier);
            
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: this.color,
                life: 1.0 * multiplier,
                decay: 0.02 + Math.random() * 0.05
            });
        }
    }
    
    /**
     * Create particles at impact location
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    createImpactParticles(x, y) {
        // Generate more particles for heavy guitar to make its rapid attacks more visible
        const isHeavyGuitar = this.type === 'heavy_guitar';
        const particleCount = isHeavyGuitar ? 8 : 12; // Fewer but faster particles for heavy guitar
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            // Faster particles for heavy guitar
            const speed = isHeavyGuitar 
                ? 1.0 + Math.random() * 2.0 
                : 0.5 + Math.random() * 1.5;
            
            // Smaller particles for heavy guitar (rapid fire)
            const size = isHeavyGuitar
                ? 1.5 + Math.random() * 2.5
                : 2 + Math.random() * 4;
            
            // Faster decay for heavy guitar particles
            const decay = isHeavyGuitar
                ? 0.05 + Math.random() * 0.08
                : 0.03 + Math.random() * 0.05;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: this.color,
                life: 1.0,
                decay: decay
            });
        }
    }
    
    /**
     * Update all particles
     */
    updateParticles() {
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Move the particle
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Apply slight gravity
            particle.vy += 0.05;
            
            // Reduce life
            particle.life -= particle.decay;
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * Upgrade the tower to the next level
     * @returns {boolean} True if upgrade was successful
     */
    upgrade() {
        if (this.level < this.maxLevel) {
            this.level += 1;
            
            // Improve tower stats
            this.damage *= 1.5;
            this.range *= 1.2;
            this.fireRate *= 1.2;
            
            return true;
        }
        return false;
    }
    
    /**
     * Get the pixel position of the tower center
     * @returns {Array} [x, y] in pixels
     */
    getPosition() {
        return [
            this.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
            this.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
        ];
    }
    
    /**
     * Calculate the cost to upgrade this tower
     * @returns {number} Cost to upgrade, or 0 if at max level
     */
    getUpgradeCost() {
        if (this.level < this.maxLevel) {
            const baseCost = CONFIG.TOWER_TYPES[this.type].cost;
            return Math.floor(baseCost * 0.8 * this.level);
        }
        return 0;
    }
}