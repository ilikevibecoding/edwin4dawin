# The WR / ISO prefix + decreasing tail reduction: an exact certificate

Erdős Problem #993 asks whether the independent-set sequence `p_0, ..., p_alpha`
of every tree (forest) is unimodal.  The project's handoff reduces this to a
one-sided inequality (`ISO_r`) on a *prefix* of indices, using a known theorem
for the *tail*.  This note certifies the reduction itself — exactly, with every
edge case — and says nothing about the open core (proving `ISO_r` for forests).

Companion files (all exact arithmetic, deterministic, no git):

* `replay_wr_iso_tail_logic.py` — sympy identities, exact integer predicates,
  validation (a)–(d), sharpness (i)–(iii); prints `PASS_...` markers and
  finally `PASS_WR_ISO_TAIL_LEMMA_REPLAY`; runs in about 5 s.
* `results/replay_wr_iso_tail_logic.json` — every count quoted below and every
  sympy-verified identity as a string.
* `forest_indep.py` — the core library (forest enumeration, polynomials,
  `L_cutoff`, `Q_iso`, `wr_slack`, `is_unimodal`); read-only here.

## 0. Conventions

* `p = (p_0, ..., p_alpha)`, `alpha >= 0`, positive integers.
* For `alpha >= 1`: `L = L(alpha) = ceil((2 alpha - 1)/3)`; in integers
  `L = (2 alpha + 1) // 3`.  Values: `L(1) = L(2) = 1`, `L(3) = 2`,
  `L(4) = L(5) = 3`, `L(6) = 4`, `L(7) = L(8) = 5`, `L(14) = 9`.
  Always `1 <= L <= alpha` (because `2 alpha - 1 <= 3 alpha`), so every index
  used below exists.  For `alpha = 0` put `L = 0`; both ranges below are empty.
* Prefix indices: `1 <= r <= L - 1`.  Tail indices: `L <= r <= alpha - 1`.
* `WR_r`:  `p_{r-1} <= r p_r`.
* `ISO_r`: `Q_r := r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0`.
* `TAIL`:  `p_r >= p_{r+1}` for all tail indices `r` (for forests this is the
  Levit–Mandrescu decreasing-tail theorem, *Partial unimodality for
  independence polynomials of König–Egerváry graphs*, Congr. Numer. 179
  (2006), stated for König–Egerváry graphs, a class containing every bipartite
  graph and hence every forest — not for arbitrary graphs, whose analogue is
  Basit–Galvin 2021, Theorem 3; here it is an assumption).
* Unimodal: there is an `m` in `{0, ..., alpha}` with
  `p_0 <= p_1 <= ... <= p_m >= p_{m+1} >= ... >= p_alpha`.  Plateaus are allowed
  anywhere (this is exactly what `forest_indep.is_unimodal` computes; the replay
  uses the literal definition and cross-checks the two on every sequence).
* Step `r` (from index `r-1` to `r`) is an *ascent* if `p_{r-1} < p_r` and a
  *weak descent* if `p_r <= p_{r-1}` (plateau or strict descent).

## 1. The one-step identities (sympy-verified)

### 1.1 Ratio form — the handoff's argument

For real `r` and `x > 0`

    r x + 1/x - (r + 1) = (r x - 1)(x - 1) / x .                      (I)

`sympy.simplify(lhs - rhs) == 0`.  Consequently, for `r >= 1` and
`x in [1/r, 1]`: `r x - 1 >= 0`, `x - 1 <= 0`, `x > 0`, hence

    r x + 1/x <= r + 1,   with equality iff x in {1/r, 1}.

Sympy certificate of the sign: with `x = 1/r + t (1 - 1/r)`, `t in [0, 1]`
(this parametrises exactly `[1/r, 1]` when `r >= 1`),

    (r x - 1)(x - 1) = t (t - 1) (r - 1)^2 / r ,

manifestly `<= 0` on `[0, 1]`; `sympy.solve(r x + 1/x = r + 1, x)` returns
`{1, 1/r}`.  For `r = 1` the interval is the single point `x = 1` (equality).
An exact rational grid check (`r = 1..12`, 25 points per interval) agrees.

