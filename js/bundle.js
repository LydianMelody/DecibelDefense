/**
 * Configuration settings for Decibel Defense
 */
const CONFIG = {
    // Game dimensions
    SCREEN_WIDTH: 800,
    SCREEN_HEIGHT: 600,
    TILE_SIZE: 40,
    GRID_WIDTH: 20,
    GRID_HEIGHT: 15,
    FPS: 60,
    
    // Path for enemies
    PATH: [
        [0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], 
        [6, 6], [6, 5], [6, 4], [6, 3], 
        [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],
        [11, 4], [11, 5], [11, 6], [11, 7], [11, 8], [11, 9],
        [12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9], [19, 9]
    ],
    
    // Endpoint (base to defend)
    get ENDPOINT() {
        return this.PATH[this.PATH.length - 1];
    },
    
    // Game settings
    STARTING_MONEY: 999999, // Infinite money for testing
    STARTING_LIVES: 10,
    
    // Tower types
    TOWER_TYPES: {
        'drums': {
            color: '#FF0000',
            range: 2,
            damage: 10,
            fireRate: 1.0, // attacks per second
            cost: 100,
            sound: 'drums',
            description: 'Fast attack rate, moderate damage'
        },
        'bass': {
            color: '#0000FF',
            range: 3,
            damage: 15,
            fireRate: 0.5,
            cost: 150,
            sound: 'bass',
            description: 'Medium range, good damage'
        },
        'heavy_guitar': {
            color: '#FFFF00',
            range: 4,
            damage: 10,  // Reduced to half
            fireRate: 1.5,  // Doubled fire rate
            cost: 200,
            sound: 'heavy_guitar',
            description: 'Long range, rapid-fire attacks'
        },
        'wiggly_guitar': {
            color: '#800080',
            range: 5,
            damage: 25,
            fireRate: 0.5,
            cost: 250,
            sound: 'wiggly_guitar',
            description: 'Very long range, very high damage'
        },
        'synth1': {
            color: '#00FF7F',
            range: 4,
            damage: 30,
            fireRate: 0.4,
            cost: 300,
            sound: 'synth1',
            description: 'High damage, slow fire rate'
        },
        'synth2': {
            color: '#FF7F00',
            range: 3,
            damage: 18,
            fireRate: 0.6,
            cost: 225,
            sound: 'synth2',
            description: 'Special effects, area damage'
        },
        'synth_stabs': {
            color: '#00C8C8',
            range: 6,
            damage: 15,  // Increased base damage
            fireRate: 0.3,
            cost: 275,
            sound: 'synth_stabs',
            description: 'Very long range with powerful attacks every 2 measures'
        }
    },
    
    // Audio settings
    SOUND_MAPPINGS: {
        'drums': {
            file: 'Stage1/Drums.wav',
            type: 'music'
        },
        'bass': {
            file: 'Stage1/Bass.wav',
            type: 'music'
        },
        'heavy_guitar': {
            file: 'Stage1/HeavyGuitar.wav',
            type: 'music'
        },
        'wiggly_guitar': {
            file: 'Stage1/WigglyGuitar.wav',
            type: 'music'
        },
        'synth1': {
            file: 'Stage1/Synth1.wav',
            type: 'music'
        },
        'synth2': {
            file: 'Stage1/Synth2.wav',
            type: 'music'
        },
        'synth_stabs': {
            file: 'Stage1/SynthStabs.wav',
            type: 'music'
        }
    }
};/**
 * Audio Manager for Decibel Defense
 * Handles loading, playing, and synchronizing audio
 */
