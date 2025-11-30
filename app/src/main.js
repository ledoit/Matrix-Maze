import { invoke } from '@tauri-apps/api/core';

// Centralized color system: convert hex to RGB
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle shorthand hex (e.g., #0f0 -> #00ff00)
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
}

// Set RGB values from hex colors
function updateColorRgbValues() {
    const root = document.documentElement;
    const colors = [
        { hex: '#0f0', name: 'level-1' },
        { hex: '#ff00ff', name: 'level-2' },
        { hex: '#ff0000', name: 'level-3' },
        { hex: '#9d00ff', name: 'level-4' },
        { hex: '#0000ff', name: 'level-5' },
    ];
    
    colors.forEach(({ hex, name }) => {
        root.style.setProperty(`--${name}-rgb`, hexToRgb(hex));
    });
}

let gameState = null;
let keys = {
    w: false,
    s: false,
    a: false,
    d: false,
    q: false,
    e: false,
};

let mouseDeltaX = 0.0;
let lastFrameTime = null;
let spacebarDebounce = false;

let viewport = null;
let levelIndicator = null;
let controls = null;
let viewportWidth = 120;
let viewportHeight = 40;

// Initialize game
async function init() {
    // Initialize color system
    updateColorRgbValues();
    
    viewport = document.getElementById('viewport');
    levelIndicator = document.getElementById('level-indicator');
    controls = document.getElementById('controls');
    if (!viewport) {
        console.error('Viewport element not found');
        return;
    }
    
    // Make viewport focusable for keyboard input
    viewport.setAttribute('tabindex', '0');
    viewport.focus();
    
    // Set up FPS-style mouse look using Pointer Lock API
    viewport.addEventListener('click', async () => {
        try {
            await viewport.requestPointerLock();
        } catch (err) {
            console.warn('Pointer lock failed:', err);
        }
    });
    
    // Track mouse movement when pointer is locked
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === viewport) {
            // movementX gives relative movement when pointer is locked
            mouseDeltaX = e.movementX / 100.0; // Scale down for smoother turning
        }
    });
    
    // Handle pointer lock change events
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement !== viewport) {
            // Pointer was unlocked, reset mouse delta
            mouseDeltaX = 0.0;
        }
    });
    
    try {
        const stateJson = await invoke('init_game');
        gameState = stateJson;
        console.log('Game initialized, state:', stateJson.substring(0, 100));
        lastFrameTime = performance.now() / 1000.0; // Initialize frame time
        resizeViewport();
        gameLoop();
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
}

function resizeViewport() {
    if (!viewport) return;
    
    const container = document.getElementById('app');
    if (!container) return;
    
    // Set font properties first to measure actual character size
    viewport.style.fontSize = '12px';
    viewport.style.lineHeight = '16px';
    viewport.style.fontFamily = "'Courier New', 'Monaco', 'Menlo', monospace";
    viewport.style.whiteSpace = 'pre';
    
    // Measure actual character width by creating a test element
    const testChar = document.createElement('span');
    testChar.style.position = 'absolute';
    testChar.style.visibility = 'hidden';
    testChar.style.fontSize = '12px';
    testChar.style.fontFamily = "'Courier New', 'Monaco', 'Menlo', monospace";
    testChar.style.whiteSpace = 'pre';
    testChar.textContent = 'M'; // Use 'M' as it's typically the widest character
    document.body.appendChild(testChar);
    const charWidth = testChar.offsetWidth;
    const charHeight = parseInt(getComputedStyle(testChar).lineHeight) || 16;
    document.body.removeChild(testChar);
    
    // Account for border (2px on each side = 4px) and padding (10px on each side = 20px)
    const borderPadding = 4 + 20; // 24px total
    const availableWidth = container.clientWidth - borderPadding - 40; // Extra 40 for margins
    const availableHeight = container.clientHeight - borderPadding - 100; // Extra 100 for other elements
    
    viewportWidth = Math.floor(availableWidth / charWidth);
    viewportHeight = Math.floor(availableHeight / charHeight);
    
    // Ensure minimum size
    viewportWidth = Math.max(80, Math.min(viewportWidth, 200));
    viewportHeight = Math.max(30, Math.min(viewportHeight, 80));
    
    // Calculate content height
    const contentHeight = viewportHeight * charHeight;
    
    // Don't set width here - let displayFrame measure the actual rendered width
    // Just set height and max-width constraint
    const exactHeight = contentHeight + 20 + 4; // padding + border
    
    // Set max-width to container limit to prevent overflow
    const maxAllowedWidth = container.clientWidth - 40;
    viewport.style.maxWidth = `${maxAllowedWidth}px`;
    viewport.style.height = `${exactHeight}px`;
    viewport.style.overflow = 'visible'; // Ensure nothing is clipped
}

