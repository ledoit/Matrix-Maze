import { createBackend } from './backend.js';
import { LEVEL_COLORS } from './constants.js';
import { AdaptiveMusic } from './music.js';

const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const isMobileWeb = !window.__TAURI__ && (isCoarsePointer || window.innerWidth <= 900);

// Initialize colors from constants - sets CSS variables
function updateColorRgbValues() {
    const root = document.documentElement;
    
    // Set HSL color variables from centralized constants
    // Store both full HSL and individual components for flexibility
    LEVEL_COLORS.forEach(({ hsl, name }) => {
        // Full HSL color for direct use (color, border-color, etc.)
        root.style.setProperty(`--${name}-color`, `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`);
        // Individual HSL components for use in hsla() with alpha (box-shadow, text-shadow, etc.)
        root.style.setProperty(`--${name}-h`, hsl[0]);
        root.style.setProperty(`--${name}-s`, `${hsl[1]}%`);
        root.style.setProperty(`--${name}-l`, `${hsl[2]}%`);
    });
}

let backend = null;
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

// Play/pause coordination for the embedded browser landing (the fullscreen shell in the repo
// root index.html). Only active when the game runs inside an iframe on the web build; the
// desktop app and the standalone /play page run unpaused as before.
let shellControlled = false;
let paused = false;
let hasStarted = false; // whether the player has ever hit PLAY (drives PLAY vs RESUME label)
let pausedAt = null; // wall-clock seconds when the current pause began (for timer compensation)

let viewport = null;
let levelIndicator = null;
let controls = null;
let pauseBtn = null;
let rotatePrompt = null;
let viewportWidth = 120;
let viewportHeight = 40;
let advancingLevel = false;
const music = new AdaptiveMusic();

// Initialize game
async function init() {
    // Initialize color system
    updateColorRgbValues();
    
    viewport = document.getElementById('viewport');
    levelIndicator = document.getElementById('level-indicator');
    controls = document.getElementById('controls');
    pauseBtn = document.getElementById('pause-btn');
    rotatePrompt = document.getElementById('rotate-prompt');
    if (!viewport) {
        console.error('Viewport element not found');
        return;
    }
    
    // Make viewport focusable for keyboard input
    viewport.setAttribute('tabindex', '0');
    viewport.focus();

    // Wire up on-screen touch controls for mobile web
    setupTouchControls();
    setupOrientationHandling();
    
    viewport.addEventListener('click', handleViewportActivate);
    viewport.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) {
            e.preventDefault();
            handleViewportActivate();
        }
    }, { passive: false });
    
    // Ensure viewport regains focus if it loses it (especially important on win screen)
    viewport.addEventListener('blur', () => {
        // Only refocus if we're on the win screen and no other element has focus
        setTimeout(() => {
            if (viewport && document.activeElement === document.body) {
                // Check if game is won - if so, refocus viewport for spacebar input
                try {
                    if (gameState) {
                        const gameStateObj = JSON.parse(gameState);
                        if (gameStateObj && gameStateObj.has_won) {
                            viewport.focus();
                        }
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }, 100);
    });
    
    // Track mouse movement when pointer is locked
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === viewport) {
            // movementX gives relative movement when pointer is locked.
            // Sensitivity boosted 6x (was / 100.0) for faster turning on the web build.
            mouseDeltaX = (e.movementX / 100.0) * 6.0;
        }
    });
    
    // Handle pointer lock change events
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement !== viewport) {
            // Pointer was unlocked, reset mouse delta
            mouseDeltaX = 0.0;
            // Exiting pointer lock (e.g. Escape, which the browser consumes) pauses the
            // embedded landing so the sidebar/PLAY overlay returns.
            if (shellControlled && !paused) {
                pauseToShell();
            }
        }
    });
    
    try {
        // Select the host backend (Tauri invoke on desktop, WASM in the browser).
        backend = await createBackend();

        // When embedded in the web landing shell, start paused behind a PLAY button. The
        // shell (repo root index.html) shows its sidebar until the player starts.
        shellControlled = !backend.isDesktop && window.self !== window.top;
        if (shellControlled) {
            paused = true;
            pausedAt = performance.now() / 1000.0;
            window.addEventListener('message', handleShellMessage);
        }
        setupPauseButton();
        refreshPauseButtonVisibility();

        const stateJson = await backend.initGame();
        gameState = stateJson;
        console.log('Game initialized, state:', stateJson.substring(0, 100));
        lastFrameTime = performance.now() / 1000.0; // Initialize frame time
        resizeViewport();
        if (shellControlled) {
            // Tell the shell we're ready and currently paused so it shows the sidebar/PLAY.
            postToShell('ready');
            postToShell('paused');
        }
        gameLoop();
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
}

