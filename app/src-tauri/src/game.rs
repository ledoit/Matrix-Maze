use crate::maze::Maze;
use crate::raycast::{cast_ray, get_ascii_char};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameState {
    pub player_x: f64,
    pub player_y: f64,
    pub player_angle: f64,
    pub maze: MazeData,
    pub exit_x: f64,
    pub exit_y: f64,
    pub has_won: bool,
    pub start_time: f64, // Time when game started (seconds since epoch)
    pub completion_time: Option<f64>, // Time when player won (seconds elapsed)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MazeData {
    pub width: usize,
    pub height: usize,
    pub cells: Vec<Vec<bool>>,
}

impl From<&Maze> for MazeData {
    fn from(maze: &Maze) -> Self {
        MazeData {
            width: maze.width,
            height: maze.height,
            cells: maze.cells.clone(),
        }
    }
}

impl From<MazeData> for Maze {
    fn from(data: MazeData) -> Self {
        Maze {
            width: data.width,
            height: data.height,
            cells: data.cells,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlayerInput {
    pub forward: bool,
    pub backward: bool,
    pub left: bool,
    pub right: bool,
    pub turn_left: bool,
    pub turn_right: bool,
    pub mouse_delta_x: f64,
}

impl GameState {
    pub fn new() -> Self {
        let maze = Maze::new(7, 7); // Very small for testing
        // Exit is on the bottom edge of the maze (outer wall opening)
        let exit_x = (maze.width - 2) as f64 + 0.5;
        let exit_y = (maze.height - 1) as f64 + 0.5;
        
        let start = (1, 1);
        let end = (maze.width - 2, maze.height - 1); // Exit on bottom edge
        
        // Save maze map to file
        Self::save_maze_map(&maze, start, end);
        
        // Calculate initial angle to face an open direction
        // Check which directions are open from start position (1.5, 1.5)
        // Start is at cell (1, 1), so check adjacent cells
        let mut initial_angle = 0.0;
        
        // Check if east (right) is open - check cell (2, 1)
        if !maze.is_wall(2, 1) {
            initial_angle = 0.0; // Face east (right)
        }
        // Check if south (down) is open - check cell (1, 2)
        else if !maze.is_wall(1, 2) {
            initial_angle = std::f64::consts::PI / 2.0; // Face south (down)
        }
        // Check if west (left) is open - check cell (0, 1)
        else if !maze.is_wall(0, 1) {
            initial_angle = std::f64::consts::PI; // Face west (left)
        }
        // Check if north (up) is open - check cell (1, 0)
        else if !maze.is_wall(1, 0) {
            initial_angle = -std::f64::consts::PI / 2.0; // Face north (up)
        }
        // Default: face towards exit
        else {
            let dx = exit_x - 1.5;
            let dy = exit_y - 1.5;
            initial_angle = dy.atan2(dx);
        }
        
        // Get current time in seconds
        let start_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs_f64();
        
        GameState {
            player_x: 1.5,
            player_y: 1.5,
            player_angle: initial_angle,
            maze: MazeData::from(&maze),
            exit_x,
            exit_y,
            has_won: false,
            start_time,
            completion_time: None,
        }
    }
    
    fn save_maze_map(maze: &Maze, start: (usize, usize), end: (usize, usize)) {
        use std::fs::File;
        use std::io::Write;
        use std::path::PathBuf;
        
        // Get the workspace root (go up from src-tauri to proje)
        let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        path.pop(); // Go from src-tauri to proje root
        path.push("maze_map.txt");
        
        let mut output = String::new();
        
        // Generate the map
        for y in 0..maze.height {
            for x in 0..maze.width {
                if (x, y) == start {
                    output.push('P');
                } else if (x, y) == end {
                    output.push('E');
                } else if maze.is_wall(x, y) {
                    output.push('█');
                } else {
                    output.push(' ');
                }
            }
            output.push('\n');
        }
        
        // Write to file
        if let Ok(mut file) = File::create(&path) {
            if let Err(e) = file.write_all(output.as_bytes()) {
                eprintln!("Failed to write maze map: {}", e);
            }
        } else {
            eprintln!("Failed to create maze map file at: {:?}", path);
        }
    }

    pub fn update(&mut self, input: &PlayerInput) {
        // Don't process any input if already won
        if self.has_won {
            return;
        }
        
        let move_speed = 0.05;
        let turn_speed = 0.10; // Doubled from 0.05
        let maze: Maze = self.maze.clone().into();

        // Handle rotation
        if input.turn_left {
            self.player_angle -= turn_speed;
        }
        if input.turn_right {
            self.player_angle += turn_speed;
        }
        // Handle mouse/trackpad turning
        self.player_angle += input.mouse_delta_x * turn_speed * 2.0;

        // Normalize angle
        self.player_angle = self.player_angle % (2.0 * std::f64::consts::PI);
        if self.player_angle < 0.0 {
            self.player_angle += 2.0 * std::f64::consts::PI;
        }

        // Handle movement
        let dx = self.player_angle.cos() * move_speed;
        let dy = self.player_angle.sin() * move_speed;

        if input.forward {
            let new_x = self.player_x + dx;
            let new_y = self.player_y + dy;
            if !maze.get_cell(new_x, new_y) {
                self.player_x = new_x;
                self.player_y = new_y;
            }
        }
        if input.backward {
            let new_x = self.player_x - dx;
            let new_y = self.player_y - dy;
            if !maze.get_cell(new_x, new_y) {
                self.player_x = new_x;
                self.player_y = new_y;
            }
        }
        if input.left {
            let left_angle = self.player_angle - std::f64::consts::PI / 2.0;
            let new_x = self.player_x + left_angle.cos() * move_speed;
            let new_y = self.player_y + left_angle.sin() * move_speed;
            if !maze.get_cell(new_x, new_y) {
                self.player_x = new_x;
                self.player_y = new_y;
            }
        }
        if input.right {
            let right_angle = self.player_angle + std::f64::consts::PI / 2.0;
            let new_x = self.player_x + right_angle.cos() * move_speed;
            let new_y = self.player_y + right_angle.sin() * move_speed;
            if !maze.get_cell(new_x, new_y) {
                self.player_x = new_x;
                self.player_y = new_y;
            }
        }
        
        // Check if player reached the exit - stop movement
        let dist_to_exit = ((self.player_x - self.exit_x).powi(2) + (self.player_y - self.exit_y).powi(2)).sqrt();
        if dist_to_exit < 0.5 && !self.has_won {
            self.has_won = true;
            // Stop player at exit position
            let dx_to_exit = self.exit_x - self.player_x;
            let dy_to_exit = self.exit_y - self.player_y;
            self.player_x = self.exit_x - dx_to_exit * 0.1; // Stop just before exit
            self.player_y = self.exit_y - dy_to_exit * 0.1;
            
            // Record completion time
            let current_time = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs_f64();
            self.completion_time = Some(current_time - self.start_time);
        }
    }

    pub fn render_frame(&mut self, width: usize, height: usize) -> String {
        let maze: Maze = self.maze.clone().into();
        let fov = std::f64::consts::PI / 2.0; // 90 degrees (zoomed out)
        let max_distance = 20.0;
        
        // Continue with normal rendering even if won - we'll overlay message at the end
        
        // Pre-calculate raycast results for each column
        let mut column_data: Vec<(f64, u8, bool, Option<f64>)> = Vec::with_capacity(width);
        for col in 0..width {
            let ray_angle = self.player_angle - fov / 2.0 + (col as f64 / width as f64) * fov;
            let result = cast_ray(
                self.player_x, 
                self.player_y, 
                ray_angle, 
                &maze, 
                max_distance,
                Some(self.exit_x),
                Some(self.exit_y),
            );
            column_data.push((result.distance, result.wall_type, result.passed_exit, result.exit_threshold_dist));
        }
        
        let mut frame = String::new();
        
        // Pre-calculate wall characters for each column to ensure consistency
        let mut wall_chars: Vec<char> = Vec::with_capacity(width);
        for col in 0..width {
            let (distance, wall_type, _passed_exit, _exit_threshold_dist) = &column_data[col];
            // Only use regular distance for wall rendering (not exit threshold)
            wall_chars.push(get_ascii_char(*distance, *wall_type, max_distance));
        }
        
        // Render row by row
        for row in 0..height {
            for col in 0..width {
                let (distance, _wall_type, passed_exit, exit_threshold_dist) = column_data[col];
                
                // Calculate wall height based on distance (perspective projection)
                let wall_render_dist = distance;
                let wall_height = if wall_render_dist > 0.01 {
                    (height as f64 / wall_render_dist).min(height as f64 * 2.0)
                } else {
                    height as f64 * 2.0
                };
                
                let wall_start = ((height as f64 - wall_height) / 2.0) as usize;
                let wall_end = (wall_start + wall_height as usize).min(height);
                
                if row < wall_start {
                    // Ceiling
                    frame.push(' ');
                } else if row < wall_end {
                    // Wall - if ray passed through exit threshold, make threshold line invisible
                    if passed_exit && exit_threshold_dist.is_some() {
                        let threshold_dist = exit_threshold_dist.unwrap();
                        // Make threshold line invisible
                        if (wall_render_dist - threshold_dist).abs() < 0.2 {
                            frame.push(' '); // Invisible exit threshold line
                        } else {
                            frame.push(wall_chars[col]);
                        }
                    } else {
                        frame.push(wall_chars[col]);
                    }
                } else {
                    // Floor - stop at exit threshold if ray passed through exit
                    if passed_exit {
                        // Check if floor position is before exit threshold
                        let floor_dist = calculate_floor_distance(
                            col,
                            row,
                            width,
                            height,
                            fov,
                            self.player_angle,
                        );
                        if let Some(threshold) = exit_threshold_dist {
                            if floor_dist < threshold {
                                frame.push(get_floor_char(floor_dist, max_distance));
                            } else {
                                frame.push(' ');
                            }
                        } else {
                            frame.push(' ');
                        }
                    } else {
                        let floor_dist = calculate_floor_distance(
                            col,
                            row,
                            width,
                            height,
                            fov,
                            self.player_angle,
                        );
                        if floor_dist < max_distance {
                            frame.push(get_floor_char(floor_dist, max_distance));
                        } else {
                            frame.push(' ');
                        }
                    }
                }
            }
            
            if row < height - 1 {
                frame.push('\n');
            }
        }
        
        // Overlay win message if player has won
        if self.has_won {
            let message = "YOU ESCAPED!";
            let message_row = height / 2;
            let time_row = height / 2 + 2;
            
            // Format completion time
            let time_message = if let Some(time) = self.completion_time {
                let minutes = (time as u64) / 60;
                let seconds = (time as u64) % 60;
                let milliseconds = ((time % 1.0) * 100.0) as u64;
                format!("Time: {:02}:{:02}.{:02}", minutes, seconds, milliseconds)
            } else {
                "Time: --:--".to_string()
            };
            
            let message_start_col = width.saturating_sub(message.len()) / 2;
            let time_start_col = width.saturating_sub(time_message.len()) / 2;
            
            let lines: Vec<&str> = frame.split('\n').collect();
            let mut new_frame = String::new();
            for (row_idx, line) in lines.iter().enumerate() {
                if row_idx == message_row {
                    // Overlay "YOU ESCAPED!" message
                    let mut new_line = line.chars().collect::<Vec<_>>();
                    for (i, ch) in message.chars().enumerate() {
                        if message_start_col + i < new_line.len() {
                            new_line[message_start_col + i] = ch;
                        }
                    }
                    new_frame.push_str(&new_line.iter().collect::<String>());
                } else if row_idx == time_row {
                    // Overlay time message
                    let mut new_line = line.chars().collect::<Vec<_>>();
                    for (i, ch) in time_message.chars().enumerate() {
                        if time_start_col + i < new_line.len() {
                            new_line[time_start_col + i] = ch;
                        }
                    }
                    new_frame.push_str(&new_line.iter().collect::<String>());
                } else {
                    new_frame.push_str(line);
                }
                if row_idx < lines.len() - 1 {
                    new_frame.push('\n');
                }
            }
            return new_frame;
        }
        
        frame
    }
}

fn calculate_floor_distance(
    _col: usize,
    row: usize,
    _width: usize,
    height: usize,
    _fov: f64,
    _player_angle: f64,
) -> f64 {
    let p = (row as f64 - height as f64 / 2.0) / (height as f64 / 2.0);
    let distance = 1.0 / p.max(0.1);
    distance
}

fn get_floor_char(distance: f64, max_distance: f64) -> char {
    let normalized_dist = (distance / max_distance).min(1.0);
    if normalized_dist < 0.3 {
        '.'
    } else if normalized_dist < 0.6 {
        ','
    } else {
        ' '
    }
}

