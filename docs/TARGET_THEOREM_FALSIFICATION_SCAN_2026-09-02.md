# Erdős #993 — independent falsification scan of the WR/ISO "target theorem" (2026-09-02)

## Headline

**No violation was found.**  On every tree with `n ≤ 28` vertices (2,023,443,032 +
1,198,738,056 = 3,222,181,088 nonisomorphic trees, counts matching OEIS A000055 at
every `n`), on every nonisomorphic forest with `n ≤ 16` (85,624 forests, counts
matching OEIS A005195), on 400,000 random forests with `n ≤ 60`, on ~30,000
structured forests built from the known hard trees, on all 43,595 distinct
PatternBoost `n = 60` trees, and on the classical families (T_{3,m,n}, T*_{3,m,n},
Galvin T_{m,t}, brooms, double brooms, spiders, multi-arm stars, paths):

* `WR_r : p_{r-1} ≤ r·p_r` holds for every `1 ≤ r < L(α)`  — **0 target-range failures**;
* `ISO_r : Q_r = r·p_r² + p_{r-1}² − (r+1)·p_{r-1}·p_{r+1} ≥ 0` holds for every
  `2 ≤ r < L(α)` — **0 target-range failures**, hence also 0 descent-conditional failures;
* in fact `ISO_r` held for **every** `1 ≤ r ≤ α−1` on every object tested (0 failures
  outside the target range as well);
* every polynomial was unimodal (0 non-unimodal objects).

The scanner reproduced the literature exactly: at `n = 26` exactly **2** trees fail
log-concavity, both at `k = 13` (identified by canonical form as `T_{3,4,4}` and
`T*_{3,3,4}`); at `n = 27`, **0**; at `n = 28`, **19**, all at `k = 14`.

This is falsification evidence only.  It is not a proof: the covered orders are
`n ≤ 28` (all trees), `n ≤ 16` (all forests) and sampled/structured objects up to
`n = 281`; the target theorem is a statement about all finite forests.

## What was tested (definitions used, independently re-implemented)

```
α        = deg I(F;x)                      (independence number)
L(α)     = ceil((2α−1)/3)  = (2α+1) div 3  (checked for α = 1..32)
WR_r     : p_{r−1} ≤ r·p_r                 target range 1 ≤ r < L(α); also counted for all r
ISO_r    : Q_r ≥ 0                          target range 2 ≤ r < L(α); also counted for 1 ≤ r ≤ α−1
descent-conditional ISO : ISO_r only at target r with p_{r−1} > p_r
slack    : Q_r / (p_{r−1}·p_{r+1}), minimised over the target range (exact rational,
           numerator/denominator recorded, tree recorded)
```

Everything is exact integer arithmetic: `uint64` coefficients with `__int128`
inequality evaluation in C (`n ≤ 32`, coefficients `< 2^30`), Python `int` /
`Fraction` elsewhere.  Nothing from `/workspace/erdos993_goal` was imported or
executed; the only file read from there is the PatternBoost polynomial corpus (data),
whose polynomials were **recomputed from the stored Prüfer codes and compared**
(43,595 / 43,595 agree).

## Deliverables

