/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Ported from Dither3D by Rune Skovbo Johansen
 * Original: https://github.com/runevision/Dither3D
 * 
 * This module implements surface-stable fractal dithering using Bayer matrices
 * for use in ASCII-based raycasting rendering.
 */

pub mod bayer;
pub mod pattern;

pub use pattern::DitherPattern;

