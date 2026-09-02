# Structured-family and random-tree ISO/WR stress test (Erdős #993)

Script: `families_stress.py` (exact arithmetic only, seed 993, single process).
Results: `results/families_stress.json` (2.6 MB; per-family summaries, per-member
rows, construction checks, all prefix failures — the failure list is empty).
Full run: 303 s wall clock on one core of the shared machine (`python3 families_stress.py`);
two independent full runs produced byte-identical results apart from timings;
`--quick` runs a 4 s smoke test.  Finite testing is falsification evidence only;
nothing below is a proof.

Framework audited (as in `forest_indep.py`): `L(alpha) = ceil((2 alpha - 1)/3)`,
prefix = `1 <= r <= L-1`, `WR_r: p_{r-1} <= r p_r`,
`ISO_r: Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0`,
ISO ratio `= (r p_r^2 + p_{r-1}^2) / ((r+1) p_{r-1} p_{r+1})` (ISO holds iff ratio >= 1).
Every polynomial comes from `indep_poly_from_edges` (exact DP; the stars additionally
use the closed form `(1+x)^m + x`, cross-checked against the DP for 530 values of `m`),
every sequence goes through `audit_sequence(p, with_ratio=True)`, and the argmin
bookkeeping in `analyze()` is cross-asserted against the library's `iso_prefix_ratio_min`,
`iso_prefix_min`, `wr_prefix_min` for every sequence.

## 1. Headline

* **No WR failure and no ISO failure inside the prefix in any of the 455 862 audited
  sequences** (trees, forests, random trees, every graph evaluated by the local
  searches, and the 50 000 PatternBoost trees).  `prefix_failures_total = 0`.
* All sequences unimodal; the tail property `p_r >= p_{r+1}` for `r >= L` held everywhere.
* Non-log-concave members occur only in the KLYM, Galvin, Bencs, union, fixed-n
  (one Galvin tree) and PatternBoost families, and **every LC break is in the tail**:
  min over all breaks of `r - L(alpha)` is **+4** (smallest non-LC members: the
  26-vertex KLYM T1 and Galvin `T_{3,4,1}`, both break at `alpha - 1 = 13`/`14` with
  `L = 9`/`10`).  No member has an LC break inside the prefix.
* Global minimum prefix ISO ratio: the star `K_{1,2000}` at `r = 2`,
  `7992006004001 / 7991998002000 = 1 + 8002001/7991998002000 ≈ 1 + 1.0013e-6`
  (`Q_2 = 2m^2 + m + 1 = 8 002 001`).  Order by order (`star_comparison_by_order` in the
  JSON: for every order `n` occurring anywhere in the run, the smallest `r = 2` ratio over
  all audited sequences of that order vs. `K_{1,n-1}`): **no tree of any order and no forest
  of order `n >= 6` has an `r = 2` ratio below the star of the same order**; the single
  exception is `n = 5`, where the edgeless forest `E_5` (`3/2`) beats `K_{1,4}` (`97/60`).
  At `r >= 3` some shapes beat the star by a constant factor in the `1/n` term (Section 5).
* WR is never close to tight: the smallest prefix value of `r p_r / p_{r-1}` over the
  whole run is `12/5 = 2.4` (`K_{1,4}`, `r = 2`); every other family has min `>= 2.4`
  (Table B).  The WR slack `r p_r - p_{r-1}` grows with `n`; its minima are attained by
  the smallest members of each family (all `r = 1`).

## 2. Construction and literature checks (all exact)

