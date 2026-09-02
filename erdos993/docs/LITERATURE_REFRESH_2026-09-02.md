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

- Levit & Mandrescu (2006): for a tree with independence number `alpha`,
  `i_k >= i_{k+1}` for `k >= ceil((2 alpha - 1)/3)` (strictly decreasing from
  there on).  Cited on the Valley Hunt page and in the forum thread; this is the
  `L(alpha)` of the handoff.  **Verified here** on every forest `n <= 22`, every
  multi-component forest `n = 23, 24`, and every tree `n <= 28` (`TAIL` check).
- Basit & Galvin, *On the independent set sequence of a tree*, arXiv:2006.12562
  (Electron. J. Combin. 2021): for a uniformly random labelled tree,
  asymptotically almost surely the first ~49.5% of the sequence is increasing
  and the last ~38.8% decreasing.

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

Paths and stars (trivial), centipedes (AMSE 1987), regular caterpillars
(Galvin–Hilyard 2018), spiders (log-concave; Li–Xie–Zhuang 2025), double brooms,
and families containing the Kadrawi–Levit examples (2026) are known to be
unimodal (as listed on brettreynolds.ca/valley-hunt.html; not re-verified here).
Claw-free graphs are real-rooted (Chudnovsky–Seymour), hence log-concave
(Hamidoune 1990); trees are not claw-free and, as shown above, not real-rooted
in general (the `n = 24` tree found here with a weakened-Newton failure has
exactly 3 real roots out of 13).

## Bottom line

As of 2026-09-02 Erdős #993 is open for trees and for forests.  The strongest
public partial results are the Levit–Mandrescu decreasing tail, the
Basit–Galvin random-tree asymptotics, exhaustive unimodality of all trees with
`n <= 32`, and the negative results showing that log-concavity (and, verified
here, weakened Newton) are the wrong strengthening.  None of this closes Gate 5
or Gate 6 of the handoff programme.
