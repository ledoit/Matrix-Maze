use std::collections::HashSet;
use std::sync::atomic::{AtomicU64, Ordering};

// Static counter to ensure unique seeds even on fast restarts
static MAZE_COUNTER: AtomicU64 = AtomicU64::new(0);

pub struct Maze {
    pub width: usize,
    pub height: usize,
    pub cells: Vec<Vec<bool>>, // true = wall, false = empty
    pub start: (usize, usize), // Starting position
    pub exit: (usize, usize), // Exit position
}

impl Maze {
    pub fn new(width: usize, height: usize) -> Self {
        let mut maze = Maze {
            width,
            height,
            cells: vec![vec![true; width]; height],
            start: (1, 1), // Default, will be set in generate()
            exit: (width - 2, height - 1), // Default, will be set in generate()
        };
        maze.generate();
        maze
    }

    fn generate(&mut self) {
        // Recursive backtracking algorithm
        let mut stack: Vec<(usize, usize)> = Vec::new();
        let mut visited: HashSet<(usize, usize)> = HashSet::new();
        
        // Generate a more random seed using multiple entropy sources
        // Combine high-precision timestamp (nanoseconds) with a counter to ensure uniqueness
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap();
        let nanos = now.as_nanos() as u64;
        
        // Increment counter atomically to ensure each maze gets a unique seed
        let counter = MAZE_COUNTER.fetch_add(1, Ordering::Relaxed);
        
        // Combine timestamp with counter and additional entropy
        use std::hash::{Hash, Hasher};
        use std::collections::hash_map::DefaultHasher;
        let mut hasher = DefaultHasher::new();
        nanos.hash(&mut hasher);
        counter.hash(&mut hasher);
        std::thread::current().id().hash(&mut hasher);
        std::process::id().hash(&mut hasher);
        
        let mut rng_seed = hasher.finish();
        
        // Pick a random edge (0=top, 1=right, 2=bottom, 3=left)
        rng_seed = rng_seed.wrapping_mul(1103515245).wrapping_add(12345);
        let edge = rng_seed as usize % 4;
        
        let exit = match edge {
            0 => { // Top edge
                rng_seed = rng_seed.wrapping_mul(1103515245).wrapping_add(12345);
                let x = 1 + (rng_seed as usize % (self.width - 2));
                (x, 0)
            },
            1 => { // Right edge
                rng_seed = rng_seed.wrapping_mul(1103515245).wrapping_add(12345);
                let y = 1 + (rng_seed as usize % (self.height - 2));
                (self.width - 1, y)
            },
            2 => { // Bottom edge
                rng_seed = rng_seed.wrapping_mul(1103515245).wrapping_add(12345);
                let x = 1 + (rng_seed as usize % (self.width - 2));
                (x, self.height - 1)
            },
            _ => { // Left edge
                rng_seed = rng_seed.wrapping_mul(1103515245).wrapping_add(12345);
                let y = 1 + (rng_seed as usize % (self.height - 2));
                (0, y)
            },
        };
        self.exit = exit;
        
        // Randomly select a starting position (not too close to exit)
        // Pick a random valid starting position (avoid edges and exit area)
        let mut start = (1, 1);
        let mut attempts = 0;
        loop {
            rng_seed = rng_seed.wrapping_mul(1103515245).wrapping_add(12345);
            let x = 1 + (rng_seed as usize % (self.width - 2));
            rng_seed = rng_seed.wrapping_mul(1103515245).wrapping_add(12345);
            let y = 1 + (rng_seed as usize % (self.height - 2));
            
            // Make sure it's not too close to exit
            let dist_to_exit = ((x as f64 - exit.0 as f64).powi(2) + (y as f64 - exit.1 as f64).powi(2)).sqrt();
            if dist_to_exit > 3.0 || attempts > 50 {
                start = (x, y);
                break;
            }
            attempts += 1;
        }
        
        self.cells[start.1][start.0] = false;
        visited.insert(start);
        stack.push(start);
        self.start = start; // Store the start position
        
        // Track if we've reached the exit
        let mut exit_reached = false;
        
        while let Some(current) = stack.pop() {
            // Check if we've reached the exit area
            if current == exit || 
               (current.0 == exit.0 && exit.1 > 0 && current.1 == exit.1 - 1) ||
               (exit.0 > 0 && current.0 == exit.0 - 1 && current.1 == exit.1) {
                exit_reached = true;
            }
            
            let neighbors = self.get_unvisited_neighbors(current, &visited);
            
            if !neighbors.is_empty() {
                stack.push(current);
                // Simple LCG random selection
                rng_seed = rng_seed.wrapping_mul(1103515245).wrapping_add(12345);
                let next = neighbors[rng_seed as usize % neighbors.len()];
                self.remove_wall_between(current, next);
                self.cells[next.1][next.0] = false;
                visited.insert(next);
                stack.push(next);
            }
        }

        // Ensure exit point is open and connected
        self.cells[exit.1][exit.0] = false;
        
        // If exit wasn't reached, connect it to the nearest visited cell
        if !exit_reached {
            // Find nearest path cell and connect
            let mut min_dist = f64::MAX;
            let mut nearest = (1, 1);
            for y in 1..self.height - 1 {
                for x in 1..self.width - 1 {
                    if !self.cells[y][x] && visited.contains(&(x, y)) {
                        let dist = ((x as f64 - exit.0 as f64).powi(2) + (y as f64 - exit.1 as f64).powi(2)).sqrt();
                        if dist < min_dist {
                            min_dist = dist;
                            nearest = (x, y);
                        }
                    }
                }
            }
            // Create a path from nearest to exit
            let mut current = nearest;
            while current != exit {
                let (cx, cy) = current;
                let (ex, ey) = exit;
                if cx < ex {
                    current = (cx + 1, cy);
                } else if cx > ex {
                    current = (cx - 1, cy);
                } else if cy < ey {
                    current = (cx, cy + 1);
                } else if cy > ey {
                    current = (cx, cy - 1);
                } else {
                    break;
                }
                self.cells[current.1][current.0] = false;
            }
        }
        
        // Create an actual opening in the outer wall at the exit
        // Clear the exit cell and adjacent cell to create opening based on which edge
        self.cells[exit.1][exit.0] = false;
        
        // Clear adjacent cell based on which edge the exit is on
        if exit.1 == 0 { // Top edge - clear cell below
            if exit.1 + 1 < self.height {
                self.cells[exit.1 + 1][exit.0] = false;
            }
        } else if exit.0 == self.width - 1 { // Right edge - clear cell to the left
            if exit.0 > 0 {
                self.cells[exit.1][exit.0 - 1] = false;
            }
        } else if exit.1 == self.height - 1 { // Bottom edge - clear cell above
            if exit.1 > 0 {
                self.cells[exit.1 - 1][exit.0] = false;
            }
        } else if exit.0 == 0 { // Left edge - clear cell to the right
            if exit.0 + 1 < self.width {
                self.cells[exit.1][exit.0 + 1] = false;
            }
        }
    }