// Wires the on-screen mobile buttons to the same `keys` flags the keyboard uses. Each button
// presses its key on pointerdown and releases it on pointerup/leave/cancel, so holding a button
// produces continuous movement and multiple buttons can be held at once (multi-touch).
function setupTouchControls() {
    const buttons = document.querySelectorAll('#touch-controls .touch-btn');
    buttons.forEach((btn) => {
        const key = btn.getAttribute('data-key');
        if (!key || !(key in keys)) return;

        const press = (e) => {
            e.preventDefault();
            // Starting the audio + game requires a user gesture; a control tap counts.
            if (paused && shellControlled) {
                startPlaying();
            }
            music.startIfNeeded();
            keys[key] = true;
            btn.classList.add('active');
        };
        const release = (e) => {
            if (e) e.preventDefault();
            keys[key] = false;
            btn.classList.remove('active');
        };

        btn.addEventListener('pointerdown', press);
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointerleave', release);
        btn.addEventListener('pointercancel', release);
        // Prevent the browser's synthetic mouse/scroll/context behaviors on touch.
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
}

function parseGameState() {
    if (!gameState) return null;
    try {
        return JSON.parse(gameState);
    } catch {
        return null;
    }
}

async function advanceIfWon() {
    if (advancingLevel) return false;
    const gameStateObj = parseGameState();
    if (!gameStateObj?.has_won) return false;

    advancingLevel = true;
    try {
        gameState = await backend.nextLevel(gameState);
        if (viewport) viewport.focus();
        return true;
    } finally {
        advancingLevel = false;
    }
}

async function handleViewportActivate() {
    if (!viewport) return;
    viewport.focus();
    await music.startIfNeeded();
    if (await advanceIfWon()) return;
    if (paused) return;
    if (isCoarsePointer) return;
    try {
        await viewport.requestPointerLock();
    } catch (err) {
        console.warn('Pointer lock failed:', err);
    }
}

function setupPauseButton() {
    if (!pauseBtn || pauseBtn.dataset.bound) return;
    pauseBtn.dataset.bound = '1';
    pauseBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (paused && !shellControlled) {
            await resumeFromInlinePause();
            return;
        }
        pauseGame();
    });
}

function refreshPauseButtonVisibility() {
    if (!pauseBtn) return;
    pauseBtn.classList.toggle('visible', shellControlled || isMobileWeb || backend?.isDesktop);
}

async function setAudioPaused(isPaused) {
    if (isPaused) await music.suspend();
    else await music.resume();
}

function applyPauseState() {
    paused = true;
    pausedAt = performance.now() / 1000.0;
    if (document.pointerLockElement) document.exitPointerLock();
    unlockLandscape();
    updatePlayingUi(false);
    setAudioPaused(true);
}

function pauseGame() {
    if (shellControlled) {
        pauseToShell();
        return;
    }
    if (paused) return;
    applyPauseState();
}

function setupOrientationHandling() {
    window.addEventListener('orientationchange', updateOrientationPrompt);
    window.addEventListener('resize', updateOrientationPrompt);
}

function updateOrientationPrompt() {
    if (!rotatePrompt) return;
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    const shouldShow = isMobileWeb && hasStarted && !paused && portrait;
    rotatePrompt.classList.toggle('visible', shouldShow);
    document.body.classList.toggle('playing-portrait', shouldShow);
}

async function lockLandscapeIfMobile() {
    if (!isMobileWeb || !screen.orientation?.lock) return;
    try {
        await screen.orientation.lock('landscape');
    } catch (err) {
        console.warn('Landscape lock unavailable:', err);
    }
}

function unlockLandscape() {
    try {
        screen.orientation?.unlock?.();
    } catch (_) {}
}

function updatePlayingUi(playing) {
    if (pauseBtn) pauseBtn.textContent = playing ? 'Pause' : 'Resume';
    if (playing && isMobileWeb) lockLandscapeIfMobile();
    updateOrientationPrompt();
}

// --- Embedded-shell play/pause coordination (web landing only) ---

