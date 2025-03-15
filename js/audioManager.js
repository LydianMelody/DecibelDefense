/**
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
}