// Exact low-memory arithmetic core for cubic e=3 mixed-boundary Newton scans.
//
// Matching-vector coefficients remain checked i128.  Only the final residual
// products and Newton differences require a wider type.  Z is a checked signed
// 256-bit integer (sign plus four little-endian u64 magnitude limbs).

type V = [i128; 9];

fn ai(a: i128, b: i128) -> i128 { a.checked_add(b).expect("i128 add overflow") }
fn si(a: i128, b: i128) -> i128 { a.checked_sub(b).expect("i128 sub overflow") }
fn mi(a: i128, b: i128) -> i128 { a.checked_mul(b).expect("i128 mul overflow") }

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Z {
    negative: bool,
    limbs: [u64; 4],
}

impl Z {
    pub const fn zero() -> Z { Z { negative: false, limbs: [0; 4] } }

    pub fn from_i128(value: i128) -> Z {
        let magnitude = value.unsigned_abs();
        Z {
            negative: value < 0,
            limbs: [magnitude as u64, (magnitude >> 64) as u64, 0, 0],
        }.normalized()
    }

    fn normalized(mut self) -> Z {
        if self.limbs == [0; 4] { self.negative = false; }
        self
    }

    pub fn is_zero(self) -> bool { self.limbs == [0; 4] }
    pub fn is_negative(self) -> bool { self.negative }
    pub fn is_positive(self) -> bool { !self.negative && !self.is_zero() }

    fn abs_cmp(self, other: Z) -> std::cmp::Ordering {
        for index in (0..4).rev() {
            match self.limbs[index].cmp(&other.limbs[index]) {
                std::cmp::Ordering::Equal => {},
                ordering => return ordering,
            }
        }
        std::cmp::Ordering::Equal
    }

    pub fn cmp(self, other: Z) -> std::cmp::Ordering {
        match (self.negative, other.negative) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            (false, false) => self.abs_cmp(other),
            (true, true) => other.abs_cmp(self),
        }
    }

    fn add_magnitudes(left: [u64; 4], right: [u64; 4]) -> [u64; 4] {
        let mut out = [0_u64; 4];
        let mut carry = 0_u128;
        for index in 0..4 {
            let total = left[index] as u128 + right[index] as u128 + carry;
            out[index] = total as u64;
            carry = total >> 64;
        }
        assert_eq!(carry, 0, "i256 add overflow");
        out
    }

    // Precondition: left >= right as unsigned four-limb magnitudes.
    fn sub_magnitudes(left: [u64; 4], right: [u64; 4]) -> [u64; 4] {
        let mut out = [0_u64; 4];
        let mut borrow = 0_u128;
        for index in 0..4 {
            let subtrahend = right[index] as u128 + borrow;
            let minuend = left[index] as u128;
            if minuend >= subtrahend {
                out[index] = (minuend - subtrahend) as u64;
                borrow = 0;
            } else {
                out[index] = ((1_u128 << 64) + minuend - subtrahend) as u64;
                borrow = 1;
            }
        }
        assert_eq!(borrow, 0, "i256 magnitude subtraction underflow");
        out
    }

    pub fn add(self, other: Z) -> Z {
        if self.negative == other.negative {
            Z {
                negative: self.negative,
                limbs: Z::add_magnitudes(self.limbs, other.limbs),
            }.normalized()
        } else {
            match self.abs_cmp(other) {
                std::cmp::Ordering::Greater | std::cmp::Ordering::Equal => Z {
                    negative: self.negative,
                    limbs: Z::sub_magnitudes(self.limbs, other.limbs),
                }.normalized(),
                std::cmp::Ordering::Less => Z {
                    negative: other.negative,
                    limbs: Z::sub_magnitudes(other.limbs, self.limbs),
                }.normalized(),
            }
        }
    }

    pub fn negated(mut self) -> Z {
        if !self.is_zero() { self.negative = !self.negative; }
        self
    }

    pub fn sub(self, other: Z) -> Z { self.add(other.negated()) }

    pub fn mul_i128(self, other: i128) -> Z {
        if self.is_zero() || other == 0 { return Z::zero(); }
        let magnitude = other.unsigned_abs();
        let rhs = [magnitude as u64, (magnitude >> 64) as u64];
        let mut wide = [0_u64; 6];
        for left_index in 0..4 {
            let mut carry = 0_u128;
            for right_index in 0..2 {
                let out_index = left_index + right_index;
                let total = self.limbs[left_index] as u128 * rhs[right_index] as u128
                    + wide[out_index] as u128 + carry;
                wide[out_index] = total as u64;
                carry = total >> 64;
            }
            let mut out_index = left_index + 2;
            while carry != 0 {
                assert!(out_index < 6, "i256 multiplication scratch overflow");
                let total = wide[out_index] as u128 + carry;
                wide[out_index] = total as u64;
                carry = total >> 64;
                out_index += 1;
            }
        }
        assert_eq!(wide[4], 0, "i256 multiplication overflow limb 4");
        assert_eq!(wide[5], 0, "i256 multiplication overflow limb 5");
        Z {
            negative: self.negative ^ (other < 0),
            limbs: [wide[0], wide[1], wide[2], wide[3]],
        }.normalized()
    }

    pub fn decimal(self) -> String {
        if self.is_zero() { return "0".to_string(); }
        let mut work = self.limbs;
        let mut chunks: Vec<u32> = Vec::new();
        const BASE: u128 = 1_000_000_000;
        while work != [0; 4] {
            let mut remainder = 0_u128;
            for index in (0..4).rev() {
                let current = (remainder << 64) | work[index] as u128;
                work[index] = (current / BASE) as u64;
                remainder = current % BASE;
            }
            chunks.push(remainder as u32);
        }
        let mut out = if self.negative { "-".to_string() } else { String::new() };
        out.push_str(&chunks.pop().unwrap().to_string());
        while let Some(chunk) = chunks.pop() { out.push_str(&format!("{:09}", chunk)); }
        out
    }
}

