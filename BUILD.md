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
  
- **Windows**: `app/src-tauri/target/release/bundle/msi/` or `nsis/`
  - `.msi` or `.exe` installer
  
- **Linux**: `app/src-tauri/target/release/bundle/appimage/` or `deb/`
  - `.AppImage` or `.deb` package

## Creating GitHub Release

1. Go to your GitHub repository: https://github.com/ledoit/Matrix-Maze
2. Click "Releases" → "Create a new release"
3. Tag version: `v1.0.0` (or increment as needed)
4. Title: `Matrix Maze v1.0.0`
5. Upload the built binaries:
   - `matrix-maze_1.0.0_x64.dmg` (macOS)
   - `matrix-maze_1.0.0_x64-setup.exe` or `.msi` (Windows)
   - `matrix-maze_1.0.0_amd64.AppImage` or `.deb` (Linux)
6. Click "Publish release"

## Update Download URLs

After creating the release, update `index.html` with the GitHub release URLs:

```html
<!-- Example URLs (replace with your actual release URLs) -->
<a href="https://github.com/ledoit/Matrix-Maze/releases/download/v1.0.0/matrix-maze_1.0.0_x64.dmg" class="download-btn">
  <span class="platform">🍎 macOS</span>
  <span class="size">Download</span>
</a>
```

The URL format is:
`https://github.com/USERNAME/REPO/releases/download/TAG/FILENAME`