Application (`p_{r-1}, p_r, p_{r+1} > 0`): put `x = p_r / p_{r-1}`,
`y = p_{r+1} / p_r`.  Then (sympy)

    Q_r / (p_{r-1} p_r) = r x + 1/x - (r + 1) y ,

so `WR_r` is `x >= 1/r`, a weak descent is `x <= 1`, and `ISO_r` is
`(r+1) y <= r x + 1/x`.  Chaining: `(r+1) y <= r x + 1/x <= r + 1`, i.e.
`y <= 1`, i.e. `p_{r+1} <= p_r`.  A descent is never followed by an ascent.

### 1.2 Integer form — no division

Two polynomial identities, both `sympy.expand(lhs - rhs) == 0`:

    (r p_r - p_{r-1}) (p_r - p_{r-1}) = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_r        (A)

    (r+1) p_{r-1} (p_r - p_{r+1}) = Q_r + (r p_r - p_{r-1}) (p_{r-1} - p_r)          (B)

**Proposition 1 (descent propagation).**  Let `r >= 1` and let
`p_{r-1} >= 1`, `p_r`, `p_{r+1}` be integers.  If `WR_r`, `ISO_r` and
`p_r <= p_{r-1}` hold, then `p_{r+1} <= p_r`.

*Proof (integers only).*  In (B) the right-hand side is `Q_r >= 0` (`ISO_r`)
plus the product of `r p_r - p_{r-1} >= 0` (`WR_r`) and `p_{r-1} - p_r >= 0`
(weak descent); so `(r+1) p_{r-1} (p_r - p_{r+1}) >= 0`.  The factor
`(r+1) p_{r-1}` is a positive integer, so if `p_r - p_{r+1} <= -1` the left side
would be `<= -(r+1) p_{r-1} < 0`.  Hence `p_r - p_{r+1} >= 0`.  ∎

*Equivalent route via (A):* `WR_r` and the weak descent make the left side of
(A) `<= 0`, i.e. `r p_r^2 + p_{r-1}^2 <= (r+1) p_{r-1} p_r`; `ISO_r` says
`(r+1) p_{r-1} p_{r+1} <= r p_r^2 + p_{r-1}^2`; chain the two and cancel the
positive integer `(r+1) p_{r-1}`.

Remarks.  (1) The only positivity used is `p_{r-1} >= 1`.  (2) Equality
`p_{r+1} = p_r` holds iff `Q_r = 0` and (`r p_r = p_{r-1}` or `p_r = p_{r-1}`),
since both summands in (B) are non-negative.  (3) The replay also verifies the
proposition exhaustively on the box `r = 1..6`, `p_{r-1}, p_r in 1..12`,
`p_{r+1} in 1..24`: 1475 triples satisfy `WR_r`, `ISO_r` and a weak descent, and
all of them have `p_{r+1} <= p_r`.

## 2. The Lemma

**Lemma.**  Let `alpha >= 0` and let `p_0, ..., p_alpha` be positive integers.
For `alpha >= 1` let `L = ceil((2 alpha - 1)/3)` and assume

* (H1) `WR_r` and `ISO_r` for every `r` with `1 <= r <= L - 1`;
* (H2) `p_r >= p_{r+1}` for every `r` with `L <= r <= alpha - 1`.

Then `(p_r)` is unimodal.  More precisely, for `alpha >= 1` exactly one of the
following holds (for `alpha = 0` there is nothing to prove):

* (A) no weak descent occurs in the prefix: `p_0 < p_1 < ... < p_{L-1}` and
  `p_L >= p_{L+1} >= ... >= p_alpha`; the mode is at `L` if `p_{L-1} <= p_L`
  and at `L - 1` if `p_{L-1} > p_L`;
* (B) there is a first `r_0 in {1, ..., L-1}` with `p_{r_0} <= p_{r_0 - 1}`;
  then `p_0 < ... < p_{r_0 - 1} >= p_{r_0} >= p_{r_0 + 1} >= ... >= p_alpha`,
  and the mode is at `r_0 - 1`.

