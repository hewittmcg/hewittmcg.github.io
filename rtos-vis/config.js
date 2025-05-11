/**
 * Configuration object containing all visualization settings
 */
export const CONFIG = {
    // Task configuration
    tasks: {
        "CAN rx": {
            color: "#0000FF",
            yPosition: 100
        },
        "CAN parsing": {
            color: "#008000",
            yPosition: 150
        },
        "IDLE": {
            color: "#FFA500",
            yPosition: 200
        }
    },
    
    // Simulation parameters
    window: {
        size: 20,  // Size of the visible window in seconds
        advanceRate: 1.0  // How fast the window moves forward (seconds per frame)
    },
    
    // CAN task parameters
    canTask: {
        duration: 1,  // Duration of CAN task when interrupt occurs
        parsingDuration: 0.5,  // Duration of CAN parsing task
        minInterruptInterval: 2,  // Minimum time between interrupts
        maxInterruptInterval: 4,  // Maximum time between interrupts
        numInterrupts: 5  // Number of interrupts to generate
    },
    
    // Visualization dimensions
    dimensions: {
        taskHeight: 40,
        interruptRadius: 5,
        timeMarkerHeight: 5,
        labelOffset: 60
    }
}; 