async function gameLoop() {
    if (!gameState) return;
    
    // Calculate delta time for frame-rate independent movement
    const currentTime = performance.now() / 1000.0; // Convert to seconds
    let deltaTime = 0.016; // Default to ~60fps if first frame
    if (lastFrameTime !== null) {
        deltaTime = currentTime - lastFrameTime;
    }
    lastFrameTime = currentTime;
    
    // Parse game state to check if won
    let gameStateObj = null;
    try {
        gameStateObj = JSON.parse(gameState);
    } catch (e) {
        // If parsing fails, continue with update
    }
    
    // Get input (only if not won)
    const input = {
        forward: gameStateObj?.has_won ? false : keys.w,
        backward: gameStateObj?.has_won ? false : keys.s,
        left: gameStateObj?.has_won ? false : keys.a,
        right: gameStateObj?.has_won ? false : keys.d,
        turn_left: gameStateObj?.has_won ? false : keys.q,
        turn_right: gameStateObj?.has_won ? false : keys.e,
        mouse_delta_x: gameStateObj?.has_won ? 0.0 : mouseDeltaX,
        delta_time: deltaTime,
    };
    
    // Reset mouse delta after using it
    mouseDeltaX = 0.0;
    
    // Update game state
    try {
        gameState = await invoke('update_game', {
            stateJson: gameState,
            input: input,
        });
        
        // Render frame (returns [frame, updatedState])
        const [frame, updatedState] = await invoke('render_frame', {
            stateJson: gameState,
            width: viewportWidth,
            height: viewportHeight,
        });
        
        // Update game state in case freeze frame was captured
        gameState = updatedState;
        
        // Debug: log first 100 chars of frame
        if (frame && frame.length > 0) {
            console.log('Frame preview:', frame.substring(0, 100));
        } else {
            console.warn('Empty frame received');
        }
        
        // Display frame
        displayFrame(frame);
    } catch (error) {
        console.error('Game loop error:', error);
        console.error('Game state:', gameState);
    }
    
    requestAnimationFrame(gameLoop);
}

function displayFrame(frame) {
    if (!viewport) return;
    
    // Measure actual rendered width of one line BEFORE setting content
    // Extract first line to measure
    const firstLineEnd = frame.indexOf('\n');
    const testLine = firstLineEnd > 0 ? frame.substring(0, firstLineEnd) : (frame.split('\n')[0] || '');
    
    // Create test element with exact same styling as viewport
    const testElement = document.createElement('div');
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.style.fontSize = getComputedStyle(viewport).fontSize || '12px';
    testElement.style.fontFamily = getComputedStyle(viewport).fontFamily || "'Courier New', 'Monaco', 'Menlo', monospace";
    testElement.style.whiteSpace = 'pre';
    testElement.style.letterSpacing = getComputedStyle(viewport).letterSpacing || '0';
    testElement.textContent = testLine;
    document.body.appendChild(testElement);
    const actualLineWidth = testElement.offsetWidth;
    document.body.removeChild(testElement);
    
    // Calculate exact viewport width: actual line width + padding + border
    const borderPadding = 24; // 4px border (2px each side) + 20px padding (10px each side)
    const exactWidth = actualLineWidth + borderPadding;
    
    // Get container (#app) - the viewport should fit within this container
    // The container uses flexbox, so we need to ensure viewport doesn't exceed its width
    const container = document.getElementById('app');
    if (container) {
        // Use the container's actual client width as the maximum
        // This ensures the viewport (including border) fits within the green box
        const maxAllowedWidth = container.clientWidth;
        
        // Constrain viewport to fit within container - the exactWidth already includes border+padding
        viewport.style.width = `${Math.min(exactWidth, maxAllowedWidth)}px`;
        viewport.style.maxWidth = `${maxAllowedWidth}px`; // Hard CSS limit
    } else {
        viewport.style.width = `${exactWidth}px`;
    }
    
    // Now set the frame content
    viewport.textContent = frame;
    
    // Update level indicator, viewport, and controls color class
    if (gameState) {
        try {
            const gameStateObj = JSON.parse(gameState);
            const level = gameStateObj.current_level || 1;
            if (levelIndicator) {
                levelIndicator.textContent = `Level ${level}`;
                levelIndicator.className = `level-${level}`;
            }
            viewport.className = `level-${level}`;
            if (controls) {
                controls.className = `level-${level}`;
            }
        } catch (e) {
            // Ignore parse errors
        }
    }
}

// Keyboard event handlers - listen on window to catch all keys
window.addEventListener('keydown', async (e) => {
    // Check if game is won and space is pressed for restart
    if (e.key === ' ' || e.key === 'Spacebar') {
        // Prevent double-tap by debouncing
        if (spacebarDebounce) {
            e.preventDefault();
            return;
        }
        
        try {
            let gameStateObj = null;
            try {
                gameStateObj = JSON.parse(gameState);
            } catch (err) {
                // Ignore parse errors
            }
            
            if (gameStateObj && gameStateObj.has_won) {
                // Set debounce flag
                spacebarDebounce = true;
                
                // Advance to next level or restart
                gameState = await invoke('next_level', { stateJson: gameState });
                console.log('Advanced to next level or restarted');
                
                // Reset debounce after a short delay
                setTimeout(() => {
                    spacebarDebounce = false;
                }, 300);
                
                e.preventDefault();
                return;
            }
        } catch (error) {
            console.error('Failed to restart game:', error);
            spacebarDebounce = false; // Reset on error
        }
    }
    
    switch (e.key.toLowerCase()) {
        case 'w':
            keys.w = true;
            e.preventDefault();
            break;
        case 's':
            keys.s = true;
            e.preventDefault();
            break;
        case 'a':
            keys.a = true;
            e.preventDefault();
            break;
        case 'd':
            keys.d = true;
            e.preventDefault();
            break;
        case 'q':
            keys.q = true;
            e.preventDefault();
            break;
        case 'e':
            keys.e = true;
            e.preventDefault();
            break;
        case 'escape':
            // Unlock pointer if locked
            if (document.pointerLockElement) {
                document.exitPointerLock();
            } else {
                // Tauri 2.x way to close window
                import('@tauri-apps/api/window').then(({ appWindow }) => {
                    appWindow.close();
                }).catch(() => {
                    // Fallback if API not available
                    window.close();
                });
            }
            e.preventDefault();
            break;
    }
});

window.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
        case 'w':
            keys.w = false;
            break;
        case 's':
            keys.s = false;
            break;
        case 'a':
            keys.a = false;
            break;
        case 'd':
            keys.d = false;
            break;
        case 'q':
            keys.q = false;
            break;
        case 'e':
            keys.e = false;
            break;
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    resizeViewport();
});

// Start the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