In particular the (first) mode index is at most `L`.

Index sanity: `ISO_r` involves `p_{r+1}`; it is only invoked for
`r <= L - 1`, and `r + 1 <= L <= alpha`.  `WR_r` involves `p_{r-1}, p_r` with
`r <= L - 1 <= alpha - 1`.  (H2) may be empty (`L = alpha`, i.e. `alpha = 1`).

**Proof.**

*Step 0: `alpha = 0`.*  A single term is unimodal (`m = 0`).  No hypotheses
are in force (both ranges are empty).

*Step 1: empty prefix, `L - 1 = 0`, i.e. `L = 1`, i.e. `alpha in {1, 2}`.*
(H1) is vacuous.  For `alpha = 1`, (H2) is vacuous too, and any two-term
sequence is unimodal: `m = 1` if `p_0 <= p_1`, else `m = 0`.  For `alpha = 2`,
(H2) says `p_1 >= p_2`; take `m = 1` if `p_0 <= p_1`, else `m = 0` (then
`p_0 > p_1 >= p_2`).  This is case (A) with `L - 1 = 0`: the statement
"`p_0 < ... < p_{L-1}`" is empty, and the "unconstrained step" is the one from
`p_0` to `p_1`.

*Step 2: `L >= 2`, i.e. `alpha >= 3`.*  Let
`S = { r : 1 <= r <= L - 1, p_r <= p_{r-1} }` be the set of weak-descent steps
in the prefix.

*Case A: `S` is empty.*  Then `p_{r-1} < p_r` for all `1 <= r <= L - 1`, so
`p` is strictly increasing on `[0, L-1]`; by (H2) it is non-increasing on
`[L, alpha]`.  The step from `L - 1` to `L` is not decided by the hypotheses:
`WR_L` is not assumed, (H2) starts at index `L`, and `ISO_{L-1}` only bounds
`p_L` above by `((L-1) p_{L-1}^2 + p_{L-2}^2) / (L p_{L-2})`, which can be
larger or smaller than `p_{L-1}`.  Both possibilities are unimodal:
if `p_{L-1} <= p_L`, then `p` is non-decreasing on `[0, L]` and non-increasing
on `[L, alpha]`, so `m = L` works;
if `p_{L-1} > p_L`, then `p` is non-decreasing on `[0, L-1]` and
`p_{L-1} > p_L >= p_{L+1} >= ... >= p_alpha`, so `m = L - 1` works.

*Case B: `S` is non-empty; let `r_0 = min S`.*  Claim: `p_r <= p_{r-1}` for
every `r` with `r_0 <= r <= L`.  Induction on `r`.  Base `r = r_0`: definition
of `S`.  Step: let `r_0 <= r <= L - 1` with `p_r <= p_{r-1}`.  Since `r` is a
prefix index, `WR_r` and `ISO_r` are available by (H1), and `p_{r-1} >= 1`;
Proposition 1 gives `p_{r+1} <= p_r`, which is the claim for `r + 1 <= L`.
The last instance is `r = L - 1` and its conclusion is `p_L <= p_{L-1}`: the
descent has been carried to index `L`, where (H2) takes over.  Altogether

    p_{r_0 - 1} >= p_{r_0} >= ... >= p_L >= p_{L+1} >= ... >= p_alpha ,

while `p_0 < p_1 < ... < p_{r_0 - 1}` by minimality of `r_0`.  Hence
`m = r_0 - 1` works.

In every case a valid `m` exists, so `p` is unimodal.  ∎

### Edge cases and what the proof uses

* `alpha = 0`: trivial, no hypotheses.  `alpha = 1`: no hypotheses at all
  (`L = 1`, both ranges empty); every pair is unimodal.  `alpha = 2`: only
  `p_1 >= p_2` is assumed.  `alpha = 3`: `L = 2`, prefix `{1}`; note that
  `WR_1` (`p_0 <= p_1`) makes a weak descent at step 1 a plateau `p_1 = p_0`,
  and then `ISO_1` (`2 p_0 p_2 <= p_1^2 + p_0^2 = 2 p_0^2`) gives `p_2 <= p_0`,
  consistent with Proposition 1.