fn zterm(constant: i128, factors: &[i128]) -> Z {
    let mut out = Z::from_i128(constant);
    for &factor in factors { out = out.mul_i128(factor); }
    out
}

fn one() -> V { let mut x = [0; 9]; x[0] = 1; x }
fn zero() -> V { [0; 9] }

fn choose(n: i32, k: i32) -> i128 {
    if k < 0 || n < k { return 0; }
    let mut value = 1_i128;
    for j in 0..k { value = mi(value, (n-j) as i128) / (j+1) as i128; }
    value
}

fn path(n: i32) -> V {
    if n == -1 { return one(); }
    if n <= -2 { return zero(); }
    let mut out = [0_i128; 9];
    for r in 0..9_i32 { out[r as usize] = choose(n-r+1, r); }
    out
}

fn add(a: &V, b: &V) -> V {
    let mut out = [0; 9];
    for k in 0..9 { out[k] = ai(a[k], b[k]); }
    out
}

fn mul(a: &V, b: &V) -> V {
    let mut out = [0; 9];
    for i in 0..9 {
        for j in 0..(9-i) { out[i+j] = ai(out[i+j], mi(a[i], b[j])); }
    }
    out
}

fn product(factors: &[V]) -> V {
    let mut out = one();
    for factor in factors { out = mul(&out, factor); }
    out
}

fn shifted(a: &V, amount: usize) -> V {
    let mut out = [0; 9];
    for k in amount..9 { out[k] = a[k-amount]; }
    out
}

#[derive(Clone, Copy, Default)]
struct L { u:i32, v:i32, a1:i32, a2:i32, m:i32, b1:i32, b2:i32, near:i32, tail:i32 }

