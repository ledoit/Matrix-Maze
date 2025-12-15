#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod dither;
mod game;
mod maze;
mod raycast;

use game::{GameState, PlayerInput};

#[tauri::command]
fn init_game() -> String {
    let game_state = GameState::new();
    serde_json::to_string(&game_state).unwrap()
}

#[tauri::command]
fn update_game(state_json: String, input: PlayerInput) -> String {
    let mut game_state: GameState = serde_json::from_str(&state_json).unwrap();
    game_state.update(&input);
    serde_json::to_string(&game_state).unwrap()
}

#[tauri::command]
fn render_frame(state_json: String, width: usize, height: usize) -> (String, String) {
    let mut game_state: GameState = serde_json::from_str(&state_json).unwrap();
    let frame = game_state.render_frame(width, height);
    // Return both the frame and the updated state (in case freeze frame was captured)
    (frame, serde_json::to_string(&game_state).unwrap())
}

#[tauri::command]
fn restart_game() -> String {
    let game_state = GameState::new();
    serde_json::to_string(&game_state).unwrap()
}

#[tauri::command]
fn next_level(state_json: String) -> String {
    let game_state: GameState = serde_json::from_str(&state_json).unwrap();
    let next_state = game_state.next_level();
    serde_json::to_string(&next_state).unwrap()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![init_game, update_game, render_frame, restart_game, next_level])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