| file | role |
|---|---|
| `tools/iso_scan.c` | C scanner: gentreeg parent arrays → exact I(T;x) → unimodality, LC breaks, WR/ISO (target / outside / descent-conditional), exact min-slack cells, `ALARM_*` lines, `STATS` + `STATS_JSON` trailer.  DP fold adapted from `scripts/lc_census.c` of github.com/BrettRey/erdos-problem-993 (MIT), credited in the header. |
| `scripts/run_tree_scan.sh` | drives `n = 1..24` serially, `n = 25, 26, 27` as two `nauty-gentreeg -p -q n i/2` shards on 2 cores (n = 27 only if the n = 26 timing projects it under the budget; it did: 178 s → projected 478 s, actual 505 s), `n = 28` as an explicit extra run on one core; A000055 cross-check; exact shard merge → `reports/tree_scan_n<N>_20260902.json`, `reports/tree_scan_summary_20260902.json`. |
| `scripts/check_known_hard_trees.py` | pure-Python DP + checks on the hard trees/families and the PatternBoost corpus → `reports/hard_trees_iso_report_20260902.json`. |
| `scripts/forest_search.py` | same checks on forests (exhaustive `n ≤ 16`, 400k random `n ≤ 60`, structured products, hill-climbs) → `reports/forest_search_report_20260902.json`. |
| `tests/test_iso_scan.py` | pytest (56 tests): C scanner vs Python DP on all trees `n ≤ 10` (polynomials and every verdict), exact min-slack cell at `n = 12` vs Python brute force, paths = `C(n−k+1,k)`, hand-checked forests, `L(α)` formula, the two n=26 trees, synthetic violation detection, Prüfer decoding. |

## Exhaustive tree scan (`tools/iso_scan.c`, gcc -O3, nauty-gentreeg)