fn core(l: &L) -> V {
    let mut out = [0; 9];
    for left in 0..2_i32 { for middle in 0..2_i32 { for right in 0..2_i32 {
        let row = shifted(&product(&[
            path(l.a1-left), path(l.a2-left), path(l.m-middle),
            path(l.b1-right), path(l.b2-right),
            path(l.u-1-left-middle), path(l.v-1-middle-right),
        ]), (left+middle+right) as usize);
        out = add(&out, &row);
    }}}
    out
}

fn deleted_outer_branch(l: &L) -> V {
    let mut out = [0; 9];
    for middle in 0..2_i32 { for right in 0..2_i32 {
        let row = shifted(&product(&[
            path(l.a1), path(l.a2), path(l.u-1-middle), path(l.m-middle),
            path(l.v-1-middle-right), path(l.b1-right), path(l.b2-right),
        ]), (middle+right) as usize);
        out = add(&out, &row);
    }}
    out
}

fn deleted_middle_branch(l: &L) -> V {
    let mut out = [0; 9];
    for left in 0..2_i32 { for right in 0..2_i32 {
        let row = shifted(&product(&[
            path(l.m), path(l.a1-left), path(l.a2-left), path(l.u-1-left),
            path(l.b1-right), path(l.b2-right), path(l.v-1-right),
        ]), (left+right) as usize);
        out = add(&out, &row);
    }}
    out
}

fn deleted_outer_leaf(l: &L) -> V {
    let mut out = [0; 9];
    for left in 0..2_i32 { for middle in 0..2_i32 { for right in 0..2_i32 {
        let row = shifted(&product(&[
            path(l.a1-1-left), path(l.a2-left), path(l.m-middle),
            path(l.b1-right), path(l.b2-right),
            path(l.u-1-left-middle), path(l.v-1-middle-right),
        ]), (left+middle+right) as usize);
        out = add(&out, &row);
    }}}
    out
}

fn deleted_middle_leaf(l: &L) -> V {
    let mut out = [0; 9];
    for left in 0..2_i32 { for middle in 0..2_i32 { for right in 0..2_i32 {
        let row = shifted(&product(&[
            path(l.a1-left), path(l.a2-left), path(l.m-1-middle),
            path(l.b1-right), path(l.b2-right),
            path(l.u-1-left-middle), path(l.v-1-middle-right),
        ]), (left+middle+right) as usize);
        out = add(&out, &row);
    }}}
    out
}

fn deleted_outer_pendant_internal(l: &L) -> V {
    let mut out = [0; 9];
    for left in 0..2_i32 { for middle in 0..2_i32 { for right in 0..2_i32 {
        let row = shifted(&product(&[
            path(l.tail), path(l.near-left), path(l.a2-left), path(l.m-middle),
            path(l.b1-right), path(l.b2-right),
            path(l.u-1-left-middle), path(l.v-1-middle-right),
        ]), (left+middle+right) as usize);
        out = add(&out, &row);
    }}}
    out
}

fn deleted_middle_pendant_internal(l: &L) -> V {
    let mut out = [0; 9];
    for left in 0..2_i32 { for middle in 0..2_i32 { for right in 0..2_i32 {
        let row = shifted(&product(&[
            path(l.tail), path(l.near-middle), path(l.a1-left), path(l.a2-left),
            path(l.b1-right), path(l.b2-right),
            path(l.u-1-left-middle), path(l.v-1-middle-right),
        ]), (left+middle+right) as usize);
        out = add(&out, &row);
    }}}
    out
}

fn deleted_spine_internal(l: &L) -> V {
    let mut out = [0; 9];
    for left in 0..2_i32 { for middle in 0..2_i32 { for right in 0..2_i32 {
        let row = shifted(&product(&[
            path(l.near-left), path(l.tail-middle), path(l.a1-left), path(l.a2-left),
            path(l.m-middle), path(l.b1-right), path(l.b2-right),
            path(l.v-1-middle-right),
        ]), (left+middle+right) as usize);
        out = add(&out, &row);
    }}}
    out
}

