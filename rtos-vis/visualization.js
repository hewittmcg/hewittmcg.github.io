import { CONFIG } from './config.js';
import { state } from './state.js';

let svg;

/**
 * Initialize the SVG container and setup
 */
export function initializeSVG() {
    const container = document.getElementById('visualization');
    if (!container) {
        throw new Error('Visualization container not found');
    }

    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 800 350');
    container.appendChild(svg);

    return svg;
}

/**
 * Creates task bars for the visualization
 * @param {Array<Object>} transitions - Array of task transitions with time and duration
 * @returns {Array<SVGRectElement>} Array of task bar elements
 */
export function createTaskBars(transitions) {
    // Clear existing bars
    state.taskBars.forEach(bar => bar.remove());
    state.taskBars = [];
    
    // Filter transitions to only include those visible in the current window
    const visibleTransitions = transitions.filter(({ time, duration }) => {
        const endTime = time + duration;
        return endTime > state.window.start && time < state.window.end;
    });
    
    // Create new task bars
    visibleTransitions.forEach(({ task, time, duration }, index) => {
        let rect;
        
        // Calculate visible portion of the task
        const visibleStart = Math.max(time, state.window.start);
        const visibleEnd = Math.min(time + duration, state.window.end);
        const visibleDuration = visibleEnd - visibleStart;
        
        // Create new bar if needed
        if (!state.taskBars[index]) {
            rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute('y', CONFIG.tasks[task].yPosition);
            rect.setAttribute('height', CONFIG.dimensions.taskHeight.toString());
            rect.setAttribute('fill', CONFIG.tasks[task].color);
            rect.setAttribute('data-task', task);
            svg.appendChild(rect);
            
            // Add hover effects to new bar
            addHoverEffects(rect);
            
            state.taskBars[index] = rect;
        } else {
            rect = state.taskBars[index];
        }
        
        // Update bar attributes with visible portion
        rect.setAttribute('x', (visibleStart - state.window.start) * state.timeScale);
        rect.setAttribute('width', visibleDuration * state.timeScale);
        rect.setAttribute('data-start-time', visibleStart);
        rect.setAttribute('data-duration', visibleDuration);
    });
    
    return state.taskBars;
}

/**
 * Creates task labels for the visualization
 */
export function createTaskLabels() {
    // Clear existing labels
    const existingLabels = svg.querySelector('.task-labels');
    if (existingLabels) {
        svg.removeChild(existingLabels);
    }
    
    const labelsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    labelsGroup.setAttribute('class', 'task-labels');
    
    Object.keys(CONFIG.tasks).forEach(task => {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute('x', `-${CONFIG.dimensions.labelOffset}`);
        text.setAttribute('y', CONFIG.tasks[task].yPosition + 25);
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('fill', '#000');
        text.setAttribute('font-size', '14');
        text.textContent = task;
        
        labelsGroup.appendChild(text);
    });
    
    svg.appendChild(labelsGroup);
}

/**
 * Creates interrupt indicators for the visualization
 */
export function createInterruptIndicators() {
    // Clear existing indicators
    const existingIndicators = svg.querySelector('.interrupt-indicators');
    if (existingIndicators) {
        svg.removeChild(existingIndicators);
    }
    
    const indicatorsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    indicatorsGroup.setAttribute('class', 'interrupt-indicators');
    
    // Only show interrupts within the current window
    const visibleInterrupts = state.interrupts.filter(time => 
        time >= state.window.start && time <= state.window.end
    );
    
    visibleInterrupts.forEach(time => {
        const x = (time - state.window.start) * state.timeScale;
        
        // Create circle for interrupt
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', '50');
        circle.setAttribute('r', CONFIG.dimensions.interruptRadius.toString());
        circle.setAttribute('fill', '#FF0000');
        circle.setAttribute('stroke', '#000');
        circle.setAttribute('stroke-width', '1');
        
        // Create label
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute('x', x);
        text.setAttribute('y', '40');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = 'CAN IRQ';
        
        indicatorsGroup.appendChild(circle);
        indicatorsGroup.appendChild(text);
    });
    
    svg.appendChild(indicatorsGroup);
}

/**
 * Creates time markers for the visualization
 */
export function createTimeMarkers() {
    // Clear existing markers
    const existingMarkers = svg.querySelector('.time-markers');
    if (existingMarkers) {
        svg.removeChild(existingMarkers);
    }
    
    const markersGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    markersGroup.setAttribute('class', 'time-markers');
    
    for (let t = Math.floor(state.window.start); t <= Math.ceil(state.window.end); t += 2) {
        const x = (t - state.window.start) * state.timeScale;
        
        // Create tick mark
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute('x1', x);
        line.setAttribute('y1', '300');
        line.setAttribute('x2', x);
        line.setAttribute('y2', (300 - CONFIG.dimensions.timeMarkerHeight).toString());
        line.setAttribute('stroke', '#000');
        line.setAttribute('stroke-width', '2');
        
        // Create time label
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute('x', x - 10);
        text.setAttribute('y', '320');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = t;
        
        markersGroup.appendChild(line);
        markersGroup.appendChild(text);
    }
    
    svg.appendChild(markersGroup);
}

/**
 * Adds hover effects and tooltips to a task bar
 * @param {SVGRectElement} taskBar - The task bar element to add effects to
 */
function addHoverEffects(taskBar) {
    let tooltipTimeout;
    const tooltip = document.getElementById('tooltip');
    
    taskBar.addEventListener('mouseenter', (e) => {
        clearTimeout(tooltipTimeout);
        const task = taskBar.getAttribute('data-task');
        const startTime = parseFloat(taskBar.getAttribute('data-start-time'));
        const duration = parseFloat(taskBar.getAttribute('data-duration'));
        
        tooltip.textContent = `${task} (${startTime.toFixed(1)}s - ${(startTime + duration).toFixed(1)}s)`;
        tooltip.style.display = 'block';
        
        gsap.to(taskBar, {
            opacity: 0.8,
            scale: 1.05,
            duration: 0.2
        });
    });
    
    taskBar.addEventListener('mousemove', (e) => {
        tooltip.style.left = e.pageX + 10 + 'px';
        tooltip.style.top = e.pageY + 10 + 'px';
    });
    
    taskBar.addEventListener('mouseleave', () => {
        tooltipTimeout = setTimeout(() => {
            tooltip.style.display = 'none';
            gsap.to(taskBar, {
                opacity: 1,
                scale: 1,
                duration: 0.2
            });
        }, 100);
    });
}

/**
 * Updates the visualization scales based on container size
 */
export function updateScales() {
    const container = document.getElementById('visualization');
    if (!container) return;

    const containerWidth = container.clientWidth;
    state.timeScale = containerWidth / CONFIG.window.size;
    
    // Update all task bars
    state.taskBars.forEach(bar => {
        const startTime = parseFloat(bar.getAttribute('data-start-time'));
        const duration = parseFloat(bar.getAttribute('data-duration'));
        
        bar.setAttribute('x', (startTime - state.window.start) * state.timeScale);
        bar.setAttribute('width', duration * state.timeScale);
    });
    
    // Update time markers, interrupt indicators, and task labels
    createTimeMarkers();
    createInterruptIndicators();
    createTaskLabels();
} 