| check | result |
|---|---|
| Stars: `Q_2(K_{1,m}) = 2m^2 + m + 1` | verified for every `3 <= m <= 2000` (1998 values); closed form `(1+x)^m + x` equals DP for all `m <= 500` and all multiples of 50 up to 2000 |
| Stars: `r` attaining the min ratio | `r = 2` for every `m >= 4` (`m = 1, 2`: empty prefix; `m = 3`: prefix is `{1}`) |
| KLYM `(3,k,k)`, `k = 4` | order 26, polynomial equals `KLYM_T1_POLY`; non-LC only at `r = 13 = alpha - 1` |
| KLYM `(3*,k,k+1)` T2 attachment | order `14 + 4k` verified for `k = 0..150`. **END-vertex attachment of the P4 reproduces T2**: `x^14 + 48 x^13 + 2372 x^12 + ...` (full polynomial `1, 26, 300, 2037, 9089, 28147, 62183, 98968, 112870, 90178, 48086, 15498, 2372, 48, 1`; LC breaks exactly at `r = 13`).  Attaching the P4 at an INNER vertex gives `2 x^14 + 81 x^13 + 2708 x^12 + ...` (same alpha but two maximum independent sets) and is log-concave — it does **not** match. Top-two coefficients `1, 3·2^k + 2k + 18` hold for all `k = 0..150`. |
| Kadrawi–Levit top-coefficient formulas for `(3,k,k+1)`, `(3,k,k+2)`, `(3*,k,k+2)`, `(3*,k,k+3)`, `(3*,k,k)` | the paper's alpha, `p_alpha = 1`, `p_{alpha-1}` and `p_{alpha-2}` formulas reproduced for all `k = 1..80` |
| Galvin `T_{m,t,1}`: order `1 + m + 2mt`, `alpha = (1+t)m` | asserted for all 440 `(m,t)` with `t = 2..12`, `m = 1..40` |
| Galvin: "`T_{t,t,1}` breaks LC at `t^2 + 2` for all `t >= 4`" | **confirmed for `4 <= t <= 20`** (break set is exactly `{t^2 + 2}`; `t = 2, 3` are log-concave). E.g. `t = 12`: alpha 156, `L = 104`, single break at 146 |
| Galvin: which `T_{m,t,1}` are non-LC | for `t >= 4` exactly `3 <= m <= m_max(t)` with `m_max = 5, 8, 12, 18, 27, 39` for `t = 4..9` (`>= 40` for `t >= 10`); every non-LC member breaks **only** at `mt + 2 = alpha - m + 2`.  `m = 1, 2` are always LC.  (Consistent with Theorem 2.1's range `t <= m <= 2^{t/16}` being far from sharp, as the paper says.) |
| Bencs `T(2^m 1^n)` (Galvin §3, "Mathematica") | break counts 2, 3, 8, **9**, 24 for `(m,n) = (4,9), (5,15), (6,17), (7,23), (8,27)` vs. reported 2, 3, 8, **16**, 24.  Four of five agree; for `T(2^7 1^23)` (order 3199, alpha 1621) we find 9 breaks at `{1581, 1585..1590, 1595, 1596}`.  Recomputed independently with a level recursion for spherically symmetric trees (`/tmp` script, identical break sets for all five), so 9 is what this construction gives; neighbouring `T(2^7 1^n)`, `n = 19..29`, give 7, 0, 7, 0, 9, 0, 10, 0, 14, 0, 15 breaks, none 16.  All breaks are deep in the tail (`min r - L = 27, 82, 187, 500, 1175`). |
| Prüfer decoder | linear-time decoder agrees with `forest_indep.prufer_to_edges` on 300 random codes |
| PatternBoost 60-vertex data | `search_output_11.txt` (sha256 `cfbf065f…2806a3`), 50 000 valid 1-based Prüfer codes, no duplicate labelled trees; **39 766 / 50 000 are non-log-concave** (all 39 766 have the Ramos–Sun score `a_29 a_31 - a_30^2 > 0`); breaks at `alpha - 1` (39 764) or `alpha - 2` (2); `min r - L = 9`; none inside the prefix; no WR/ISO prefix failure |

## 3. Per-family table (Table A)

Columns: members audited, order range, min prefix ISO ratio with argmin member and `r`,
histogram of the `r` attaining each member's min, number of non-LC members, number of
members with an LC break inside the prefix, prefix failures.

| family (sizes) | members | n | min ISO prefix ratio (exact or digits) | ≈ | excess | argmin | r | argmin-r histogram | non-LC | LC break in prefix | fail |
|---|---|---|---|---|---|---|---|---|---|---|---|
| stars `K_{1,m}`, `m <= 2000` | 2000 | 2..2001 | 7992006004001/7991998002000 | 1.000001001 | 1.0e-06 | `K_{1,2000}` | 2 | r=2: 1997 (r=1: m=3) | 0 | 0 | 0 |
| paths `P_n`, `n <= 400` | 400 | 1..400 | 160001/158802 | 1.007550283 | 7.6e-03 | `P_400` | 1 | r=1: 396 | 0 | 0 | 0 |
| matchings `mK_2`, `n <= 400` | 200 | 2..400 | 160001/159200 | 1.005031407 | 5.0e-03 | `200K_2` | 1 | r=1: 198 | 0 | 0 | 0 |
| edgeless `E_n`, `n <= 400` | 400 | 1..400 | 160001/159600 | 1.002512531 | 2.5e-03 | `E_400` | 1 | r=1: 398 | 0 | 0 | 0 |
| spiders `S(k x l)`, `k <= 60`, `l <= 6` | 360 | 2..361 | 6269521/6262260 | 1.001159486 | 1.2e-03 | `S(60x1)` (= `K_{1,60}`) | 2 | r=1:59, 2:82, 3:51, 4:55, 5:55, 6:41, 7:13 | 0 | 0 | 0 |
| brooms, `h <= 30`, `m <= 60` | 1800 | 2..90 | 6701644/6694140 | 1.001120980 | 1.1e-03 | `Broom(h=2,m=60)` (= `K_{1,61}`) | 2 | r=1:194, 2:631, 3:712, 4:259 | 0 | 0 | 0 |
| double brooms, `h <= 16`, `m1 <= m2 <= 30` | 6975 | 4..76 | 493121/488070 | 1.010348925 | 1.0e-02 | `DBroom(h=2,1,30)` | 2 | r=1:215, 2:362, 3:2113, 4:2916, 5:1368 | 0 | 0 | 0 |
| caterpillars, spine `<= 60` (4 leg distributions ×5, one-hub, regular c=1..6) | 1593 | 2..420 | 152-digit fraction | 1.005186438 | 5.2e-03 | `Cat(s=60, regular c=6)` (n=420) | 66 | r=1:951, 2:25, 3:37, 4:57 … up to r=66 | 0 | 0 | 0 |
| complete d-ary, `d=2..5`, `n <= 1365` | 24 | 3..1365 | 495-digit fraction | 1.002059856 | 2.1e-03 | `T_4-ary(depth=5)` (n=1365) | 219 | r=1:14, 2:2, 5,6,15,28,56,138,219: 1 each | 0 | 0 | 0 |
| KLYM `(3,k,k)`, `k <= 150` | 150 | 14..610 | 40-digit fraction | 1.003378645 | 3.4e-03 | `(3,150,150)` | 9 | r=1:6, 2:2, 3:2, 4:4, 5:7, 6:11, 7:23, 8:52, 9:43 | 147 (k>=4) | 0 | 0 |
| KLYM `(3*,k,k+1)`, `k <= 150` | 151 | 14..614 | 40-digit fraction | 1.003361682 | 3.4e-03 | `(3*,150,151)` | 9 | r=1:7, 2:2, 3:2, 4:4, 5:6, 6:11, 7:22, 8:50, 9:47 | 148 (k>=3) | 0 | 0 |
| `(left,k,k)`, `left=3..8`, `k <= 60` | 360 | 14..260 | 31-digit fraction | 1.008550790 | 8.6e-03 | `(8,60,60)` | 8 | r=1:32 … r=7:122, r=8:67 | 341 | 0 | 0 |
| KLYM variants `(3,k,k+1)`, `(3,k,k+2)`, `(3*,k,k+2)`, `(3*,k,k+3)`, `(3*,k,k)`, `k <= 80` | 400 | 16..338 | 32-digit fraction | 1.006346741 | 6.3e-03 | `(3*,k,k+3) k=80` | 8 | r=1:29 … r=7:111, r=8:135 | 386 | 0 | 0 |
| Galvin `T_{m,t,1}`, `t=2..12`, `m<=40`, + `T_{t,t,1}` to `t=20` | 448 | 6..1001 | 170-digit fraction | 1.002787351 | 2.8e-03 | `T_{40,12,1}` (n=1001) | 50 | r=1:56, 2:32, 3:31, 4:37, 5:39 … up to r=50 | 219 | 0 | 0 |
| Bencs `T(2^m 1^n)` (5 trees) | 5 | 175..7423 | 55100930/55078662 | 1.000404294 | 4.0e-04 | `T(2^8 1^27)` (n=7423, r=1 value `1+(3n-1)/((n-1)(n-2))`) | 1 | r=1:5 | 5 | 0 | 0 |
| unions (`mT1`, `mT2`, `aT1+bT2`, `T1+K_{1,m}`, `T1+E_m`, `T1+P_m`, `T1+mK_2`, `mK_{1,j}`, `T_{4,4,1}+K_{1,m}`) | 568 | 2..312 | 78-digit fraction | 1.007597207 | 7.6e-03 | `20K_{1,10}` | 33 | r=1:278, 3:53, 4:57, 5:31 … | 49 | 0 | 0 |
| random Prüfer trees, `n=30,50,100,200,300`, 600 each | 3000 | 30..300 | 90001/89102 | 1.010089560 | 1.0e-02 | `prufer(n=300,#0)` (r=1 value, same for every tree of order 300) | 1 | r=1: 3000 | 0 | 0 | 0 |
| random recursive forests, `n=30..200`, `q=0.5,0.8,0.95`, 200 each | 2400 | 30..200 | 40001/39636 | 1.009208800 | 9.2e-03 | `forest(n=200,q=0.5,#36)` | 1 | r=1:2381, 2:15, 3:4 | 0 | 0 | 0 |
| preferential-attachment trees, `n=50..300`, 200 each | 800 | 50..300 | 63-digit fraction | 1.007944043 | 7.9e-03 | `prefattach(n=300,#29)` | 20 | r=3:12, 4:64, 5:80 … r=30:1 | 0 | 0 | 0 |
| spider-stars `SS(a,b)`, `a,b <= 60` | 3720 | 2..181 | 6269521/6262260 | 1.001159486 | 1.2e-03 | `SS(0,60)` (= `K_{1,60}`) | 2 | r=1:14, 2:1068, 3:2478, 4:156 | 0 | 0 | 0 |
| `K_{1,m}+E_j`, `m <= 100`, `j <= 100` | 10100 | 2..201 | 49015201/48995100 | 1.000410266 | 4.1e-04 | `K_{1,100}+E_0` | 2 | r=1:630, 2:1869, 3:2180, 4:2399, 5:1677, 6:1015, 7:327 | 0 | 0 | 0 |
| two stars `K_{1,a}+K_{1,b}`, `a<=b<=60` | 1830 | 4..122 | 7163297/7136640 | 1.003735231 | 3.7e-03 | `K_{1,1}+K_{1,60}` | 2 | r=1:8, 2:377, 3:641, 4:803 | 0 | 0 | 0 |
| double stars `DS(a,b)`, `a<=b<=60` | 1830 | 4..122 | 7155731/7136640 | 1.002675068 | 2.7e-03 | `DS(1,60)` | 2 | r=1:4, 2:501, 3:367, 4:957 | 0 | 0 | 0 |
| star of stars `SoS(k,m)`, `k,m <= 30` | 900 | 3..931 | 207-digit fraction | 1.001251938 | 1.3e-03 | `SoS(30,30)` (n=931) | 67 | spread over r=1..67 | 0 | 0 | 0 |
| local search, trees, objective `r>=2` | 24010 | 20..30 | 330572/328860 | 1.005205863 | 5.2e-03 | rediscovers `K_{1,29}` | 2 | r=2: 13596 … | 0 | 0 | 0 |
| local search, forests, `r>=3` and `r=3` | 25205 | 20..60 | 3601/3540 | 1.017231638 | 1.7e-02 | (r=1 value of `E_60`) | 1 | r=1: 22777 | 0 | 0 | 0 |
| local search, trees, `r>=3`, `r>=4`, `r=3`, `r=4` | 312086 | 20..100 | 47074402/47054700 | 1.000418704 | 4.2e-04 | `K_{1,99}` (audited min over all r) | 2 | r=2: 88824, 3: 46288, 4: 58211 … | 0 | 0 | 0 |
| fixed-n shape comparison, `n=30,60,100` (310/1064/2773 shapes) | 4147 | 30..100 | 47074402/47054700 | 1.000418704 | 4.2e-04 | `K_{1,99}` | 2 | r=2:576, 3:808, 4:917, 5:800 … | 1 (`T_{3,16,1}`) | 0 | 0 |
| PatternBoost 60-vertex trees | 50000 | 60 | 3601/3422 | 1.052308591 | 5.2e-02 | (r=1 value of any tree with n=60) | 1 | r=1: 50000 | 39766 | 0 | 0 |

The Table-A entries for paths/matchings/edgeless/random trees/PatternBoost are the trivial
`r = 1` value: `Q_1 = p_1^2 + p_0^2 - 2 p_2 = n + 1 + 2e` for **every** graph with `n`
vertices and `e` edges, so `ratio_1 = 1 + (n+1+2e)/(n(n-1) - 2e)`, i.e. `1 + (3n-1)/((n-1)(n-2))`
for every tree of order `n` (e.g. `160001/158802` for `P_400`, `90001/89102` for `n = 300`),
`1 + (n+1)/(n(n-1))` for `E_n`.  `r = 1` therefore carries no structural information and the
interesting minima are at `r >= 2`.

## 4. WR slack and Q minima (Table B) and LC break positions (Table C)

| family | min WR slack `r p_r - p_{r-1}` (member, r) | min WR ratio `r p_r / p_{r-1}` (member, r) | min `Q_r` (member, r) |
|---|---|---|---|
| stars | 3 (`K_{1,3}`, 1) | 2.4000 (`K_{1,4}`, 2) | 11 (`K_{1,3}`, 1) |
| paths | 4 (`P_5`, 1) | 4.2857 (`P_7`, 2) | 14 (`P_5`, 1) |
| matchings | 5 (`3K_2`, 1) | 6.0000 (`3K_2`, 1) | 13 (`3K_2`, 1) |
| edgeless | 2 (`E_3`, 1) | 3.0000 (`E_3`, 1) | 4 (`E_3`, 1) |
| spiders / brooms / caterpillars / d-ary / spider-stars / star-of-stars / unions | 3 (the `K_{1,3}` member, 1) | 2.4000 (the `K_{1,4}` member, 2) | 11 |
| double brooms | 4 (`DBroom(2,1,2)`, 1) | 3.3333 (`DBroom(2,1,3)`, 2) | 14 |
| KLYM `(3,k,k)` / `(left,k,k)` | 13 (`(3,1,1)`, 1) | 5.7992 (`(3,2,2)`, 6) | 41 |
| KLYM `(3*,k,k+1)` | 13 (`(3*,0,1)`, 1) | 5.7167 (`(3*,1,2)`, 6) | 41 |
| KLYM variants | 15 (`(3,1,2)`, 1) | 5.8868 (`(3,1,3)`, 6) | 47 |
| Galvin | 5 (`T_{1,2,1}`, 1) | 5.2500 (`T_{1,3,1}`, 2) | 17 |
| Bencs | 174 (`T(2^4 1^9)`, 1) | 32.6392 (`T(2^4 1^9)`, 59) | 524 |
| random trees / forests / pref-attach | 29 / 29 / 49 (n=30/30/50, r=1) | 6.9099 / 7.4226 / 12.8467 (r=12/12/20) | 89 / 47 / 149 |
| `K_{1,m}+E_j` | 3 (`K_{1,1}+E_2`, 1) | 2.4000 (`K_{1,4}+E_0`, 2) | 7 (`K_{1,1}+E_2`, 1) |
| two stars / double stars | 4 (1) | 3.5455 (`K_{1,3}+K_{1,3}`, 3) / 3.3333 (`DS(1,3)`, 2) | 12 / 14 |
| local searches (n>=20) | 19 (r=1) | 5.1084 (n=20 tree, r=8) | 21 (n=20 forest, r=1) |
| fixed-n shapes | 29 (`K_{1,29}`, 1) | 7.5181 (`broom(28,2)` n=30, r=10) | 31 (`E_30`, 1) |
| PatternBoost | 59 (r=1) | 12.6938 (`PB60#49368`, r=20) | 179 (r=1) |

WR ratio `>= 2.4` everywhere: WR has a factor-2.4 margin in the worst case and grows
with `n` (for the star `r p_r/p_{r-1} = r C(m,r)/C(m,r-1) = m - r + 1` for `r >= 3`).

LC breaks (Table C; offset = `alpha - r`):

| family | non-LC | break offsets `alpha - r` (count) | min `r - L` | breaks in prefix |
|---|---|---|---|---|
| KLYM `(3,k,k)` | 147 | 1 (147) | 4 | 0 |
| KLYM `(3*,k,k+1)` | 148 | 1 (148) | 4 | 0 |
| `(left,k,k)` | 341 | 1 (341) | 4 | 0 |
| KLYM variants | 386 | 1 (386) | 4 | 0 |
| Galvin `T_{m,t,1}` | 219 | `m - 2` for the non-LC `(m,t)` (offsets 1..38; break at `mt + 2` only) | 4 | 0 |
| Bencs | 5 | 2..76 (2, 3, 8, 9, 24 breaks) | 27 | 0 |
| unions | 49 | 1 (36), 2 (13) | 4 | 0 |
| fixed-n (`T_{3,16,1}`, n=100) | 1 | 1 | 16 | 0 |
| PatternBoost 60 | 39766 | 1 (39764), 2 (2) | 9 | 0 |

So every observed LC failure lies at `r >= L(alpha) + 4`, in the descending tail where the
proof route only needs `p_r >= p_{r+1}` (Levit–Mandrescu), which held in all cases.

## 5. Trend of the minimum ratio

### 5.1 Closed forms (all confirmed by the exact runs)

* Star `K_{1,m}`, `I = (1+x)^m + x`: `Q_2 = 2m^2 + m + 1` and
  `ratio_2 - 1 = 2(2m^2+m+1) / ((m+1)m(m-1)(m-2)) = 4/m^2 + O(1/m^3)`.
  For `r >= 3` all three coefficients are pure binomials, so
  `ratio_r - 1 = (m+1)/((m-r)(m-r+1)) ≈ 1/m` — hence the argmin is `r = 2` for all `m >= 4`
  and the `r = 2` value is smaller by a factor `≈ 4/m` than any other `r`.
* Edgeless `E_n` (`(1+x)^n`): `ratio_r - 1 = (n+1)/((n-r)(n-r+1))` for every `r`
  (Newton/real-rootedness gives a positive slack of order `1/n`), min at `r = 1`.
* Matching `mK_2` (`(1+2x)^m`), paths: minima at `r = 1`, excess `≈ 2/n` resp. `3/n`.
* Any graph: `Q_1 = n + 1 + 2e` (the `r = 1` ratio is constant over trees of equal order).

### 5.2 Does anything beat the star's `1 + 4/m^2` at `r = 2`?  No (trees: never; forests: only `E_5`).

* Per-order comparison over **all 455 862 audited sequences** (`star_comparison_by_order`;
  1999 orders `n` with a nonempty `r = 2` prefix: every `5 <= n <= 2001` plus 3199 and 7423):
  the minimum `r = 2` ratio among trees of order `n` is the star `K_{1,n-1}` (or a relabelled
  copy: `S(m×1)`, `Broom(1,m)`, `Broom(2,m-1)`, `SS(0,m)`) for **every** order; among forests
  the star is beaten only at `n = 5` by `E_5` (`3/2 < 97/60`).  This covers every graph
  evaluated by the local searches (361 301), all random trees/forests, and all structured
  families.
* Fixed-n comparison (`fixed_n_shape_comparison`, 310/1064/2773 shapes at `n = 30/60/100`
  including all double stars, spider-stars, brooms, double brooms, spiders, stars of stars,
  regular caterpillars, Galvin trees of that order, two-star forests and `K_{1,m}+E_j`
  forests): at `r = 2` the minimiser is the star in all three orders
  (`1.0052059`, `1.0012000`, `1.0004187`).  Ranking the distinct `r = 2` values at
  `n = 100` (excess relative to the star's `4.19e-4`): `K_{1,98}+K_1` forest 1.98×,
  `DS(1,97) = SS(1,97) = Broom(3,97)` (star with one subdivided edge) 2.48×, `K_{1,97}+E_2`
  2.95×, `K_{1,1}+K_{1,97}` 3.46×, `K_{1,96}+E_3` 3.91× — the same order and almost the same
  factors at `n = 30` (1.95×, 2.44×, 2.85×, 3.39×, 3.70×).  Every `1/n^2`-tight shape is the
  star plus one small perturbation.
* Local search with objective "min ratio over `r >= 2`" rediscovers the star from 4 of 4
  random starts at `n = 20` and from 1 of 4 at `n = 30` (the others end in a `[25,5,1,…]`
  local minimum at `1.0323`, far above the star's `1.0052`).
* Every family's `r = 2` per-r minimum (`iso_ratio_min_by_r` in the JSON) is attained by
  its most star-like member (`S(60x1)`, `Broom(2,60)`, `SS(0,60)`, `K_{1,100}+E_0`,
  `DS(1,60)`, `K_{1,1}+K_{1,60}`, `DBroom(2,1,30)`).
* Excess `≈ 4/n^2`: `1.0e-6` at `n = 2001`, `4.1e-4` at `n = 101`, `5.2e-3` at `n = 30`.

### 5.3 Does any family have its minimum at `r > 2`?  Yes — but only with `Θ(1/n)` excess.

Families whose min prefix ratio sits at `r > 2`: double brooms (mostly `r = 3..5`),
double stars and two-star forests (`r = 3, 4` for balanced `a ≈ b`), spider-stars with
`a >= 1` (`r = 3`), `K_{1,m}+E_j` with `j > 0` (`r = 3..7`), KLYM families (`r = 8, 9` at
`k = 150`), Galvin (`r` up to 50), preferential-attachment trees (`r ≈ 4..30`), stars of
stars (`r = 67` for `SoS(30,30)`), regular caterpillars (`r = 66` for `s = 60, c = 6`) and
complete 4-ary trees (`r = 219` at `n = 1365`).  For these "bushy" trees the ratio
decreases slowly and monotonically in `r` across the prefix, so the prefix minimum is
attained deep inside the prefix, but its size is `≈ c/n` with `c ≈ 2..3`
(`T_4-ary(5)`: `2.06e-3` at `n = 1365`, i.e. `n·excess ≈ 2.8`; `Cat(60,c=6)`: `n·excess ≈ 2.2`;
`T_{40,12,1}`: `≈ 2.8`; `SoS(30,30)`: `≈ 1.17`), never close to the star's `4/n^2`.

Fixed-`n` minimisers at `r >= 3` (trees and forests at `n = 100`; the `n = 30, 60` rows in the
JSON show the same shapes):

| r | over all shapes | over trees only | star `K_{1,99}` | `E_100` |
|---|---|---|---|---|
| 2 | star `1.0004187` | star | `1.0004187` | `1.0104` |
| 3 | `K_{1,78}+E_21` forest `1.0087244` | double broom `(h=3,19,78)` `1.0106469` | `1.0107388` | `1.0106249` |
| 4 | double broom `(h=3,48,49)` `1.0097549` | same | `1.0109649` | `1.0108462` |
| 5 | double broom `(h=3,48,49)` `1.0099771` | same | `1.0111982` | `1.0110746` |
| 6 | double star `DS(49,49)` `1.0105565` | same | `1.011439` | `1.0113102` |

The local searches with exact objectives `r = 3` and `r = 4` find the same two-hub shapes
(degree sequences `[16,3,2,…]`, `[23,6,2,…]`, `[35,9,2,…]`, `[47,12,2,…]` for `r = 3`;
`[10,9,2,…]`, `[15,14,2,…]`, `[22,22,2,…]`, `[30,29,2,…]` for `r = 4`; forests at `r = 3`
converge to `E_n` or `K_{1,15}+E_4`), beating the star by 1–10 % of its excess at
`n = 20..60`; at `n = 100` the sampled descent stalls in local minima above the star.

Per-order summary of who beats the star at `r = 3, 4` (`star_comparison_by_order`):

| r | orders where a **tree** beats `K_{1,n-1}` | tree shapes | largest relative gain (trees) | orders where a **forest** beats it | forest shapes |
|---|---|---|---|---|---|
| 3 | 50 orders, `n = 17..65` and `100` (all orders at which a two-hub tree of that order was tested) | `DBroom(h=3,a,b)` with `a ≈ 0.2 n`, search results | `0.076 %` (`DBroom(3,3,18)`, `n = 24`) | 394 orders, every `7 <= n <= 400` tested | `E_n` (`n <= 11`), `K_{1,m}+E_j` with `j ≈ 0.21 n`; `E_n` where no `K_{1,m}+E_j` of that order was tested |
| 4 | 104 orders, `n = 19..122` | `DS(a,b)`, `DBroom(3,a,b)` with `a ≈ b` | `0.28 %` (`DBroom(3,14,14)`, `n = 31`) | 393 orders, every `8 <= n <= 400` tested | `K_{1,m}+E_j` (`j ≈ 0.35 n`), `DBroom(3,a,b)`, `E_n` |

("Relative gain" = `min/star - 1`; the star's own excess at `r = 3, 4` is `≈ 1/n`, so these
gains are a few per cent of the excess, in line with the asymptotic constants below.
Orders `n > 122` show no tree beating the star simply because no two-hub tree of that order
was generated; the closed-form scan below shows that the `r = 4` advantage of the balanced
double broom persists for all `n` (constant `0.876` vs `1`), while at `r = 3` it shrinks to
`≈ 0.1 %` of the excess.)

Large-`n` closed-form scans (`asymptotic_scans`, exact rationals, `n` up to 10 000) of
`n·(ratio_r - 1)` at the optimal parameter:

| r | star | `E_n` | `K_{1,m}+E_j` (argmin `j/n`) | double broom `h=3` (argmin `a/n`) |
|---|---|---|---|---|
| 2 | `≈ 4/n → 0` | `→ 1` | star (`j = 0`) | `→ 0` (`a → 1`, i.e. `≈` a star) |
| 3 | `→ 1` | `→ 1` | `→ 0.808` at `j/n → 0.211` | `→ 1.00` at `a/n → 0.21` |
| 4 | `→ 1` | `→ 1` | `→ 0.901` at `j/n → 0.355` | `→ 0.876` at `a/n → 1/2` |

So at `r >= 3` the tightest known shapes improve on the star only in the constant of the
`1/n` term (by at most ≈ 20 %), and all of them stay at `ratio >= 1 + 0.8/n`; the only
`1/n^2`-tight configuration found anywhere is the star at `r = 2` (its two-hub relatives
`K_{1,n-2}+K_1`, `DS(1,m)`, `DBroom(2,1,m)` are `1/n^2`-tight as well, with a larger
constant).  Nothing in the tested families comes within a factor `n/4` of an ISO failure
for `r >= 3`, and the `r = 2` margin `Q_2 >= 2m^2+m+1` is attained only by the star.

### 5.4 Random trees

Uniform Prüfer trees (`n <= 300`) and recursive forests have their min at `r = 1`
(the trivial `1 + 3/n` value) in 3000/3000 resp. 2381/2400 cases: random trees have no
large hub, so their `r >= 2` ratios are `≈ 1 + c/n` with `c > 3` and not competitive.
Preferential-attachment trees (a hub of degree `≈ 0.1..0.3 n`) move the argmin to `r ≈ 4..30`
but with excess `≥ 7.9e-3` at `n = 300` (`n·excess ≈ 2.4`).  The PatternBoost trees, tuned
to break LC at `alpha - 1`, are far from ISO-tight: their smallest `r >= 2` ratio is
`1.0536` (`PB60#57`, `r = 2`) against `1.0012` for `K_{1,59}` — breaking LC at the top of
the sequence and being ISO-tight at the bottom are antagonistic.

## 6. Caveats

* Everything here is finite evidence; it excludes the tested configurations as
  counterexamples and quantifies margins, nothing more.
* Local search is a sampled steepest descent with restarts (4 random + the star/edgeless
  start); at `n = 100` it visibly stalls, so the fixed-`n` shape tables and the closed-form
  scans are the more reliable guide to the `r >= 3` minimisers.
* Random families are seeded (`SEED = 993`, per-size derived seeds) and reproducible;
  the PatternBoost file is identified by sha256 in the JSON.
