# Matrix Maze

A desktop application featuring a first-person 3D ASCII labyrinth adventure game built with Rust, Tauri, and JavaScript.

## 🎮 [Play Demo / Download](landing.html)

Visit the [landing page](landing.html) to see a demo and download the game for your platform.

## Features

- **3D ASCII Raycasting Engine**: Real-time 3D rendering using ASCII characters with depth perception
- **Procedural Maze Generation**: Randomly generated labyrinths using recursive backtracking algorithm
- **First-Person Controls**: Smooth movement and rotation with WASD + Q/E keys
- **Cross-Platform**: Built with Tauri for Windows, macOS, and Linux support

## Controls

- **W**: Move forward
- **S**: Move backward
- **A**: Strafe left
- **D**: Strafe right
- **Q**: Turn left
- **E**: Turn right
- **ESC**: Exit game

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (latest stable version)
- [Node.js](https://nodejs.org/) (v16 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone git@github.com:ledoit/Matrix-Maze.git
cd Matrix-Maze
```

2. Install frontend dependencies:
```bash
npm install
```

3. The Rust dependencies will be automatically installed when you build the project.

## Development

Run the development server:
```bash
npm run tauri dev
```

This will:
- Start the Vite dev server for the frontend
- Compile the Rust backend
- Launch the Tauri application window

## Building

Build the application for production:
```bash
npm run tauri build
```

The built application will be in `src-tauri/target/release/` (or `src-tauri/target/release/bundle/` for installers).

## Project Structure

```
.
├── src/                    # Frontend (HTML/CSS/JavaScript)
│   ├── main.js            # Game loop and Tauri integration
│   └── style.css          # Styling
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs        # Tauri entry point
│   │   ├── game.rs        # Game state and logic
│   │   ├── maze.rs        # Maze generation
│   │   └── raycast.rs     # 3D raycasting engine
│   └── Cargo.toml         # Rust dependencies
├── index.html             # HTML entry point
└── package.json           # Node.js dependencies
```

## How It Works

### 3D Rendering

The game uses a raycasting algorithm similar to classic games like Wolfenstein 3D:
- For each column of the screen, a ray is cast from the player's position
- The ray intersects with walls in the maze
- Distance is calculated and used to determine wall height (perspective projection)
- ASCII characters are chosen based on distance to create depth perception

### Maze Generation

The maze is generated using a recursive backtracking algorithm:
- Creates a perfect maze (one path between any two points)
- Ensures the player starts at a valid position
- Guarantees an exit point

### Game Loop

1. Frontend captures keyboard input
2. Input is sent to Rust backend via Tauri commands
3. Game state is updated (player position, rotation)
4. Frame is rendered using raycasting
5. ASCII frame is returned to frontend and displayed