| n | trees (= A000055) | non-unimodal | LC-failing trees (k) | ISO target fails | ISO fails any r | WR target fails | trees with a descent before L | min target slack Q_r/(p_{r−1}p_{r+1}) [tree] | min descent-conditional slack | min slack over r ≥ 9 | wall s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 ✓ | 0 | 0 | 0 | 0 | 0 | 0 | – | – | – | 0.002 |
| 2 | 1 ✓ | 0 | 0 | 0 | 0 | 0 | 0 | – | – | – | 0.002 |
| 3 | 1 ✓ | 0 | 0 | 0 | 0 | 0 | 0 | – | – | – | 0.002 |
| 4 | 2 ✓ | 0 | 0 | 0 | 0 | 0 | 0 | – | – | – | 0.002 |
| 5 | 3 ✓ | 0 | 0 | 0 | 0 | 0 | 0 | 37/20 ≈ 1.85 (r=2, α=4) [star] | – | – | 0.002 |
| 6 | 6 ✓ | 0 | 0 | 0 | 0 | 0 | 0 | 14/15 ≈ 0.9333 (r=2, α=5) [star] | – | – | 0.002 |
| 7 | 11 ✓ | 0 | 0 | 0 | 0 | 0 | 0 | 79/140 ≈ 0.5643 (r=2, α=6) [star] | – | – | 0.002 |
| 8 | 23 ✓ | 0 | 0 | 0 | 0 | 0 | 0 | 53/140 ≈ 0.3786 (r=2, α=7) [star] | – | – | 0.002 |
| 9 | 47 ✓ | 0 | 0 | 0 | 0 | 0 | 4 | 137/504 ≈ 0.2718 (r=2, α=8) [star] | 2852/861 ≈ 3.312 (r=4, α=7) | – | 0.002 |
| 10 | 106 ✓ | 0 | 0 | 0 | 0 | 0 | 18 | 43/210 ≈ 0.2048 (r=2, α=9) [star] | 3629/1147 ≈ 3.164 (r=4, α=7) | – | 0.002 |
| 11 | 235 ✓ | 0 | 0 | 0 | 0 | 0 | 25 | 211/1320 ≈ 0.1598 (r=2, α=10) [star] | 385/134 ≈ 2.873 (r=5, α=9) | – | 0.002 |
| 12 | 551 ✓ | 0 | 0 | 0 | 0 | 0 | 43 | 127/990 ≈ 0.1283 (r=2, α=11) [star] | 30225/9593 ≈ 3.151 (r=5, α=9) | – | 0.002 |
| 13 | 1301 ✓ | 0 | 0 | 0 | 0 | 0 | 238 | 301/2860 ≈ 0.1052 (r=2, α=12) [star] | 5303/1947 ≈ 2.724 (r=6, α=11) | – | 0.002 |
| 14 | 3159 ✓ | 0 | 0 | 0 | 0 | 0 | 789 | 8/91 ≈ 0.08791 (r=2, α=13) [star] | 15344/5451 ≈ 2.815 (r=6, α=11) | – | 0.004 |
| 15 | 7741 ✓ | 0 | 0 | 0 | 0 | 0 | 2768 | 407/5460 ≈ 0.07454 (r=2, α=14) [star] | 840487/320712 ≈ 2.621 (r=7, α=13) | – | 0.007 |
| 16 | 19320 ✓ | 0 | 0 | 0 | 0 | 0 | 10290 | 233/3640 ≈ 0.06401 (r=2, α=15) [star] | 31159/11951 ≈ 2.607 (r=7, α=13) | 80/21 ≈ 3.81 (r=9, α=15) | 0.016 |
| 17 | 48629 ✓ | 0 | 0 | 0 | 0 | 0 | 25924 | 529/9520 ≈ 0.05557 (r=2, α=16) [star] | 546212/216645 ≈ 2.521 (r=7, α=13) | 85/28 ≈ 3.036 (r=9, α=16) | 0.04 |
| 18 | 123867 ✓ | 0 | 0 | 0 | 0 | 0 | 47905 | 149/3060 ≈ 0.04869 (r=2, α=17) [star] | 1849691/734860 ≈ 2.517 (r=8, α=15) | 5/2 ≈ 2.5 (r=9, α=17) | 0.107 |
| 19 | 317955 ✓ | 0 | 0 | 0 | 0 | 0 | 175769 | 667/15504 ≈ 0.04302 (r=2, α=18) [star] | 1971605/794304 ≈ 2.482 (r=9, α=17) | 19/9 ≈ 2.111 (r=9, α=18) | 0.288 |
| 20 | 823065 ✓ | 0 | 0 | 0 | 0 | 0 | 588818 | 371/9690 ≈ 0.03829 (r=2, α=19) [star] | 1215447696/496228513 ≈ 2.449 (r=9, α=17) | 20/11 ≈ 1.818 (r=9, α=19) | 0.783 |
| 21 | 2144505 ✓ | 0 | 0 | 0 | 0 | 0 | 1575790 | 821/23940 ≈ 0.03429 (r=2, α=20) [star] | 1857801/764516 ≈ 2.43 (r=10, α=19) | 35/22 ≈ 1.591 (r=9, α=20) | 2.12 |
| 22 | 5623756 ✓ | 0 | 0 | 0 | 0 | 0 | 4605145 | 226/7315 ≈ 0.0309 (r=2, α=21) [star] | 656270965/273017866 ≈ 2.404 (r=9, α=17) | 55/39 ≈ 1.41 (r=9, α=21) | 5.916 |
| 23 | 14828074 ✓ | 0 | 0 | 0 | 0 | 0 | 12824027 | 991/35420 ≈ 0.02798 (r=2, α=22) [star] | 30462712/12756095 ≈ 2.388 (r=11, α=21) | 115/91 ≈ 1.264 (r=9, α=22) | 16.305 |
| 24 | 39299897 ✓ | 0 | 0 | 0 | 0 | 0 | 30702337 | 541/21252 ≈ 0.02546 (r=2, α=23) [star] | 8806847144/3761143719 ≈ 2.342 (r=10, α=19) | 8/7 ≈ 1.143 (r=9, α=23) | 45.125 |
| 25 | 104636890 ✓ | 0 | 0 | 0 | 0 | 0 | 82273443 | 107/4600 ≈ 0.02326 (r=2, α=24) [star] | 65697139477/27919126094 ≈ 2.353 (r=11, α=21) | 25/24 ≈ 1.042 (r=9, α=24) | 62.78 |
| 26 | 279793450 ✓ | 0 | 2 (k=13) | 0 | 0 | 0 | 254300651 | 319/14950 ≈ 0.02134 (r=2, α=25) [star] | 647119262544/279039516721 ≈ 2.319 (r=11, α=21) | 65/68 ≈ 0.9559 (r=9, α=25) | 178.011 |
| 27 | 751065460 ✓ | 0 | 0 | 0 | 0 | 0 | 719529497 | 1379/70200 ≈ 0.01964 (r=2, α=26) [star] | 11747228249/5053308468 ≈ 2.325 (r=13, α=25) | 15/17 ≈ 0.8824 (r=9, α=26) | 504.527 |
| 28 | 2023443032 ✓ | 0 | 19 (k=14) | 0 | 0 | 0 | 1936720978 | 743/40950 ≈ 0.01814 (r=2, α=27) [star] | 54547430688429/23555476479650 ≈ 2.316 (r=13, α=25) | 140/171 ≈ 0.8187 (r=9, α=27) | 2745.475 |

