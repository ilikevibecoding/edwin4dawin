# Literature refresh — Erdős Problem #993 (checked 2026-09-02)

Sources were fetched directly during this session (URLs given).  Statements
marked "verified here" were additionally reproduced by the code in this
directory.

## Problem statement and status

- erdosproblems.com/993 (page last edited 2026-02-01; status **open**; "Currently
  working on: will0708"): *"The independent set sequence of any tree or forest is
  unimodal."*  The forest form is part of the official statement.  Source:
  [forum thread 993](https://www.erdosproblems.com/forum/thread/993?order=oldest)
  (the main page is behind a JavaScript challenge for non-browser clients).
- Origin: Alavi, Malde, Schwenk, Erdős, *The vertex independence sequence of a
  graph is not constrained*, Congr. Numer. 58 (1987) — general graphs realise
  every pattern of inequalities; unimodality conjectured for trees.
- No proof and no counterexample has been announced as of this date.

## Decreasing tail (used by the WR+ISO+TAIL route)

- Levit & Mandrescu, *Very well-covered graphs and the unimodality conjecture*,
  [arXiv:math/0406623](https://arxiv.org/abs/math/0406623) (2004; published as
  *Partial unimodality for independence polynomials of König–Egerváry graphs*,
  Congr. Numer. 179 (2006) 109–119).  Corollary 2.7/2.8 there: for every
  bipartite graph (hence every forest) with independence number `alpha`,
  `s_{ceil((2 alpha - 1)/3)} >= ... >= s_{alpha-1} >= s_alpha`.  Proof
  mechanism: for a stable set `S` of size `k` in a quasi-regularizable graph on
  `2 alpha` vertices, `|S| <= |N(S)|` gives `(k+1) s_{k+1} <= 2 (alpha - k) s_k`.
  Tight for a perfect matching.  This is the `L(alpha)` of the handoff.
  **Verified here** on every forest `n <= 22`, every multi-component forest
  `n = 23, 24`, and every tree `n <= 28` (`TAIL` check).
- Basit & Galvin, *On the independent set sequence of a tree*,
  [arXiv:2006.12562](https://arxiv.org/abs/2006.12562) (Electron. J. Combin.
  28(3) (2021) P3.23).  Theorem 1.3 generalises the tail to every graph:
  `(i_k)` is weakly decreasing from `ell = ceil(alpha (n-1)/(alpha + n))`
  (recovering `2 alpha/3` when `alpha >= n/2`).  Theorem 1.6: for a tree every
  maximal independent set has size `>= ceil((n - alpha + 1)/2)`, so the sequence
  is weakly increasing up to `ceil((n - alpha + 1)/4)`.  Theorems 1.4/1.7: for a
  uniformly random labelled tree, a.a.s. increasing up to `0.280 n` (~49.5% of
  the nonzero part) and decreasing from `0.347 n` (~38.8%).
- Heilman, [arXiv:2006.04756](https://arxiv.org/abs/2006.04756): the first
  ~46.8% of the sequence of a random tree is increasing with exponentially high
  probability.
- **Ordered log-concavity.**  Basit–Galvin define ordered log-concavity
  `a_k^2 >= (1 + 1/k) a_{k-1} a_{k+1}` (Question 1.9: does every tree satisfy
  it?  Claim 1.10: equivalent to the average extension count `e_k` being weakly
  decreasing) and note that ultra log-concavity (Newton) fails already for
  `K_{1,3}`; they report that Radcliffe verified ordered log-concavity for all
  trees on `<= 25` vertices.  Ordered log-concavity is exactly the `NW_r` of this
  directory.  **Finding here**: it fails for exactly one tree on 24 vertices
  (`3,3,4`; see `STATUS_2026-09-02.md` §2.1, verified by four independent
  computations) and for none with `n <= 23`; so Question 1.9 has a negative
  answer at `n = 24`, and the cited `n <= 25` verification cannot be correct as
  stated.

## Log-concavity is false for trees

- Kadrawi, Levit, Yosef, Mizrachi (2023) and Kadrawi & Levit, *The independence
  polynomial of trees is not always log-concave starting from order 26*,
  [arXiv:2305.01784](https://arxiv.org/abs/2305.01784) (Ars Math. Contemp.
  25 (2025) #P4.03): all trees on `<= 25` vertices are log-concave (Radcliffe,
  cited there); exactly two trees on 26 vertices (`T1 = 3,4,4`, `T2 = 3*,3,4`)
  are unimodal but not log-concave (break at `k = alpha - 1 = 13`); infinite
  families `3,k,k+j` and `3*,k,k+j` follow.  **Verified here**: `known_counterexamples.py`
  reproduces the published `I(T1;x)` coefficient-for-coefficient, and the
  exhaustive C run finds log-concavity violations first at `n = 26` and none
  for `n <= 25`.
- Galvin, *Trees with non log-concave independent set sequences*,
  [arXiv:2502.10654](https://arxiv.org/abs/2502.10654) (2025): the trees
  `T_{m,t}` (root with `m` children, each with `t` children, each with one leaf
  child) break log-concavity at `k = mt + 2`, i.e. at about
  `alpha (1 - 1/(16 log alpha))` for `m = 2^{t/16}`.  **Verified here** for
  `T_{t,t}`, `t <= 12` (`n <= 301`).
- Ramos & Sun, *An AI enhanced approach to the tree unimodality conjecture*,
  [arXiv:2510.18826](https://arxiv.org/abs/2510.18826) (2025): PatternBoost
  finds tens of thousands of further non-log-concave trees with 27–101
  vertices; all of them are still unimodal.
- Bautista-Ramos et al., *Linear recurrences for non-log-concave independence
  polynomials of trees*, Graphs and Combinatorics (2026),
  doi:10.1007/s00373-026-03054-4: recurrences for the known families; breaks at
  up to five consecutive indices.
- Forum thread (2026): 0 non-log-concave trees at `n = 27`, 19 at `n = 28` (all
  breaking at `k = 14`).

**Bearing on the handoff route.** All known log-concavity breaks occur in the
descending tail `r >= L(alpha)`, where `ISO_r` is *weaker* than `LC_r` and where
the route relies only on the tail theorem.  `known_counterexamples.py` checks
`ISO_r` for every `r` on all of the families above (up to `n = 301`): no
violation, and every break satisfies `r >= L`.  The route is therefore
consistent with everything known about log-concavity failures — but this is
evidence, not a proof.

## Exhaustive unimodality verification records

- Forum thread (2026): unimodality of every tree verified for `n <= 29`
  (B. Reynolds, 8,691,747,673 trees; github.com/BrettRey/erdos-problem-993),
  then `n <= 31` and `n = 32` (109,972,410,221 trees; github.com/Tyorden/erdos-993-trees-n31),
  with per-order counts matching A000055.
- Reynolds, *Mean bounds, structural reductions, and exhaustive verification for
  tree independence polynomial unimodality*, Zenodo preprint (2026),
  doi:10.5281/zenodo.19100781: `mu(T) < n/3` for trees with `d_leaf <= 1`,
  structural reductions, exhaustive `n <= 29`; conjecture remains open.
- This session (see `STATUS_2026-09-02.md`): trees `n <= 28` are covered here
  independently, with the *additional* checks `ISO`, `NW`, `WR`, `TAIL`; all
  forests `n <= 22` and all multi-component forests `n = 23, 24`.  The tree
  unimodality range is therefore **not** a record; the `ISO`/`WR` coverage is
  what is new relative to the public record.

## Forests: the Hoggar reduction (forum, 2026)

A forest's independence polynomial is the product of its components'.  By
Hoggar's theorem (1974) a product of log-concave positive sequences is
log-concave, so a forest can fail unimodality only if one of its components is
already non-log-concave — i.e. contains a tree on `>= 26` vertices from the
non-log-concave class.  Consequently every forest all of whose components have
`<= 25` vertices is log-concave, hence unimodal, by the tree results above.  This
does **not** transfer to `ISO`/`NW`/`WR` (they are not known to be closed under
products), which is why the forest-level `ISO` verification in this directory is
still informative for the handoff route.

## Positive special families (for orientation)

- Paths and stars (trivial); centipedes (Levit–Mandrescu; real-rooted, Zhu 2007);
  well-covered spiders (Levit–Mandrescu 2003, arXiv:math/0211036);
  `K_{1,k}`-concatenations (Wang–Zhu 2011); periodic path-attached trees and
  pendant-edge saturation (Galvin–Hilyard, Australas. J. Combin. 70 (2018),
  arXiv:1701.02204); non-regular caterpillars (Bahls–Ethridge–Szabo,
  arXiv:1802.06298); Fibonacci trees and caterpillars real-rooted (Bencs,
  Discrete Math. 341 (2018), arXiv:1703.05409).
- Bendjeddou & Hardiman, Bull. LMS 57 (2025) 1305–1323
  ([arXiv:2405.00511](https://arxiv.org/abs/2405.00511)): log-concavity for all
  forests obtained by replacing every edge of an arbitrary forest by a
  caterpillar of size 4 ("pre-Lorentzian" property).
- Li, Li, Yang & Zhang ([arXiv:2501.04245](https://arxiv.org/abs/2501.04245),
  2025): all spiders and all pineapple graphs have log-concave independence
  polynomials (via chromatic symmetric functions).
- G. M. X. Li ([arXiv:2603.03025](https://arxiv.org/abs/2603.03025), 2026):
  the Kadrawi–Levit families `T_{3,m,n}` and `T*_{3,m,n}` are unimodal for all
  `m, n >= 1` (so the known non-log-concave families are unimodal).
- Hibi, Kara & Vien ([arXiv:2604.18824](https://arxiv.org/abs/2604.18824),
  2026): trees with symmetric unimodal independence polynomials for every order
  outside `{2,4,5,7,10}`; describes the conjecture as open as of April 2026.
- Bautista-Ramos ([arXiv:2511.00334](https://arxiv.org/abs/2511.00334), 2025):
  for each `m`, trees `TG_{m,t}` breaking log-concavity at `m` indices.
- Claw-free graphs are real-rooted (Chudnovsky–Seymour 2007), hence log-concave
  and unimodal (Hamidoune 1990); trees are not claw-free and not real-rooted in
  general (`K_{1,3}`: `1 + 4x + 3x^2 + x^3`; the `n = 24` tree found here has
  exactly 3 real roots out of 13).
- Formalisation: google-deepmind/formal-conjectures PR #4192 states the
  conjecture in Lean (statement only).

(Family results not re-verified here unless stated.)

## Bottom line

As of 2026-09-02 Erdős #993 is open for trees and for forests (erdosproblems.com:
"FALSIFIABLE — Open", 0 proof claims; the most recent arXiv papers of March and
April 2026 describe it as open; no retracted claims were found).  The strongest
public partial results are the Levit–Mandrescu decreasing tail (generalised by
Basit–Galvin to all graphs), the Basit–Galvin deterministic increasing prefix
`ceil((n - alpha + 1)/4)` and random-tree asymptotics, exhaustive unimodality of
all trees with `n <= 26` (refereed), `n <= 29` (preprint) and `n <= 32`
(unrefereed GitHub record), and the negative results showing that
log-concavity (from `n = 26`) and ordered log-concavity / weakened Newton (from
`n = 24`, found here) are the wrong strengthenings.  None of this closes Gate 5
or Gate 6 of the handoff programme.
