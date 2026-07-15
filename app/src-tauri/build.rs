fn main() {
    // Build scripts run on the host, so branch on the *target* arch env var.
    // Tauri's build step is meaningless (and its runtime deps are absent) for the wasm library build.
    if std::env::var("CARGO_CFG_TARGET_ARCH").as_deref() != Ok("wasm32") {
        tauri_build::build()
    }
}