* Plateaus.  A weak descent is `p_r <= p_{r-1}` (plateau included), and the
  conclusion of Proposition 1 is `p_{r+1} <= p_r` (plateau allowed).  Hence a
  plateau *inside the prefix* forces the sequence to be non-increasing from
  there on — a genuine consequence of (H1), not an extra assumption.  Plateaus
  at the maximum and in the tail are allowed by the definition of unimodal;
  e.g. `5 K_2` has `p = (1, 10, 40, 80, 80, 32)`, `alpha = 5`, `L = 3`, with
  the maximum spanning indices `L` and `L + 1`.
* Positivity.  The proof uses only `p_{r-1} >= 1` for prefix indices `r`, i.e.
  `p_0, ..., p_{L-2} >= 1`, to cancel `(r+1) p_{r-1}` in (B).  For independence
  sequences `p_r >= 1` for every `0 <= r <= alpha`: a maximum independent set
  `S` has `|S| = alpha >= r`, and each of its `C(alpha, r) >= 1` subsets of
  size `r` is independent.  (Do not argue "every independent set extends to a
  maximum one": that is false, e.g. the centre of the star `K_{1,m}` is a
  maximal independent set of size `1 < m = alpha`.)
* The lemma is stated for positive integers, as the project uses it.  The same
  proof works verbatim for positive reals: (A), (B) are ring identities and the
  cancellation of `(r+1) p_{r-1} > 0` is valid in any ordered field.

### What the lemma does NOT need

* No `ISO_r` for tail indices `r >= L`, and no condition of any kind at index
  `alpha` beyond `p_{alpha-1} >= p_alpha` (from (H2)).
* No `WR_r` for `r >= L`; in particular **no `WR_alpha`**.  `WR_alpha` fails for
  most forests: for `8621` of the `15206` forests with `n <= 14` (e.g. `P_3`:
  `p_1 = 3 > 2 p_2 = 2`).  `WR_{alpha-1}` can fail too: six trees on 14
  vertices with `alpha = 8`, `L = 5` have `p_6 > 7 p_7` (e.g.
  `p = (1, 14, 78, 224, 356, 307, 127, 18, 1)`, `127 > 126`), at `r = 7 >= L`.
* The 26-vertex KLYM tree `T1` (`KLYM_T1_POLY`, `alpha = 14`, `L = 9`):
  `p_13 = 51 > 14 p_14 = 14`, so `WR_14` fails, and
  `p_12 = 2979 > 13 p_13 = 663`, so `WR_13` fails as well — both in the tail
  and irrelevant to the lemma.  (The task statement's "`13 p_14 = 13`" is a
  slip; the correct comparison for `WR_14` is `14 p_14 = 14`, and `WR_14`
  fails either way.)  (H1) holds for `r = 1..8` with slacks
  `r p_r - p_{r-1} = 25, 574, 5820, 34528, 133613, 355047, 662219, 867272` and
  `Q_r = 77, 21556, 1604400, 47246056, 652521253, 4607364783, 17336077897,
  35121382848`; (H2) holds (`100144 >= 55499 >= 18683 >= 2979 >= 51 >= 1`); the
  sequence is unimodal with mode `8 = L - 1` (case A, `p_8 = 121376 > p_9 =
  100144`) even though log-concavity fails at `r = 13` (`51^2 = 2601 <
  2979 * 1`).
* No log-concavity anywhere, and nothing about how `TAIL` is proved.

## 3. Validation (from `replay_wr_iso_tail_logic.py`, seed 993)

All predicates are exact integer predicates re-implemented in the replay and
cross-checked against `forest_indep` (`L_cutoff`, `Q_iso`, `wr_slack`,
`is_unimodal`) on every sequence below; `UNIMODAL` is the literal definition
(existence of `m`).  Besides the conclusion, the replay checks the
*propagation property* (`p_r <= p_{r-1}` at a prefix index implies
`p_{r+1} <= p_r`) on every sequence.

