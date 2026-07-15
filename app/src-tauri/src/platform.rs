//! Platform shims so the game logic can run both natively (Tauri desktop) and in the
//! browser (wasm32). Everything the sim needs from the host — wall-clock time, RNG entropy
//! and best-time persistence — is funnelled through here so `game.rs` stays platform-agnostic.
//!
//! Native builds use `std` (SystemTime + filesystem). The wasm build uses `js-sys`
//! (Date/Math) and `web-sys` (localStorage). The two implementations are selected with
//! `cfg(target_arch = "wasm32")` and expose an identical interface.

/// Key used for the browser localStorage best-times entry.
#[cfg(target_arch = "wasm32")]
const BEST_TIMES_KEY: &str = "matrix_maze_best_times";

/// Current wall-clock time in fractional seconds. Used for level timing and RNG seeding.
#[cfg(not(target_arch = "wasm32"))]
pub fn now_secs() -> f64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs_f64()
}

#[cfg(target_arch = "wasm32")]
pub fn now_secs() -> f64 {
    // Date.now() is in milliseconds since the epoch.
    js_sys::Date::now() / 1000.0
}

/// Produces a high-entropy seed for maze generation. `counter` is a monotonic caller-supplied
/// value guaranteeing distinct seeds even when two mazes are generated within the same instant.
#[cfg(not(target_arch = "wasm32"))]
pub fn entropy_seed(counter: u64) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos() as u64;

    let mut hasher = DefaultHasher::new();
    nanos.hash(&mut hasher);
    counter.hash(&mut hasher);
    std::thread::current().id().hash(&mut hasher);
    std::process::id().hash(&mut hasher);
    hasher.finish()
}

#[cfg(target_arch = "wasm32")]
pub fn entropy_seed(counter: u64) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    // The browser has no threads/PID; use the high-resolution clock plus Math.random().
    let nanos = (js_sys::Date::now() * 1_000_000.0) as u64;
    let rand_bits = (js_sys::Math::random() * u64::MAX as f64) as u64;

    let mut hasher = DefaultHasher::new();
    nanos.hash(&mut hasher);
    counter.hash(&mut hasher);
    rand_bits.hash(&mut hasher);
    hasher.finish()
}

/// Reads the raw best-times JSON blob previously written by [`store_best_times`], if any.
#[cfg(not(target_arch = "wasm32"))]
pub fn load_best_times() -> Option<String> {
    std::fs::read_to_string(best_times_path()).ok()
}

#[cfg(target_arch = "wasm32")]
pub fn load_best_times() -> Option<String> {
    let storage = web_sys::window()?.local_storage().ok()??;
    storage.get_item(BEST_TIMES_KEY).ok()?
}

/// Persists the raw best-times JSON blob.
#[cfg(not(target_arch = "wasm32"))]
pub fn store_best_times(json: &str) {
    if let Err(e) = std::fs::write(best_times_path(), json) {
        eprintln!("Failed to save best times: {}", e);
    }
}

#[cfg(target_arch = "wasm32")]
pub fn store_best_times(json: &str) {
    if let Some(Ok(Some(storage))) = web_sys::window().map(|w| w.local_storage()) {
        let _ = storage.set_item(BEST_TIMES_KEY, json);
    }
}

/// Writes the debug maze map. This is a developer aid on desktop and a no-op in the browser.
#[cfg(not(target_arch = "wasm32"))]
pub fn store_maze_map(map: &str) {
    if let Err(e) = std::fs::write(sibling_path("maze_map.txt"), map) {
        eprintln!("Failed to write maze map: {}", e);
    }
}

#[cfg(target_arch = "wasm32")]
pub fn store_maze_map(_map: &str) {}

#[cfg(not(target_arch = "wasm32"))]
fn best_times_path() -> std::path::PathBuf {
    sibling_path("best_times.json")
}

/// Resolves a path next to the app directory (one level up from `src-tauri`).
#[cfg(not(target_arch = "wasm32"))]
fn sibling_path(name: &str) -> std::path::PathBuf {
    let mut path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.pop(); // src-tauri -> app/
    path.push(name);
    path
}