Totals over n = 1..28: trees 3222181088, non-unimodal 0, LC-failing trees 21, target ISO failures 0, ISO failures at any r 0, target WR failures 0.  All tree counts match A000055: True.

Notes on the table.

* "ISO fails any r" counts failures of `Q_r ≥ 0` over the whole range `1 ≤ r ≤ α−1`,
  i.e. including the non-target tail; it is 0 everywhere, so even the two `n = 26`
  and the nineteen `n = 28` log-concavity breakers satisfy `ISO_r` at their break
  index (`k = α−1`, a descent position, where the `p_{r−1}²` term dominates).
* The minimum target-range slack at every `n ≥ 5` is attained by the **star
  `K_{1,n−1}` at `r = 2`**, and equals `(2n²−3n+2) / (n·C(n−1,3))` ≈ `12/n²`.
  The minimum over the open ranks `r ≥ 9` is also the star (`α = n−1`, `r = 9`),
  equal to `(r+1)/(m−r) + r(r+1)/((m−r)(m−r+1))` with `m = n−1`; it drops below 1 at
  `n = 26` (`65/68`), and is `15/17` at `n = 27`, `140/171` at `n = 28`.  Both tend to 0 as `n → ∞` while
  staying strictly positive (closed forms above), so the target theorem is
  **asymptotically tight** on stars: any proof must handle the star family without
  losing a constant factor.
* The descent-conditional slack (the quantity the framework's descent lemma actually
  needs) never went below **2.31** on trees `n ≤ 28`; its minimisers are
  trees made of a few large stars joined through a path, e.g. `n = 27`:
  `par = 0,1,2,2,…,2,1,21,21,21,21,21,21` at `r = 13` (`α = 25`), and `n = 28`:
  `par = 0,1,2,2,2,2,2,2,2,1,10,10,10,10,10,10,10,1,1,1,1,1,1,1,1,1,1,1` at `r = 13`
  (slack `54547430688429/23555476479650 ≈ 2.3157`).
* `WR_r` first fails only at `r ≥ L(α) + 3` (all `n ≤ 28`; histogram `wr_first_fail_r_minus_L`
  in each per-n JSON; at `n = 26, 27, 28` the first failure is even at `r ≥ L(α) + 4`), i.e. WR holds with a margin of at least three indices beyond
  the target prefix.
* Log-concavity breakers found: `n = 26`:
  `par = 0,1,2,3,2,5,2,7,2,9,1,11,12,11,14,11,16,11,18,1,20,21,20,23,20,25`
  (`T_{3,4,4}`, poly `1,26,300,2040,9142,28551,63933,103736,121376,100144,55499,18683,2979,51,1`, break `k = 13`, defect 378) and
  `par = 0,1,2,3,4,3,6,3,8,3,10,2,12,13,12,15,12,17,1,19,20,21,1,23,1,25`
  (`T*_{3,3,4}`, poly `1,26,300,2037,9089,28147,62183,98968,112870,90178,48086,15498,2372,48,1`, break `k = 13`, defect 68);
  all breaks have `k − L(α) = 4`.  The n = 28 breakers are listed in
  `reports/tree_scan_n28_20260902.json` (`lc_fail_lines`).