**(a) All forests of order `n <= 14`.**  `15206` forests for `n = 0..14`
(`15205` for `n = 1..14`; counts equal OEIS A005195).  Hypotheses (H1)+(H2)
hold on all `15206`; all `15206` are unimodal; propagation holds on all;
core cross-check agrees on all.  Proof cases: `alpha = 0`: 1; empty prefix
(`alpha in {1,2}`): 7; A with `p_{L-1} <= p_L`: 1450; A with
`p_{L-1} > p_L`: 9952; B with a plateau descent: 128; B with a strict descent:
3668.  Minimum prefix `Q_r` is 4 and minimum prefix WR slack is 2 (both
`3 K_1`, `r = 1`); no forest has `Q_r = 0` or zero WR slack in the prefix.
Minimum prefix ISO ratio `(r p_r^2 + p_{r-1}^2)/((r+1) p_{r-1} p_{r+1})` is
`281/273 ≈ 1.0293`, attained by the star `K_{1,13}` at `r = 2`.

**(b) 100,000 seeded random sequences satisfying the hypotheses.**
Rejection sampler (alpha uniform in `2..7`, entries uniform in `1..M`,
`M in {2,3,5,10,30}`): `40,000` accepted out of `215,969` tried (acceptance
`18.52 %`).  Constructive sampler (alpha from a menu up to 30, magnitudes up to
`10^18`, each `p_j` chosen inside the exact integer interval allowed by `WR_j`
and `ISO_{j-1}`, tail non-increasing; strategies uniform / lower end / upper
end / near upper end / mixed): `60,000` accepted out of `70,368` attempts
(`10,368` empty-interval rejections, acceptance `85.27 %`; emptiness is genuine:
e.g. `p_{r-1} = 2, p_r = 1, r = 3` satisfy `WR_3` but `ISO_3` forces
`p_4 <= 7/8`).  All `100,000` satisfy the hypotheses, all `100,000` are
unimodal, propagation holds on all, and the core cross-check agrees on all.
Cases: `alpha = 0`: 2807; empty prefix: 27609; A(`<=`): 11968; A(`>`): 5710;
B plateau: 42037; B strict: 9869.  Equality-edge coverage: some prefix
`Q_r = 0` in 33,512 sequences; some prefix WR slack `= 0` in 34,797; a prefix
plateau in 43,598; `p_{L-1} = p_L` in 31,525; a tail plateau in 65,282.

**(c) The hypotheses do work.**  200,000 seeded random sequences with
`alpha in 3..8` and entries in `1..V`, `V in {3,5,10,20}`.  Of the `16,688`
sequences that satisfy TAIL and every prefix `WR_r` but violate exactly one
prefix `ISO_r`, `6,534` are **not** unimodal (`4,167` distinct sequences;
by alpha: 4: 2231, 5: 1105, 6: 1606, 7: 1130, 8: 462).  Of the `3,314` that
satisfy TAIL and every prefix `ISO_r` but violate exactly one prefix `WR_r`,
`533` are **not** unimodal (`424` distinct; by alpha: 3: 279, 4: 185, 5: 47,
6: 17, 7: 5).  The `12,217` sampled sequences satisfying all hypotheses were
all unimodal.  Smallest witnesses: `(1, 2, 1, 2, 1)` (`alpha = 4`, `L = 3`;
`WR_1, WR_2, ISO_1`, TAIL hold, `ISO_2` fails with `Q_2 = -6`) and
`(4, 1, 2, 1)` (`alpha = 3`, `L = 2`; `ISO_1` holds with `Q_1 = 1`, TAIL
holds, `WR_1` fails).  Exhaustive tiny boxes confirm the pattern
deterministically: `alpha = 3`, entries `1..6` (1296 sequences): 303 satisfy
all hypotheses (0 non-unimodal), 82 single-`WR` violators (12 non-unimodal),
138 single-`ISO` violators (0 non-unimodal — for `alpha = 3`, `WR_1` gives
`p_0 <= p_1` and TAIL gives `p_2 >= p_3`, leaving no room for a valley);
`alpha = 4`, entries `1..6` (7776): 596 / 0, single-`ISO` 1362 / 548,
single-`WR` 206 / 57; `alpha = 5`, entries `1..4` (4096): 176 / 0,
single-`ISO` 454 / 190, single-`WR` 41 / 10.

