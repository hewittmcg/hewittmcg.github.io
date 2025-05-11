import { CONFIG } from './config.js';
import { state, initializeState, updateState, getFormattedTaskChanges, updateSpeed } from './state.js';
import {
    initializeSVG,
    createTaskBars,
    createTaskLabels,
    createInterruptIndicators,
    createTimeMarkers,
    updateScales
} from './visualization.js';

const FIXED_TIME_SLICE = 1/120; // 120 FPS fixed time slice in seconds
const MAX_FRAME_TIME = 0.25; // Maximum time to process in a single frame (250ms)

/**
 * Initializes the visualization controls
 */
function initializeControls() {
    const playPauseBtn = document.getElementById('play-pause');
    const restartBtn = document.getElementById('restart');
    const speedInput = document.getElementById('speed');
    const speedValue = document.getElementById('speed-value');
    const canIntervalInput = document.getElementById('can-interval');
    const canDurationInput = document.getElementById('can-duration');
    const canParsingDurationInput = document.getElementById('can-parsing-duration');
    const applyCanBtn = document.getElementById('apply-can');

    if (!playPauseBtn || !restartBtn || !speedInput || !speedValue || !canIntervalInput || !canDurationInput || !canParsingDurationInput || !applyCanBtn) {
        console.warn('Some controls are missing');
        return;
    }

    // Initialize speed value
    const initialSpeed = parseFloat(speedInput.value);
    updateSpeed(initialSpeed);
    speedValue.textContent = `${initialSpeed}x`;

    // Initialize CAN parameters
    state.canParams.meanInterval = parseFloat(canIntervalInput.value);
    state.canParams.duration = parseFloat(canDurationInput.value);
    state.canParams.parsingDuration = parseFloat(canParsingDurationInput.value);

    // Store temporary values for CAN parameters
    let tempCanParams = {
        meanInterval: state.canParams.meanInterval,
        duration: state.canParams.duration,
        parsingDuration: state.canParams.parsingDuration
    };

    playPauseBtn.addEventListener('click', () => {
        state.isPlaying = !state.isPlaying;
        playPauseBtn.textContent = state.isPlaying ? 'Pause' : 'Play';
        if (state.isPlaying) {
            state.lastUpdateTime = performance.now();
            requestAnimationFrame(updateVisualization);
        }
    });

    restartBtn.addEventListener('click', () => {
        state.window.start = 0;
        state.window.end = CONFIG.window.size;
        state.interrupts = [];
        state.taskChanges = [];
        initializeState();
        state.isPlaying = true;
        playPauseBtn.textContent = 'Pause';
        state.lastUpdateTime = performance.now();
        requestAnimationFrame(updateVisualization);
    });

    speedInput.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        updateSpeed(speed);
        speedValue.textContent = `${speed}x`;
    });

    canIntervalInput.addEventListener('input', (e) => {
        tempCanParams.meanInterval = parseFloat(e.target.value);
    });

    canDurationInput.addEventListener('input', (e) => {
        tempCanParams.duration = parseFloat(e.target.value);
    });

    canParsingDurationInput.addEventListener('input', (e) => {
        tempCanParams.parsingDuration = parseFloat(e.target.value);
    });

    applyCanBtn.addEventListener('click', () => {
        state.canParams.meanInterval = tempCanParams.meanInterval;
        state.canParams.duration = tempCanParams.duration;
        state.canParams.parsingDuration = tempCanParams.parsingDuration;
        // Visual feedback for the button
        applyCanBtn.style.backgroundColor = '#28a745';
        setTimeout(() => {
            applyCanBtn.style.backgroundColor = '#007bff';
        }, 200);
    });
}

/**
 * Main visualization update loop
 */
function updateVisualization() {
    if (!state.isPlaying) return;
    
    const currentTime = performance.now();
    const elapsedTime = (currentTime - state.lastUpdateTime) / 1000; // Convert to seconds
    state.lastUpdateTime = currentTime;
    
    // Cap the maximum time we'll process in a single frame to prevent huge jumps
    const timeToProcess = Math.min(elapsedTime, MAX_FRAME_TIME);
    
    // Calculate how many time slices we need to process
    const numSlices = Math.floor(timeToProcess / FIXED_TIME_SLICE);
    
    // Process each time slice
    for (let i = 0; i < numSlices; i++) {
        updateState(FIXED_TIME_SLICE);
    }
    
    // If we still have time to process, schedule another frame immediately
    if (timeToProcess >= MAX_FRAME_TIME) {
        requestAnimationFrame(updateVisualization);
    } else {
        // Update visualization
        const formattedTaskChanges = getFormattedTaskChanges();
        createTaskBars(formattedTaskChanges);
        createTaskLabels();
        createInterruptIndicators();
        createTimeMarkers();
        
        // Schedule next frame
        requestAnimationFrame(updateVisualization);
    }
}

// Initialize everything
initializeSVG();
initializeState();
initializeControls();
window.addEventListener('resize', updateScales);
requestAnimationFrame(updateVisualization); 