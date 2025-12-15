/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Ported from Dither3D by Rune Skovbo Johansen
 * Original: https://github.com/runevision/Dither3D
 */

use super::bayer::BayerPatterns;

/// Main dithering pattern structure that handles fractal dithering.
/// 
/// This implements distance-based fractal dithering where:
/// - Closer objects use finer patterns (8x8)
/// - Farther objects use coarser patterns (1x1)
/// - The pattern is sampled based on world-space UV coordinates
pub struct DitherPattern {
    patterns: BayerPatterns,
}

impl DitherPattern {
    /// Creates a new DitherPattern with precomputed Bayer patterns.
    pub fn new() -> Self {
        Self {
            patterns: BayerPatterns::new(),
        }
    }
    
    /// Samples the dither pattern at a given UV coordinate and brightness.
    /// 
    /// This finds the minimum distance to any Bayer point and converts it
    /// to a pattern value that can be compared against a brightness threshold.
    /// 
    /// # Arguments
    /// 
    /// * `uv` - UV coordinates in world space (typically from hit position)
    /// * `level` - Fractal level (0-3, where 3 is finest)
    /// * `dot_count` - Number of dots to use from the pattern (1 to pattern_size)
    /// 
    /// # Returns
    /// 
    /// A pattern value in [0.0, 1.0] where higher values indicate closer
    /// proximity to a Bayer point (darker in inverse mode, brighter in normal mode)
    pub fn sample_pattern(&self, uv: (f64, f64), level: usize, dot_count: usize) -> f64 {
        let bayer_points = self.patterns.get_level(level);
        let max_dots = dot_count.min(bayer_points.len());
        
        if max_dots == 0 {
            return 0.0;
        }
        
        // Calculate dot radius based on number of dots
        // This matches the Dither3D calculation: dotArea = 0.5 / dotCount
        let dot_area = 0.5 / max_dots as f64;
        let dot_radius = (dot_area / std::f64::consts::PI).sqrt();
        
        // Find minimum distance to any Bayer point
        let mut min_dist = f64::INFINITY;
        
        for i in 0..max_dots {
            let point = bayer_points[i];
            
            // Calculate wrapped distance (accounting for tiling)
            let vec = (
                (uv.0 - point.0 + 0.5).rem_euclid(1.0) - 0.5,
                (uv.1 - point.1 + 0.5).rem_euclid(1.0) - 0.5,
            );
            
            let dist = (vec.0 * vec.0 + vec.1 * vec.1).sqrt();
            min_dist = min_dist.min(dist);
        }
        
        // Normalize distance and convert to pattern value
        // The 2.4 factor matches Dither3D's normalization
        let normalized_dist = min_dist / (dot_radius * 2.4);
        (1.0 - normalized_dist).clamp(0.0, 1.0)
    }
    
    /// Selects the appropriate fractal level based on normalized distance.
    /// 
    /// Closer objects (lower normalized_dist) use finer patterns.
    /// 
    /// # Arguments
    /// 
    /// * `normalized_dist` - Distance normalized to [0.0, 1.0] where 0 is closest
    /// 
    /// # Returns
    /// 
    /// A tuple of (level, interpolation_factor) where:
    /// - level: The fractal level (0-3)
    /// - interpolation_factor: How much to blend with the next level (0.0-1.0)
    pub fn select_level(&self, normalized_dist: f64) -> (usize, f64) {
        // Map distance to level: closer = finer pattern
        // normalized_dist: 0.0 (close) -> 1.0 (far)
        // We want: close -> level 3 (8x8), far -> level 0 (1x1)
        
        let level_float = (1.0 - normalized_dist) * 3.0;
        let level = level_float.floor() as usize;
        let interp = level_float - level as f64;
        
        (level.min(3), interp)
    }
    
    /// Applies fractal dithering to a brightness value.
    /// 
    /// This is the main function used for distance-based dithering.
    /// It selects the appropriate fractal level based on distance,
    /// samples the pattern, and returns a dithered brightness.
    /// 
    /// # Arguments
    /// 
    /// * `normalized_dist` - Distance normalized to [0.0, 1.0]
    /// * `uv` - UV coordinates from world-space hit position
    /// * `brightness` - Input brightness in [0.0, 1.0]
    /// 
    /// # Returns
    /// 
    /// Dithered brightness value in [0.0, 1.0]
    pub fn dither(&self, normalized_dist: f64, uv: (f64, f64), brightness: f64) -> f64 {
        // Select fractal level based on distance
        let (level, interp) = self.select_level(normalized_dist);
        
        // Calculate dot count based on brightness
        // Higher brightness = more dots visible
        let max_dots = self.patterns.get_level(level).len();
        let dot_count = (brightness * max_dots as f64).ceil() as usize;
        let dot_count = dot_count.max(1).min(max_dots);
        
        // Sample pattern at current level
        let pattern_value = self.sample_pattern(uv, level, dot_count);
        
        // If interpolation is needed, sample next level too
        if interp > 0.001 && level < 3 {
            let next_level = level + 1;
            let next_max_dots = self.patterns.get_level(next_level).len();
            let next_dot_count = (brightness * next_max_dots as f64).ceil() as usize;
            let next_dot_count = next_dot_count.max(1).min(next_max_dots);
            
            let next_pattern_value = self.sample_pattern(uv, next_level, next_dot_count);
            
            // Interpolate between levels
            return pattern_value * (1.0 - interp) + next_pattern_value * interp;
        }
        
        pattern_value
    }
}

impl Default for DitherPattern {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_select_level() {
        let pattern = DitherPattern::new();
        
        // Close distance should use fine pattern (level 3)
        let (level, _) = pattern.select_level(0.0);
        assert_eq!(level, 3);
        
        // Far distance should use coarse pattern (level 0)
        let (level, _) = pattern.select_level(1.0);
        assert_eq!(level, 0);
        
        // Mid distance should use mid pattern
        let (level, _) = pattern.select_level(0.5);
        assert!(level >= 1 && level <= 2);
    }
    
    #[test]
    fn test_sample_pattern() {
        let pattern = DitherPattern::new();
        
        // Sample at a known point
        let value = pattern.sample_pattern((0.0, 0.0), 0, 4);
        assert!(value >= 0.0 && value <= 1.0);
        
        // Sample at different level
        let value2 = pattern.sample_pattern((0.5, 0.5), 1, 16);
        assert!(value2 >= 0.0 && value2 <= 1.0);
    }
    
    #[test]
    fn test_dither() {
        let pattern = DitherPattern::new();
        
        // Test dithering at different distances
        let close = pattern.dither(0.1, (0.0, 0.0), 0.5);
        assert!(close >= 0.0 && close <= 1.0);
        
        let far = pattern.dither(0.9, (0.5, 0.5), 0.5);
        assert!(far >= 0.0 && far <= 1.0);
    }
}