class AudioManager {
    constructor() {
        this.sounds = {};
        this.activeSounds = {};
        this.masterVolume = 0.7;
        this.loaded = false;
        this.debug = true;
        this.hasStartedAudio = false; // Track if audio has been started (only after first tower)
        
        // Music timing information
        this.bpm = 75;  // Beats per minute
        this.beatsPerBar = 4; // 4/4 time signature
        this.startTime = 0;
        this.beatDuration = 60 / this.bpm; // Duration of one beat in seconds
        this.barDuration = this.beatDuration * this.beatsPerBar; // Duration of one bar
        
        // For rhythm callbacks
        this.beatCallbacks = {
            '1/1': [], // Whole notes (every 4 beats in 4/4)
            '1/2': [], // Half notes (every 2 beats in 4/4)
            '1/4': [], // Quarter notes (every beat in 4/4)
            '1/8': [], // Eighth notes (twice per beat)
            '1/16': [] // Sixteenth notes (four times per beat)
        };
        
        // Last processed beat times for callbacks
        this.lastProcessedBeatTime = {
            '1/1': 0,
            '1/2': 0,
            '1/4': 0,
            '1/8': 0,
            '1/16': 0
        };
    }
    
    /**
     * Load all sound files defined in CONFIG.SOUND_MAPPINGS
     * @returns {Promise} Promise that resolves when all sounds are loaded
     */
    loadSounds() {
        if (this.loaded) return Promise.resolve();
        
        this.log('Loading sounds...');
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        
        const soundPromises = [];
        
        // Create gain node for master volume
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.masterVolume;
        this.masterGain.connect(this.audioContext.destination);
        
        // Process each sound in the mappings
        for (const [soundKey, soundConfig] of Object.entries(CONFIG.SOUND_MAPPINGS)) {
            const filePath = `assets/sounds/${soundConfig.file}`;
            
            // Create an object to store sound info
            this.sounds[soundKey] = {
                buffer: null,
                source: null,
                gainNode: null,
                active: false,
                playing: false,
                type: soundConfig.type,
                path: filePath
            };
            
            // Create gain node for this sound
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0; // Start muted
            gainNode.connect(this.masterGain);
            this.sounds[soundKey].gainNode = gainNode;
            
            // Load the sound file
            const promise = fetch(filePath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load sound: ${filePath}`);
                    }
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    this.sounds[soundKey].buffer = audioBuffer;
                    this.log(`Loaded sound: ${soundKey}`);
                })
                .catch(error => {
                    console.error(`Error loading sound ${soundKey}:`, error);
                });
            
            soundPromises.push(promise);
        }
        
        return Promise.all(soundPromises)
            .then(() => {
                this.loaded = true;
                this.log('All sounds loaded successfully');
            })
            .catch(error => {
                console.error('Error loading sounds:', error);
            });
    }
    
    /**
     * Start playing all music tracks at volume 0 (muted)
     * This keeps them perfectly in sync
     */
    startAllTracks() {
        if (!this.loaded) {
            console.warn('Cannot start tracks - sounds not loaded');
            return;
        }
        
        // Check if we should actually start the tracks now
        if (this.allTracksStarted()) {
            this.log('Tracks already started, not starting again');
            return; // Already started, don't start again
        }
        
        this.log('Starting all music tracks (muted)');
        
        // Force resume audio context - very important for browsers
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                this.log('AudioContext resumed successfully');
                this._startTracks();
            }).catch(err => {
                console.error('Failed to resume AudioContext:', err);
            });
        } else {
            this._startTracks();
        }
    }
    
    /**
     * Internal method to actually start the tracks
     * @private
     */
    _startTracks() {
        // Start all music tracks
        for (const [soundKey, sound] of Object.entries(this.sounds)) {
            if (sound.type !== 'music') continue;
            
            // Skip if already playing
            if (sound.playing) continue;
            
            try {
                // Create a new source
                const source = this.audioContext.createBufferSource();
                source.buffer = sound.buffer;
                source.loop = true;
                
                // Connect to gain node (which is already connected to master)
                source.connect(sound.gainNode);
                
                // Start the source
                source.start();
                
                // Store the source
                sound.source = source;
                sound.playing = true;
                
                this.log(`Started ${soundKey} (muted)`);
            } catch (error) {
                console.error(`Error starting sound ${soundKey}:`, error);
            }
        }
    }
    
    /**
     * Update audio based on which towers are active
     * @param {Array} towers - Array of active towers
     */
    update(towers) {
        if (!this.loaded) return;
        
        // Check if we have towers and should start audio
        const hadNoTowersBefore = !this.hasStartedAudio;
        const hasTowersNow = towers.length > 0;
        
        // Only start audio if we now have towers and didn't before
        if (hasTowersNow && hadNoTowersBefore) {
            this.log('First tower placed! Starting audio now');
            // Set flag to track that we've started audio
            this.hasStartedAudio = true;
            // Actually start the tracks
            this.startAllTracks();
        }
        
        // Don't continue processing audio if we don't have audio running yet
        if (!this.hasStartedAudio) {
            return;
        }
        
        // Make sure audio context is running
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                this.log('AudioContext resumed in update');
            });
        }
        
        // Get active sound keys from towers
        const activeSoundKeys = new Set();
        for (const tower of towers) {
            if (tower.soundKey) {
                activeSoundKeys.add(tower.soundKey);
            }
        }
        
        // Update each sound's volume based on whether it should be active
        for (const [soundKey, sound] of Object.entries(this.sounds)) {
            if (sound.type !== 'music') continue;
            
            const shouldBeActive = activeSoundKeys.has(soundKey);
            
            // If active state has changed
            if (shouldBeActive !== sound.active) {
                sound.active = shouldBeActive;
                
                // Target gain value
                const targetGain = shouldBeActive ? 0.5 : 0;
                
                // Smoothly adjust volume
                this.setGain(sound.gainNode.gain, targetGain, 0.1);
                
                if (shouldBeActive) {
                    this.log(`Unmuted ${soundKey}`);
                } else {
                    this.log(`Muted ${soundKey}`);
                }
            }
        }
    }
    
    /**
     * Helper to smoothly set gain value
     * @param {AudioParam} gainParam - The gain parameter to adjust
     * @param {number} value - Target value
     * @param {number} timeConstant - Time constant for exponential approach
     */
    setGain(gainParam, value, timeConstant = 0.1) {
        const currentTime = this.audioContext.currentTime;
        gainParam.setTargetAtTime(value, currentTime, timeConstant);
    }
    
    /**
     * Check if all music tracks have been started
     * @returns {boolean} True if all tracks started
     */
    allTracksStarted() {
        for (const sound of Object.values(this.sounds)) {
            if (sound.type === 'music' && !sound.playing) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Reset all sounds (mute everything)
     */
    reset() {
        if (!this.loaded) return;
        
        // Reset the started audio flag
        this.hasStartedAudio = false;
        
        for (const [soundKey, sound] of Object.entries(this.sounds)) {
            if (sound.type !== 'music') continue;
            
            // Mute this sound
            this.setGain(sound.gainNode.gain, 0, 0.1);
            sound.active = false;
            
            // Stop the sound if it's playing
            if (sound.source && sound.playing) {
                try {
                    sound.source.stop();
                    sound.playing = false;
                } catch (e) {
                    console.error("Error stopping sound:", e);
                }
            }
        }
        
        this.log('Audio system reset - will restart when a tower is placed');
    }
    
    /**
     * Utility for logging with debug mode
     * @param {string} message - Message to log
     */
    log(message) {
        if (this.debug) {
            console.log(`[AudioManager] ${message}`);
        }
    }
    
    /**
     * Notification for wave start
     */
    onWaveStart() {
        // Could add a sound effect here
    }
    
    /**
     * Notification for enemy death
     */
    onEnemyDie() {
        // Could add a sound effect here
    }
    
    /**
     * Notification for tower placement
     */
    onTowerPlace() {
        // Resume audio context if needed (user interaction)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    /**
     * Notification for game over
     */
    onGameOver() {
        this.reset();
    }
    
    /**
     * Register a callback to be called on specific note divisions
     * @param {string} division - The rhythm division ('1/1', '1/2', '1/4', '1/8', '1/16')
     * @param {Function} callback - The function to call on each beat
     * @param {string} id - Unique identifier for this callback (usually the tower id)
     */
    addBeatCallback(division, callback, id) {
        if (!this.beatCallbacks[division]) {
            console.warn(`Invalid beat division: ${division}`);
            return;
        }
        
        // Remove any existing callback with this ID first
        this.removeBeatCallback(id);
        
        // Add the new callback
        this.beatCallbacks[division].push({
            id: id,
            callback: callback
        });
        
        this.log(`Added ${division} beat callback for ${id}`);
    }
    
    /**
     * Remove a beat callback by id
     * @param {string} id - The id of the callback to remove
     */
    removeBeatCallback(id) {
        for (const division in this.beatCallbacks) {
            this.beatCallbacks[division] = this.beatCallbacks[division].filter(item => item.id !== id);
        }
    }
    
    /**
     * Process beat callbacks based on current time
     * Called regularly from the game loop
     */
    processBeatCallbacks() {
        if (!this.loaded || !this.audioContext || !this.hasStartedAudio) return;
        
        // Only process if we have a valid start time
        if (this.startTime === 0) {
            if (this.audioContext.state === 'running') {
                this.startTime = this.audioContext.currentTime;
                this.log('Music timing system initialized');
            } else {
                return;
            }
        }
        
        // Calculate elapsed time and current beat positions
        const currentTime = this.audioContext.currentTime;
        const elapsedTime = currentTime - this.startTime;
        
        // Get current bar and beat
        const currentBar = Math.floor(elapsedTime / this.barDuration);
        const currentBeat = Math.floor((elapsedTime % this.barDuration) / this.beatDuration);
        
        // Calculate positions for each division
        this.processNoteDivision('1/1', elapsedTime, this.barDuration);        // Whole notes
        this.processNoteDivision('1/2', elapsedTime, this.barDuration / 2);    // Half notes
        this.processNoteDivision('1/4', elapsedTime, this.beatDuration);       // Quarter notes
        this.processNoteDivision('1/8', elapsedTime, this.beatDuration / 2);   // Eighth notes
        this.processNoteDivision('1/16', elapsedTime, this.beatDuration / 4);  // Sixteenth notes
    }
    
    /**
     * Process callbacks for a specific note division
     * @param {string} division - The note division to process
     * @param {number} elapsedTime - Elapsed time in seconds
     * @param {number} divisionDuration - Duration of this division in seconds
     * @private
     */
    processNoteDivision(division, elapsedTime, divisionDuration) {
        // Calculate current division number
        const currentDivision = Math.floor(elapsedTime / divisionDuration);
        
        // Check if we've already processed this division
        if (currentDivision > this.lastProcessedBeatTime[division]) {
            // Update last processed time
            this.lastProcessedBeatTime[division] = currentDivision;
            
            // Call all callbacks for this division
            for (const callbackObj of this.beatCallbacks[division]) {
                callbackObj.callback(currentDivision);
            }
        }
    }
    
    /**
     * Get the beat division for a tower type
     * @param {string} towerType - The type of tower
     * @returns {string} Beat division ('1/4', '1/8', etc.)
     */
    getBeatDivisionForTower(towerType) {
        const divisions = {
            'drums': '1/4',       // Quarter notes (steady beat)
            'bass': '1/2',        // Half notes (slower, foundational)
            'heavy_guitar': '1/16', // 16th notes (very fast rhythm)
            'wiggly_guitar': '1/4', // Quarter notes
            'synth1': '1/2',      // Half notes (slow, sustained sounds)
            'synth2': '1/4',      // Quarter notes
            'synth_stabs': '1/1'  // Whole notes (very slow, dramatic hits)
        };
        
        return divisions[towerType] || '1/4'; // Default to quarter notes
    }
    
    /**
     * Get the current beat phase (0-1) for a specific division
     * @param {string} division - The beat division to check
     * @returns {number} Phase from 0-1 (0=start of beat, 1=end of beat)
     */
    getCurrentBeatPhase(division) {
        if (!this.loaded || !this.audioContext || this.startTime === 0) {
            return 0;
        }
        
        const elapsedTime = this.audioContext.currentTime - this.startTime;
        let divisionDuration;
        
        // Calculate the duration of this division
        switch (division) {
            case '1/1': divisionDuration = this.barDuration; break;
            case '1/2': divisionDuration = this.barDuration / 2; break;
            case '1/4': divisionDuration = this.beatDuration; break;
            case '1/8': divisionDuration = this.beatDuration / 2; break;
            case '1/16': divisionDuration = this.beatDuration / 4; break;
            default: divisionDuration = this.beatDuration; break;
        }
        
        // Return phase within the current division (0-1)
        return (elapsedTime % divisionDuration) / divisionDuration;
    }
}/**
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
}/**
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
}/**
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
        
        // Draw version text in top-left corner with improved visibility
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // Increased opacity for better visibility
        this.ctx.font = 'bold 14px Arial'; // Make text bold and slightly larger
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Pre-Alpha Version 0.2.0', 10, 20);
        
        // Draw a darker outline for better contrast
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeText('Pre-Alpha Version 0.2.0', 10, 20);
        
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
        
        // Create subtle color pulse based on active towers
        const pulse = Math.sin(this.frameCounter * 0.05) * 0.5 + 0.5;
        
        // Each tower type contributes a color
        let r = 0, g = 0, b = 0;
        let activeTowerCount = 0;
        
        for (const tower of this.towers) {
            if (tower.active) {
                activeTowerCount++;
                
                // Convert tower color to RGB and add to color mix
                let colorRgb = this._hexToRgb(tower.color);
                r += colorRgb.r / 255;
                g += colorRgb.g / 255;
                b += colorRgb.b / 255;
            }
        }
        
        // Normalize and scale down
        if (activeTowerCount > 0) {
            r = (r / activeTowerCount) * 0.25 * pulse;
            g = (g / activeTowerCount) * 0.25 * pulse;
            b = (b / activeTowerCount) * 0.25 * pulse;
        }
        
        // Calculate the center of the game grid
        // Using standard grid coordinates since canvas is already scaled
        const gridCenterX = CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE / 2;
        const gridCenterY = CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE / 2;
        
        const gradient = this.ctx.createRadialGradient(
            gridCenterX, gridCenterY, 0,
            gridCenterX, gridCenterY, CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE
        );
        
        gradient.addColorStop(0, `rgba(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)}, 0.5)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw rhythmic pulse waves from towers
        this.drawTowerPulses();
    }
    
