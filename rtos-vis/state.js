import { CONFIG } from './config.js';

/**
 * Global state for the visualization
 */
export const state = {
    taskChanges: [],  // List of all task state changes with timestamps
    interrupts: [],   // List of all interrupts
    pendingInterrupts: 0, // Number of pending interrupts
    pendingParsingMessages: 0, // Number of CAN messages waiting to be parsed
    window: {
        start: 0,
        end: 0
    },
    taskBars: [],
    lastUpdateTime: 0,
    isPlaying: true,
    timeScale: 800 / CONFIG.window.size,
    speed: CONFIG.window.advanceRate,
    canParams: {
        meanInterval: 3.0,
        duration: 1.0,
        parsingDuration: 0.5
    },
    parsingStartTime: 0 // Track when CAN parsing task started
};

/**
 * Initialize the visualization state
 */
export function initializeState() {
    // Reset window bounds
    state.window.start = 0;
    state.window.end = 0;
    
    // Add initial IDLE task
    state.taskChanges = [{
        task: "IDLE",
        time: state.window.start
    }];
    
    // Clear interrupts and messages
    state.interrupts = [];
    state.pendingInterrupts = 0;
    state.pendingParsingMessages = 0;
    state.parsingStartTime = 0;
    state.lastUpdateTime = performance.now();
}

/**
 * Update the simulation state
 * @param {number} deltaTime - Time elapsed since last update in seconds
 */
export function updateState(deltaTime) {
    if (!state.isPlaying) return;
    
    // Grow the window if it's not already the full size    
    state.window.end += deltaTime * state.speed;
    if (state.window.end > state.window.start + CONFIG.window.size) {
        state.window.start = state.window.end - CONFIG.window.size;
    }
            
    // Modify taskChanges to remove completed tasks
    if (state.taskChanges.length > 1 && state.taskChanges[1].time < state.window.start) {
        state.taskChanges[1].time = state.window.start;
        state.taskChanges.shift();
    }
    
    state.interrupts = state.interrupts.filter(time => time >= state.window.start);
    
    // Generate a new interrupt
    const meanInterval = state.canParams.meanInterval;
    const stdDev = meanInterval * 0.2;
    
    // Check if we should generate a new interrupt based on the last one
    const lastInterrupt = state.interrupts.length > 0 ? state.interrupts[state.interrupts.length - 1] : 0;
    const timeSinceLastInterrupt = state.window.end - lastInterrupt;
    
    // Generate a random interval using Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const randomInterval = meanInterval + (z * stdDev);
    
    if (timeSinceLastInterrupt >= randomInterval) {
        const newInterruptTime = state.window.end;
        state.interrupts = [...state.interrupts, newInterruptTime];
        state.pendingInterrupts++;
    }

    // Update task state based on current conditions
    const currentTask = state.taskChanges[state.taskChanges.length - 1];
    
    // Check for interrupt preemption first
    if (state.pendingInterrupts > 0 && currentTask.task === "CAN parsing") {
        // Preempt CAN parsing task with CAN rx task
        state.pendingInterrupts--;
        state.taskChanges.push({
            task: "CAN rx",
            time: state.window.end
        });
        return;
    }
    
    if (currentTask.task === "IDLE") {
        if (state.pendingInterrupts > 0) {  
            state.pendingInterrupts--;
            state.taskChanges.push({
                task: "CAN rx",
                time: state.window.end
            });
        } else if (state.pendingParsingMessages > 0) {
            state.taskChanges.push({
                task: "CAN parsing",
                time: state.window.end
            });
            state.parsingStartTime = state.window.end;
        }   
    } else if (currentTask.task === "CAN rx") {
        if (currentTask.time + state.canParams.duration < state.window.end) {
            // When CAN rx completes, increment pending parsing messages
            state.pendingParsingMessages++;
            if (state.pendingInterrupts > 0) {
                state.pendingInterrupts--;
                state.taskChanges.push({
                    task: "CAN rx",
                    time: state.window.end
                });
            } else {
                state.taskChanges.push({
                    task: "CAN parsing",
                    time: state.window.end
                });
                state.parsingStartTime = state.window.end;
            }
        }
    } else if (currentTask.task === "CAN parsing") {
        const parsingTime = state.window.end - state.parsingStartTime;
        if (parsingTime >= state.canParams.parsingDuration) {
            // When parsing duration is complete, decrement pending messages
            state.pendingParsingMessages--;
            if (state.pendingParsingMessages > 0) {
                // If more messages to parse, continue parsing
                state.taskChanges.push({
                    task: "CAN parsing",
                    time: state.window.end
                });
                state.parsingStartTime = state.window.end;
            } else if (state.pendingInterrupts > 0) {
                // If no more messages to parse but interrupts pending, switch to CAN rx
                state.pendingInterrupts--;
                state.taskChanges.push({
                    task: "CAN rx",
                    time: state.window.end
                });
            } else {
                // If no more work to do, go to IDLE
                state.taskChanges.push({
                    task: "IDLE",
                    time: state.window.end
                });
            }
        }
    }
}

/**
 * Format task changes to include duration
 * @returns {Array<Object>} Formatted task changes with durations
 */
export function getFormattedTaskChanges() {
    return state.taskChanges.map((change, index) => {
        const nextChange = state.taskChanges[index + 1];
        const duration = nextChange ? nextChange.time - change.time : state.window.end - change.time;
        return { 
            ...change, 
            duration: Math.max(0, duration)
        };
    });
}

/**
 * Update the simulation speed
 * @param {number} speed - New speed value
 */
export function updateSpeed(speed) {
    state.speed = speed;
} 