## Known hard trees and classical families (`scripts/check_known_hard_trees.py`)

Family definitions (all built explicitly in the script):
`T_{3,m,n}`: root `v0` with children `v1,v2,v3`; `v1` has 3 children, `v2` has `m`,
`v3` has `n`; every grandchild `v_ij` carries one pendant child `v'_ij`
(`|T_{3,m,n}| = 10+2m+2n`).  `T*_{3,m,n}`: the edge `v13 v'13` is replaced by the path
`v13 − v'13 − x − y` (`|T*| = 12+2m+2n`).  Galvin `T_{m,t}`: root with `m` children, each
the torso of a spider with `t` legs of length 2 (`1+m+2mt` vertices).  Broom `B(k,L)`:
hub + `k` leaves + handle of `L` vertices.  Double broom `DB(a,b,L)`: path on `L`
vertices with `a` / `b` leaves at its ends.  `MS(k,j)`: root with `k` children each with
`j` leaves; `US(k,l)`: spider with `k` legs of length `l`.

| family | count | max n | non-unimodal | LC-failing trees (k−α histogram) | ISO target fails | ISO desc-cond fails | WR target fails | trees with a descent before L | tightest ISO cell (tree, r, Q_r, slack) | tightest descent-conditional cell |
|---|---|---|---|---|---|---|---|---|---|---|
| two_n26_non_log_concave_trees | 2 | 26 | 0 | 2 {'-1': 2} | 0 | 0 | 0 | 0 | T_{3,4,4}, r=2, Q=21556, 317/780 ≈ 0.4064 | – |
| T_{3,m,n}_1<=m,n<=20 | 400 | 90 | 0 | 79 {'-1': 79} | 0 | 0 | 0 | 133 | T_{3,20,20}, r=2, Q=945812, 236453/2477700 ≈ 0.09543 | T_{3,20,20}, r=30, ≈ 3.378 |
| T*_{3,m,n}_1<=m,n<=20 | 400 | 92 | 0 | 111 {'-1': 111} | 0 | 0 | 0 | 134 | T*_{3,20,20}, r=2, Q=1016050, 508025/5421744 ≈ 0.0937 | T*_{3,19,20}, r=30, ≈ 3.416 |
| Galvin_T_{m,t}_1<=m,t<=10 | 100 | 211 | 0 | 49 {'-8': 5, '-7': 5, '-6': 6, '-5': 6, '-4': 6, '-3': 7, '-2': 7, '-1': 7} | 0 | 0 | 0 | 69 | Galvin_T_{10,10}, r=2, Q=13539661, 13539661/316556970 ≈ 0.04277 | Galvin_T_{10,10}, r=68, ≈ 3.153 |
| brooms_B(k,L)_n<=80 | 3159 | 80 | 0 | 0  | 0 | 0 | 0 | 3038 | B(78,1), r=2, Q=12562, 571/287560 ≈ 0.001986 | B(74,4), r=39, ≈ 2.169 |
| double_brooms_DB(a,b,L)_a<=b_n<=50 | 9500 | 50 | 0 | 0  | 0 | 0 | 0 | 9331 | DB(1,47,2), r=2, Q=11902, 5951/459425 ≈ 0.01295 | DB(7,40,2), r=24, ≈ 2.17 |
| spiders_<=6_legs_n<=40 | 28347 | 40 | 0 | 0  | 0 | 0 | 0 | 22066 | S(34, 1, 1, 1, 1, 1), r=2, Q=86242, 43121/168920 ≈ 0.2553 | S(30, 3, 1, 1, 1, 1), r=12, ≈ 3.421 |
| multi_arm_stars_MS(k,j)_1<=k<=30_1<=j<=8_n<=120_and_uniform_spiders_US(k,l)_n<=100 | 408 | 120 | 0 | 0  | 0 | 0 | 0 | 301 | US(59,1), r=2, Q=7022, 3511/975270 ≈ 0.0036 | MS(17,4), r=34, ≈ 1.984 |
| paths_P_n_1<=n<=100 | 100 | 100 | 0 | 0  | 0 | 0 | 0 | 72 | P_100, r=2, Q=1445602, 722801/7604800 ≈ 0.09505 | P_98, r=28, ≈ 3.513 |
| arxiv_2510.18826_explicit_trees | 0 | 0 | 0 | 0  | 0 | 0 | 0 | 0 | – | – |
| patternboost60_polynomial_corpus_20260726 | 43595 | 60 | 0 | 39766 {'-2': 2, '-1': 39764} | 0 | 0 | 0 | 43595 | pb60_rec21072_line426, r=2, Q=298082, 149041/926760 ≈ 0.1608 | pb60_rec37284_line10901, r=18, ≈ 3.367 |

