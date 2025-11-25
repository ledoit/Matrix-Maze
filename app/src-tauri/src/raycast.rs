pub struct RaycastResult {
    pub distance: f64,
    pub wall_type: u8, // 0-3 for N, S, E, W walls
    #[allow(dead_code)]
    pub hit_x: f64,
    #[allow(dead_code)]
    pub hit_y: f64,
    pub passed_exit: bool, // True if ray passed through the exit
    pub exit_threshold_dist: Option<f64>, // Distance to exit threshold if ray would hit it
}

pub fn cast_ray(
    start_x: f64,
    start_y: f64,
    angle: f64,
    maze: &crate::maze::Maze,
    max_distance: f64,
    exit_x: Option<f64>,
    exit_y: Option<f64>,
) -> RaycastResult {
    let dx = angle.cos();
    let dy = angle.sin();
    
    // DDA (Digital Differential Analyzer) algorithm for efficient grid traversal
    let mut map_x = start_x as i32;
    let mut map_y = start_y as i32;
    
    let delta_dist_x = if dx == 0.0 { 1e30 } else { (1.0 / dx).abs() };
    let delta_dist_y = if dy == 0.0 { 1e30 } else { (1.0 / dy).abs() };
    
    let mut side_dist_x: f64;
    let mut side_dist_y: f64;
    let step_x: i32;
    let step_y: i32;
    
    if dx < 0.0 {
        step_x = -1;
        side_dist_x = (start_x - map_x as f64) * delta_dist_x;
    } else {
        step_x = 1;
        side_dist_x = (map_x as f64 + 1.0 - start_x) * delta_dist_x;
    }
    
    if dy < 0.0 {
        step_y = -1;
        side_dist_y = (start_y - map_y as f64) * delta_dist_y;
    } else {
        step_y = 1;
        side_dist_y = (map_y as f64 + 1.0 - start_y) * delta_dist_y;
    }
    
    let mut hit = false;
    let mut side = 0; // 0 = x-side, 1 = y-side
    let mut passed_exit = false;
    let mut exit_threshold_dist: Option<f64> = None;
    
    // Calculate exit cell coordinates
    let exit_cell_x = exit_x.map(|x| x as i32);
    let exit_cell_y = exit_y.map(|y| y as i32);
    
    while !hit {
        let prev_map_x = map_x;
        let prev_map_y = map_y;
        let prev_side_dist_x = side_dist_x;
        let prev_side_dist_y = side_dist_y;
        
        if side_dist_x < side_dist_y {
            side_dist_x += delta_dist_x;
            map_x += step_x;
            side = 0;
        } else {
            side_dist_y += delta_dist_y;
            map_y += step_y;
            side = 1;
        }
        
        // Check if we're about to enter the exit cell - calculate threshold distance
        if let (Some(ex_x), Some(ex_y)) = (exit_x, exit_y) {
            if prev_map_x != ex_x as i32 || prev_map_y != ex_y as i32 {
                if map_x == ex_x as i32 && map_y == ex_y as i32 {
                    // Calculate distance to the actual exit position (center of exit cell)
                    // This makes the floor continue to the actual exit opening
                    let exit_world_x = ex_x;
                    let exit_world_y = ex_y;
                    
                    // Calculate distance along the ray to the exit position
                    // Solve: start_x + t*dx = exit_world_x, start_y + t*dy = exit_world_y
                    let threshold_dist = if dx.abs() > dy.abs() {
                        (exit_world_x - start_x) / dx
                    } else if dy != 0.0 {
                        (exit_world_y - start_y) / dy
                    } else {
                        // Fallback to side distance
                        if side == 0 {
                            side_dist_x - delta_dist_x
                        } else {
                            side_dist_y - delta_dist_y
                        }
                    };
                    
                    if threshold_dist > 0.0 {
                        exit_threshold_dist = Some(threshold_dist);
                        passed_exit = true;
                    }
                }
            }
        }
        
        // If we passed the exit and go out of bounds, show open sky
        if passed_exit && (map_x < 0 || map_y < 0 || map_x as usize >= maze.width || map_y as usize >= maze.height) {
            // Return max_distance to show open space (ceiling), but use exit threshold for wall rendering
            let final_distance = exit_threshold_dist.unwrap_or(max_distance);
            return RaycastResult {
                distance: final_distance,
                wall_type: 0,
                hit_x: start_x + dx * final_distance,
                hit_y: start_y + dy * final_distance,
                passed_exit: true,
                exit_threshold_dist,
            };
        }
        
        if map_x < 0 || map_y < 0 || map_x as usize >= maze.width || map_y as usize >= maze.height {
            break;
        }
        
        // Don't treat exit cell as a wall
        let is_exit = if let (Some(ex_x), Some(ex_y)) = (exit_cell_x, exit_cell_y) {
            map_x == ex_x && map_y == ex_y
        } else {
            false
        };
        
        if !is_exit && maze.is_wall(map_x as usize, map_y as usize) {
            hit = true;
        }
    }
    
    let perp_wall_dist = if side == 0 {
        side_dist_x - delta_dist_x
    } else {
        side_dist_y - delta_dist_y
    };
    
    let distance = perp_wall_dist.min(max_distance);
    let hit_x = start_x + dx * distance;
    let hit_y = start_y + dy * distance;
    
    // Determine wall type based on which side was hit
    let wall_type = if side == 0 {
        if step_x > 0 { 3 } else { 2 } // East or West
    } else {
        if step_y > 0 { 1 } else { 0 } // South or North
    };
    
    RaycastResult {
        distance,
        wall_type,
        hit_x,
        hit_y,
        passed_exit,
        exit_threshold_dist,
    }
}


pub fn get_ascii_char(distance: f64, wall_type: u8, max_distance: f64) -> char {
    let normalized_dist = (distance / max_distance).min(1.0);
    
    // Choose character based on distance and wall type
    if normalized_dist < 0.1 {
        match wall_type {
            0 => '█', // North
            1 => '█', // South
            2 => '█', // West
            3 => '█', // East
            _ => '█',
        }
    } else if normalized_dist < 0.3 {
        match wall_type {
            0 => '▓',
            1 => '▓',
            2 => '▓',
            3 => '▓',
            _ => '▓',
        }
    } else if normalized_dist < 0.5 {
        '▒'
    } else if normalized_dist < 0.7 {
        '░'
    } else {
        '·'
    }
}

#[allow(dead_code)]
pub fn get_color(distance: f64, max_distance: f64) -> u8 {
    let normalized_dist = (distance / max_distance).min(1.0);
    // Return brightness level (0-255, but we'll use 0-5 for terminal colors)
    if normalized_dist < 0.2 {
        5 // Very bright
    } else if normalized_dist < 0.4 {
        4
    } else if normalized_dist < 0.6 {
        3
    } else if normalized_dist < 0.8 {
        2
    } else {
        1 // Dark
    }
}