fn choose_small(n: usize, k: usize) -> i128 {
    if k > n { return 0; }
    let mut x = 1_i128;
    for j in 0..k { x = mi(x, (n-j) as i128) / (j+1) as i128; }
    x
}

fn residual(c: &V, h: &V, siblings: usize) -> Z {
    let mut p7 = h[6];
    let mut p8 = h[7];
    let mut open9 = 0_i128;
    for j in 0..=7 { p7 = ai(p7, mi(c[7-j], choose_small(siblings, j))); }
    for j in 0..=8 { p8 = ai(p8, mi(c[8-j], choose_small(siblings, j))); }
    for j in 1..=9 { open9 = ai(open9, mi(c[9-j], choose_small(siblings, j))); }
    let q8 = si(si(mi(16, mi(p8, p8)), mi(p7, p8)), mi(18, mi(p7, open9)));
    let cq = si(mi(16, mi(c[8], c[8])), mi(c[7], c[8]));
    let hq = si(mi(14, mi(h[7], h[7])), mi(h[6], h[7]));
    zterm(8, &[c[7], h[6], q8])
        .sub(zterm(8, &[h[6], p7, cq]))
        .sub(zterm(9, &[c[7], p7, hq]))
}

fn deltas(c: &V, h: &V) -> (Z, Z) {
    let a = residual(c, h, 1);
    let b = residual(c, h, 2);
    (a, b.sub(a))
}

#[derive(Clone, Copy)]
enum Root { OuterBranch, MiddleBranch, OuterLeaf, MiddleLeaf, OuterPendant, MiddlePendant, Spine }

fn parse_root(s: &str) -> Root {
    match s {
        "outer_branch" => Root::OuterBranch,
        "middle_branch" => Root::MiddleBranch,
        "outer_leaf" => Root::OuterLeaf,
        "middle_leaf" => Root::MiddleLeaf,
        "outer_pendant_internal" => Root::OuterPendant,
        "middle_pendant_internal" => Root::MiddlePendant,
        "spine_internal" => Root::Spine,
        _ => panic!("root"),
    }
}

pub fn evaluate(root: &str, values: &[i32]) -> (Z, Z) {
    let r = parse_root(root);
    let mut l = match r {
        Root::OuterBranch | Root::OuterLeaf => L {
            a1:values[0], a2:values[1], m:values[2], b1:values[3],
            b2:values[4], u:values[5], v:values[6], ..Default::default()
        },
        Root::MiddleBranch | Root::MiddleLeaf => L {
            m:values[0], a1:values[1], a2:values[2], b1:values[3],
            b2:values[4], u:values[5], v:values[6], ..Default::default()
        },
        Root::OuterPendant => L {
            near:values[0], tail:values[1], a2:values[2], m:values[3],
            b1:values[4], b2:values[5], u:values[6], v:values[7], ..Default::default()
        },
        Root::MiddlePendant => L {
            near:values[0], tail:values[1], a1:values[2], a2:values[3],
            b1:values[4], b2:values[5], u:values[6], v:values[7], ..Default::default()
        },
        Root::Spine => L {
            near:values[0], tail:values[1], a1:values[2], a2:values[3],
            m:values[4], b1:values[5], b2:values[6], v:values[7], ..Default::default()
        },
    };
    let h = match r {
        Root::OuterBranch => deleted_outer_branch(&l),
        Root::MiddleBranch => deleted_middle_branch(&l),
        Root::OuterLeaf => deleted_outer_leaf(&l),
        Root::MiddleLeaf => deleted_middle_leaf(&l),
        Root::OuterPendant => { l.a1 = l.near + l.tail + 1; deleted_outer_pendant_internal(&l) },
        Root::MiddlePendant => { l.m = l.near + l.tail + 1; deleted_middle_pendant_internal(&l) },
        Root::Spine => { l.u = l.near + l.tail + 2; deleted_spine_internal(&l) },
    };
    deltas(&core(&l), &h)
}

