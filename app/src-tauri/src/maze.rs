use std::collections::HashSet;

pub struct Maze {
    pub width: usize,
    pub height: usize,
    pub cells: Vec<Vec<bool>>, // true = wall, false = empty
}

impl Maze {
    pub fn new(width: usize, height: usize) -> Self {
        let mut maze = Maze {
            width,
            height,
            cells: vec![vec![true; width]; height],
        };
        maze.generate();
        maze
    }

    fn generate(&mut self) {
        // Recursive backtracking algorithm
        let mut stack: Vec<(usize, usize)> = Vec::new();
        let mut visited: HashSet<(usize, usize)> = HashSet::new();
        
        // Start at (1, 1) - ensure it's a path
        let start = (1, 1);
        // Exit is on the bottom edge
        let exit = (self.width - 2, self.height - 1);
        self.cells[start.1][start.0] = false;
        visited.insert(start);
        stack.push(start);

        let mut rng_seed = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos() as u64;
        
        // Track if we've reached the exit
        let mut exit_reached = false;
        
        while let Some(current) = stack.pop() {
            // Check if we've reached the exit area
            if current == exit || 
               (current.0 == exit.0 && current.1 == exit.1 - 1) ||
               (current.0 == exit.0 - 1 && current.1 == exit.1) {
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
        // Place exit on the bottom edge (y = height - 1)
        let exit_x = exit.0;
        let exit_y = self.height - 1;
        // Make sure the exit cell and the wall opening are clear
        self.cells[exit_y][exit_x] = false;
        // Also clear the cell just before the exit to ensure path
        if exit_y > 0 {
            self.cells[exit_y - 1][exit_x] = false;
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