    /**
     * Draw visual rhythm grid in the background
     */
    drawRhythmGrid() {
        // Create a pulsating pattern that follows 75 BPM
        const bpm = 75;
        const beatsPerSecond = bpm / 60;
        const beatDuration = 1 / beatsPerSecond;
        
        // Calculate current beat position
        const elapsedTime = this.frameCounter / 60; // Approximate seconds
        const beatPosition = (elapsedTime % beatDuration) / beatDuration;
        
        // Ensure dotSize is always positive by using absolute value
        const dotSizeBase = 1.5; // Base size
        const dotSizeVariation = 1.0; // Amount it can pulse
        const dotSize = Math.max(0.5, dotSizeBase + Math.sin(beatPosition * Math.PI * 2) * dotSizeVariation);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        
        // Draw dots only within the game grid area - with proper grid scaling
        const gridWidth = CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE;
        const gridHeight = CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE;
        const spacing = CONFIG.TILE_SIZE;
        
        // Draw dots aligned with the grid cells
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
                // Calculate dot position at cell center - no offsets in new scaling system
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
        
        // Add a green grid overlay to match the screenshot
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.15)';
        this.ctx.lineWidth = 1;
        
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
                    // Draw subtly animated grid cells
                    const beatPhase = (this.frameCounter / 120 + (x + y) / 10) % 1;
                    const beatIntensity = Math.sin(beatPhase * Math.PI * 2) * 0.05 + 0.05;
                    