// Notifies the parent landing shell of a state change ('ready' | 'playing' | 'paused').
function postToShell(type) {
    if (!shellControlled) return;
    try {
        window.parent.postMessage({ source: 'mm-game', type }, window.location.origin);
    } catch (err) {
        console.warn('postToShell failed:', err);
    }
}

// Handles messages from the shell (currently just the PLAY/RESUME action).
function handleShellMessage(e) {
    const data = e.data;
    if (!data || data.source !== 'mm-shell') return;
    if (data.type === 'play') {
        startPlaying();
    }
}

// Resumes play from a paused state. The first PLAY starts a fresh game; subsequent resumes
// continue the current one, shifting the level start time forward so paused time isn't counted.
async function startPlaying() {
    if (!paused) return;

    if (!hasStarted) {
        // First launch: begin a fresh game so its timer starts now, not at page load.
        gameState = await backend.initGame();
        hasStarted = true;
    } else if (pausedAt !== null) {
        gameState = shiftLevelStart(gameState, performance.now() / 1000.0 - pausedAt);
    }

    pausedAt = null;
    paused = false;
    lastFrameTime = performance.now() / 1000.0; // avoid a large delta on the first live frame
    if (viewport) viewport.focus();
    updatePlayingUi(true);
    await setAudioPaused(false);
    postToShell('playing');
}

async function resumeFromInlinePause() {
    if (!paused) return;
    if (pausedAt !== null) {
        gameState = shiftLevelStart(gameState, performance.now() / 1000.0 - pausedAt);
    }
    pausedAt = null;
    paused = false;
    lastFrameTime = performance.now() / 1000.0;
    if (viewport) viewport.focus();
    updatePlayingUi(true);
    await setAudioPaused(false);
}

// Pauses play and asks the shell to reveal its sidebar/PLAY overlay again.
function pauseToShell() {
    if (paused) return;
    applyPauseState();
    postToShell('paused');
}

// Advances `level_start_time` by `deltaSeconds` so time spent paused doesn't count toward the
// level timer. Operates on the JSON state string the backend hands back.
function shiftLevelStart(stateJson, deltaSeconds) {
    try {
        const obj = JSON.parse(stateJson);
        if (typeof obj.level_start_time === 'number') {
            obj.level_start_time += deltaSeconds;
            return JSON.stringify(obj);
        }
    } catch (e) {
        // Leave state untouched on parse failure.
    }
    return stateJson;
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
    const wasWonBeforeUpdate = gameStateObj?.has_won ?? false;
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
        // While paused (embedded landing, pre-PLAY), keep rendering the current frame so the
        // shell shows a live teaser, but don't advance the simulation.
        if (!paused) {
            gameState = await backend.updateGame(gameState, input);
        }

        // Render frame (returns [frame, updatedState])
        const [frame, updatedState] = await backend.renderFrame(
            gameState,
            viewportWidth,
            viewportHeight,
        );

        // Update game state in case freeze frame was captured
        gameState = updatedState;

        const stateAfterUpdate = parseGameState();
        if (!wasWonBeforeUpdate && stateAfterUpdate?.has_won) {
            music.playLevelComplete(stateAfterUpdate.current_level || 1);
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
            music.setLevel(level);
            viewport.className = `level-${level}`;
            if (controls) {
                controls.className = `level-${level}`;
            }
            
            // Ensure viewport maintains focus, especially on win screen
            // This helps ensure spacebar presses are registered
            if (gameStateObj.has_won && document.activeElement !== viewport) {
                viewport.focus();
            }
        } catch (e) {
            // Ignore parse errors
        }
    }
}

// Keyboard event handlers - listen on window to catch all keys
window.addEventListener('keydown', async (e) => {
    // Ignore gameplay keys while paused behind the landing overlay (Escape still handled below).
    if (paused && e.key !== 'Escape') {
        return;
    }

    // Check if game is won and space is pressed for restart
    if (e.key === ' ' || e.key === 'Spacebar') {
        try {
            if (await advanceIfWon()) {
                e.preventDefault();
                return;
            }
        } catch (error) {
            console.error('Error handling spacebar:', error);
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
            if (shellControlled) {
                // In the web landing: pause and bring the sidebar/PLAY overlay back.
                pauseToShell();
            } else if (document.pointerLockElement) {
                document.exitPointerLock();
            } else if (paused) {
                await resumeFromInlinePause();
            } else {
                pauseGame();
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

