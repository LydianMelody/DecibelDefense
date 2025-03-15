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
    
    // Tower types - pastel colors for cute softgirl aesthetic
    TOWER_TYPES: {
        'drums': {
            color: '#FFB6C1', // Pastel pink
            range: 2,
            damage: 10,
            fireRate: 1.0, // attacks per second
            cost: 100,
            sound: 'drums',
            description: 'Fast attack rate, moderate damage'
        },
        'bass': {
            color: '#B6DCFF', // Pastel blue
            range: 3,
            damage: 15,
            fireRate: 0.5,
            cost: 150,
            sound: 'bass',
            description: 'Medium range, good damage'
        },
        'heavy_guitar': {
            color: '#FFFFC2', // Pastel yellow
            range: 4,
            damage: 10,  // Reduced to half
            fireRate: 1.5,  // Doubled fire rate
            cost: 200,
            sound: 'heavy_guitar',
            description: 'Long range, rapid-fire attacks'
        },
        'wiggly_guitar': {
            color: '#E1C4FF', // Pastel purple
            range: 5,
            damage: 25,
            fireRate: 0.5,
            cost: 250,
            sound: 'wiggly_guitar',
            description: 'Very long range, very high damage'
        },
        'synth1': {
            color: '#C1FFD7', // Pastel mint
            range: 4,
            damage: 30,
            fireRate: 0.4,
            cost: 300,
            sound: 'synth1',
            description: 'High damage, slow fire rate'
        },
        'synth2': {
            color: '#FFD8B6', // Pastel orange
            range: 3,
            damage: 18,
            fireRate: 0.6,
            cost: 225,
            sound: 'synth2',
            description: 'Special effects, area damage'
        },
        'synth_stabs': {
            color: '#B6FFFD', // Pastel cyan
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
};