import { invoke } from '@tauri-apps/api/core';

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

let viewport = null;
let viewportWidth = 120;
let viewportHeight = 40;

// Initialize game
async function init() {
    viewport = document.getElementById('viewport');
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
    
    const availableWidth = container.clientWidth - 40;
    const availableHeight = container.clientHeight - 100;
    
    // Calculate optimal viewport size based on available space
    // Using a monospace font, we can estimate character size
    const charWidth = 8; // Approximate pixel width of a character
    const charHeight = 16; // Approximate pixel height of a character
    
    viewportWidth = Math.floor(availableWidth / charWidth);
    viewportHeight = Math.floor(availableHeight / charHeight);
    
    // Ensure minimum size
    viewportWidth = Math.max(80, Math.min(viewportWidth, 200));
    viewportHeight = Math.max(30, Math.min(viewportHeight, 80));
    
    viewport.style.width = `${viewportWidth * charWidth}px`;
    viewport.style.height = `${viewportHeight * charHeight}px`;
    viewport.style.fontSize = '12px';
    viewport.style.lineHeight = '16px';
}

async function gameLoop() {
    if (!gameState) return;
    
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
    
    // Use textContent - it automatically escapes HTML and preserves whitespace
    // CSS white-space: pre will preserve newlines and spaces
    viewport.textContent = frame;
}

// Keyboard event handlers - listen on window to catch all keys
window.addEventListener('keydown', async (e) => {
    // Check if game is won and space is pressed for restart
    if (e.key === ' ' || e.key === 'Spacebar') {
        try {
            let gameStateObj = null;
            try {
                gameStateObj = JSON.parse(gameState);
            } catch (err) {
                // Ignore parse errors
            }
            
            if (gameStateObj && gameStateObj.has_won) {
                // Restart the game
                gameState = await invoke('restart_game');
                console.log('Game restarted');
                e.preventDefault();
                return;
            }
        } catch (error) {
            console.error('Failed to restart game:', error);
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