                    // Draw a grid cell with subtle illumination and green tint
                    this.ctx.fillStyle = `rgba(20, 40, 30, ${beatIntensity})`;
                    this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
                }
                
                // Draw grid lines with green tint to match the screenshot
                this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.15)';
                this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            }
        }
        
        // Highlight possible placement cells when a tower is selected
        if (this.selectedTowerType) {
            this._highlightValidPlacements(0, 0);
        }
    }
    
    /**
     * Draw the path with glow effect
     * @param {number} offsetX - X offset for centering
     * @param {number} offsetY - Y offset for centering
     * @private
     */
    _drawPath(offsetX, offsetY) {
        const pathPoints = [];
        
        // Collect path points with the correct offset
        for (const [x, y] of CONFIG.PATH) {
            const centerX = offsetX + x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            const centerY = offsetY + y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
            pathPoints.push({ x: centerX, y: centerY });
        }
        
        // Draw glowing path
        this.ctx.save();
        
        // Draw path base
        this.ctx.beginPath();
        this.ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        
        for (let i = 1; i < pathPoints.length; i++) {
            this.ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        }
        
        this.ctx.lineWidth = CONFIG.TILE_SIZE * 0.6;
        this.ctx.strokeStyle = 'rgba(60, 60, 70, 0.7)';
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();
        
        // Draw path glow
        this.ctx.beginPath();
        this.ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        
        for (let i = 1; i < pathPoints.length; i++) {
            this.ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        }
        
        this.ctx.lineWidth = CONFIG.TILE_SIZE * 0.5;
        
        // Create animated gradient
        const gradient = this.ctx.createLinearGradient(
            pathPoints[0].x, pathPoints[0].y,
            pathPoints[pathPoints.length - 1].x, pathPoints[pathPoints.length - 1].y
        );
        
        // Animate the gradient based on frame counter
        const offset = (this.frameCounter % 120) / 120;
        
        gradient.addColorStop((0 + offset) % 1, 'rgba(100, 100, 140, 0.2)');
        gradient.addColorStop((0.25 + offset) % 1, 'rgba(70, 70, 100, 0.5)');
        gradient.addColorStop((0.5 + offset) % 1, 'rgba(100, 100, 140, 0.2)');
        gradient.addColorStop((0.75 + offset) % 1, 'rgba(70, 70, 100, 0.5)');
        gradient.addColorStop((1 + offset) % 1, 'rgba(100, 100, 140, 0.2)');
        
        this.ctx.strokeStyle = gradient;
        this.ctx.stroke();
        
        // Draw start point (entry)
        const startX = pathPoints[0].x;
        const startY = pathPoints[0].y;
        
        this.ctx.beginPath();
        this.ctx.arc(startX, startY, CONFIG.TILE_SIZE * 0.4, 0, Math.PI * 2);
        
        const startGradient = this.ctx.createRadialGradient(
            startX, startY, 0,
            startX, startY, CONFIG.TILE_SIZE * 0.4
        );
        
        startGradient.addColorStop(0, 'rgba(0, 255, 0, 0.7)');
        startGradient.addColorStop(1, 'rgba(0, 100, 0, 0.3)');
        
        this.ctx.fillStyle = startGradient;
        this.ctx.fill();
        
        // Draw endpoint (base to defend)
        const endX = pathPoints[pathPoints.length - 1].x;
        const endY = pathPoints[pathPoints.length - 1].y;
        
        this.ctx.beginPath();
        this.ctx.arc(endX, endY, CONFIG.TILE_SIZE * 0.4, 0, Math.PI * 2);
        
        const endGradient = this.ctx.createRadialGradient(
            endX, endY, 0,
            endX, endY, CONFIG.TILE_SIZE * 0.4
        );
        
        endGradient.addColorStop(0, 'rgba(255, 0, 0, 0.7)');
        endGradient.addColorStop(1, 'rgba(100, 0, 0, 0.3)');
        
        this.ctx.fillStyle = endGradient;
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
                
                enemy.color = '#FF00FF'; // Bright magenta for high visibility
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
}/**
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
        
        // Add version to wave display
        this.waveElement.title = "Pre-Alpha Version 0.2.0";
        
        // Update pause button
        this.updatePauseButton();
        
        // Screen visibility is now handled in main.js
    }
}/**
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