**(d) KLYM `T1`.**  `KLYM_T1_POLY` is reproduced from `klym_3kk_tree(4)`;
`alpha = 14`, `L = 9`, prefix `r = 1..8`; (H1) and (H2) hold (numbers in
Section 2); unimodal with mode 8; log-concavity fails exactly at `r = 13`;
`WR` fails exactly at `r in {13, 14}`; `ISO_r` happens to hold for all
`r = 1..13` (not needed).

## 4. Sharpness remarks (sympy-verified)

**(i) Edgeless forest `n K_1`** (`p_r = C(n, r)`, `alpha = n`).  With
`C(n,r)/C(n,r-1) = (n-r+1)/r` and `C(n,r+1)/C(n,r-1) = (n-r+1)(n-r)/(r(r+1))`
(both `sympy.combsimp`), the ISO ratio is

    rho_r(n) = (r C(n,r)^2 + C(n,r-1)^2) / ((r+1) C(n,r-1) C(n,r+1))
             = (1 + r/(n-r+1)^2) (1 + 1/(n-r))
             = 1 + (n+1) / ((n-r+1)(n-r)) ,

`sympy.simplify(combsimp(...)) == 0` for both equalities, and an exact
`Fraction` check for all `n <= 40`, `1 <= r <= n-1`.  `rho_r(n)` is strictly
increasing in `r`, so over the prefix its minimum is at `r = 1`:
`1 + (n+1)/(n(n-1)) -> 1`; at the end of the prefix, `r ≈ 2n/3`, it is
`1 + 9/n + O(1/n^2) -> 1` (sympy limits equal 1).  Hence the infimum of the ISO
ratio over forests and prefix indices is 1: `ISO_r` cannot be strengthened to
`r p_r^2 + p_{r-1}^2 >= c (r+1) p_{r-1} p_{r+1}` with any constant `c > 1`
uniformly.

**(ii) Star `K_{1,m}`** (`p_0 = 1`, `p_1 = m+1`, `p_k = C(m,k)` for `k >= 2`,
`alpha = m`; polynomial `(1+x)^m + x`, checked against the core for
`m <= 14`).  At `r = 2` (a prefix index iff `m >= 4`):

    Q_2 = 2 m^2 + m + 1                                   (sympy expand)
    rho_2(m) = (m^4 - 2m^3 + 3m^2 + 4m + 2) / (m^4 - 2m^3 - m^2 + 2m)
             = 1 + 2 (2m^2 + m + 1) / (m (m-1) (m-2) (m+1))
             = 1 + 4/m^2 + 10/m^3 + 26/m^4 + 54/m^5 + O(m^-6)   (sympy series at m = oo)

so the ratio is `1 + O(1/m^2)`, closer to 1 than the edgeless `1 + O(1/n)`.
Exact integer check `Q_2 = 2m^2 + m + 1` for `m = 3..40`.  Consistently, in
(a) the minimum prefix ratio among forests of order `n` is the edgeless forest
at `r = 1` for `n <= 6` and the star `K_{1,n-1}` at `r = 2` for `7 <= n <= 14`
(`n = 14`: `281/273`, which is `rho_2(13)`).

**(iii) Cutoff data, all forests `1 <= n <= 12` (2948 forests).**

* No `WR_r` or `ISO_r` failure occurs inside any prefix (as in (a)).
* `ISO_r` never fails at *any* `r = 1..alpha-1` for any forest with `n <= 12`
  (nor for `n <= 14`: `15206/15206`; nor for KLYM `T1`).  Data only, not
  needed.
