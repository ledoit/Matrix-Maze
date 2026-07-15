#!/usr/bin/env bash
#
# Compiles the Rust game core (app/src-tauri) to WebAssembly for the browser build and emits
# the wasm-bindgen glue into app/src/wasm/. Run this whenever game.rs / maze.rs / raycast.rs /
# dither/ change. The generated output is committed so the Vite build (and Vercel) never need
# a Rust toolchain.
#
# Prerequisites (one-time):
#   rustup target add wasm32-unknown-unknown
#   cargo install wasm-bindgen-cli --version 0.2.100   # must match the wasm-bindgen crate pin
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
TAURI_DIR="$APP_DIR/src-tauri"
OUT_DIR="$APP_DIR/src/wasm"

echo "==> Building matrix_maze lib for wasm32-unknown-unknown (release)"
(cd "$TAURI_DIR" && cargo build --lib --release --target wasm32-unknown-unknown)

echo "==> Running wasm-bindgen (--target web) into $OUT_DIR"
wasm-bindgen \
    "$TAURI_DIR/target/wasm32-unknown-unknown/release/matrix_maze.wasm" \
    --out-dir "$OUT_DIR" \
    --target web

echo "==> Done. Generated:"
ls -1 "$OUT_DIR"
