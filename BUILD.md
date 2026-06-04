# Building and Releasing Matrix Maze

## Build for Current Platform

```bash
cd app
npm install
npm run tauri build
```

## Build Outputs

After building, you'll find the installers in:

- **macOS**: `app/src-tauri/target/release/bundle/macos/`
  - `.app` file and `.dmg` installer
  
- **Windows**:
  - `app/src-tauri/target/release/bundle/msi/` -> `.msi` installer
  - `app/src-tauri/target/release/bundle/nsis/` -> `.exe` installer
  
- **Linux**: `app/src-tauri/target/release/bundle/appimage/` or `deb/`
  - `.AppImage` or `.deb` package

## Creating GitHub Release

## Versioning Policy (SemVer)

Choose exactly one increment per release:

- **Major** `X.0.0`: breaking changes.
- **Minor** `1.X.0`: new features / significant additions (backward compatible).
- **Patch** `1.2.X`: fixes, tweaks, docs, packaging-only changes.

When bumping, keep these files in sync:

- `app/package.json`
- `app/package-lock.json`
- `app/src-tauri/Cargo.toml`
- `app/src-tauri/tauri.conf.json`
- `app/src-tauri/src/game.rs` (`CURRENT_VERSION`)

1. Go to your GitHub repository: https://github.com/ledoit/Matrix-Maze
2. Click "Releases" → "Create a new release"
3. Tag version to match `app/package.json` (currently **v1.3.0**; increment as needed)
4. Title: `Matrix Maze v1.3.0` (or current version)
5. Upload the built binaries:
   - `matrix-maze_1.0.0_x64.dmg` (macOS)
   - `Matrix Maze_1.0.0_x64_en-US.msi` (Windows)
   - `matrix-maze_1.0.0_amd64.AppImage` or `.deb` (Linux)
6. Click "Publish release"

## Update Download URLs

After creating the release, update `index.html` with the GitHub release URLs:

```html
<!-- Example URLs (replace with your actual release URLs) -->
<a href="https://github.com/ledoit/Matrix-Maze/releases/download/v1.3.0/matrix-maze_1.3.0_x64.dmg" class="download-btn">
  <span class="platform">🍎 macOS</span>
  <span class="size">Download</span>
</a>
```

The URL format is:
`https://github.com/USERNAME/REPO/releases/download/TAG/FILENAME`