Totals: 86011 trees, non-unimodal 0, LC-failing 40007, target ISO failures 0, descent-conditional ISO failures 0, target WR failures 0 (runtime 17.4 s).

* `arxiv_2510.18826_explicit_trees`: the text dump of the PatternBoost paper keeps the
  appendix examples 5.1–5.13 only as figure captions (no Prüfer codes or edge lists),
  so no explicit tree could be reconstructed from it.  Its 60-vertex output is covered
  by the corpus row, and Galvin's `T_{4,4}` (Example 5.13) by the Galvin row.
* PatternBoost corpus (`erdos993_goal/patternboost60_polynomial_corpus_20260726.json`,
  79 MB): JSON with header fields (`lines_processed 50000`, `non_log_concave_lines 39766`,
  `unique_polynomials 43595`) and a `records` array of
  `{multiplicity, first_line, prufer_code_one_based, polynomial, order, alpha, mode,
  first_descent, log_concavity_failures, …}`.  Streamed record-by-record with
  `json.JSONDecoder.raw_decode`; all 43,595 Prüfer codes decoded, all polynomials
  recomputed and equal to the stored ones, 39,766 records have LC breaks (39,764 at
  `α−1`, 2 at `α−2`), matching the stored `log_concavity_failures`; 0 WR/ISO target
  failures, 0 non-unimodal.

## Forests (`scripts/forest_search.py`)