* `WR_r` first fails at `r = 2` for `P_3` (`p = (1, 3, 1)`, `alpha = 2 = r`),
  and for `n <= 12` it fails only at `r = alpha`; the first failures at
  `r = alpha - 1` appear at `n = 14` (the six trees above), and KLYM `T1` has
  `WR_13` failing with `alpha = 14`.

| alpha | L | forests | WR fails somewhere | min first WR-fail r | ISO fails | max first-mode index | L − max first-mode |
|---|---|---|---|---|---|---|---|
| 1 | 1 | 2 | 0 | – | 0 | 1 | 0 |
| 2 | 1 | 5 | 1 | 2 | 0 | 1 | 0 |
| 3 | 2 | 13 | 3 | 3 | 0 | 2 | 0 |
| 4 | 3 | 39 | 11 | 4 | 0 | 3 | 0 |
| 5 | 3 | 127 | 46 | 5 | 0 | 3 | 0 |
| 6 | 4 | 467 | 191 | 6 | 0 | 4 | 0 |
| 7 | 5 | 1004 | 550 | 7 | 0 | 4 | 1 |
| 8 | 5 | 852 | 498 | 8 | 0 | 5 | 0 |
| 9 | 6 | 345 | 175 | 9 | 0 | 5 | 1 |
| 10 | 7 | 81 | 24 | 10 | 0 | 5 | 2 |
| 11 | 7 | 12 | 1 | 11 | 0 | 6 | 1 |
| 12 | 8 | 1 | 0 | – | 0 | 6 | 2 |

Reading the table in both directions:

* *Larger cutoff* `L'' > L` (longer prefix, shorter tail): (H1) would then be
  needed for `r in [L, L''-1]`.  On this data `ISO_r` would survive any
  extension, and `WR_r` survives up to `r = alpha - 1` — but not in general:
  `WR_{alpha-1}` fails for six 14-vertex trees and `WR_13` fails for KLYM `T1`
  (`alpha = 14`, `L = 9`).  So a prefix reaching `alpha - 1` is not available
  from `WR`; the true constraint on how far the prefix may extend is where
  `WR` starts failing in the tail.
* *Smaller cutoff* `L' < L` (shorter prefix, longer tail): this removes
  `WR`/`ISO` requirements (they cannot fail by being dropped) but asks TAIL from
  `L'`, which holds iff `L' >=` the first mode index.  The last column is the
  slack: it is `0` for `alpha in {1,...,6, 8}` — some forest has its first mode
  exactly at `L(alpha)` (witnesses: `K_2`: `(1,2)`; `2K_1`: `(1,2,1)`;
  `K_2 + 2K_1`: `(1,4,5,2)`; `3K_2 + K_1`: `(1,7,18,20,8)`;
  `K_2 + 4K_1`: `(1,6,14,16,9,2)`; `3K_2 + 3K_1`: `(1,9,33,63,66,36,8)`;
  `3K_2 + 5K_1`: `(1,11,52,138,225,231,146,52,8)`), so for those alpha the
  cutoff cannot be lowered at all without TAIL failing.  The positive slacks at
  `alpha in {7, 9, 10, 11, 12}` only reflect the scarcity of forests with
  `n <= 12` and large `alpha` (e.g. `alpha = 12` is `12 K_1` alone).

## 5. Running the replay

    python3 replay_wr_iso_tail_logic.py

Prints `PASS_L_CUTOFF_DEFINITION`, `PASS_IDENTITIES`, `PASS_FORESTS_N_LE_14`,
`PASS_RANDOM_100000_HYPOTHESES_IMPLY_UNIMODAL`,
`PASS_NECESSITY_SINGLE_HYPOTHESIS_DROPPED`, `PASS_KLYM_T1_HYPOTHESES_HOLD`,
`PASS_SHARPNESS`, then `PASS_WR_ISO_TAIL_LEMMA_REPLAY` (exit code 0), and
writes `results/replay_wr_iso_tail_logic.json`.  Python 3.12, sympy 1.14.
