//! Value noise and fBm for the procedural texture toolkit, compiled to wasm32.
//!
//! This is a port of the JavaScript in `src/textures/core.js`, not a rewrite.
//! Every texture in the project and the whole terrain height field are built
//! from these two functions, so if the port were merely *similar* the world
//! would change out from under twelve iterations of tuning. It is therefore
//! bit-exact against the JS, which `tools/wasmcheck.mjs` asserts over a few
//! hundred thousand samples before the module is allowed to be used at all.
//!
//! Bit-exactness is achievable here because the arithmetic is deliberately
//! plain: 32-bit integer hashing, and f64 add/multiply/floor. IEEE 754 pins all
//! of those. The two places it could have gone wrong, and how they are handled:
//!
//!  - `core` has no `f64::floor`, so it is open-coded rather than pulled from
//!    libm, whose rounding is not guaranteed to agree with V8's.
//!  - `Math.round` rounds half towards +infinity, while Rust's `f64::round`
//!    rounds half away from zero. They disagree on negative halves. `jround`
//!    below is the JS one.
//!
//! `worley` is deliberately *not* ported: it uses `Math.hypot`, whose precision
//! is implementation-defined, so there is no way to guarantee agreement.

#![no_std]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_: &PanicInfo) -> ! {
    loop {}
}

#[inline(always)]
fn imul(a: i32, b: i32) -> i32 {
    a.wrapping_mul(b)
}

/// JS `>>>`: shift the 32-bit pattern as unsigned, keep it in an i32.
#[inline(always)]
fn ushr(v: i32, n: u32) -> i32 {
    ((v as u32) >> n) as i32
}

#[inline(always)]
fn hash2(ix: i32, iy: i32, seed: i32) -> f64 {
    let mut h = imul(ix, 374761393) ^ imul(iy, 668265263) ^ imul(seed, 1274126177);
    h = imul(h ^ ushr(h, 13), 1274126177);
    ((h ^ ushr(h, 16)) as u32) as f64 / 4294967296.0
}

/// `Math.floor` without libm. Exact for anything that fits in an i64, which is
/// every coordinate this is ever called with.
#[inline(always)]
fn ffloor(x: f64) -> f64 {
    let t = (x as i64) as f64;
    if t > x {
        t - 1.0
    } else {
        t
    }
}

/// `Math.round`: half goes towards +infinity, which is not what Rust's does.
#[inline(always)]
fn jround(x: f64) -> f64 {
    ffloor(x + 0.5)
}

#[inline(always)]
fn smooth(t: f64) -> f64 {
    t * t * (3.0 - 2.0 * t)
}

#[inline(always)]
fn value_noise(x: f64, y: f64, period: i32, seed: i32) -> f64 {
    let p = if period < 1 { 1 } else { period } as i64;
    let xi = ffloor(x);
    let yi = ffloor(y);
    let xf = x - xi;
    let yf = y - yi;
    let x0 = (((xi as i64) % p) + p) % p;
    let y0 = (((yi as i64) % p) + p) % p;
    let x1 = (x0 + 1) % p;
    let y1 = (y0 + 1) % p;
    let u = smooth(xf);
    let v = smooth(yf);
    let a = hash2(x0 as i32, y0 as i32, seed);
    let b = hash2(x1 as i32, y0 as i32, seed);
    let c = hash2(x0 as i32, y1 as i32, seed);
    let d = hash2(x1 as i32, y1 as i32, seed);
    (a * (1.0 - u) + b * u) * (1.0 - v) + (c * (1.0 - u) + d * u) * v
}

#[no_mangle]
pub extern "C" fn value_noise_at(x: f64, y: f64, period: i32, seed: i32) -> f64 {
    value_noise(x, y, period, seed)
}

#[no_mangle]
pub extern "C" fn fbm(x: f64, y: f64, octaves: i32, period: f64, seed: i32, gain: f64, lacunarity: f64) -> f64 {
    let mut sum = 0.0f64;
    let mut amp = 1.0f64;
    let mut norm = 0.0f64;
    let mut freq = 1.0f64;
    let mut per = period;
    let mut i = 0i32;
    while i < octaves {
        sum += amp * value_noise(x * freq, y * freq, per as i32, seed.wrapping_add(imul(i, 977)));
        norm += amp;
        amp *= gain;
        freq *= lacunarity;
        let r = jround(per * lacunarity);
        per = if r < 1.0 { 1.0 } else { r };
        i += 1;
    }
    sum / norm
}

/// Fill `out` with fBm over a regular grid, so a whole texture tile or a strip
/// of terrain costs one call instead of one per texel. The per-call overhead of
/// crossing into wasm is small but it is not free, and the grid case is most of
/// the work this module exists for.
///
/// Writes `w * h` f64s at `out` — the caller owns that memory and is expected to
/// have grown it via `alloc`.
#[no_mangle]
pub extern "C" fn fbm_grid(
    out: *mut f64,
    w: i32,
    h: i32,
    x0: f64,
    y0: f64,
    dx: f64,
    dy: f64,
    octaves: i32,
    period: f64,
    seed: i32,
    gain: f64,
    lacunarity: f64,
) {
    let mut j = 0i32;
    while j < h {
        let y = y0 + (j as f64) * dy;
        let mut i = 0i32;
        while i < w {
            let v = fbm(x0 + (i as f64) * dx, y, octaves, period, seed, gain, lacunarity);
            unsafe { *out.offset((j * w + i) as isize) = v };
            i += 1;
        }
        j += 1;
    }
}

/// Bump allocator over the tail of linear memory. There is no `std`, no heap and
/// nothing is ever freed — the only allocations are a handful of scratch grids
/// that live for the length of the boot.
static mut BUMP: usize = 0;

#[no_mangle]
pub extern "C" fn alloc(bytes: usize) -> *mut u8 {
    unsafe {
        if BUMP == 0 {
            // start past whatever the linker put at the bottom of memory
            BUMP = 65536;
        }
        // f64 alignment
        BUMP = (BUMP + 7) & !7usize;
        let p = BUMP;
        BUMP += bytes;
        let have = core::arch::wasm32::memory_size(0) * 65536;
        if BUMP > have {
            let need = (BUMP - have + 65535) / 65536;
            if core::arch::wasm32::memory_grow(0, need) == usize::MAX {
                return core::ptr::null_mut();
            }
        }
        p as *mut u8
    }
}
