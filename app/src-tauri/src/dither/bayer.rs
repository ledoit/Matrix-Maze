/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Ported from Dither3D by Rune Skovbo Johansen
 * Original: https://github.com/runevision/Dither3D
 */

/// Generates Bayer matrix points recursively for fractal dithering.
/// 
/// The base pattern consists of 4 points, and each recursion level
/// adds more points in a fractal pattern. This creates a self-similar
/// structure that allows for smooth scaling.
/// 
/// # Arguments
/// 
/// * `recursion` - The recursion level (0 = 1x1, 1 = 2x2, 2 = 4x4, 3 = 8x8)
/// 
/// # Returns
/// 
/// A vector of (x, y) coordinates in the range [0.0, 1.0)
pub fn generate_bayer_points(recursion: usize) -> Vec<(f64, f64)> {
    // Base pattern: 4 points forming the initial 2x2 Bayer matrix
    let mut points = vec![
        (0.0, 0.0),
        (0.5, 0.5),
        (0.5, 0.0),
        (0.0, 0.5),
    ];
    
    // Recursively subdivide for higher levels
    for r in 0..recursion.saturating_sub(1) {
        let count = points.len();
        let offset = 0.5_f64.powi((r + 1) as i32);
        
        // For each of the 3 offset vectors (skip the first which is (0,0))
        for i in 1..4 {
            for j in 0..count {
                let base = points[j];
                let offset_vec = points[i];
                points.push((
                    base.0 + offset_vec.0 * offset,
                    base.1 + offset_vec.1 * offset,
                ));
            }
        }
    }
    
    points
}

/// Precomputed Bayer points for different recursion levels.
/// These are generated at compile time for performance.
pub struct BayerPatterns {
    pub level_0: Vec<(f64, f64)>, // 1x1 (4 points)
    pub level_1: Vec<(f64, f64)>, // 2x2 (16 points)
    pub level_2: Vec<(f64, f64)>, // 4x4 (64 points)
    pub level_3: Vec<(f64, f64)>, // 8x8 (256 points)
}

impl BayerPatterns {
    /// Creates a new BayerPatterns instance with precomputed patterns.
    pub fn new() -> Self {
        Self {
            level_0: generate_bayer_points(0),
            level_1: generate_bayer_points(1),
            level_2: generate_bayer_points(2),
            level_3: generate_bayer_points(3),
        }
    }
    
    /// Gets the Bayer points for a specific level.
    /// 
    /// # Arguments
    /// 
    /// * `level` - The fractal level (0-3)
    /// 
    /// # Returns
    /// 
    /// A reference to the Bayer points for that level
    pub fn get_level(&self, level: usize) -> &[(f64, f64)] {
        match level {
            0 => &self.level_0,
            1 => &self.level_1,
            2 => &self.level_2,
            3 => &self.level_3,
            _ => &self.level_3, // Default to finest level
        }
    }
    
    /// Gets the number of dots per side for a given level.
    pub fn dots_per_side(&self, level: usize) -> usize {
        match level {
            0 => 1,
            1 => 2,
            2 => 4,
            3 => 8,
            _ => 8,
        }
    }
}

impl Default for BayerPatterns {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_bayer_level_0() {
        let points = generate_bayer_points(0);
        assert_eq!(points.len(), 4);
    }
    
    #[test]
    fn test_bayer_level_1() {
        let points = generate_bayer_points(1);
        assert_eq!(points.len(), 16); // 4 * 4
    }
    
    #[test]
    fn test_bayer_level_2() {
        let points = generate_bayer_points(2);
        assert_eq!(points.len(), 64); // 16 * 4
    }
    
    #[test]
    fn test_bayer_level_3() {
        let points = generate_bayer_points(3);
        assert_eq!(points.len(), 256); // 64 * 4
    }
    
    #[test]
    fn test_bayer_patterns() {
        let patterns = BayerPatterns::new();
        assert_eq!(patterns.level_0.len(), 4);
        assert_eq!(patterns.level_1.len(), 16);
        assert_eq!(patterns.level_2.len(), 64);
        assert_eq!(patterns.level_3.len(), 256);
    }
}