| family | count | max n | non-unimodal | LC-failing forests | ISO target fails | ISO desc-cond fails | WR target fails | tightest ISO cell (forest, n, r, Q_r, slack) | tightest descent-conditional cell | tightest cell over r ≥ 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| all_nonisomorphic_forests_n<=16 | 85624 | 16 | 0 | 0 | 0 | 0 | 0 | T16#19319, n=16, r=2, Q=466, 233/3640 ≈ 0.06401 | T7#10+T1#0+T1#0+T1#0+T1#0+T1#0+T1#0+T1#0+T1#0+T1#0, r=8, ≈ 2.549 | T1#0+T1#0+T1#0+T1#0+T1#0+T1#0+T1#0+T1#0+T1#0+T1#0+T1#0+T1#0+…, r=9, ≈ 3.036 |
| random_forests_400000_n<=60_seed20260902 | 400000 | 60 | 0 | 0 | 0 | 0 | 0 | rand64085_n60_comps[10, 3, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, …, n=60, r=2, Q=172562, 86281/993840 ≈ 0.08682 | rand175025_n56_comps[24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,…, r=24, ≈ 2.3 | rand221165_n60_comps[17, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1,…, r=9, ≈ 0.3555 |
| m*K1_+_T_hard_trees_0<=m<=60 | 1159 | 116 | 0 | 257 | 0 | 0 | 0 | 0*K1+K_{1,25}, n=26, r=2, Q=1276, 319/14950 ≈ 0.02134 | 60*K1+K_{1,25}, r=43, ≈ 2.095 | 60*K1+K_{1,25}, r=9, ≈ 0.1438 |
| m*K2_+_T_hard_trees_0<=m<=40 | 779 | 136 | 0 | 209 | 0 | 0 | 0 | 0*K2+K_{1,25}, n=26, r=2, Q=1276, 319/14950 ≈ 0.02134 | 1*K2+K_{1,25}, r=14, ≈ 2.541 | 40*K2+Galvin_T_{5,5}, r=9, ≈ 0.1994 |
| m*K_{1,s}_+_T_hard_trees_1<=s<=8_0<=m<=25 | 3952 | 281 | 0 | 683 | 0 | 0 | 0 | 0*K_{1,1}+K_{1,25}, n=26, r=2, Q=1276, 319/14950 ≈ 0.02134 | 22*K_{1,5}+K_{1,5}, r=57, ≈ 1.988 | 25*K_{1,8}+Galvin_T_{5,5}, r=9, ≈ 0.09498 |
| K_{1,s}_+_m*K1_1<=s<=60_0<=m<=60 | 3660 | 121 | 0 | 0 | 0 | 0 | 0 | K_{1,60}+0*K1, n=61, r=2, Q=7261, 7261/2087420 ≈ 0.003478 | K_{1,59}+60*K1, r=60, ≈ 2.068 | K_{1,60}+60*K1, r=9, ≈ 0.09635 |
| random_star_forests_20000_n<=80 | 20000 | 80 | 0 | 0 | 0 | 0 | 0 | stars[79], n=80, r=2, Q=12562, 571/287560 ≈ 0.001986 | stars[58, 9, 7, 0, 0, 0], r=39, ≈ 2.102 | stars[30, 25, 22], r=9, ≈ 0.1559 |
| unions_of_2_or_3_hard_trees | 1520 | 168 | 0 | 542 | 0 | 0 | 0 | Galvin_T_{5,5}+Galvin_T_{5,5}+Galvin_T_{5,5}, n=168, r=2, Q=6819138, 1136523/20976368 ≈ 0.05418 | K_{1,25}+K_{1,25}+K_{1,25}, r=38, ≈ 2.108 | K_{1,25}+K_{1,25}+K_{1,25}, r=9, ≈ 0.1603 |
| adversarial_hill_climb_best_forests | 30 | 59 | 0 | 0 | 0 | 0 | 0 | climb_seed1002_open_forest, n=56, r=2, Q=89376, 19/330 ≈ 0.05758 | climb_seed1019_descent_forest, r=18, ≈ 2.207 | climb_seed1002_open_forest, r=9, ≈ 0.2527 |

Totals: 516724 forests, non-unimodal 0, LC-failing 1691 (all inherited from a non-LC tree component), target ISO failures 0, descent-conditional 0, target WR failures 0 (runtime 131.9 s).

* Exhaustive forest counts `n = 1..16`: 1, 2, 3, 6, 10, 20, 37, 76, 153, 329, 710, 1601,
  3658, 8599, 20514, 49905 — equal to OEIS A005195 and to the Euler transform of A000055
  computed in the script.
* Random forests: 400,000 with `2 ≤ n ≤ 60` (random Prüfer trees + isolated vertices +
  `K2`'s, seed 20260902).
* Structured products: `m·K1 ⊔ T`, `m·K2 ⊔ T`, `m·K_{1,s} ⊔ T` for 19 hard trees `T`
  (incl. `T_{3,4,4}`, `T*_{3,3,4}`, `T_{3,10,10}`, Galvin `T_{5,5}`, stars, brooms, paths),
  `K_{1,s} ⊔ m·K1` full grid, 20,000 random star forests `n ≤ 80`, all unions of 2 or 3
  hard trees (`n` up to 281).
* Hill-climbs (30 runs × 8,000 exact-arithmetic steps, forest moves or tree-preserving
  leaf moves) minimising the target slack, the descent-conditional slack and the
  `r ≥ 9` slack: minima 0.0576 (`r = 2`, edgeless forest), 2.21 (descent-conditional),
  0.253 (`r = 9`); none approached 0 and none beat the star.

## Two structural observations that frame the numbers

1. **At a descent position (`p_{r−1} > p_r`), log-concavity at `r` implies `ISO_r`**:
   `p_r² ≥ p_{r−1}p_{r+1}` gives `p_{r+1} < p_{r−1}`, so
   `Q_r ≥ r·p_{r−1}p_{r+1} + p_{r−1}² − (r+1)p_{r−1}p_{r+1} = p_{r−1}(p_{r−1} − p_{r+1}) > 0`.
   Hence a **descent-conditional** ISO failure requires a log-concavity break at a
   descent index `r < L(α)`.  Every LC break seen in this scan (`n ≤ 28` exhaustive; the
   PatternBoost `n = 60` corpus; Galvin's `T_{m,t}`, `m,t ≤ 10`) sits at `k ≥ α−8 > L(α)`
   (Galvin's general break index `mt+2 = α−(m−2)` is `≥ L(α)` for every `t ≥ 2`); even at
   those breaks `ISO_k` still held.  This explains the large (≥ 2.0) descent-conditional
   slacks everywhere.
2. **At an ascent/plateau position (`p_{r−1} ≤ p_r`), a log-concavity break at `r`
   forces `ISO_r` to fail**: `Q_r < r·p_r² + p_{r−1}² − (r+1)p_r² = p_{r−1}² − p_r² ≤ 0`.
   So the *unconditional* target theorem (`ISO_r` for all `2 ≤ r < L`) implies "no forest
   has a log-concavity break before its mode inside the prefix", and more: writing
   `ρ_r = p_{r−1}p_{r+1}/p_r²` and `x = p_r/p_{r−1}`, ascent-ISO is
   `ρ_r ≤ (r + x^{−2})/(r+1)`, a Newton-type inequality that Poisson-like sequences
   (`ρ_r = r/(r+1)`) satisfy only through the `x^{−2}` term.  The star is exactly this
   borderline case (`ρ_2 = (2/3)(1 − 2/(s²−s))`), which is why it is the tightest object
   at every `n` and why the slack decays like `12/n²`.

## Coverage summary (evidence, not proof)

* All trees `n ≤ 28`: 3,222,181,088 trees, 0 target WR/ISO failures, 0 ISO failures at
  any `r`, 0 non-unimodal; LC breakers 2 (`n=26`), 0 (`n=27`), 19 (`n=28`), exactly as in
  the literature.
* All forests `n ≤ 16`; 400,000 random forests `n ≤ 60`; 30,000+ structured forests to
  `n = 281`; 43,595 PatternBoost trees `n = 60`; 41,000+ trees from classical families
  to `n = 211`.  0 failures anywhere.
* Not covered: trees `n ≥ 29` outside the sampled families, forests `n ≥ 17` outside the
  samples, and — crucially — the asymptotic regime, where the star shows the target
  inequality has vanishing relative slack.  The structural facts above reduce the
  descent-conditional part of the target theorem to "no LC break at a descent before
  `L(α)`", which is consistent with but not established by any known result.

## Reproduction

```
gcc -O3 -march=native -o /tmp/iso_scan tools/iso_scan.c
nauty-gentreeg -p -q 26 0/2 | /tmp/iso_scan 26 --res 0 --mod 2 -o /tmp/s0.json
scripts/run_tree_scan.sh 27            # n = 1..27 (≈ 14 min on 2 cores), then
JOBS=1 scripts/run_tree_scan.sh 28 28   # n = 28 on one core (≈ 45 min)
python3 scripts/check_known_hard_trees.py     # ≈ 20 s
python3 scripts/forest_search.py              # ≈ 2.5 min
python3 -m pytest -q tests/test_iso_scan.py
```

Environment: Ubuntu, gcc, python3.12, nauty (`nauty-gentreeg`), ≤ 2 cores, < 200 MB RAM.