    fn get_unvisited_neighbors(&self, pos: (usize, usize), visited: &HashSet<(usize, usize)>) -> Vec<(usize, usize)> {
        let mut neighbors = Vec::new();
        let (x, y) = pos;

        if x > 2 && !visited.contains(&(x - 2, y)) {
            neighbors.push((x - 2, y));
        }
        if x < self.width - 2 && !visited.contains(&(x + 2, y)) {
            neighbors.push((x + 2, y));
        }
        if y > 2 && !visited.contains(&(x, y - 2)) {
            neighbors.push((x, y - 2));
        }
        if y < self.height - 2 && !visited.contains(&(x, y + 2)) {
            neighbors.push((x, y + 2));
        }

        neighbors
    }

    fn remove_wall_between(&mut self, a: (usize, usize), b: (usize, usize)) {
        let (ax, ay) = a;
        let (bx, by) = b;
        let mid_x = (ax + bx) / 2;
        let mid_y = (ay + by) / 2;
        self.cells[mid_y][mid_x] = false;
    }

    pub fn is_wall(&self, x: usize, y: usize) -> bool {
        if x >= self.width || y >= self.height {
            return true;
        }
        self.cells[y][x]
    }

    pub fn get_cell(&self, x: f64, y: f64) -> bool {
        let ix = x as usize;
        let iy = y as usize;
        self.is_wall(ix, iy)
    }
}


