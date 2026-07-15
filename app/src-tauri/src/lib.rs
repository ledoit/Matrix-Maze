//! Matrix Maze game core.
//!
//! The maze generation, raycasting and game-state logic live here so they can be shared by
//! two front ends: the native Tauri desktop binary (`src/main.rs`) and the browser build
//! (a wasm32 cdylib exposing [`wasm_api`]). Host-specific concerns are isolated in
//! [`platform`].

pub mod dither;
pub mod game;
pub mod maze;
pub mod platform;
pub mod raycast;

#[cfg(target_arch = "wasm32")]
mod wasm_api;
