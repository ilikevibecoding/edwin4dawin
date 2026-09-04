# Erdős #993 — all write-ups of this repository, concatenated (branch cursor/erdos993-exact-verification-942e)

Order: status → README → proved theorems → probes/leads → literature → the original handoff. Code and JSON reports are listed in RAW_URLS.md.



---

<!-- FILE: STATUS_2026-09-02.md -->

# Erdős Problem #993 — status audit, 2026-09-02

**Bottom line: the problem is still open. This session did not prove it, and
nothing in the handoff could be replayed here.** What follows separates
(A) what could not be verified, (B) what is proved in this repository,
(C) what is exhaustively verified (falsification evidence only), and
(D) what remains open, with an assessment of the handoff's plan.

## A. The handoff's workspace is not available

The handoff (`handoff/HANDOFF_2026-09-02_verbatim.md`) describes a proof
workspace `C:\Users\chris\erdos993_goal` with dozens of Python producers,
JSON reports, `PASS_*` markers and SHA-256 hashes. **None of those files exist
in this repository or anywhere in this environment** (the repository
contained only a 14-byte `README.md`). Consequently:

- none of the "frozen" theorems (rank-4 `N_4` bundle, rank-6 `G2..G10`,
  the retained-isolate / marked-parent / ordinary-parent reductions, the
  `q3` terminal theorem, the `WR` prefix proof) could be replayed or audited;
- the "4 of 6 gates closed" checklist and the "94%" figure are unverifiable
  claims from here, and by the handoff's own rule 7 the percentage is not a
  probability;
- the recommended immediate commands (the prepared
  `search_iso_n6_bundle_g1_*` cone searches) could not be executed.

Everything below was built from scratch, exactly, and is replayable with the
commands in `README.md`. An independent re-implementation
(`audit/`, `reports/independent_audit.json`, marker
`PASS_INDEPENDENT_AUDIT_ERDOS993_CORE`) agrees with the main library on every
polynomial and verdict it checked.

## B. Proved here (rigorous, machine-checked)

Full statements and proofs: `docs/REDUCTION_LEMMA_AND_PROVED_CASES.md`,
`docs/ISO3_TREES_THEOREM.md`, `docs/ISO3_FORESTS_THEOREM.md`; symbolic/exact
checks: `scripts/verify_lemmas_symbolic.py`, `scripts/prove_iso3_trees.py`,
`scripts/prove_iso3_forests.py`; tests: `tests/` (88 passing);
`bash scripts/replay_all.sh` runs all of it.

1. **Reduction lemma.** For `r >= 1`, `p_{r-1} > 0`: `WR_r`, `ISO_r` and a
   descent `p_r <= p_{r-1}` imply `p_{r+1} <= p_r`, via the identity
   `r p_r^2 - (r+1) p_r p_{r-1} + p_{r-1}^2 = (r p_r - p_{r-1})(p_r - p_{r-1})`.
2. **Conditional unimodality theorem.** `WR_r` and `ISO_r` for
   `1 <= r <= L(alpha)-1` plus the Levit–Mandrescu tail theorem imply
   unimodality (also in a weaker descent-conditional form). The handoff's
   architecture is therefore sound; the whole difficulty is the universal
   `ISO` theorem. **Scope correction:** the tail theorem with threshold
   `ceil((2 alpha - 1)/3)` is a theorem for bipartite (hence all forests),
   König–Egerváry and quasi-regularizable graphs, *not* for arbitrary graphs
   (Levit–Mandrescu give general-graph counterexamples); the framework only
   ever applies it to forests, so nothing breaks, but the hypothesis must be
   carried.
3. **`ISO_1`, `ISO_2`, `WR_1`, `WR_2` for every forest**, and **`WR_3`
   wherever the framework needs it.** With `n` vertices, `e` edges and
   `S = sum_v C(d_v,2)`: `p_2 = C(n,2) - e`, `p_3 = C(n,3) - e(n-2) + S`,
   `Q_1 = n + 1 + 2e`, and the exact decomposition
   `Q_2 = [(n-1)(n-2) + n^2] + 3n(C(e,2) - S) + (n-1-e)((3n-4)e + (n-1)^2 + 3)/2`
   with all three terms nonnegative; equality iff `F` is the star.
4. **`ISO_3` for every tree** (new; `docs/ISO3_TREES_THEOREM.md`). Exact
   formula `p_4 = C(n,4) - e C(n-2,2) + S(n-4) + C(e,2) - P - T3`
   (`T3 = sum C(d_v,3)`, `P` = number of 3-edge paths); drop `P >= 0`; the
   Cauchy–Schwarz bound `3 T3 >= 2S^2/D2 - S` with `D2 = 2(n-1) - l` (`l`
   leaves; exact on stars); the convexity bound `S <= C(l,2) + n - l - 1`;
   reduction to a two-variable integer polynomial `K~(n, lambda)` whose
   nonnegativity for `n >= 7` is certified by a shift certificate
   (`K~(a+2,b+2) = a^4(a^2 - ab + 10 b^2) + R`, `R` coefficientwise `>= 0`),
   exact real-root isolation on two strips, and exact Bernstein subdivision on
   two compact pieces; `n <= 14` checked directly. Marker
   `PASS_EXACT_ISO3_ALL_TREES_ROOT` (replays in about 1 s).
5. **`ISO_3` for every forest** (new; `docs/ISO3_FORESTS_THEOREM.md`,
   `scripts/prove_iso3_forests.py`, marker `PASS_EXACT_ISO3_ALL_FORESTS_ROOT`,
   replays in about 9 s). Additional ingredients, each an exact certificate:
   the leaf bound `S <= C(l+2-2c',2) + e + c' - l - 1` is weakest for one
   non-trivial component, so `S <= C(l,2) + e - l` for every forest; in the
   sparse regime `S <= e-1` the inequality `C(d,2) >= d/2` gives
   `l >= 2e - 2S`, at which the Cauchy–Schwarz term vanishes; the bounds are
   monotone in `n` (all coefficients of the `n`-differences are nonnegative
   after the substitutions `lambda = 2+a, e = 2+a+b, n = 3+a+b+c`), which
   reduces every forest to the `n = e+1` case, i.e. to the tree polynomial;
   `e <= 5` reduces to 26 explicit cores times `(1+x)^z` (univariate
   certificates in `z`); `I = 0` (matchings plus isolated vertices) is
   real-rooted. Together with `WR_3`, the framework alone now proves
   unimodality for every **forest** with `alpha <= 6`; each further certified
   index `r` extends the covered range of `alpha` by `3/2`.
6. **`ISO` is asymptotically tight at `r = 2`.** On the star `K_{1,n-1}`,
   `Q_2 = (n-1)(n-2) + n^2` while `p_1 p_2 ~ n^3/2`, so the dimensionless
   margin `Q_2/(p_1 p_2) = 2/n + 2n/((n-1)(n-2)) -> 0`. Exhaustively the star
   is the unique minimiser of the margin at every order. Any inductive
   "payment" proof must be exact on stars at `r = 2`. For `r >= 3` there is
   slack (`>= 7/8` on the extremal double brooms), which is exactly what
   made the crude bounds in items 4–5 sufficient.
7. **Real-rooted case.** If `I(F;x)` is real-rooted (claw-free graphs, in
   particular all linear forests), Newton's inequalities give `ISO_r` at every
   index. Stars with `>= 3` leaves are not real-rooted, so this does not cover
   trees in general.

## C. Exhaustive and adversarial evidence (not proof)

Counts are cross-checked against OEIS A000055 (trees) and A005195 (forests;
regenerated as the Euler transform of A000055). Every report carries the
SHA-256 of the producing script.

- `reports/exhaustive_job_A.json` (all 63,242,256 trees with `n <= 24`),
  `reports/exhaustive_job_C.json` (all 104,636,890 trees with `n = 25`) and
  `reports/exhaustive_job_B.json` (all 21,539,987 forests with `n <= 22`),
  produced by `scripts/verify_exhaustive.py`: every non-isomorphic tree and
  forest in range satisfies `WR_r` and `ISO_r` on the whole prefix, `ISO_r`
  at *every* index, the tail theorem, and unimodality; no log-concavity
  failure exists in range (consistent with the literature: first at `n = 26`).
  Extremal data: the minimum `ISO` margin is the star at `r = 2` for every
  order (exactly the closed form above, e.g. `541/3036` at `n = 24`); for
  `r = 3..6` the minimisers are double brooms (two adjacent or
  distance-2 hubs of nearly equal degree; margins `1.064, 1.072, 1.145,
  1.257` at `n = 24`), for `r = 7, 8` three-hub trees (`1.35, 1.48`), and
  for `r >= 9` the star again with margin `1 + r^2/(n-r)` growing in `r`;
  over forests `n <= 22` the `r = 3` minimum is `0.958` (a tree of order 18
  plus four isolated vertices). **At actual descent indices** (`p_r <= p_{r-1}`
  with `r <= L-1`, which is all the reduction lemma ever uses) the minimum
  margin over all trees `n <= 24` is `1.88`: the tightness at `r = 2` occurs
  only where the sequence is still increasing. The maximum `WR` ratio
  `p_{r-1}/(r p_r)` is `5/12` (`K_{1,4}`, `r = 2`) and decreases with `n`.
  The minimum tail ratio `p_r/p_{r+1}` (`r >= L`) is `967/900` over trees
  and exactly `1` over forests (tight on matchings, as Basit–Galvin note).
  At `n = 25` the pattern is unchanged: star at `r = 2` (`1177/6900`),
  double brooms at `r = 3, 4` (`1.060`, `1.060`), descent-index minimum
  `1.93`, maximum `WR` ratio `0.175`.
- `reports/lc_families.json` (`scripts/verify_lc_families.py`): all 67
  members checked of the published non-log-concave families `T_{3,m,n}`,
  `T*_{3,m,n}` (orders 26–50) fail log-concavity **only at index `alpha-1`**,
  deep inside the tail region `r >= L(alpha)`, and satisfy `ISO_r` at every
  index with prefix margin `>= 2.2`; 172 further non-log-concave "bush"
  generalisations behave the same (failures at `alpha-1` or `alpha-2`). Since
  `ISO_r` is strictly stronger than log-concavity wherever
  `p_{r+1} > p_{r-1}`, a log-concavity failure inside the prefix would have
  refuted the framework; none exists among known examples (Galvin's 2025
  family breaks at `~ alpha(1 - 1/(16 log alpha))`, also in the tail).
- `reports/iso_adversarial_search.json` (`scripts/search_iso_adversarial.py`,
  35-minute budget): 9,590,415 exact polynomials — parameter sweeps over
  stars with pendant paths, spiders, brooms, double brooms, caterpillars,
  bushes, `T_{3,m,n}`, `T*_{3,m,n}`, multi-arm stars, complete `k`-ary and
  subdivided trees up to order 300; simulated annealing / hill climbing on
  trees of orders 24–120 driven to minimise the `ISO` margin; uniform and
  preferential-attachment random trees up to order 200; and 3,180 forests
  assembled from the most extremal trees and from `T_{3,4,4}` with paths.
  **Zero violations** of `ISO`, `WR`, `TAIL` or unimodality. Smallest `ISO`
  margin for `r >= 3`: `0.887` (double broom `a = 148, k = 3, b = 149`,
  `n = 300`, `r = 4`); for balanced double brooms the margin at `r = 4` is
  proved to tend to `7/8` (exact rational function), and every tested family
  stays above that; smallest margin at a descent index: `1.898`; largest `WR`
  ratio: `0.194`. The `n = 20` exhaustive minima are reproduced exactly. The
  committed file is a slimmed copy (exact per-`(n,r)` minima reduced to floats
  except the per-`n` minimum; witnesses only where referenced); the full run
  report is identified by its SHA-256 inside the file.
- `reports/independent_audit.json` (`scripts/audit_independent.py`):
  deletion-recursion polynomials, a different tree generator with
  canonical-form deduplication, and checks written from the definitions agree
  with `erdos993lib` on all trees `n <= 14`, all forests `n <= 12`, and the
  named families.

## D. What remains open, and an assessment of the plan

- The open core is the **all-forest `ISO_r` theorem for `r >= 4`** (or the
  weaker descent-conditional form). `ISO_1..ISO_3` and `WR_1..WR_3` are now
  proved for all forests. `ISO_4` needs `p_5`, i.e. counts of all sub-forests
  on `<= 5` vertices (edges, `P_3`, `2K_2`, `P_4`, `K_{1,3}`, `P_3 + K_2`,
  `3K_2`, `P_5`, the chair, `K_{1,4}`, ...), so each further index is a
  separate and growing campaign — consistent with the handoff's "rank"
  structure and with its being stuck at rank 6. Nothing here suggests that
  finitely many indices suffice; the handoff's own plan relies on an
  unverified "Newton tail" for large indices.
- The handoff's Gate 5 still lists: rank-6 `G1` (three coupled families, all
  strongest cones infeasible), all-`N6` integration, rank-6/7 propagation, and
  the Newton join for indices `m = 0..7`. Even taking every frozen claim at
  face value, that is several independent unproved theorems, not a finishing
  step. The realistic status is the handoff's own last sentence: substantial
  exact progress, theorem still open.
- Literature (`docs/LITERATURE_STATUS_2026-09-02.md`, primary sources fetched
  2026-09-02): no proof and no counterexample is known; unimodality is
  verified for all trees with `n <= 29` (Reynolds; an independent repository
  claims `n <= 32`); log-concavity fails from `n = 26`
  (Kadrawi–Levit–Yosef–Mizrachi) with arbitrarily many breaks in later
  constructions (Galvin; Bautista-Ramos); `T_{3,m,n}`, `T*_{3,m,n}` are proved
  unimodal (Li, arXiv:2603.03025); all spiders are log-concave
  (Li–Li–Yang–Zhang). A non-unimodal forest must contain a non-log-concave
  tree component (Hoggar), so the forest half is not implied by the tree half.

### Recommendations

1. Publish the original `erdos993_goal` workspace (or at least the producers
   and JSON reports named in the handoff) so the frozen claims can be replayed
   independently; until then treat them as unverified.
2. Try the same machinery on `ISO_4`: derive `p_5` by inclusion–exclusion over
   sub-forests on `<= 5` vertices, keep the star-exact terms (the analogue of
   `T3`) through Cauchy–Schwarz-type bounds, drop only manifestly nonnegative
   terms, and certify the resulting low-dimensional polynomial. The observed
   `r = 4` margin (`>= 7/8` asymptotically, `>= 1.07` for `n <= 24`) leaves
   room for such crude bounds.
3. Attack the **descent-conditional** `ISO` rather than the universal one:
   the reduction lemma only needs `Q_r >= 0` at prefix indices where
   `p_r <= p_{r-1}`, and there the observed margin is `>= 1.88` on all trees
   `n <= 24` (versus `-> 0` for the universal statement at `r = 2`). A weaker
   inductive inequality such as `Q_r >= c * p_{r-1} p_r` (`c` around `1/2`),
   false for the universal statement at `r = 2` but plausible at descent
   indices and for `r >= 3`, leaves room for a leaf-deletion induction.
4. Test any claimed closure against the extremal families recorded here
   (stars at `r = 2`; double brooms and tree-plus-isolated-vertices at
   `r = 3..5`) before believing it.

## E. Second campaign (same day): direct attack on the open core

After the audit above, a second round attacked the open core itself with
several parallel strategies. Outcome: **no proof of the conjecture**; three new
exact partial theorems; and, more importantly, a sharp map of where the
difficulty sits. Everything is replayable.

1. **The whole problem is one inductive inequality — the leaf lemma.**
   (`docs/LEAF_INDUCTION_PROBE.md`, `scripts/probe_leaf_induction.py`.) For a
   forest `T`, a leaf `l` with neighbour `v`, `A = T - l`, `B = T - l - v`:

   ```text
   R := Q_r(T) - Q_r(A) - Q_{r-1}(B) >= 0          ("leaf lemma")
   ```

   would prove `ISO_r` for **every forest at every index** by induction on
   `n` (base case: empty graphs, binomial coefficients). On all 244,690
   (tree, leaf) instances with `n <= 16` and all 2,133,459 index rows, `R > 0`
   strictly. The lemma is asymptotically tight on stars at `r = 2`
   (`R = 3m - 1` while the two competing terms are each of order `m^2`), so any
   proof must be exact there. An exact LP search shows that `R` is **not** a
   nonnegative combination of the induction hypotheses on `B`, `C = T - N[v]`
   and the coordinate relations that hold universally (`b_k >= c_k >= 0`,
   synchronisation inequalities, ISO/LC/FLC of `B` and `C`) for any
   `2 <= r <= 8`; only `r = 1` certifies. The missing structure is the
   relation between `I(B)` and `I(B - D)` where `D` picks one vertex from each
   component of `B` — exactly the "marked forest / bundle" objects of the
   handoff. So the handoff's route is the right one, and its cone
   infeasibilities are re-confirmed independently at small scale.
2. **A single-level sufficient condition (new lead).**
   (`docs/DISPERSION_LEAD.md`, `scripts/probe_dispersion.py`.) Let `e(T)` be
   the number of one-vertex extensions of a uniformly random independent
   `k`-set. Exact identities give

   ```text
   Var_k(e) <= E_k(e)   ==>   (k+1) p_{k+1}^2 >= (k+2) p_k p_{k+2}  (FLC)   ==>   ISO_{k+1}  (with Q >= p_k^2),
   ```

   and `Var_k(e) <= E_k(e)` is equivalent to `FLC_{k+1}` strengthened by the
   explicit term `2 M_k p_k` (`M_k` = pairs (set, edge) with both endpoints
   free). It holds at every prefix level for all trees `n <= 19`, all forests
   `n <= 16` and all structured families tested (to order ~250); the only
   family near the boundary is the star (`Var/E = (m-1)/(m+1)` at level 1;
   `Var = 0` at higher levels). `k = 1` is proved for all forests. This is a
   statement about one probability measure rather than three coefficients, so
   it opens coupling/correlation methods; but `U_k` is not negatively
   associated even on `P_4`, so no off-the-shelf theorem applies. Not proved
   for `k >= 2`.
3. **ISO in the tail: exact provable range and exact obstruction.**
   (`docs/ISO_TAIL_THEOREM.md`, `scripts/prove_iso_tail.py`.) From the
   Levit–Mandrescu bound `(k+1) p_{k+1} <= 2(alpha-k) p_k` and AM–GM:
   `ISO_r` holds for every forest whenever `(alpha - r)^2 <= r`, i.e.
   `r >= alpha - floor((sqrt(4 alpha + 1) - 1)/2)`; a Fisher–Ryan refinement
   gives an exactly tabulated larger range `r >= r_B(alpha)`, and the whole
   tail `r >= L(alpha)` is covered for `alpha in {2,...,7,10}`. Conversely, for
   every other `alpha <= 60` and every `L(alpha) <= r < r_B(alpha)` there is an
   explicit rational sequence satisfying all of Levit–Mandrescu, Fisher–Ryan,
   Zykov, `WR` and `TAIL` with `Q_r < 0`: those general tools alone cannot
   finish even the tail, which is why the handoff needed its own "Newton
   tail" machinery.
4. **Strengthenings tested and their closure.** `FLC` (log-concavity of
   `r! p_r`) holds at every index for all trees `n <= 20` and fails in the
   published non-log-concave families exactly where log-concavity fails (tail
   only); it is closed under disjoint union (Liggett's ULC(∞) theorem),
   whereas `ISO` is not closed under convolution as an abstract property
   (explicit non-graph counterexamples) although it holds on all 487,578
   products of tree polynomials tested.
5. **ISO_4 for trees: not proved; the obstruction is quantified.**
   (`docs/ISO4_TREES_PROBE.md`, `scripts/probe_iso4_trees.py`.) The exact
   inclusion–exclusion formula for `p_5` (sub-forests on `<= 5` vertices:
   `P_3 + K_2` pairs, `P_5`, chairs, `K_{1,4}`) is verified. A universally
   valid bound chain in the `ISO_3` style exists and is exact on stars, but
   its lower bound on `Q_4` is negative for `n <= 40` (positive for all
   scanned `n >= 45`), because the extremal double brooms leak `~17/m` through
   the degree-only relaxations of the distance-2 counts. Closing `ISO_4` this
   way needs the second moment of distance-2 counts kept as an extra parameter
   (equivalently `N_{P_5} + N_chair`); the region `n <= 44` is also far beyond
   enumeration (`~10^16` trees at `n = 44`).
6. **The leaf lemma is now certified at `r = 1, 2, 3` for every
   configuration** — giving a complete, exact, inductive proof of
   `ISO_1..ISO_3` for all forests through the leaf recursion
   (`docs/LEAF_LEMMA_STRUCTURED.md`, `scripts/certify_leaf_lemma_r3_complete.py`,
   marker `PASS_EXACT_LEAF_LEMMA_R3_ALL_CONFIGURATIONS`, one minute to replay).
   The key was making certificates **uniform in the number of sibling leaves**
   (`s = 1 + t`, coefficients polynomial in `t` with nonnegative coefficients),
   so one identity covers infinitely many configurations, plus degree-4
   certificates for the `s = 0` cases. Two ingredients the earlier LP lacked
   made any of this possible: super-multiplicativity
   `i_j(Y) i_k(X) >= C(j+k,j) i_{j+k}(X)` for induced subforests `X ⊆ Y`, and
   the exact single-mark relation `I(F') = I(F'-w) + x I(F'-N[w])` obtained by
   deleting a *deepest* leaf. Adding the **degree relation**
   `gamma_k - delta_k <= deg(w) · gamma_{k-1}` (second-neighbourhood
   information, exactly what the obstruction analyses asked for) lowers the
   degree needed at `r = 3` and yields the **first exact certificate at
   `r = 4`** (configuration `s = 1, deg(w) = 2`; degree 4; `52 + 1,124`
   rational coefficients verified exactly, `reports/leaf_lemma_r4_certificates.json`).
   The certificate degree grows with `r` (2 → 3 → 4), and at `r = 4` the
   remaining configurations are out of reach of the present LP sizes: the
   no-parent cases are infeasible through degree 4, `deg(w)`-uniformity fails
   with polynomial coefficients even at `r = 3`, and inducting on the stronger
   FLC does not help. So `ISO_4` for all forests is **not** proved. What is
   established is that the inductive route works level by level once
   second-neighbourhood relations are supplied — the same ladder the handoff
   climbed to rank 6 — and that a proof for all `r` must come from
   understanding these certificates uniformly in `r`, not from enumerating
   them.

### Honest reading

The second campaign moved the frontier (`ISO_3` for all forests; a proved
tail range with a proved obstruction; two clean reformulations with large
empirical slack; the inductive leaf lemma certified exactly at `r = 2, 3`)
but did not reach a proof, and the obstruction results explain why: every
general tool leaves the middle range untouched; the inductive inequality that
would finish everything is provable level by level only with certificates whose
degree grows with `r`, and stalls at `r = 4` for lack of relations about the
second neighbourhood of the marked vertex; and the direct `ISO_4` chain leaks
exactly through the same distance-2 statistics. Three independent routes point
at the same missing object — quantitative control of `I(F - N[w])` versus
`I(F - w)` in terms of the degrees around `w` (the handoff's two-mark
bundles). That is where a proof has to come from. Erdős #993 remains open.

## Status of long-running exhaustive jobs

| Job | Scope | Wall time | Result |
| --- | --- | --- | --- |
| A | all trees `n <= 24` (63,242,256) | ~55 min | complete, no failures (`reports/exhaustive_job_A.json`) |
| B | all forests `n <= 22` (21,539,987) | ~12 min | complete, no failures (`reports/exhaustive_job_B.json`) |
| C | all trees `n = 25` (104,636,890) | 103 min | complete, no failures (`reports/exhaustive_job_C.json`) |
| D | all trees `n = 26` (279,793,450) | stopped after 104 min | **not completed** (would have needed ~4.5 h); the only two non-log-concave trees of order 26 were checked directly in `reports/lc_families.json` |

The 4-core VM ran A–D in parallel with the subagents' searches; per-tree cost
is about 60 µs in pure Python. Extending to `n = 26..29` (and matching the
literature's unimodality frontier) is a matter of machine time, not method.


---

<!-- FILE: README.md -->

# Erdős Problem #993 — exact verification toolkit and status audit

Erdős Problem #993 (Alavi–Malde–Schwenk–Erdős, 1987) asks whether the
independent-set sequence `p_0, p_1, ..., p_alpha` of every tree (equivalently
every forest) is unimodal. **As of 2026-09-02 the problem is open**; nothing in
this directory proves it. What is here:

| Path | Content |
| --- | --- |
| `STATUS_2026-09-02.md` | Honest status: what is proved, what is exhaustively verified, what is unverifiable, what remains open. Start here. |
| `handoff/HANDOFF_2026-09-02_verbatim.md` | The handoff received for this task, preserved verbatim. It refers to a Windows workspace that is **not** in this repository. |
| `docs/REDUCTION_LEMMA_AND_PROVED_CASES.md` | Rigorous proofs of the small theorems that *are* available: the WR+ISO reduction lemma, the conditional unimodality theorem, `ISO_1`, `ISO_2`, `WR_1`, `WR_2`, `WR_3` for all forests, and `ISO` for real-rooted polynomials. |
| `docs/ISO3_TREES_THEOREM.md` | Exact computer-assisted proof that `ISO_3` holds for every tree (`scripts/prove_iso3_trees.py`). |
| `docs/ISO3_FORESTS_THEOREM.md` | Extension of that proof to every forest (`scripts/prove_iso3_forests.py`). |
| `docs/ISO_TAIL_THEOREM.md` | `ISO_r` proved for every forest when `(alpha-r)^2 <= r` (plus a tabulated refinement), and an exact obstruction showing the general tools cannot reach the whole tail (`scripts/prove_iso_tail.py`). |
| `docs/LEAF_INDUCTION_PROBE.md` | The whole problem as one inductive inequality (the leaf lemma); exhaustive evidence, tightness on stars, and LP proof that it is not derivable from the obvious relations (`scripts/probe_leaf_induction.py`). |
| `docs/LEAF_LEMMA_STRUCTURED.md` | Exact Positivstellensatz certificates for the leaf lemma: complete for `r <= 3` (an inductive proof of `ISO_1..3` for all forests, `scripts/certify_leaf_lemma_r3_complete.py`) and one configuration at `r = 4` (`scripts/certify_leaf_lemma_r4.py`). |
| `docs/DISPERSION_LEAD.md` | A single-level probabilistic sufficient condition (`Var(e) <= E(e)` for random independent sets) implying the whole chain; exhaustive evidence, `k = 1` proved (`scripts/probe_dispersion.py`). |
| `docs/ISO4_TREES_PROBE.md` | Feasibility probe for extending the `ISO_3` method to `ISO_4` (if present). |
| `docs/LITERATURE_STATUS_2026-09-02.md` | Primary-source literature check (erdosproblems.com, arXiv, Zenodo, GitHub). |
| `erdos993lib/` | Exact-arithmetic library: independence polynomials of forests, WROM enumeration of non-isomorphic trees/forests, WR/ISO/TAIL/unimodality checks, named tree families, JSON reports with SHA-256. |
| `audit/` | Independent re-implementation (different algorithms) used to cross-check `erdos993lib`. |
| `scripts/` | Reproducible producers: exhaustive scans, published non-log-concave families, adversarial search, symbolic lemma checks, independent audit. |
| `reports/` | JSON outputs of the scripts (each carries the SHA-256 of the script that produced it). |
| `tests/` | `pytest` suite. |

## The framework being audited

For a forest with independence polynomial `I(F;x) = sum p_r x^r`, put
`L(alpha) = ceil((2 alpha - 1)/3)` and

```text
WR_r :  p_{r-1} <= r p_r
ISO_r:  Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0
TAIL :  p_r >= p_{r+1} for r >= L(alpha)        (Levit–Mandrescu, every graph)
```

`WR_r` and `ISO_r` for `1 <= r <= L-1` together with `TAIL` imply unimodality
(proved in `docs/REDUCTION_LEMMA_AND_PROVED_CASES.md`). `ISO_r` and `WR_r` are
proved here for all forests and `r <= 3`; the open core is the all-forest
`ISO_r` theorem for `r >= 4`.

## Reproduce

```bash
cd erdos993
bash scripts/replay_all.sh                             # everything below except the long scans (~1 min)
python3 -m pytest -q                                   # unit tests
python3 scripts/verify_lemmas_symbolic.py              # sympy checks of every proved identity
python3 scripts/prove_iso3_trees.py                    # ISO_3 for all trees (exact certificate)
python3 scripts/prove_iso3_forests.py                  # ISO_3 for all forests (exact certificate)
python3 scripts/audit_independent.py                   # independent re-implementation cross-check
python3 scripts/verify_lc_families.py                  # published non-log-concave trees vs ISO/WR/TAIL
python3 scripts/verify_exhaustive.py --trees-max 20 --forests-max 18 --out reports/small.json
python3 scripts/search_iso_adversarial.py --minutes 5  # heuristic hunt for ISO violations
```

Reports are deterministic (no timestamps or timings inside the JSON), so a
faithful replay reproduces each proof/audit report byte-for-byte and hence its
SHA-256. The two exceptions are inherently non-deterministic: the adversarial
search (time-budgeted, randomised) and the exhaustive scans started before
this convention was adopted (they carry a `utc` field).

Python 3.12; dependencies: `sympy`, `pytest` (and `networkx` only for one
optional cross-check). All mathematics is done in exact integer/rational
arithmetic.


---

<!-- FILE: docs/REDUCTION_LEMMA_AND_PROVED_CASES.md -->

# The reduction lemma and the proved cases of the WR + ISO + TAIL framework

**Scope.** This note is an audit of the proof framework used in this repository for the
unimodality question for independence polynomials of forests (Alavi, Malde, Schwenk and
Erdős, 1987; Erdős Problem #993). It gives complete, self-contained proofs of everything
the framework uses that *can* be proved with elementary means, states precisely what is
cited from the literature, and ends with an explicit list of what is **not** proved.

**Machine verification.** Every algebraic identity and inequality below is checked, with
exact arithmetic only (sympy polynomial identities, Python integers, `fractions.Fraction`;
no floating point anywhere), by

```
python3 scripts/verify_lemmas_symbolic.py        # prints PASS/FAIL per item, exit 1 on failure
python3 -m pytest tests/test_lemmas.py -q        # same checks + independent unit tests
```

Tags of the form **[S-k]** refer to item `k` of that script. Equation labels such as (1.1)
are referred to verbatim in the script output. Numerical enumerations in the script are
consistency checks of the theorems; they are never used as proof steps.

**Summary of status.**

| Statement | Status |
| --- | --- |
| Reduction lemma (Lemma 1.1, ratio form Lemma 1.2) | proved here (pure arithmetic) |
| Conditional unimodality theorem (Theorems 2.1, 2.2) | proved here (pure arithmetic) |
| Exact formulas for $p_0, p_1, p_2, p_3$ of a forest (Theorem 3.1), and $p_4$ (Prop. 3.3) | proved here (counting) |
| $\mathrm{ISO}_1$ for every forest (Theorem 4.1) | proved here |
| $\mathrm{ISO}_2$ for every forest, star extremal (Theorem 5.1) | proved here |
| $\mathrm{WR}_1$, $\mathrm{WR}_2$ wherever the framework needs them (Theorem 6.1) | proved here |
| real-rooted $I(F;x)$ $\Rightarrow$ $\mathrm{ISO}_r$ for all $r$ (Theorem 7.1) | proved here, from Newton's inequalities (classical, cited) |
| claw-free graphs have real-rooted $I(G;x)$ (Theorem 8.2) | **cited** (Chudnovsky–Seymour) |
| TAIL for forests (Theorem 8.1) | **cited** (Levit–Mandrescu; valid for bipartite graphs, **not** for all graphs) |
| $\mathrm{ISO}_3$ for every tree (Theorem 11.1, `ISO3_TREES_THEOREM.md`) and every forest (Theorem 11.1', `ISO3_FORESTS_THEOREM.md`) | proved (exact computer-assisted certificates) |
| $\mathrm{WR}_3$ wherever the framework needs it (Theorem 11.2) | proved here |
| $\mathrm{ISO}_r$, $\mathrm{WR}_r$ for $r \ge 4$ | **not proved** (Sections 10–11) |

---

## 0. Setting, notation and two elementary facts

Throughout, $F$ is a forest with $n \ge 1$ vertices, $e$ edges and vertex degrees
$d_v$; $S := \sum_v \binom{d_v}{2}$. An *independent set* is a set of pairwise
non-adjacent vertices ($\emptyset$ is independent). Write $p_k$ for the number of
independent $k$-sets, $\alpha = \alpha(F)$ for the independence number, and

$$I(F;x) = \sum_{k=0}^{\alpha} p_k x^k .$$

In the code, $p$ is the list `[p_0, ..., p_alpha]` (trailing zeros stripped, so
`alpha = len(p) - 1`). We use the convention $p_k := 0$ for $k > \alpha$; all identities
below hold with this convention (the degenerate cases $n \in \{1,2\}$ are treated explicitly
where they matter).

**Definitions (as in `erdos993lib/checks.py`).** For $a \ge 1$ put

$$L(a) := \left\lceil \frac{2a-1}{3} \right\rceil .$$

For a sequence $p_0, \dots, p_\alpha$:

* $\mathrm{WR}_r$ ($1 \le r \le \alpha$): $p_{r-1} \le r\,p_r$.
* $\mathrm{ISO}_r$ ($1 \le r \le \alpha - 1$): $Q_r := r\,p_r^2 + p_{r-1}^2 - (r+1)\,p_{r-1}\,p_{r+1} \ \ge\ 0$.
* $\mathrm{TAIL}$: $p_r \ge p_{r+1}$ for every $r$ with $L(\alpha) \le r \le \alpha - 1$.

A finite sequence is *unimodal* if it is non-decreasing up to some index and non-increasing
afterwards.

**Fact 0.1 (positivity).** For every graph with independence number $\alpha$ and every
$0 \le k \le \alpha$: $p_k \ge \binom{\alpha}{k} \ge 1$.

*Proof.* Every $k$-subset of a maximum independent set is independent, and there are
$\binom{\alpha}{k} \ge 1$ of them. $\square$

**Fact 0.2 (index bookkeeping) [S-2].** For $\alpha \ge 1$: $1 \le L(\alpha) \le \alpha$;
for $\alpha \ge 2$: $L(\alpha) \le \alpha - 1$; and $L$ is non-decreasing. Moreover
$L(\alpha) \le 3 \iff \alpha \le 5$.

*Proof.* $(2\alpha-1)/3 > 0$ for $\alpha \ge 1$, so the ceiling is $\ge 1$.
$(2\alpha-1)/3 \le \alpha - 1 \iff \alpha \ge 2$, and $(2\alpha-1)/3 \le \alpha$ always; the
ceiling of a real number that is at most the integer $m$ is at most $m$. Monotonicity is clear,
and $\lceil (2\alpha-1)/3 \rceil \le 3 \iff (2\alpha-1)/3 \le 3 \iff \alpha \le 5$. $\square$

Table: $L(1)=1,\ L(2)=1,\ L(3)=2,\ L(4)=3,\ L(5)=3,\ L(6)=4,\ L(7)=5,\ L(8)=5,\ L(9)=6$.

Consequently, whenever $1 \le r \le L(\alpha) - 1$ we have $r + 1 \le L(\alpha) \le \alpha - 1$
(for $\alpha \ge 2$; for $\alpha = 1$ the range is empty), so $p_{r-1}, p_r, p_{r+1}$ are all
$\ge 1$ by Fact 0.1 and $\mathrm{ISO}_r$ is meaningful. The guard `min(L, alpha)` in
`checks.analyze` is therefore never active; it is harmless.

---

## 1. The reduction lemma

**Lemma 1.1 (reduction lemma) [S-1].** Let $r \ge 1$ and let $a = p_{r-1} > 0$,
$b = p_r$, $c = p_{r+1}$ be real numbers. Then the polynomial identities

$$r b^2 - (r+1)\,a b + a^2 \;=\; (r b - a)(b - a) \tag{1.2}$$

$$(r+1)\,a\,(b - c) \;=\; Q_r + (r b - a)(a - b), \qquad Q_r = r b^2 + a^2 - (r+1) a c \tag{1.1}$$

hold. Consequently, if $\mathrm{WR}_r$ ($a \le r b$), $\mathrm{ISO}_r$ ($Q_r \ge 0$) and
$b \le a$ (i.e. $p_r \le p_{r-1}$) hold, then $c \le b$ (i.e. $p_{r+1} \le p_r$).

*Proof.* Expanding, $(rb-a)(b-a) = rb^2 - rab - ab + a^2 = rb^2 - (r+1)ab + a^2$, which is
(1.2); adding $(r+1)a(b-c)$ to both sides of (1.2) rearranged gives (1.1). Both are checked by
`sympy.expand` in [S-1].

Now assume the three hypotheses. In (1.2) the first factor $rb - a$ is $\ge 0$ by
$\mathrm{WR}_r$ and the second factor $b - a$ is $\le 0$, so

$$r p_r^2 - (r+1) p_r p_{r-1} + p_{r-1}^2 \le 0, \quad\text{i.e.}\quad r p_r^2 + p_{r-1}^2 \le (r+1)\,p_{r-1}\,p_r .$$

Combining with $\mathrm{ISO}_r$,

$$(r+1)\,p_{r-1}\,p_{r+1} \;\le\; r p_r^2 + p_{r-1}^2 \;\le\; (r+1)\,p_{r-1}\,p_r ,$$

and dividing by $(r+1)p_{r-1} > 0$ gives $p_{r+1} \le p_r$. (Equivalently: in (1.1) the
right-hand side is a sum of the non-negative quantities $Q_r$ and $(rb-a)(a-b)$, so
$(r+1)a(b-c) \ge 0$.) No sign assumption on $b$ or $c$ is needed; for forests all $p_k$ are
positive integers anyway. $\square$

**Lemma 1.2 (ratio form) [S-1].** Keep the notation of Lemma 1.1 and assume additionally
$\mathrm{WR}_r$, so that $b \ge a/r > 0$. Put $x = p_r / p_{r-1}$ and $y = p_{r+1} / p_r$.
Then

* $\mathrm{WR}_r \iff x \ge 1/r$, and the hypothesis $p_r \le p_{r-1} \iff x \le 1$;
* $\mathrm{ISO}_r \iff r x + \dfrac1x \ge (r+1)\,y$ (divide $Q_r \ge 0$ by $p_{r-1}p_r > 0$; indeed
  $Q_r/(p_{r-1}p_r) = rx + 1/x - (r+1)y$);
* $f(x) := r x + 1/x$ satisfies $f(x) \le r + 1$ on $[1/r, 1]$.

Hence $(r+1) y \le r + 1$, i.e. $y \le 1$, i.e. $p_{r+1} \le p_r$.

*Proof of the third point.* Two equivalent arguments. (i) The identity

$$r x + \frac1x - (r+1) = \frac{(r x - 1)(x - 1)}{x}$$

(checked in [S-1]) has right-hand side $\le 0$ exactly when $x$ lies between $1/r$ and $1$.
(ii) $f''(x) = 2/x^3 > 0$, so $f$ is convex on $[1/r,1]$; a convex function lies below the chord
joining its endpoint values, and $f(1/r) = 1 + r = f(1)$, so the chord is the constant $r+1$
(equality at both endpoints). For $r = 1$ the interval is the single point $x = 1$. $\square$

The quantity $Q_r/(p_{r-1}p_r) = rx + 1/x - (r+1)y$ is the *dimensionless ISO margin* recorded
by `checks.iso_margin`.

---

## 2. The conditional unimodality theorem

**Theorem 2.1 [S-2].** Let $\alpha \ge 1$, $L = L(\alpha)$, and let $p_0, \dots, p_\alpha$ be
positive real numbers such that

* **(H1)** $\mathrm{WR}_r$ and $\mathrm{ISO}_r$ hold for every $r$ with $1 \le r \le L - 1$, and
* **(H2)** $\mathrm{TAIL}$ holds: $p_r \ge p_{r+1}$ for every $r$ with $L \le r \le \alpha - 1$.

Then $(p_0, \dots, p_\alpha)$ is unimodal. Moreover its maximum is attained at an index
$\le L$.

*Proof.* Call $r \in \{1, \dots, \alpha\}$ a *descent index* if $p_r \le p_{r-1}$.

*Case 1: no $r \in \{1, \dots, L-1\}$ is a descent index.* Then
$p_0 < p_1 < \dots < p_{L-1}$, and by (H2) $p_L \ge p_{L+1} \ge \dots \ge p_\alpha$. If
$p_{L-1} \le p_L$ the sequence is non-decreasing on $[0, L]$ and non-increasing on
$[L, \alpha]$ (mode $L$); if $p_{L-1} > p_L$ it is non-decreasing on $[0, L-1]$ and
non-increasing on $[L-1, \alpha]$ (mode $L-1$). Either way it is unimodal with maximum at an
index $\le L$. (If $L = 1$, i.e. $\alpha \in \{1,2\}$, this case always applies and (H1) is
vacuous.)

*Case 2: otherwise.* Let $m$ be the smallest descent index in $\{1, \dots, L-1\}$, so
$p_0 < p_1 < \dots < p_{m-1} \ge p_m$. We claim that

$$p_{r} \le p_{r-1} \quad\text{for all } m \le r \le L. \tag{2.1}$$

Induction on $r$: for $r = m$ this is the definition of $m$. If $m \le r \le L-1$ and
$p_r \le p_{r-1}$, then $r \le L - 1$, so $\mathrm{WR}_r$ and $\mathrm{ISO}_r$ hold by (H1),
$p_{r-1} > 0$, and Lemma 1.1 gives $p_{r+1} \le p_r$, which is (2.1) at $r+1$. The induction
stops exactly when it reaches $r + 1 = L$, which is where (H1) stops being available — and
that is where (H2) takes over: $p_L \ge p_{L+1} \ge \dots \ge p_\alpha$. Altogether

$$p_0 < \dots < p_{m-1} \ge p_m \ge p_{m+1} \ge \dots \ge p_L \ge p_{L+1} \ge \dots \ge p_\alpha ,$$

which is unimodal with mode $m - 1 \le L - 2$. $\square$

**Theorem 2.2 (descent-conditional version) [S-2].** Theorem 2.1 remains true if (H1) is
weakened to

* **(H1$'$)** for every $r$ with $1 \le r \le L-1$ *and* $p_r \le p_{r-1}$, both
  $\mathrm{WR}_r$ and $\mathrm{ISO}_r$ hold.

In particular (keeping $\mathrm{WR}_r$ for all $1 \le r \le L-1$, which is what the framework
does) it suffices that $\mathrm{ISO}_r$ holds at those $r \le L-1$ where $p_r \le p_{r-1}$.

*Proof.* In the proof of Theorem 2.1, $\mathrm{WR}_r$ and $\mathrm{ISO}_r$ were invoked only
at the indices $r \in \{m, \dots, L-1\}$ of the induction (2.1), and every such $r$ satisfies
$p_r \le p_{r-1}$ (that is the induction hypothesis). $\square$

**Remark 2.3 (exactly which indices are needed).**

* $\mathrm{WR}_r$: for $1 \le r \le L(\alpha) - 1$ only (Theorem 2.1), or only at the descent
  indices among them (Theorem 2.2).
* $\mathrm{ISO}_r$: the same range. By Fact 0.2 every such $r$ satisfies
  $r \le L - 1 \le \alpha - 2$, so $p_{r+1}$ exists and $\mathrm{ISO}_r$ is meaningful; the
  statement "$\mathrm{ISO}_r$ for $1 \le r \le L-1$, $r \le \alpha - 1$" has the second
  condition automatically satisfied.
* $\mathrm{TAIL}$: for $L(\alpha) \le r \le \alpha - 1$.
* Nothing is assumed at indices $r \ge L$ other than TAIL. In particular $\mathrm{WR}_r$ and
  $\mathrm{ISO}_r$ may fail for $r \ge L$ without affecting the conclusion.

These are exactly the hypotheses `checks.analyze` records in `wr_failures_prefix`,
`iso_failures_prefix`, `descent_conditional_iso_failures_prefix` and `tail_failures`; the
`AssertionError` in `analyze` (hypotheses hold but the sequence is not unimodal) is
unreachable by Theorem 2.1. Item [S-2] also checks Theorems 2.1 and 2.2 exhaustively on the
finite domain of all sequences with $p_0 = 1$, $1 \le p_k \le 6$, $\alpha \le 6$
(1306 sequences satisfy (H1)+(H2), 2568 satisfy (H1$'$)+(H2); all are unimodal with maximum
at an index $\le L$; the domain contains 48510 non-unimodal sequences), and exhibits
$(1,5,4,5,1)$: TAIL holds, the sequence is not unimodal, and indeed $Q_2 = -18 < 0$.

**Corollary 2.4 (forests with $\alpha \le 5$).** Let $F$ be a forest with
$\alpha(F) \le 5$. Then $I(F;x)$ is unimodal, assuming only the cited Theorem 8.1 (TAIL for
forests).

*Proof.* By Fact 0.2, $L(\alpha) \le 3$, so (H1) only concerns $r \in \{1, 2\}$.
$\mathrm{WR}_1$ and $\mathrm{ISO}_1$ hold for every forest (Theorems 6.1 and 4.1);
$\mathrm{ISO}_2$ holds for every forest (Theorem 5.1); $\mathrm{WR}_2$ holds for every forest
with $n \ge 4$, and if $n \le 3$ then $\alpha \le 3$ and $L \le 2$, so $r = 2$ is not in the
prefix (Theorem 6.1). TAIL is Theorem 8.1. Apply Theorem 2.1. $\square$

For $\alpha \ge 6$ the prefix contains $r = 3$. $\mathrm{ISO}_3$ for general forests is not
proved in Sections 1–9 (Section 10); $\mathrm{WR}_3$ wherever it is needed, and $\mathrm{ISO}_3$
for *trees*, are treated in the Addendum (Section 11).

---

## 3. Exact low-order coefficients of a forest

**Theorem 3.1 [S-3].** For every forest $F$ (with the convention $p_k = 0$ for $k > \alpha$):

$$p_0 = 1,\qquad p_1 = n,\qquad p_2 = \binom n2 - e,\qquad p_3 = \binom n3 - e\,(n-2) + S,
\qquad S = \sum_v \binom{d_v}{2}.$$

Here $S$ is the number of unordered pairs of edges sharing a vertex, equivalently the
number of paths with two edges ($P_3$ subgraphs) in $F$.

*Proof.* $p_0 = 1$ (the empty set) and $p_1 = n$ (every singleton) are clear. A $2$-set is
independent iff it is not an edge, so $p_2 = \binom n2 - e$.

For $p_3$: a $3$-set $U$ is independent iff it contains no edge. Let $E(U)$ be the set of edges
with both ends in $U$. In a forest $|E(U)| \le 2$, since three edges on three vertices would
form a triangle. Let $N_1$, $N_2$ be the numbers of $3$-sets with $|E(U)| = 1$, resp. $2$.
Double counting the pairs $(uv, U)$ with $uv \in E$, $\{u,v\} \subseteq U$, $|U| = 3$: each
edge lies in exactly $n - 2$ three-sets, so

$$e\,(n-2) = N_1 + 2 N_2, \qquad\text{hence}\qquad p_3 = \binom n3 - N_1 - N_2 = \binom n3 - e(n-2) + N_2 .$$

It remains to show $N_2 = S$. If $U$ contains two distinct edges, they have four endpoints
counted with multiplicity but only three vertices are available, so they share exactly one
vertex $v$ and $U = \{u, v, w\}$ with $uv, vw \in E$; thus $U$ is determined by the pair of
edges. Conversely, two edges $uv, vw$ with a common vertex $v$ span the $3$-set $\{u,v,w\}$,
which contains exactly these two edges ($uw \notin E$, else a triangle). So $N_2$ is the
number of unordered pairs of edges with a common vertex. Two distinct edges share at most one
vertex, so each such pair is counted at exactly one vertex $v$, and at $v$ there are
$\binom{d_v}{2}$ pairs: $N_2 = \sum_v \binom{d_v}2 = S$. $\square$

*Degenerate cases.* $n = 1$: $p = (1,1)$ and the formulas give $p_2 = \binom12 - 0 = 0$,
$p_3 = 0$. $n = 2$, $e = 0$: $p = (1,2,1)$, $p_3 = 0 - 0 + 0 = 0$. $n = 2$, $e = 1$:
$p = (1,2)$, $p_2 = 1 - 1 = 0$, $p_3 = 0 - 1\cdot 0 + 0 = 0$. $P_3$: $p = (1,3,1)$, $S = 1$,
$p_3 = 1 - 2\cdot 1 + 1 = 0$. All checked in [S-3]. [S-3] also verifies the formulas against
`erdos993lib.indpoly.indpoly_forest` for all 987 non-isomorphic trees with $n \le 12$
(counts matching OEIS A000055) and for 400 random forests with $n \le 40$ obtained by deleting
random edges from random Prüfer trees (117 of them cross-checked against the $2^n$ brute
force `indpoly_bruteforce`).

**Remark 3.2 (general graphs; not used).** The same double count gives, for an arbitrary
graph with $t$ triangles, $p_3 = \binom n3 - e(n-2) + S - t$ (a triangle is counted three
times in $S$ and once as a $3$-set with three edges). Checked by brute force on random graphs
in [S-3]; only the forest case $t = 0$ is used here.

**Proposition 3.3 ($p_4$ of a forest) [S-3, S-10].** For every forest,

$$p_4 = \binom n4 - e\binom{n-2}{2} + (n-3)\,S + \Bigl(\binom e2 - S\Bigr) - T - P,
\qquad T = \sum_v \binom{d_v}{3},\qquad P = \sum_{uv \in E} (d_u - 1)(d_v - 1),$$

where $T$ is the number of $K_{1,3}$ subgraphs and $P$ the number of paths with three edges
(in a forest every such path is an induced $P_4$).

*Proof.* For a $4$-set $U$, $\sum_{A \subseteq E(U)} (-1)^{|A|} = [E(U) = \emptyset]$, so
$p_4 = \sum_{A \subseteq E} (-1)^{|A|} N(A)$, where $N(A)$ is the number of $4$-sets containing
the vertex set $V(A)$ of $A$, i.e. $N(A) = \binom{n - |V(A)|}{4 - |V(A)|}$ if $|V(A)| \le 4$ and
$0$ otherwise. A set $A$ of edges of a forest spans $|V(A)| \ge |A| + 1$ vertices, so
$|A| \le 3$. $A = \emptyset$ contributes $\binom n4$; a single edge contributes
$-\binom{n-2}{2}$; two edges sharing a vertex ($S$ pairs) contribute $+(n-3)$ each, two disjoint
edges ($\binom e2 - S$ pairs) contribute $+1$ each; three edges with $|V(A)| \le 4$ form a tree on
exactly four vertices, i.e. a $K_{1,3}$ ($T$ of them) or a $P_4$, each contributing $-1$. A
$3$-edge path is determined by its middle edge $uv$ and one further neighbour of $u$ and of
$v$; these are distinct (otherwise a triangle) and the path is induced (a chord would close a
cycle), so there are $P = \sum_{uv}(d_u-1)(d_v-1)$ of them. $\square$

This formula is only needed in Section 10; [S-3] checks it on all trees $n \le 12$ and on
random forests.

---

## 4. $\mathrm{ISO}_1$ holds for every forest

**Theorem 4.1 [S-4].** For every forest, $Q_1 = p_1^2 + p_0^2 - 2 p_0 p_2 = n + 1 + 2e > 0$.

*Proof.* By Theorem 3.1, $Q_1 = n^2 + 1 - 2\bigl(\binom n2 - e\bigr) = n^2 + 1 - n(n-1) + 2e
= n + 1 + 2e$ (polynomial identity, checked by `sympy.expand`). Since $n \ge 1$, $e \ge 0$,
$Q_1 \ge 2$. $\square$

(For $\alpha \le 1$, i.e. $F = K_1$ or $K_2$, $\mathrm{ISO}_1$ is not needed by the framework;
the identity still holds with $p_2 = 0$: $Q_1(K_1) = 2$, $Q_1(K_2) = 5$.)

---

## 5. $\mathrm{ISO}_2$ holds for every forest, and the star is extremal

Write, using Theorem 3.1,

$$Q_2 = 2p_2^2 + p_1^2 - 3p_1p_3 = 2\Bigl(\binom n2 - e\Bigr)^2 + n^2 - 3n\Bigl(\binom n3 - e(n-2) + S\Bigr) . \tag{5.0}$$

**Theorem 5.1 [S-5].** For every forest with $n \ge 1$ vertices,

$$Q_2 \;\ge\; g(e) \;\ge\; (n-1)(n-2) + n^2 \;\ge\; 1, \qquad
g(e) := 2\Bigl(\binom n2 - e\Bigr)^2 + n^2 - 3n\Bigl(\binom n3 - e(n-2) + \binom e2\Bigr).$$

In particular $\mathrm{ISO}_2$ holds strictly for every forest. Moreover
$Q_2 = (n-1)(n-2) + n^2$ if and only if $F$ is the star $K_{1,n-1}$ ($n \ge 2$; for $n = 1$,
$F = K_1$).

*Proof.* **Step 1 ($Q_2 \ge g(e)$).** $S$ counts unordered pairs of edges sharing a vertex, a
subset of all $\binom e2$ unordered pairs of edges; hence $S \le \binom e2$ and, as a polynomial
identity in $n, e, S$,

$$Q_2 - g(e) = 3n\Bigl(\binom e2 - S\Bigr) \ \ge\ 0 . \tag{5.1}$$

**Step 2 (concavity of $g$ in $e$).** Expanding, $g$ is a quadratic polynomial in $e$ whose
$e^2$-coefficient is $2 - \tfrac{3n}{2} = -\tfrac{3n-4}{2}$, which is $\le -1 < 0$ for every
integer $n \ge 2$. So for $n \ge 2$, $g$ is a concave function of $e$, and a concave function
on an interval attains its minimum at an endpoint. Concretely, with the chord through
$(0, g(0))$ and $(n-1, g(n-1))$,

$$g(e) - \Bigl[\tfrac{n-1-e}{n-1}\,g(0) + \tfrac{e}{n-1}\,g(n-1)\Bigr] = \Bigl(\tfrac{3n}{2} - 2\Bigr)\,e\,(n-1-e) \ \ge 0
\quad (0 \le e \le n-1,\ n \ge 2), \tag{5.2}$$

so $g(e) \ge \min\{g(0), g(n-1)\}$ on $0 \le e \le n-1$.

**Step 3 (endpoints).** The closed forms

$$g(0) = \frac{n^2(n-1)}{2} + n^2, \qquad g(n-1) = (n-1)(n-2) + n^2$$

are polynomial identities (checked by `sympy.expand`; e.g. $\binom n2 - (n-1) = \binom{n-1}2$
and $\binom n3 - (n-1)(n-2) + \binom{n-1}{2} = \binom{n-1}{3}$). Both are positive for $n \ge 1$,
and $g(0) - g(n-1) = \tfrac{(n-1)\left((n-1)^2 + 3\right)}{2} \ge 0$, so the minimum is
$g(n-1) = (n-1)(n-2) + n^2 \ge n^2 \ge 1$. For a forest, $0 \le e \le n-1$, so Steps 1–3 give
$Q_2 \ge g(e) \ge g(n-1) \ge 1$ for $n \ge 2$.

**Step 4 (degenerate cases).** $n = 1$: $e = 0$, $p = (1,1)$, $Q_2 = p_1^2 = 1 = g(0)$
($g(0) = g(n-1)$ here and the leading coefficient $2 - 3/2 > 0$ is irrelevant since $e = 0$ is
the only value). $n = 2$: $2K_1$ has $p = (1,2,1)$, $Q_2 = 2 + 4 = 6 = g(0)$; $K_2$ has
$p = (1,2)$, $Q_2 = 4 = g(1) = (1)(0) + 4$. In all these cases $p_2$ or $p_3$ is $0$ and the
formulas of Theorem 3.1 hold as identities.

**Step 5 (an explicit decomposition, and the equality case).** Combining (5.1) with the
identity $g(e) - g(n-1) = \tfrac12 (n-1-e)\bigl((3n-4)e + (n-1)^2 + 3\bigr)$ gives the polynomial
identity

$$Q_2 = \bigl[(n-1)(n-2) + n^2\bigr] + 3n\Bigl(\binom e2 - S\Bigr) + \frac{(n-1-e)\bigl((3n-4)\,e + (n-1)^2 + 3\bigr)}{2}. \tag{5.3}$$

For a forest with $n \ge 2$ each of the three terms is $\ge 0$ ($S \le \binom e2$;
$e \le n-1$; $(3n-4)e \ge 0$ and $(n-1)^2 + 3 > 0$), which re-proves the theorem in one line.
Equality $Q_2 = (n-1)(n-2) + n^2$ forces $e = n - 1$ (the last term has a strictly positive
second factor) and $S = \binom e2$, i.e. every two edges share a vertex. A family of pairwise
intersecting edges of a simple graph is a star or a triangle, and forests have no triangles;
so $F$ is a tree all of whose edges pass through one vertex: $F = K_{1,n-1}$. Conversely the
star has $e = n-1$ and $S = \binom{n-1}{2} = \binom e2$. $\square$

**Remark 5.2 (the star is extremal and $\mathrm{ISO}_2$ is asymptotically tight) [S-5].**
For $K_{1,m}$ ($n = m+1$), $I(K_{1,m};x) = (1+x)^m + x$, so $p_1 = m + 1 = \binom m1 + 1$,
$p_2 = \binom m2$, $p_3 = \binom m3$: the coefficient $p_1$ exceeds the "binomial" value by
exactly $1$ (the centre), and this is what makes the star extremal at $r = 2$. Indeed

$$Q_2(K_{1,m}) = 2\binom m2^2 + (m+1)^2 - 3(m+1)\binom m3 = m(m-1) + (m+1)^2 = (n-1)(n-2) + n^2,$$

and the dimensionless margin is

$$\frac{Q_2}{p_1 p_2} = \frac{(n-1)(n-2) + n^2}{n\binom{n-1}{2}} = \frac 2n + \frac{2n}{(n-1)(n-2)} \;\xrightarrow[n\to\infty]{}\; 0 .$$

Since $p_1 p_2$ is the same for all trees of order $n$, Theorem 5.1 says the star minimises
both $Q_2$ and the margin among trees of order $n$, and $Q_2$ among all forests of order $n$.
This matters for any strategy that tries to prove $\mathrm{ISO}_r$ inductively: at $r = 2$
there is no slack to spare on stars, so every estimate used must be exact on $K_{1,n-1}$.
(By contrast, for the binomial sequence itself, i.e. $I(\overline{K_m};x) = (1+x)^m$, the margin
at every $r$ is $1 + r/(m-r+1) > 1$.) [S-5] verifies these identities symbolically, checks
$Q_2 \ge g(e) \ge (n-1)(n-2)+n^2$ for all 2948 non-isomorphic forests with $n \le 12$ with
equality exactly once per order, and checks $g(e) \ge g(n-1) \ge 1$ for all integers
$1 \le n \le 60$, $0 \le e \le n-1$.

---

## 6. $\mathrm{WR}_1$ and $\mathrm{WR}_2$ hold wherever the framework needs them

**Theorem 6.1 [S-6].** For every forest:

1. $\mathrm{WR}_1$ ($p_0 \le p_1$, i.e. $1 \le n$) holds.
2. $\mathrm{WR}_2$ ($p_1 \le 2p_2$, i.e. $n \le n(n-1) - 2e$) holds whenever $n \ge 4$.
3. If $n \le 3$ then $L(\alpha) \le 2$, so $r = 2$ never satisfies $r \le L(\alpha) - 1$: the
   framework never needs $\mathrm{WR}_2$ (nor $\mathrm{ISO}_2$) for $n \le 3$.

Consequently (H1) of Theorem 2.1 is satisfied at $r = 1$ and $r = 2$ (whenever these indices
belong to the prefix $1 \le r \le L(\alpha) - 1$) for every forest.

*Proof.* (1) is $n \ge 1$. (2) By Theorem 3.1, $2p_2 - p_1 = n(n-1) - 2e - n$, and since
$e \le n - 1$ for a forest,

$$2p_2 - p_1 \;\ge\; n(n-1) - 2(n-1) - n = (n-1)(n-2) - n = (n-2)^2 - 2 \;\ge\; 2 \quad (n \ge 4).$$

(3) $\alpha \le n \le 3$ and $L$ is non-decreasing with $L(3) = 2$ (Fact 0.2), so
$L(\alpha) - 1 \le 1 < 2$. $\square$

Item (3) is not vacuous: for $P_3$ we have $p = (1,3,1)$ and $\mathrm{WR}_2$ fails
($3 > 2\cdot 1$), but $\alpha(P_3) = 2$, $L = 1$, and `checks.analyze` correctly reports no
prefix failure ([S-6]). [S-6] also confirms $\mathrm{WR}_1$ for all forests $n \le 12$ and
$\mathrm{WR}_2$ for all forests $4 \le n \le 12$.

---

## 7. Real-rooted independence polynomials satisfy $\mathrm{ISO}_r$ at every index

**Newton's inequalities (classical; Theorem 8.3).** If $f(x) = \sum_{k=0}^{d} c_k x^k$ is a
real polynomial of degree $d$ all of whose roots are real, then with
$E_k := c_k / \binom dk$ one has $E_k^2 \ge E_{k-1} E_{k+1}$ for $1 \le k \le d-1$.

**Theorem 7.1 [S-7].** Let $F$ be a forest (or any graph) with $\alpha \ge 2$ such that
$I(F;x)$ has only real roots. Then for every $1 \le r \le \alpha - 1$,

$$Q_r \;\ge\; p_{r-1}^2 \;>\; 0, \qquad\text{in particular } \mathrm{ISO}_r \text{ holds.}$$

*Proof.* All $p_k$ are positive (Fact 0.1), so $I(F;x) > 0$ for $x \ge 0$ and the real roots
are negative; $I$ has degree exactly $\alpha$. Newton's inequalities with $d = \alpha$,
$c_k = p_k$ give, for $1 \le r \le \alpha - 1$,

$$p_r^2 \;\ge\; p_{r-1}\,p_{r+1}\,\frac{\binom{\alpha}{r}^2}{\binom{\alpha}{r-1}\binom{\alpha}{r+1}}
= p_{r-1}\,p_{r+1}\Bigl(1 + \frac1r\Bigr)\Bigl(1 + \frac{1}{\alpha - r}\Bigr), \tag{7.1}$$

using $\binom{\alpha}{r}/\binom{\alpha}{r-1} = (\alpha - r + 1)/r$ and
$\binom{\alpha}{r}/\binom{\alpha}{r+1} = (r+1)/(\alpha - r)$ (checked symbolically in [S-7]). Since

$$\Bigl(1 + \frac1r\Bigr)\Bigl(1 + \frac{1}{\alpha - r}\Bigr) - 1 = \frac{\alpha + 1}{r(\alpha - r)}, \tag{7.2}$$

(7.1) is equivalent to $r\,(p_r^2 - p_{r-1}p_{r+1}) \ge p_{r-1}p_{r+1}\,\frac{\alpha+1}{\alpha-r}$,
and $\frac{\alpha+1}{\alpha-r} > 1$, so $r\,(p_r^2 - p_{r-1}p_{r+1}) \ge p_{r-1}p_{r+1}
> p_{r-1}(p_{r+1} - p_{r-1})$ (as $p_{r-1}^2 > 0$). Now use the rearrangement

$$Q_r = r\,(p_r^2 - p_{r-1}p_{r+1}) + p_{r-1}\,(p_{r-1} - p_{r+1}) \tag{7.3}$$

(checked by `sympy.expand`): $Q_r \ge p_{r-1}p_{r+1} + p_{r-1}(p_{r-1} - p_{r+1}) = p_{r-1}^2 > 0$.

Equivalently, with the *Newton defect*
$D := p_r^2 - p_{r-1}p_{r+1}(1+\frac1r)(1+\frac1{\alpha-r}) \ge 0$, one has the identity

$$Q_r = p_{r-1}^2 + r\,D + p_{r-1}\,p_{r+1}\,\frac{r+1}{\alpha - r}, \tag{7.4}$$

whose three terms are all $\ge 0$ (checked symbolically in [S-7]). $\square$

**Corollary 7.2 (claw-free graphs).** If $G$ is claw-free (no induced $K_{1,3}$) then, by the
Chudnovsky–Seymour theorem (Theorem 8.2, cited), $I(G;x)$ is real-rooted, so
$\mathrm{ISO}_r$ holds for all $1 \le r \le \alpha - 1$. A forest is claw-free iff its maximum
degree is $\le 2$, i.e. iff it is a disjoint union of paths; so paths and all linear forests
satisfy $\mathrm{ISO}_r$ at every index. [S-7] checks that $I(P_n;x)$ is real-rooted for
$n \le 12$ (exact root isolation) and that $Q_r \ge p_{r-1}^2$ at every index for $P_n$,
$n \le 60$.

**Caution 7.3 (real-rootedness fails for stars) [S-7].** Do not expect real-rootedness for
general trees. $K_{1,m}$ contains a claw iff $m \ge 3$, and
$I(K_{1,m};x) = (1+x)^m + x$ is then not real-rooted: for $m = 3$,
$x^3 + 3x^2 + 4x + 1$ has discriminant $-31 < 0$, hence exactly one real root; for
$3 \le m \le 10$, sympy's exact root isolation finds $1$ real root ($m$ odd) or $2$ ($m$ even),
never $m$. (For $m = 2$, $K_{1,2} = P_3$ is claw-free and $x^2 + 3x + 1$, of discriminant $5$,
is real-rooted, as it must be.) Theorem 7.1 therefore covers only claw-free forests; the
proof of $\mathrm{ISO}_1, \mathrm{ISO}_2$ for all forests in Sections 4–5 does not go through
real-rootedness.

**Proposition 7.4 (stars satisfy ISO at every index) [S-7].** For $m \ge 2$ and every
$1 \le r \le m - 1$, $Q_r(K_{1,m}) > 0$.

*Proof.* $r = 1$: Theorem 4.1. $r = 2$: Theorem 5.1. $r \ge 3$: the three coefficients
$p_{r-1}, p_r, p_{r+1}$ of $(1+x)^m + x$ involved are $\binom m{r-1}, \binom mr, \binom m{r+1}$,
the coefficients of the real-rooted polynomial $(1+x)^m$ of degree $m$; the computation of
Theorem 7.1 with $\alpha$ replaced by $m$ (identity (7.4) with $a = m$, $D \ge 0$ by Newton,
$(r+1)/(m-r) > 0$) gives $Q_r \ge \binom m{r-1}^2 > 0$. $\square$

So stars are not counterexamples to $\mathrm{ISO}_r$ at any index; they are merely the tight
case at $r = 2$ (Remark 5.2) and the reason crude bounds fail at $r = 3$ (Section 10).

---

## 8. Cited theorems (not proved here)

**Theorem 8.1 (Levit–Mandrescu tail theorem; TAIL for forests).** Let $G$ be a bipartite
graph — more generally a König–Egerváry graph — with independence number $\alpha \ge 1$,
and $s_k$ its independence-sequence. Then

$$s_{\lceil (2\alpha - 1)/3 \rceil} \;\ge\; s_{\lceil (2\alpha - 1)/3 \rceil + 1} \;\ge\; \dots \;\ge\; s_{\alpha - 1} \;\ge\; s_\alpha .$$

Every forest is bipartite, so TAIL (with $L(\alpha) = \lceil (2\alpha-1)/3 \rceil$) holds for
every forest. References:

* V. E. Levit and E. Mandrescu, *Independence polynomials and the unimodality conjecture for
  very well-covered, quasi-regularizable, and perfect graphs*, in: *Graph Theory in Paris*
  (A. Bondy, J. Fonlupt, J.-L. Fouquet, J.-C. Fournier, J. L. Ramírez Alfonsín, eds.), Trends in
  Mathematics, Birkhäuser, Basel, 2007, pp. 243–254, doi:10.1007/978-3-7643-7400-6_19;
  preprint arXiv:math/0406623 (bipartite graphs — stated there as a corollary of the perfect-graph
  bound $s_{\lceil(\omega\alpha-1)/(\omega+1)\rceil} \ge \dots \ge s_\alpha$ with $\omega \le 2$ —
  and quasi-regularizable graphs on $2\alpha$ vertices; in particular trees). The paper itself
  exhibits non-bipartite graphs, e.g. one with $I(G;x) = 1 + 6x + 8x^2$, for which the tail
  inequality fails.
* V. E. Levit and E. Mandrescu, *Partial unimodality for independence polynomials of
  König–Egerváry graphs*, Congressus Numerantium 179 (2006), 109–119.

**Scope warning [S-9].** The tail theorem is sometimes quoted as valid for every graph. It is
**not**: for $G = 2K_3$ (two disjoint triangles), $I(G;x) = (1+3x)^2 = 1 + 6x + 9x^2$, so
$\alpha = 2$, $L(2) = 1$ and $s_1 = 6 < 9 = s_2$. More generally $\alpha K_m$ has
$s_\alpha / s_{\alpha-1} = m/\alpha > 1$ whenever $m > \alpha$. The framework only applies TAIL
to forests, which are bipartite, so this does not affect any conclusion of this note, but the
hypothesis "bipartite (or König–Egerváry)" must be kept in the statement. [S-9] verifies
$I(2K_3;x)$ by brute force and checks TAIL on all 2948 non-isomorphic forests with $n \le 12$
(a consistency check of the cited theorem, not a proof).

**Theorem 8.2 (Chudnovsky–Seymour).** If $G$ is claw-free, then all roots of $I(G;x)$ are
real. — M. Chudnovsky and P. Seymour, *The roots of the independence polynomial of a clawfree
graph*, J. Combin. Theory Ser. B 97 (2007), 350–357.

**Theorem 8.3 (Newton's inequalities).** As stated at the beginning of Section 7. —
G. H. Hardy, J. E. Littlewood, G. Pólya, *Inequalities*, Cambridge University Press, 2nd ed.
1952, §2.22 (Theorem 51); C. P. Niculescu, *A new look at Newton's inequalities*, J. Inequal.
Pure Appl. Math. 1 (2000), Article 17. (In our application all roots are negative reals, so the
classical version for positive reals $t_i = -\rho_i$ suffices: with
$I(F;x) = p_\alpha\prod_i (x + t_i)$ one has $p_k = p_\alpha\, e_{\alpha - k}(t)$ and
$\binom{\alpha}{k} = \binom{\alpha}{\alpha-k}$, so the inequalities for the elementary symmetric
means of the $t_i$ are exactly $E_k^2 \ge E_{k-1}E_{k+1}$ for $E_k = p_k/\binom{\alpha}{k}$.)

---

## 9. Map of the machine verification

`scripts/verify_lemmas_symbolic.py` prints one `PASS`/`FAIL` line per item, followed by
every sub-check (with `-q`, only the per-item lines and any failures), and exits with status 1
if any sub-check fails. Symbolic items end with an assertion that no `Float` atom occurs in
any expression used.

| Item | What is checked |
| --- | --- |
| [S-1] | (1.1), (1.2), (7.3) by `expand`; ratio identity $rx + 1/x - (r+1) = (rx-1)(x-1)/x$; $f'' = 2/x^3$; $f(1/r) = f(1) = r+1$; brute force of Lemma 1.1 on integers $r \le 6$, $p_{r-1} \le 25$, $p_{r+1} \le 60$ |
| [S-2] | $L(a)$ equals `tail_cutoff(a)` and Fact 0.2 for $a < 300$; Theorems 2.1/2.2 on all sequences with $\alpha \le 6$, entries $\le 6$; the witness $(1,5,4,5,1)$ |
| [S-3] | Theorem 3.1 and Prop. 3.3 vs `indpoly_forest` on all trees $n \le 12$ and 400 random forests $n \le 40$ (117 cross-checked by brute force); Remark 3.2 on random graphs; degenerate cases |
| [S-4] | $Q_1 = n + 1 + 2e$ by `expand`; stars $n \le 19$ |
| [S-5] | (5.1), leading coefficient $2 - 3n/2$, closed forms of $g(0)$, $g(n-1)$, (5.2), $g(e) - g(n-1)$, (5.3), star value and margin, `limit` $= 0$; $g(e) \ge g(n-1) \ge 1$ for $n \le 60$; all forests $n \le 12$ with the star as unique minimiser; $n \in \{1,2\}$ |
| [S-6] | $2p_2 - p_1 = n(n-1) - 2e - n$, $(n-1)(n-2) - n = (n-2)^2 - 2$; $L(1), L(2), L(3)$; $P_3$; all forests $n \le 12$ |
| [S-7] | binomial ratio identity (symbolic and exact for $\alpha \le 40$), (7.2), (7.3), (7.4); paths real-rooted ($n \le 12$) and $Q_r \ge p_{r-1}^2$ ($n \le 60$); $(1+x)^3 + x$ has discriminant $-31$ and one real root; $(1+x)^m + x$ for $m \le 10$; stars satisfy ISO at all indices ($n \le 60$) |
| [S-8] | all 5447 trees $n \le 14$ (`free_tree_layouts` → `layout_to_parent` → `indpoly_parent_array`): the reduction lemma's conclusion never fails (16117 hypothesis instances), $Q_1 = n + 1 + 2e$ exactly, $Q_2$ equals (5.0) exactly and $Q_2 \ge g(e)$, star unique minimiser, `analyze` consistent |
| [S-9] | $I(2K_3;x) = 1 + 6x + 9x^2$ (TAIL fails), $\alpha K_m$ ratio; TAIL on all forests $n \le 12$ |
| [S-10] | $Q_3(K_{1,m}) = \binom m2\binom{m+1}{3}$; crude bound equals $\binom m2 m(m-1)(3-m)/2 < 0$ for $m \ge 4$; stars $m \le 40$ numerically |
| [S-11] | algebra of Theorem 11.2 (Addendum): $3p_3 - p_2 = 3\binom n3 - \binom n2 - e(3n-7) + 3S$, $3\binom n3 - \binom n2 - (n-1)(3n-7) = \tfrac{(n-1)(n-2)(n-7)}{2}$, tree case $\tfrac{(n-2)(n-3)(n-4) - (n-1)(n-2)}{2}$; $S \ge n-2$ for trees (equality iff path) and $\mathrm{WR}_3$ on all forests $n \le 12$ with $\alpha \ge 6$ |

`tests/test_lemmas.py` runs each item as a pytest test, checks that an injected failing
sub-check produces a `FAIL` line and exit status 1, and adds independent tests (named tree
families, all forests $n \le 11$, the Newton chain on $P_{10}$, Corollary 2.4 on all forests
$n \le 11$, etc.).

---

## 10. What is NOT proved

1. **$\mathrm{ISO}_r$ for $r \ge 3$ for general forests is not proved** in Sections 1–9, and
   neither is $\mathrm{WR}_r$ for $r \ge 3$. The framework needs both for
   $1 \le r \le L(\alpha) - 1$, so for forests with $\alpha \ge 6$ (where $L \ge 4$) Sections 1–9
   do *not* establish unimodality; Corollary 2.4 covers exactly $\alpha \le 5$. (The Addendum,
   Section 11, adds $\mathrm{WR}_3$ wherever the framework needs it — algebra machine-checked in
   [S-11] — and, for *trees only*, $\mathrm{ISO}_3$ via `docs/ISO3_TREES_THEOREM.md`, which is not
   audited here. $\mathrm{ISO}_3$ for forests and everything at $r \ge 4$ remain open.) The
   repository's exhaustive scans (`scripts/verify_exhaustive.py`) are falsification evidence for
   finitely many orders only.

2. **Why $r = 3$ is already hard.** By Prop. 3.3,
   $p_4 = \binom n4 - e\binom{n-2}2 + (n-3)S + \bigl(\binom e2 - S\bigr) - T - P$ with
   $T = \sum_v \binom{d_v}3$ and $P$ = number of induced $P_4$'s. A lower bound for
   $Q_3 = 3p_3^2 + p_2^2 - 4p_2p_4$ needs an *upper* bound for $p_4$. The crude bound that
   simply drops the non-negative terms $T$ and $P$, $p_4 \le U_4 := p_4 + T + P$, fails near the
   star: on $K_{1,m}$ one has $T = \binom m3$, $P = 0$, and [S-10]

   $$3p_3^2 + p_2^2 - 4p_2U_4 = \binom m2\,\frac{m(m-1)(3-m)}{2} < 0 \quad (m \ge 4),
   \qquad\text{whereas}\qquad Q_3(K_{1,m}) = \binom m2\binom{m+1}3 > 0 .$$

   So the crude bound cannot prove $\mathrm{ISO}_3$ even for stars (which do satisfy it,
   Prop. 7.4). Note also that $P = \sum_{uv}(d_u-1)(d_v-1)$ is not a function of the degree
   sequence alone. A rigorous proof of $\mathrm{ISO}_3$ for all forests therefore needs a genuine
   extremal optimisation over the degree data $(e, S, T, P)$ — in particular a lower bound for
   $T$ that is exact on stars (where $P = 0$, so dropping $P$ alone costs nothing there), in the
   spirit of the equality analysis in Step 5 of Theorem 5.1 — not a term-dropping estimate.
   At the time of writing, a separate document in this repository,
   `docs/ISO3_TREES_THEOREM.md` (replayed by `scripts/prove_iso3_trees.py`), pursues exactly
   such an optimisation for *trees*; it is not audited in this note, and by its own remarks the
   forest case is not covered there either.

3. **Real-rootedness** is available only for claw-free forests (linear forests), Corollary 7.2;
   it fails for all stars $K_{1,m}$, $m \ge 3$ (Caution 7.3). No claim is made about the roots of
   $I(F;x)$ for general trees.

4. **TAIL** is not proved here; it is cited (Theorem 8.1) and is a theorem for bipartite and
   König–Egerváry graphs only, not for all graphs (Section 8, scope warning).

5. The numerical enumerations in the script (all trees $n \le 14$, all forests $n \le 12$,
   random forests $n \le 40$, integer boxes) are consistency checks; none of the theorems above
   depends on them.

---

## 11. Addendum (2026-09-02): $\mathrm{ISO}_3$ for all trees, and $\mathrm{WR}_3$

**Theorem 11.1 ($\mathrm{ISO}_3$ for trees).** For every tree, $Q_3 = 3p_3^2 + p_2^2 - 4p_2p_4 \ge 0$.
This is proved in `docs/ISO3_TREES_THEOREM.md` (replayed by `scripts/prove_iso3_trees.py`)
by exactly the route item 2 above calls for: keep $T$ via the Cauchy–Schwarz bound
$3T \ge 2S^2/D_2 - S$ ($D_2 = 2(n-1) - \ell$, $\ell$ = number of leaves), drop only $P \ge 0$,
use $S \le \binom{\ell}{2} + n - \ell - 1$, and certify the resulting two-variable polynomial
with exact algebra (shift certificate, real-root isolation, Bernstein subdivision). Item 2 is
therefore superseded. **Theorem 11.1' ($\mathrm{ISO}_3$ for forests).** The extension to every
forest is proved in `docs/ISO3_FORESTS_THEOREM.md` (replayed by `scripts/prove_iso3_forests.py`):
the leaf bound is weakest for a single non-trivial component, the sparse regime $S \le e-1$ is
handled through $\ell \ge 2e - 2S$ (from $\binom d2 \ge d/2$), monotonicity of the bound in $n$
reduces every forest to the tree polynomial at $n = e+1$, forests with $e \le 5$ edges reduce to
26 explicit cores times $(1+x)^z$, and $I = 0$ is the real-rooted case.

**Theorem 11.2 ($\mathrm{WR}_3$ wherever needed) [tests/test_core.py].** For every forest,
$\mathrm{WR}_3$ ($p_2 \le 3p_3$) holds whenever $3 \le L(\alpha) - 1$, i.e. whenever the
framework needs it.

*Proof.* By Theorem 3.1 and $S \ge 0$, $e \le n-1$,
$3p_3 - p_2 \ge 3\binom n3 - 3e(n-2) - \binom n2 + e \ge \tfrac{n(n-1)(n-3)}{2} - (n-1)(3n-7)
= \tfrac{(n-1)(n-2)(n-7)}{2} \ge 0$ for $n \ge 7$. If $n \le 6$ then $\alpha \le 6$ and
$L(\alpha) - 1 \ge 3$ forces $\alpha = 6 = n$, i.e. $F = \overline{K_6}$, where
$p_2 = 15 \le 60 = 3p_3$. For trees the bound is sharper ($S \ge n-2$ gives
$3p_3 - p_2 \ge \tfrac{(n-2)(n-3)(n-4) - (n-1)(n-2)}{2} \ge 0$ for $n \ge 6$). $\square$

**Corollary 11.3.** Every forest with $\alpha \le 6$ has a unimodal independence polynomial by the
framework alone (Theorem 2.1 with $L(\alpha) \le 4$, Theorems 4.1, 5.1, 6.1, 11.1', 11.2 and the
cited TAIL). This is of course far weaker than the exhaustive verification for $n \le 29$; its
point is structural: each further index $r$ for which $\mathrm{ISO}_r$ and $\mathrm{WR}_r$ are
proved for all forests extends the range of $\alpha$ covered by the framework by $3/2$.


---

<!-- FILE: docs/ISO3_TREES_THEOREM.md -->

# Theorem: `ISO_3` holds for every tree

Replay: `python3 scripts/prove_iso3_trees.py` (exact arithmetic throughout;
prints `PASS_EXACT_ISO3_ALL_TREES_ROOT`; report `reports/iso3_trees_proof.json`).

## Statement

Let `T` be a tree on `n` vertices with independence polynomial
`I(T;x) = sum_r p_r x^r`. Then

```text
Q_3(T) = 3 p_3^2 + p_2^2 - 4 p_2 p_4 >= 0.
```

(`ISO_r` is `Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0`; `ISO_1`,
`ISO_2` for all forests are proved in `REDUCTION_LEMMA_AND_PROVED_CASES.md`.)

## Notation

`e = n - 1`; `d_v` = degree of `v`; `l` = number of leaves;
`I` = set of internal vertices (`d_v >= 2`), `|I| = n - l`;

```text
S  = sum_v C(d_v,2)          (pairs of edges sharing a vertex = 2-edge paths)
T3 = sum_v C(d_v,3)          (claws K_{1,3})
P  = sum_{uv in E} (d_u-1)(d_v-1)     (3-edge paths P_4)
```

For `n <= 6` the statement is checked directly (all trees with `n <= 14` are
in fact checked in the script). Assume `n >= 7`.

## Step 1 — exact coefficient formulas

By inclusion–exclusion over the edge subsets contained in a `k`-set of
vertices (a `k`-set of a forest contains at most `k-1` edges, and any set of
edges inside a `k`-set is a sub-forest on at most `k` vertices):

```text
p_2 = C(n,2) - e
p_3 = C(n,3) - e(n-2) + S
p_4 = C(n,4) - e C(n-2,2) + [ S (n-3) + (C(e,2) - S) ] - (P + T3)
    = C(n,4) - e C(n-2,2) + S (n-4) + C(e,2) - P - T3
```

(For `p_4`: single edges lie in `C(n-2,2)` four-sets; two edges sharing a
vertex lie in `n-3` four-sets, two disjoint edges in exactly one; the
`3`-edge sub-forests on `4` vertices are the `P_4`s and the claws, each in
exactly one four-set; nothing else fits in four vertices.)
Verified exactly on all 5,447 trees with `n <= 14`.

## Step 2 — drop `P`

`P >= 0` and `p_2 > 0`, so `Q_3 >= 3 p_3^2 + p_2^2 - 4 p_2 (p_4 + P)`.

## Step 3 — a Cauchy–Schwarz lower bound for `T3`

Put `x_v = C(d_v,2)`. For `d_v >= 1`, `x_v (d_v - 2) = 2 x_v^2 / d_v - x_v`
(both sides equal `d_v (d_v-1)(d_v-2)/2`), and `C(d_v,3) = x_v (d_v-2)/3`.
Summing over `I` (leaves contribute `0` to `S` and `T3`):

```text
3 T3 = sum_I 2 x_v^2 / d_v - S  >=  2 (sum_I x_v)^2 / (sum_I d_v) - S = 2 S^2 / D2 - S,
D2 = sum_I d_v = 2e - l = 2(n-1) - l,
```

by Cauchy–Schwarz `(sum x_v^2/d_v)(sum d_v) >= (sum x_v)^2`. Equality holds
for stars, so this bound is exact on the extremal family.

## Step 4 — leaves versus `S`

`sum_I (d_v - 1) = sum_v (d_v - 1) = 2(n-1) - n = n - 2`, every internal
vertex has `d_v - 1 >= 1`, and `y -> y(y+1)/2` is convex; by the standard
exchange (majorisation) argument `S = sum_I C(d_v,2)` is maximised when one
internal vertex takes `d_v - 1 = l - 1` and the other `n - l - 1` take `1`:

```text
S <= Smax(l) := C(l,2) + n - l - 1.
```

Also `S >= n - 2` (since `C(d,2) >= d - 1`) and `S <= C(e,2) = Smax(n-1)`.

## Step 5 — reduction to one polynomial

With `c3 = C(n,3) - e(n-2)`, `c4 = C(n,4) - e C(n-2,2)`, Steps 1–3 give

```text
Q_3 >= G(n,l,S) := 3 (c3+S)^2 + p_2^2 - 4 p_2 ( c4 + S(n-4) + C(n-1,2) )
                   + (4 p_2 / 3) ( 2 S^2 / (2n-2-l) - S ).
```

`G` is non-decreasing in `l` (it depends on `l` only through
`2S^2/(2n-2-l)`). `Smax` is continuous and increasing on `[2, oo)` with
`Smax(2) = n-2 <= S <= C(n-1,2) = Smax(n-1)`, so there is a unique real
`lambda in [2, n-1]` with `Smax(lambda) = S`, and Step 4 gives `l >= lambda`.
Hence

```text
Q_3 >= G(n, lambda, Smax(lambda)) =: K(n, lambda).
```

`K~(n,lambda) := 12 (2n-2-lambda) K(n,lambda)` is a polynomial with integer
coefficients (printed in the report), and `2n-2-lambda >= n-1 > 0`, so it
suffices to show `K~ >= 0` for real `lambda in [2, n-1]`, `n >= 7`.

## Step 6 — positivity certificate for `K~`

Write `lambda = 2 + a`, `n = 3 + a + b` with real `a, b >= 0`, `a + b = n - 3 >= 4`.

**(6a) `a, b >= 2`.** Substituting `a -> a+2`, `b -> b+2`,

```text
K~(a+2, b+2) = a^4 (a^2 - a b + 10 b^2) + R(a,b),
```

where every coefficient of `R` is non-negative (25 monomials, checked
symbolically) and `a^2 - ab + 10 b^2 = (a - b/2)^2 + (39/4) b^2 >= 0`.

**(6b) `0 <= a <= 2, b >= 4` (and symmetrically `0 <= b <= 2, a >= 4`).**
Expanding `K~(a, b+4)` in powers of `b`, each coefficient is a univariate
polynomial in `a` with no real root in `(0,2)` and non-negative values at
`0, 1, 2` (exact real-root isolation), hence non-negative on `[0,2]`; so
`K~(a, b+4) >= 0` for `b >= 0`. Same with the roles of `a`, `b` swapped.

**(6c) the compact pieces `{0<=a<=2, 2<=b<=4, a+b>=4}` and
`{2<=a<=4, 0<=b<=2, a+b>=4}`.** Exact Bernstein-coefficient subdivision: a
polynomial all of whose Bernstein coefficients on a box are non-negative is
non-negative on the box; boxes lying entirely in `a + b < 4` are irrelevant.
Both pieces certify after one subdivision level. (The routine is self-tested:
it refuses `(a-4)^2 - 1/10` and accepts `(a-4)^2 + 1/10` on `[3,5]x[1,2]`.)

These pieces cover `{a, b >= 0, a + b >= 4}`: if `a, b >= 2` use (6a);
otherwise one variable is `< 2`, the other is `> 2`, and it is either `>= 4`
(6b) or in `(2,4)` (6c).

## Step 7 — small orders

Trees with `n <= 6` (indeed `n <= 14`) satisfy `Q_3 >= 0` by direct exact
computation. Together with Steps 1–6 this proves the theorem for all trees. ∎

## Remarks

- The bound is far from tight for `n >= 7` (normalised lower bound
  `G/(p_2 p_3) >= 0.27`), whereas the true minimum of `Q_3/(p_2 p_3)` over
  trees is about `1.09` (double brooms). The slack is what makes the crude
  bounds `P >= 0` and Cauchy–Schwarz sufficient.
- `K~(a,b)` is negative at some real points with `a + b <= 2.5` (`n <= 5.5`),
  which is why the certificate is restricted to `n >= 7`.
- For forests the same chain holds numerically (33,000 random forests,
  bound never negative) but the region acquires extra parameters (`e`, number
  of isolated vertices); a certificate has not been produced. See
  `STATUS_2026-09-02.md`.


---

<!-- FILE: docs/ISO3_FORESTS_THEOREM.md -->

# Theorem: `ISO_3` holds for every forest

Replay: `python3 scripts/prove_iso3_forests.py` (exact arithmetic throughout —
sympy rationals and Python `Fraction`s, no floating point; about 8 s; prints
`PASS_EXACT_ISO3_ALL_FORESTS_ROOT`; report `reports/iso3_forests_proof.json`).
If any step failed the script would print `ISO3_FORESTS_INCOMPLETE` and exit
non-zero. **Every step is certified; nothing in this note is left open.**

This extends `docs/ISO3_TREES_THEOREM.md` (trees) to all forests. The tree
certificate is reused *and re-run* here, so the present proof is self-contained.

## Statement

Let `F` be a forest on `n` vertices with independence polynomial
`I(F;x) = sum_r p_r x^r`. Then

```text
Q_3(F) = 3 p_3^2 + p_2^2 - 4 p_2 p_4 >= 0.
```

(`ISO_r` is `Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0`; `ISO_1`,
`ISO_2` for all forests are proved in `REDUCTION_LEMMA_AND_PROVED_CASES.md`,
`ISO_3` for trees in `ISO3_TREES_THEOREM.md`.)

## Notation

`e` edges; `d_v` degree of `v`; `z` isolated vertices (`d_v = 0`); `l` leaves
(`d_v = 1`); `I` the set (and number) of internal vertices (`d_v >= 2`);
`c'` the number of non-trivial components (components with `>= 2` vertices);
`n' = n - z = e + c'` (a forest with `c'` components on `n'` vertices has
`n' - c'` edges).

```text
S  = sum_v C(d_v,2)          (pairs of edges sharing a vertex = 2-edge paths)
T3 = sum_v C(d_v,3)          (claws K_{1,3})
P  = sum_{uv in E} (d_u-1)(d_v-1)     (3-edge paths P_4)
D2 = sum_{v in I} d_v = 2e - l
```

Leaves and isolated vertices contribute `0` to `S`, `T3` and `D2`.

## Overview

The forest is treated in three cases:

| case | handled by |
|---|---|
| `I = 0` (every component is `K_1` or `K_2`) | Step A |
| `I >= 1`, `e <= 5` | Step D (26 explicit "cores" + any number of isolated vertices) |
| `I >= 1`, `e >= 6` (so `n >= e+1 >= 7`) | Steps 1–5 give `Q_3 >= G(n,e,l,S)`; two regimes `R1`/`R2`; monotonicity in `n` (Step B) reduces to `n = e+1` (Step C) |

Step E checks all `85,624` forests with `n <= 16` directly and verifies every
identity and inequality below on those actual forests.

## Step 1 — exact coefficient formulas (cited)

For every forest (`REDUCTION_LEMMA_AND_PROVED_CASES.md`, Theorem 3.1 and
Proposition 3.3, proved there by inclusion–exclusion over edge subsets):

```text
p_2 = C(n,2) - e
p_3 = C(n,3) - e(n-2) + S
p_4 = C(n,4) - e C(n-2,2) + S(n-4) + C(e,2) - P - T3
```

Re-verified exactly on all forests with `n <= 16` (Step E).

## Step 2 — `P >= 0`, `p_2 >= 0`

`P` is a sum of products of non-negative integers; `p_2 = C(n,2) - e >= 0` since
`e <= n - 1 <= C(n,2)` for `n >= 2` (and `p_2 = 0` for `n = 1`). Hence

```text
Q_3 >= 3 p_3^2 + p_2^2 - 4 p_2 (p_4 + P).
```

## Step 3 — Cauchy–Schwarz lower bound for `T3` (needs `I >= 1`)

Put `x_v = C(d_v,2)`. For `d_v >= 1`, `x_v (d_v - 2) = 2 x_v^2 / d_v - x_v`
(both sides equal `d_v(d_v-1)(d_v-2)/2`) and `C(d_v,3) = x_v (d_v-2)/3`.
Summing over `I` (the only vertices with `x_v != 0`):

```text
3 T3 = sum_I 2 x_v^2/d_v - S  >=  2 (sum_I x_v)^2 / (sum_I d_v) - S = 2 S^2 / D2 - S,
```

by Cauchy–Schwarz (`(sum x_v^2/d_v)(sum d_v) >= (sum x_v)^2`), where
`D2 = sum_I d_v = 2e - l > 0` because `I >= 1` and every internal vertex has
`d_v >= 2` (so in fact `l <= 2e - 2`). Equality holds for stars.

## Step 4 — leaves, components and `S` (needs `I >= 1`)

**Lemma 4.** Let `F` be a forest with `I >= 1`. Then

* (a) `S <= C(l + 2 - 2c', 2) + e + c' - l - 1 <= Smax(l) := C(l,2) + e - l`;
* (b) `S >= e - c'` and `S >= I = e + c' - l`; consequently `l >= 2e - 2S`;
* (c) `1 <= S <= C(e,2)`, `2 <= 2c' <= l <= 2e - 2`.

*Proof.* Every non-trivial component is a tree on `>= 2` vertices and has
`>= 2` leaves, so `l >= 2c'`; `I >= 1` forces `c' >= 1`, so `l >= 2`;
`l <= 2e - 2` was shown in Step 3. `S >= 1` since some `d_v >= 2`; `S <= C(e,2)`
since `S` counts pairs of edges.

(a) `sum_I d_v = 2e - l` and `I = n' - l = e + c' - l`, so
`Y := sum_I (d_v - 1) = 2e - l - (e + c' - l) = e - c'`. Put `y_v = d_v - 1 >= 1`
for `v in I`; then `S = sum_I f(y_v)` with `f(y) = C(y+1,2) = y(y+1)/2`, which
is convex with increasing increments `f(y+1) - f(y) = y + 1`. If two entries
satisfy `y_i >= y_j >= 2`, replacing them by `(y_i + 1, y_j - 1)` keeps the sum
`Y` and all entries `>= 1`, and changes `S` by `(y_i + 1) - y_j >= 1 > 0`.
Repeating, `S` is maximised when one internal vertex takes
`y = Y - (I - 1) = l + 1 - 2c'` (this is `>= 1` because `l >= 2c'`) and the
other `I - 1` take `y = 1`:

```text
S <= f(l + 1 - 2c') + (I - 1) = C(l + 2 - 2c', 2) + e + c' - l - 1 =: h(c').
```

With `m = l + 2 - 2c' >= 2`,
`h(c'+1) - h(c') = C(m-2,2) - C(m,2) + 1 = (3 - 2m) + 1 = 4 - 2m = 4c' - 2l <= 0`,
so `h` is non-increasing in `c'` on `1 <= c' <= l/2` and `h(c') <= h(1) =
C(l,2) + e - l = Smax(l)`. (For `I = 1` the bound (a) is an equality.)

(b) `C(d,2) >= d - 1` for `d >= 1` (`(d-1)(d-2)/2 >= 0`), so
`S >= sum_I (d_v - 1) = e - c'`; and `C(d,2) >= 1` for `d >= 2`, so `S >= I =
e + c' - l`. Adding, `2S >= 2e - l`, i.e. `l >= 2e - 2S`. ∎

Both inequalities in (a), and (b), (c), are re-verified on all forests with
`n <= 16` in the script.

## Step 5 — the bound `G` and the two regimes (needs `I >= 1`)

With `c3 = C(n,3) - e(n-2)`, `c4 = C(n,4) - e C(n-2,2)`, Steps 1–3 give

```text
Q_3 >= G(n,e,l,S) := 3 (c3+S)^2 + p_2^2 - 4 p_2 ( c4 + S(n-4) + C(e,2) )
                     + (4 p_2 / 3) ( 2 S^2 / (2e - l) - S ).
```

`G` depends on `l` only through `(8 p_2/3) S^2/(2e-l)`, and
`dG/dl = (8 p_2/3) S^2/(2e-l)^2 >= 0` (checked symbolically), so `G` is
non-decreasing in `l` on `[0, 2e)`.

`Smax(x) = C(x,2) + e - x = (x^2 - 3x)/2 + e` is increasing on `[2, oo)`
(`Smax'(x) = x - 3/2`), with `Smax(2) = e - 1` and `Smax(e) = C(e,2)`.

**Regime R1: `S >= e - 1`.** Since `e - 1 <= S <= C(e,2)`, there is a unique
real `lambda in [2, e]` with `Smax(lambda) = S`, namely
`lambda = (3 + sqrt(9 - 8e + 8S))/2`. By Lemma 4(a), `Smax(l) >= S =
Smax(lambda)` with `l >= 2`, so `l >= lambda`, and monotonicity in `l` gives

```text
Q_3 >= G(n,e,lambda,Smax(lambda)) =: K(n,e,lambda),      K~ := 12 (2e - lambda) K.
```

`K~(n,e,lambda)` is a polynomial with integer coefficients (checked; printed
in the report and below), and `2e - lambda >= e > 0`.

**Regime R2: `1 <= S <= e - 1`.** By Lemma 4(b), `l >= 2e - 2S > 0`, so
monotonicity in `l` on `[2e-2S, l]` gives

```text
Q_3 >= G(n,e,2e-2S,S) = G0(n,e,S) := 3 (c3+S)^2 + p_2^2 - 4 p_2 ( c4 + S(n-4) + C(e,2) ),
```

because at `l = 2e - 2S` the Cauchy–Schwarz term is `2S^2/(2S) - S = 0`
(identity checked symbolically). Explicitly

```text
G0 = n^5/12 - n^4/12 - n^3/12 + n^2/12 + e n^4/6 - 2 e n^3 + 29 e n^2/6 - 3 e n
     - e^2 n - e^2 + 2 e^3 - S n^3 + 7 S n^2 - 6 S n - 2 S e n - 4 S e + 3 S^2 .
```

The two regimes overlap at `S = e - 1` and together cover every forest with
`I >= 1`.

```text
K~(n,e,lambda) =
  48e^4 - 24e^3 lambda - 72e^3 n - 48e^3 - 24e^2 lambda^2 n + 8e^2 lambda^2 + 108e^2 lambda n
  - 16e^2 lambda + 4e^2 n^4 - 72e^2 n^3 + 284e^2 n^2 - 216e^2 n + 10e lambda^4 + 12e lambda^3 n
  - 80e lambda^3 - 12e lambda^2 n^3 + 92e lambda^2 n^2 - 116e lambda^2 n + 150e lambda^2
  - 2e lambda n^4 + 72e lambda n^3 - 410e lambda n^2 + 340e lambda n + 2e n^5 - 2e n^4 - 2e n^3
  + 2e n^2 - 9 lambda^5 + 4 lambda^4 n^2 - 4 lambda^4 n + 54 lambda^4 + 6 lambda^3 n^3
  - 62 lambda^3 n^2 + 56 lambda^3 n - 81 lambda^3 - 18 lambda^2 n^3 + 150 lambda^2 n^2
  - 132 lambda^2 n - lambda n^5 + lambda n^4 + lambda n^3 - lambda n^2 .
```

At `n = e + 1` this is exactly the tree polynomial `K~(n,lambda)` of
`ISO3_TREES_THEOREM.md` (checked symbolically against the recorded
`K_tilde_ab` of `reports/iso3_trees_proof.json`).

## Step A — `I = 0`

Every component is `K_1` or `K_2`, so `I(F;x) = (1+2x)^e (1+x)^z`,
`p_k = sum_j C(e,j) 2^j C(z,k-j)`, and `Q_3` is a polynomial in `(e,z)`:

```text
Q_3 = ( 64e^5 + 144e^4 z - 208e^4 + 128e^3 z^2 - 320e^3 z + 224e^3 + 56e^2 z^3 - 168e^2 z^2
        + 208e^2 z - 80e^2 + 12e z^4 - 32e z^3 + 52e z^2 - 32e z + z^5 - z^4 - z^3 + z^2 ) / 12 ,
```

which coincides with `G0(2e+z, e, 0)` (consistent with Step 1: `S = T3 = P = 0`).
Two independent proofs that it is `>= 0`:

1. *Newton.* `(1+2x)^e (1+x)^z` is real-rooted, so by Theorem 7.1 of
   `REDUCTION_LEMMA_AND_PROVED_CASES.md` `Q_3 >= p_2^2 > 0` whenever
   `alpha = e + z >= 4`; if `alpha <= 3` then `p_4 = 0` and `Q_3 = 3p_3^2 + p_2^2 >= 0`.
2. *Polynomial certificate.* `Q_3(e, z+2)` has only non-negative coefficients
   (21 monomials, listed in the report), so `Q_3 >= 0` for `e >= 0`, `z >= 2`;
   `Q_3(e,0) = 4e^2 (e-1)^2 (4e-5)/3`, which is `0` at `e in {0,1}` and positive
   for integers `e >= 2`; `Q_3(e,1) = 4e^2 (4e^3 - 4e^2 + 2e + 1)/3 >= 0` for
   `e >= 0` (the cubic is increasing — its derivative `12e^2 - 8e + 2` has
   negative discriminant — and equals `1` at `e = 0`). Both univariate facts are
   certified by exact real-root isolation.

Numerically re-checked for all `e, z <= 30` (`Q_3 >= 0`, and `Q_3 >= p_2^2`
when `alpha >= 4`).

## Step B — monotonicity in `n` for `n >= e + 1`

Write `lambda = 2 + a`, `e = 2 + a + b`, `n = 3 + a + b + c` (so `a, b, c >= 0`
encode `2 <= lambda <= e`, `n >= e + 1`).

**(B1')** `K~(n,e,lambda) - K~(e+1,e,lambda)` is a polynomial in `(a,b,c)` with
55 monomials, all with positive integer coefficients, and no constant term
(it vanishes at `c = 0`); it is printed in the report as
`K_tilde_abc_minus_tree`. Hence, for all real `2 <= lambda <= e` and
`n >= e + 1`,

```text
K~(n,e,lambda) >= K~(e+1,e,lambda).
```

**(B1)** The successor difference `K~(n+1,e,lambda) - K~(n,e,lambda)` likewise
has 55 positive coefficients in `(a,b,c)` (`DeltaK_abc` in the report).

**(B2)** Write `S = s`, `e = 1 + s + u`, `n = 2 + s + u + c` (so `s, u, c >= 0`
encode `0 <= S <= e - 1`, `n >= e + 1`). Then

```text
G0(n+1,e,S) - G0(n,e,S) =
  5c^4/12 + 7c^3 s/3 + 7c^3 u/3 + 9c^3/2 + 9c^2 s^2/2 + 9c^2 s u + 19c^2 s/2 + 9c^2 u^2/2
  + 25c^2 u/2 + 145c^2/12 + 11c s^3/3 + 11c s^2 u + 11c s^2/2 + 11c s u^2 + 17c s u + 31c s/2
  + 11c u^3/3 + 23c u^2/2 + 33c u/2 + 12c + 13s^4/12 + 13s^3 u/3 + s^3/2 + 13s^2 u^2/2
  + 9s^2 u/2 + 5s^2/12 + 13s u^3/3 + 15s u^2/2 + 23s u/6 + 12s + 13u^4/12 + 7u^3/2
  + 41u^2/12 + 4u + 4 ,
```

all 35 coefficients positive. Telescoping over the integers
`m = e+1, ..., n-1` (each with `c = m - e - 1 >= 0`):

```text
G0(n,e,S) >= G0(e+1,e,S)     for all integers n >= e+1, 0 <= S <= e-1.
```

No shift of variables was needed in any of (B1), (B1'), (B2): the differences
are manifestly non-negative on the whole parameter cone.

## Step C — the base case `n = e + 1`

**(C1) Regime R1, `e >= 6`.** `K~(e+1,e,lambda) = K~_tree(a,b)` with
`a = lambda - 2`, `b = e - lambda`, i.e. the polynomial

```text
a^6 - a^5 b + 11a^5 + 10a^4 b^2 - 18a^4 b + 49a^4 + 48a^3 b^3 - 30a^3 b^2 - 67a^3 b + 113a^3
+ 63a^2 b^4 + 62a^2 b^3 - 221a^2 b^2 - 78a^2 b + 142a^2 + 33a b^5 + 72a b^4 - 143a b^3
- 278a b^2 - 4a b + 92a + 6b^6 + 18b^5 - 30b^4 - 114b^3 - 72b^2 + 24b + 24 ,
```

and `e >= 6` means `a + b = e - 2 >= 4`. It is `>= 0` on
`{a, b >= 0, a + b >= 4}` by the three certificates of the tree proof, which
the script re-runs:

* (C1a) `a, b >= 2`: `K~(a+2,b+2) = a^4 (a^2 - ab + 10b^2) + R(a,b)` with `R`
  having only non-negative coefficients (25 monomials) and
  `a^2 - ab + 10b^2 = (a - b/2)^2 + 39b^2/4`;
* (C1b) `0 <= a <= 2, b >= 4` (and symmetrically): each of the 7 coefficients
  of `K~(a, b+4)` as a polynomial in `b` is a univariate polynomial in `a` that
  is `>= 0` on `[0,2]` (exact Sturm root counting: no root in `(0,2)`, values
  `>= 0` at `0` and `2`, `> 0` at `1`);
* (C1c) the compact pieces `{0<=a<=2, 2<=b<=4, a+b>=4}` and
  `{2<=a<=4, 0<=b<=2, a+b>=4}`: exact Bernstein-coefficient subdivision (all
  Bernstein coefficients on a box `>= 0` implies the polynomial is `>= 0` on
  the box; boxes inside `a + b < 4` are irrelevant). Both pieces certify after
  one subdivision level.

Coverage: if `a, b >= 2` use (C1a); otherwise one variable is `< 2`, the other
`> 2`, and it is either `>= 4` (C1b) or in `(2,4)` (C1c).

Consequently, by (B1') and (C1), `K~(n,e,lambda) >= 0`, hence
`K(n,e,lambda) >= 0`, for all `e >= 6`, `n >= e+1`, `2 <= lambda <= e`.

**(C2) Regime R2, `e >= 5`.**

```text
G0(e+1,e,S) = 3S^2 - e(e-1)^2 S + e^2 (e-1)^2 (e-2)/4 .
```

Substituting `S = e - 1 - w`, `e = 5 + v` (`w, v >= 0` encode `S <= e-1`, `e >= 5`):

```text
G0 = v^5/4 + 17v^4/4 + v^3 w + 107v^3/4 + 13v^2 w + 303v^2/4 + 50v w + 90v + 3w^2 + 56w + 28 ,
```

all 11 coefficients positive. So `G0(e+1,e,S) >= 28 > 0` for `e >= 5`,
`S <= e - 1`. (Elementary reading: `G0(e+1,e,S)` is a convex quadratic in `S`
with vertex `e(e-1)^2/6 >= e - 1` for `e >= 3`, hence decreasing on `[0,e-1]`,
and `G0(e+1,e,e-1) = (e-1)^2 (e^3 - 6e^2 + 4e + 12)/4 > 0` for `e >= 5`; it is
negative at `(e,S) = (3,2)` and `(4,3)`, which is one reason `e <= 5` is
handled separately.)

Consequently, by (B2) and (C2), `G0(n,e,S) >= 0` for all integers `n >= e+1`,
`e >= 5`, `0 <= S <= e-1`.

## Step D — `I >= 1` and `e <= 5`

Let `F'` be the forest obtained from `F` by deleting its `z` isolated vertices
("core"): `F'` has no isolated vertex, the same `e` and `I`, and `n' = e + c'`
vertices. Since `I >= 1`, some component has `>= 2` edges, so `c' <= e - 1` and
`3 <= n' <= 2e - 1 <= 9`. Enumerating all forests on `3..9` vertices
(`erdos993lib.trees.forest_polys`) and keeping those without a `K_1`
component, not all of whose components are `K_2`, with `e <= 5`, gives exactly
26 cores (1, 3, 7, 15 with `e = 2, 3, 4, 5`). Since
`I(F;x) = (1+x)^z I(F';x)`, `p_k(F) = sum_j p_j(F') C(z,k-j)` and
`Q_3(F' + zK_1)` is an explicit polynomial in `z`; the script computes each one
exactly and certifies `>= 0` for every integer `z >= 0` by exact real-root
isolation (all real roots are negative and the value at `z = 0` is positive, so
in fact each polynomial is positive for every real `z >= 0`). Every one of the
26 polynomials even has positive coefficients:

| # | n' | component orders | e | l | S | I(F';x) | 12 Q_3(F' + z K_1) |
|---|----|------------------|---|---|---|---------|---------------------|
| 1 | 3 | 3 | 2 | 2 | 1 | [1, 3, 1] | z^5 + 18z^4 + 65z^3 + 84z^2 + 48z + 12 |
| 2 | 4 | 4 | 3 | 2 | 2 | [1, 4, 3] | z^5 + 25z^4 + 143z^3 + 323z^2 + 312z + 108 |
| 3 | 4 | 4 | 3 | 3 | 3 | [1, 4, 3, 1] | z^5 + 25z^4 + 131z^3 + 263z^2 + 264z + 144 |
| 4 | 5 | 5 | 4 | 2 | 3 | [1, 5, 6, 1] | z^5 + 32z^4 + 257z^3 + 838z^2 + 1092z + 468 |
| 5 | 5 | 5 | 4 | 3 | 4 | [1, 5, 6, 2] | z^5 + 32z^4 + 245z^3 + 766z^2 + 1080z + 576 |
| 6 | 5 | 5 | 4 | 4 | 6 | [1, 5, 6, 4, 1] | z^5 + 32z^4 + 221z^3 + 598z^2 + 840z + 720 |
| 7 | 5 | 3+2 | 3 | 4 | 1 | [1, 5, 7, 2] | z^5 + 30z^4 + 265z^3 + 984z^2 + 1480z + 732 |
| 8 | 6 | 6 | 5 | 2 | 4 | [1, 6, 10, 4] | z^5 + 39z^4 + 407z^3 + 1761z^2 + 3072z + 1776 |
| 9 | 6 | 6 | 5 | 3 | 5 | [1, 6, 10, 5, 1] | z^5 + 39z^4 + 395z^3 + 1653z^2 + 2856z + 1620 |
| 10 | 6 | 6 | 5 | 4 | 6 | [1, 6, 10, 6, 1] | z^5 + 39z^4 + 383z^3 + 1569z^2 + 2904z + 2016 |
| 11 | 6 | 6 | 5 | 3 | 5 | [1, 6, 10, 5] | z^5 + 39z^4 + 395z^3 + 1677z^2 + 3120z + 2100 |
| 12 | 6 | 6 | 5 | 4 | 7 | [1, 6, 10, 7, 2] | z^5 + 39z^4 + 371z^3 + 1461z^2 + 2688z + 2004 |
| 13 | 6 | 6 | 5 | 5 | 10 | [1, 6, 10, 10, 5, 1] | z^5 + 39z^4 + 335z^3 + 1137z^2 + 2040z + 2400 |
| 14 | 6 | 4+2 | 4 | 4 | 2 | [1, 6, 11, 6] | z^5 + 37z^4 + 407z^3 + 1919z^2 + 3864z + 2748 |
| 15 | 6 | 4+2 | 4 | 5 | 3 | [1, 6, 11, 7, 2] | z^5 + 37z^4 + 395z^3 + 1787z^2 + 3408z + 2160 |
| 16 | 6 | 3+3 | 4 | 4 | 2 | [1, 6, 11, 6, 1] | z^5 + 37z^4 + 407z^3 + 1895z^2 + 3600z + 2220 |
| 17 | 7 | 5+2 | 5 | 4 | 3 | [1, 7, 16, 13, 2] | z^5 + 44z^4 + 585z^3 + 3370z^2 + 8444z + 7620 |
| 18 | 7 | 5+2 | 5 | 5 | 4 | [1, 7, 16, 14, 4] | z^5 + 44z^4 + 573z^3 + 3226z^2 + 7976z + 7056 |
| 19 | 7 | 5+2 | 5 | 6 | 6 | [1, 7, 16, 16, 9, 2] | z^5 + 44z^4 + 549z^3 + 2914z^2 + 6728z + 5376 |
| 20 | 7 | 4+3 | 5 | 4 | 3 | [1, 7, 16, 13, 3] | z^5 + 44z^4 + 585z^3 + 3346z^2 + 8132z + 6852 |
| 21 | 7 | 4+3 | 5 | 5 | 4 | [1, 7, 16, 14, 6, 1] | z^5 + 44z^4 + 573z^3 + 3178z^2 + 7352z + 5520 |
| 22 | 7 | 3+2+2 | 4 | 6 | 1 | [1, 7, 17, 16, 4] | z^5 + 42z^4 + 577z^3 + 3516z^2 + 9520z + 9420 |
| 23 | 8 | 4+2+2 | 5 | 6 | 2 | [1, 8, 23, 28, 12] | z^5 + 49z^4 + 783z^3 + 5579z^2 + 17912z + 21324 |
| 24 | 8 | 4+2+2 | 5 | 7 | 3 | [1, 8, 23, 29, 16, 4] | z^5 + 49z^4 + 771z^3 + 5375z^2 + 16760z + 18960 |
| 25 | 8 | 3+3+2 | 5 | 6 | 2 | [1, 8, 23, 28, 13, 2] | z^5 + 49z^4 + 783z^3 + 5555z^2 + 17552z + 20220 |
| 26 | 9 | 3+2+2+2 | 5 | 8 | 1 | [1, 9, 31, 50, 36, 8] | z^5 + 54z^4 + 1001z^3 + 8448z^2 + 32808z + 47964 |

(Cores with the same component orders but different `I(F';x)` are different
trees of that order, e.g. rows 9/11 are the two trees on 6 vertices with `S = 5`.)
The polynomials are cross-checked against direct computation for `z <= 6`, and
the script verifies that every forest with `n <= 16`, `I >= 1`, `e <= 5` is
indeed (one of these cores) `+ z K_1` (by exact division of `I(F;x)` by
`(1+x)^z`).

Remark: this step uses the exact `Q_3`, not the bound `G`, because `G` can be
negative for tiny `n` where the bound is lossy (e.g. `K~(6,5,lambda) < 0` at
`lambda = 7/2`, see the remarks), whereas `Q_3(F' + zK_1)` itself is a clean
polynomial in `z`.

## Step E — direct verification

All `85,624` non-isomorphic forests with `n <= 16` (counts match OEIS A005195)
satisfy `Q_3 >= 0` by exact computation (`min Q_3 = 0`, attained by `K_1` and
`K_2`, where `p_2 = p_3 = 0`). On each of them the
script also checks: the formulas of Step 1; `P >= 0`, `p_2 >= 0`; for `I >= 1`
the Cauchy–Schwarz bound, both inequalities of Lemma 4(a), Lemma 4(b), (c),
`Q_3 >= G(n,e,l,S)`; in `R1` the exact inequality
`12(2e - lambda) Q_3 >= K~(n,e,lambda)` at `lambda = (3 + sqrt(9-8e+8S))/2`
(computed exactly in `Q(sqrt D)`); in `R2` `Q_3 >= G(n,e,l,S) >= G0(n,e,S)`;
and for `I = 0` that `I(F;x) = (1+2x)^e (1+x)^z` and `Q_3 = G0(2e+z,e,0)`.

## Proof of the theorem

Let `F` be a forest.

* If `I = 0`: Step A.
* If `I >= 1` and `e <= 5`: `F = F' + zK_1` for one of the 26 cores; Step D.
* If `I >= 1` and `e >= 6`: then `n >= n' = e + c' >= e + 1 >= 7`. By Step 5,
  `Q_3 >= G(n,e,l,S)`, and
  * if `S >= e - 1` (R1): `Q_3 >= K(n,e,lambda) = K~(n,e,lambda) / (12(2e-lambda))`
    with `2 <= lambda <= e`; `K~(n,e,lambda) >= K~(e+1,e,lambda) >= 0` by (B1')
    and (C1);
  * if `S <= e - 1` (R2): `Q_3 >= G0(n,e,S) >= G0(e+1,e,S) >= 0` by (B2) and
    (C2) (which need only `e >= 5`, `0 <= S <= e-1`).

In every case `Q_3(F) >= 0`. ∎

## What is certified, and what is not

Certified by the script (35 `PASS` steps, exact arithmetic):

* self-tests of all four certificate routines on a known-negative and a
  known-positive polynomial (coefficient certificate; Sturm interval
  certificate; integer certificate via exact root isolation; Bernstein
  subdivision) and of the exact sign routine in `Q(sqrt D)`;
* the symbolic identities of Step 5 (`K~` integral, `dG/dl`, `G0` identity,
  properties of `Smax`), and agreement of the `Fraction` implementations with
  the symbolic ones;
* Step A (identity, coefficient certificate for `z >= 2`, univariate
  certificates for `z = 0, 1`, numeric check `e, z <= 30`);
* Steps (B1), (B1'), (B2) (all coefficients non-negative, no shift);
* Step (C1) (agreement with the tree polynomial; (C1a), (C1b), (C1c); coverage;
  and the remark `K~(6,5,7/2) = -7947/32 < 0`), Step (C2) (closed form and
  coefficient certificate; plus the remark on the weaker `l >= 2` bound);
* Step D (26 cores; each `Q_3(F'+zK_1) >= 0` for all integers `z >= 0`; coverage
  for `n <= 16`);
* Steps 1–5 and E on all forests with `n <= 16`.

Cited, not re-proved here: the coefficient formulas (Theorem 3.1, Proposition
3.3 of `REDUCTION_LEMMA_AND_PROVED_CASES.md`; re-verified numerically for
`n <= 16`) and, for the *alternative* proof of Step A only, Newton's
inequalities (Theorem 7.1 there). Elementary lemmas proved in this note:
Steps 2, 3, 4 and the reductions of Step 5; the convexity argument of Lemma 4(a)
and the case split are the only non-machine-checked ingredients, and they are
written out above.

**No step is missing.** The marker `PASS_EXACT_ISO3_ALL_FORESTS_ROOT` is printed
only when every step passes; a failing step prints `FAIL`, the marker
`ISO3_FORESTS_INCOMPLETE`, and exits non-zero (both failure paths were exercised
on modified copies of the script).

## Remarks

* **The `c' = 1` relaxation covers all forests.** Regime R1 uses only
  `S <= Smax(l) = C(l,2) + e - l`, which is the `c' = 1` value `h(1)` of the true
  bound `h(c')` of Lemma 4(a). Since `h` is non-increasing in `c'`, the bound
  used is *weaker* than the truth for `c' >= 2`; so nothing is lost in validity
  (only in sharpness), and the R1 argument applies verbatim to every forest with
  `I >= 1`. Isolated vertices enter only through `n`, which is handled by the
  monotonicity certificates (B1'), (B2).
* **Why `l >= 2e - 2S` in R2.** The plan of record suggested using only
  `l >= 2` when `S < e - 1`. That would also work: the script checks (as a
  remark step, not used in the proof) that `3(2e-2) G(e+1,e,2,S)` with
  `S = e-1-w`, `e = 5+v` has only non-negative coefficients. But at `l = 2` the
  Cauchy–Schwarz term `2S^2/(2e-2) - S` is negative for `S < e - 1`, whereas
  Lemma 4(b) gives the stronger `l >= 2e - 2S`, at which that term vanishes
  exactly. This makes the R2 polynomial `G0` denominator-free and its
  certificates (B2), (C2) pure coefficient-positivity statements.
* **Why `e <= 5` needs Step D.** `K~(6,5,lambda) = -9lambda^5 + 224lambda^4 -
  721lambda^3 - 1810lambda^2 + 7700lambda - 3000` equals `-7947/32` at
  `lambda = 7/2`, so the tree certificate cannot be pushed to `n = e+1 = 6`,
  and `G0(e+1,e,e-1) < 0` at `e = 3, 4`. Rather than patching the bounds, Step D
  certifies the exact `Q_3` for the finitely many cores.
* **Where the parameters are real and where integer.** (B1'), (C1), (A) for
  `z >= 2`, and (C2) hold for real parameters in the stated cones; (B2) is used
  by telescoping over integer `n`; Step D and the `z = 0, 1` cases of Step A
  are integer statements (some of those polynomials are negative at non-integer
  points, which is why exact root isolation plus finite integer checks is used
  there).
* The bound is far from tight (already for trees `G/(p_2 p_3) >= 0.27` while
  `Q_3/(p_2 p_3) >= 1.09` on trees); the slack is what allows the crude
  `P >= 0` and Cauchy–Schwarz estimates to suffice, exactly as in the tree case.
* Together with `ISO_1`, `ISO_2` (all forests) and `WR_3` (Theorem 11.2 of
  `REDUCTION_LEMMA_AND_PROVED_CASES.md`), this closes the item
  "`ISO_3` for forests remains open" of that document's Section 11; `ISO_r`
  for `r >= 4` is untouched.


---

<!-- FILE: docs/ISO_TAIL_THEOREM.md -->

# $\mathrm{ISO}_r$ in the tail: the exact range provable from Levit–Mandrescu and Fisher–Ryan

**Scope.** This note determines, rigorously, for which indices $r$ the inequality

$$\mathrm{ISO}_r:\qquad Q_r := r\,p_r^2 + p_{r-1}^2 - (r+1)\,p_{r-1}\,p_{r+1} \;\ge\; 0$$

can be proved *for every forest* from the following cited tools: the Levit–Mandrescu
double-counting bound, the Fisher–Ryan monotonicity, Zykov's bound, and elementary algebra.
The result is a theorem covering the top part of the tail, $r \ge \alpha - \lfloor(\sqrt{4\alpha+1}-1)/2\rfloor$
(Theorem 3.1), a slightly larger exactly-tabulated range (Theorem 4.1), and a precise
**obstruction** (Theorem 5.2) showing that these tools *cannot* reach the whole tail
$r \ge L(\alpha) = \lceil (2\alpha-1)/3\rceil$ for any $\alpha \notin \{2,\dots,7,10\}$, together with an
explanation of what is missing (Section 5.3) and a numerical study of the gap (Section 6).

**Machine verification.** Every identity, inequality and table below is checked with exact
arithmetic (sympy polynomial identities, exact real-root counting, Python integers,
`fractions.Fraction`; no floating point in any statement) by

```
python3 scripts/prove_iso_tail.py        # PASS/FAIL per item, markers, exit 1 on failure
```

which writes `reports/iso_tail_proof.json`. Tags **[T-k]** refer to item `k` of the script. The
markers printed are `PASS_EXACT_ISO_TAIL_RANGE_ROOT` (Theorem 3.1 and its closed form),
`PASS_EXACT_ISO_TAIL_FR_REFINEMENT` (Theorem 4.1 and the table $r_B$),
`PASS_EXACT_ISO_TAIL_OBSTRUCTION_WITNESSES` (Theorem 5.2), `PASS_EXACT_ISO_TAIL_NUMERIC_CONSISTENCY`
(Section 6) and `PASS_EXACT_ISO_TAIL_VARIANCE_FORM` (Proposition 5.4). Enumerations of trees and
forests are consistency checks only; no theorem depends on them.

**Status summary.**

| Statement | Status |
| --- | --- |
| Theorem 3.1: $\mathrm{ISO}_r$ for every forest when $(\alpha-r)^2 \le r$, i.e. $r \ge r_A(\alpha) = \alpha - \lfloor(\sqrt{4\alpha+1}-1)/2\rfloor$ | **proved** (LM + AM–GM) |
| Theorem 3.3: $\mathrm{ISO}_r$ for every forest on $n$ vertices when $(\alpha-r)\,n/\alpha \le 2\sqrt r$ | **proved** (FR + AM–GM) |
| Theorem 4.1: $\mathrm{ISO}_r$ for every forest when $P_{r,\alpha-r}(w)\ge 0$ on $[0,2(\alpha-r+1)]$; exact table $r_B(\alpha)$, $\alpha \le 60$ | **proved** (LM + FR + Zykov) |
| Corollary 4.3: whole tail $r \ge L(\alpha)$ covered for $\alpha \in \{2,3,4,5,6,7,10\}$ | **proved** |
| Theorem 5.2: for every other $\alpha \le 60$ and every $L(\alpha) \le r < r_B(\alpha)$, the tools are *consistent* with $Q_r<0$ | **proved** (explicit witnesses) |
| $\mathrm{ISO}_r$ for $L(\alpha) \le r < r_B(\alpha)$, $\alpha \ge 8$, $\alpha \ne 10$ | **not proved** (Section 7) |

---

## 1. Setting, notation, cited tools

$F$ is a forest with $n \ge 1$ vertices, $p_k$ the number of independent $k$-sets,
$\alpha$ the independence number, $L(\alpha) = \lceil (2\alpha-1)/3 \rceil$ (`checks.tail_cutoff`), and for
$1 \le r \le \alpha-1$

$$d := \alpha - r \ \ (\ge 1),\qquad x := \frac{p_r}{p_{r-1}},\qquad y := \frac{p_{r+1}}{p_r},\qquad
t_k := \Bigl(\frac{p_k}{\binom{\alpha}{k}}\Bigr)^{1/k}\ (1 \le k \le \alpha).$$

All $p_k$ ($0\le k\le\alpha$) are positive (Fact 0.1 of `REDUCTION_LEMMA_AND_PROVED_CASES.md`), so $x, y, t_k$
are well defined. For an independent set $S$ let $H_S := F - N[S]$ (delete $S$ and all its
neighbours) and $e(S) := |V(H_S)|$, the number of one-vertex extensions of $S$.

**Tool LM (Levit–Mandrescu).** V. E. Levit, E. Mandrescu, *Independence polynomials and the
unimodality conjecture for very well-covered, quasi-regularizable, and perfect graphs*,
arXiv:math/0406623 (Graph Theory in Paris, Birkhäuser 2007, 243–254).

* *Lemma 2.3 there* (double counting): for any graph, $(k+1)\,p_{k+1} = \sum_{|S|=k} e(S) \le \omega_{\alpha-k}\,p_k$,
  where $\omega_{\alpha-k} = \max\{ e(S) : S \text{ independent}, |S| = k\}$.
* *Proposition 2.6 there* (perfect graphs, via Lovász' $|V(H)| \le \alpha(H)\,\omega(H)$): for a
  perfect graph $\omega_{\alpha-k} \le \omega\,(\alpha-k)$. For bipartite graphs (*Corollary 2.7*,
  trees *Corollary 2.8*) $\omega \le 2$, hence

$$(k+1)\,p_{k+1} \;\le\; 2(\alpha-k)\,p_k \qquad (0 \le k \le \alpha-1). \tag{LM}$$

  Elementary form of the argument for a forest: $H_S$ is a forest with $\alpha(H_S) \le \alpha - k$
  (as $S \cup I$ is independent for every independent $I \subseteq V(H_S)$), and a bipartite graph on
  $m$ vertices has an independent set of size $\ge m/2$ (its larger colour class), so
  $e(S) = |V(H_S)| \le 2\alpha(H_S) \le 2(\alpha-k)$. Consequently $p_{k+1} \le p_k$ once
  $k+1 \ge 2(\alpha-k)$, i.e. for $k \ge (2\alpha-1)/3$: this is TAIL.

**Tool FR (Fisher–Ryan).** D. C. Fisher, J. Ryan, *Bounds on the number of complete subgraphs*,
Discrete Math. 103 (1992) 313–320; used in the form of Theorem 2.1 of A. Basit, D. Galvin, *On the
independent set sequence of a tree*, arXiv:2006.12562 (Electron. J. Combin. 28(3) (2021) P3.23):
for **every** graph with independence number $\alpha$,

$$t_1 \;\ge\; t_2 \;\ge\; \dots \;\ge\; t_{\alpha}. \tag{FR}$$

**Tool Z (Zykov).** Theorem 2.2 of Basit–Galvin: for every graph, $p_k \le \binom{\alpha}{k}(n/\alpha)^k$,
i.e. $t_k \le n/\alpha$. (This also follows from (FR) since $t_1 = p_1/\alpha = n/\alpha$.) For a forest,
$\alpha \ge n/2$ (bipartite), hence

$$1 \;\le\; t_k \;\le\; \frac{n}{\alpha} \;\le\; 2 \qquad (1 \le k \le \alpha), \tag{Z}$$

the lower bound being Fact 0.1 ($p_k \ge \binom{\alpha}{k}$). Equality $t_k = 2$ for some $k \ge 1$
forces $n = 2\alpha$ and $p_k = 2^k\binom{\alpha}{k}$, i.e. $F = \alpha K_2$ (every choice of $k$ matching
edges and one endpoint each must be independent, so no edge joins two matching edges).

**Also cited but not needed for the theorems.** Basit–Galvin Theorem 1.3 (the tail decreases from
$\lceil \alpha(n-1)/(\alpha+n) \rceil$ on, for every graph; equals $L(\alpha)$ when $n = 2\alpha$) and Theorem 1.6
(every maximal independent set of a tree has size $\ge \lceil (n-\alpha+1)/2 \rceil$). Theorem 1.6 gives
$e(S) \ge 1$ for all independent $S$ with $|S| < (n-\alpha+1)/2$, i.e. $\mathrm{WR}_k$ for small $k$; it says
nothing at tail indices (there $|S| \approx 2\alpha/3 > (n-\alpha+1)/2$ since $n \le 2\alpha$), see Remark 5.5.

---

## 2. The margin, AM–GM, and the window

**Lemma 2.1 [T-1.1, T-1.2, T-1.4].** For $1 \le r \le \alpha-1$,

$$\frac{Q_r}{p_{r-1}p_r} \;=\; r x + \frac1x - (r+1)\,y, \tag{2.1}$$

$$r x + \frac1x - 2\sqrt r \;=\; \frac{(\sqrt r\,x - 1)^2}{x} \;\ge\; 0, \tag{2.2}$$

$$r x + \frac1x - (r+1) \;=\; \frac{(r x - 1)(x-1)}{x}. \tag{2.3}$$

*Proof.* Write $p_{r-1} = a$, $p_r = a x$, $p_{r+1} = a x y$ in $Q_r$ and divide by $a^2 x$; (2.2) and (2.3)
are one-line expansions. All three are checked by `sympy.expand`. $\square$

So $\mathrm{ISO}_r \iff (r+1)\,y \le r x + 1/x$, and $r x + 1/x \ge 2\sqrt r$ with equality iff $x = 1/\sqrt r$.

**Lemma 2.2 (ratio bounds).** For every forest and $1 \le r \le \alpha - 1$:

$$(r+1)\,y \;\le\; 2d, \qquad r x \;\le\; 2(d+1) \tag{2.4}$$

by (LM) at $k = r$ and $k = r-1$; and, for every graph,

$$r x \;=\; (d+1)\,\frac{t_r^{\,r}}{t_{r-1}^{\,r-1}}, \qquad (r+1)\,y \;=\; d\,\frac{t_{r+1}^{\,r+1}}{t_r^{\,r}} \;\le\; d\,t_{r+1} \;\le\; d\,t_r \;\le\; d\,\frac{n}{\alpha}. \tag{2.5}$$

*Proof.* (2.4) is (LM). For (2.5) substitute $p_k = \binom{\alpha}{k} t_k^k$ (with $t_0^0 := 1$) and use
$\binom{\alpha}{r}/\binom{\alpha}{r-1} = (d+1)/r$, $\binom{\alpha}{r+1}/\binom{\alpha}{r} = d/(r+1)$ [T-2.1]; then
$t_{r+1} \le t_r$ (FR) and $t_r \le t_1 = n/\alpha$ (FR, Z). $\square$

**Lemma 2.3 (the window) [T-1.3, T-1.5].** Let $d^2 > r$ and $x_\pm := \bigl(d \pm \sqrt{d^2-r}\bigr)/r$. Then

$$r x^2 - 2 d x + 1 \;=\; r\,(x - x_-)(x - x_+), \tag{2.6}$$

so $r x + 1/x < 2d$ **iff** $x_- < x < x_+$. Moreover $r x + 1/x = r + 1$ at $x = 1$ and $x = 1/r$, and

$$r + 1 \;\ge\; 2d \quad\iff\quad r \;\ge\; L(\alpha), \tag{2.7}$$

so for $r \ge L(\alpha)$ one has $1/r \le x_- < x_+ \le 1$: the window lies inside the "WR-holds-and-descending" interval.

*Proof.* (2.6) is a polynomial identity (checked with $r = d^2 - D^2$, $D = \sqrt{d^2-r}$). (2.7):
$r+1 \ge 2(\alpha - r) \iff 3r \ge 2\alpha - 1 \iff r \ge \lceil (2\alpha-1)/3\rceil$ (checked for all $\alpha \le 300$).
The last claim: for $r \ge L$, $r x + 1/x \ge r+1 \ge 2d$ at $x = 1/r$ and $x = 1$, and $r x + 1/x$ is
decreasing on $(0, 1/\sqrt r]$ and increasing on $[1/\sqrt r, \infty)$, so the set where it is $< 2d$ is
contained in $(1/r, 1)$. $\square$

---

## 3. Theorem A: the root range

**Theorem 3.1 [T-1.1, T-1.2, T-1.6].** Let $F$ be a forest with independence number $\alpha \ge 2$ and let
$1 \le r \le \alpha - 1$ with

$$(\alpha - r)^2 \;\le\; r, \qquad\text{equivalently}\qquad d(d+1) \le \alpha \quad (d = \alpha - r).$$

Then $\mathrm{ISO}_r$ holds; more precisely $\dfrac{Q_r}{p_{r-1}p_r} \ge 2\sqrt r - 2(\alpha - r) \ge 0$.

*Proof.* By (2.1), (2.2) and (2.4): $Q_r/(p_{r-1}p_r) = r x + 1/x - (r+1) y \ge 2\sqrt r - 2d$, and
$2\sqrt r \ge 2d \iff r \ge d^2$. Finally $d^2 \le r = \alpha - d \iff d(d+1) \le \alpha$. $\square$

**Corollary 3.2 (closed form) [T-1.6].** Put

$$d_{\max}(\alpha) := \Bigl\lfloor \frac{\sqrt{4\alpha+1} - 1}{2} \Bigr\rfloor = \max\{ d \ge 0 : d(d+1) \le \alpha \},
\qquad r_A(\alpha) := \alpha - d_{\max}(\alpha).$$

Then $\{ r : 1 \le r \le \alpha-1,\ (\alpha-r)^2 \le r \} = \{ r_A(\alpha), \dots, \alpha - 1\}$, so $\mathrm{ISO}_r$
holds for every forest with independence number $\alpha$ and every $r \ge r_A(\alpha)$. One has
$r_A(\alpha) \ge L(\alpha)$ for all $\alpha \ge 2$ (the proved range lies inside the tail), with equality exactly
for $\alpha \in \{2, 3, 4, 6, 7\}$. Asymptotically $r_A(\alpha) = \alpha - \sqrt{\alpha} + O(1)$, while the tail
starts at $L(\alpha) \approx 2\alpha/3$.

*Proof.* $d(d+1) \le \alpha \iff d \le (\sqrt{4\alpha+1}-1)/2$; the script verifies
$d_{\max}(d_{\max}+1) \le \alpha < (d_{\max}+1)(d_{\max}+2)$ with `isqrt` for all $\alpha \le 10^5$, the set identity for
$\alpha \le 400$, and $r_A \ge L$ for $\alpha \le 10^5$. $\square$

| $\alpha$ | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 20 | 30 | 40 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| $L(\alpha)$ | 1 | 2 | 3 | 3 | 4 | 5 | 5 | 6 | 7 | 7 | 8 | 9 | 9 | 10 | 11 | 13 | 20 | 27 |
| $r_A(\alpha)$ | 1 | 2 | 3 | 4 | 4 | 5 | 6 | 7 | 8 | 9 | 9 | 10 | 11 | 12 | 13 | 16 | 25 | 35 |
| $r_B(\alpha)$ (Thm 4.1) | 1 | 1 | 1 | 3 | 4 | 5 | 6 | 7 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 16 | 25 | 35 |

In particular the known non-log-concave trees (log-concavity failures at $\alpha-1$ or $\alpha-2$) are
covered: $d = 1$ needs $\alpha \ge 2$ and $d = 2$ needs $\alpha \ge 6$.

**Theorem 3.3 ($n$-refined version) [T-2.6].** For a forest on $n$ vertices, $\mathrm{ISO}_r$ holds whenever

$$(\alpha - r)\,\frac{n}{\alpha} \;\le\; 2\sqrt r, \qquad\text{i.e.}\qquad n^2 (\alpha-r)^2 \le 4 r \alpha^2 .$$

*Proof.* Replace (2.4) by the last inequality of (2.5): $(r+1) y \le d\,n/\alpha$; then argue as in
Theorem 3.1. $\square$ For $n = 2\alpha$ this is Theorem 3.1; for trees with $\alpha$ close to $n$ (many leaves)
it is much better (e.g. $n/\alpha = 3/2$ gives $r \ge 24$ instead of $25$ at $\alpha = 30$, and $r \ge 3$ at
$\alpha = 5$; $n/\alpha \to 1$ gives $d \le 2\sqrt r$). The script tabulates the range for $n/\alpha \in \{1, 3/2, 2\}$.

---

## 4. Theorem B: the Fisher–Ryan refinement and the exact table $r_B(\alpha)$

For $r \ge 1$, $d \ge 1$ define

$$q_{r,d}(w) := w + \frac rw - d\Bigl(\frac{2^{r-1} w}{d+1}\Bigr)^{1/r}\quad (w > 0),\qquad
P_{r,d}(w) := (d+1)\,(w^2 + r)^r - 2^{r-1} d^{\,r}\, w^{r+1}.$$

Then $q_{r,d}(w) \ge 0 \iff P_{r,d}(w) \ge 0$, because
$\bigl(w + r/w\bigr)^r (d+1) - 2^{r-1} d^r w = P_{r,d}(w)/w^r$ [T-2.2] and both sides of
$w + r/w \ge d(2^{r-1}w/(d+1))^{1/r}$ are positive.

**Theorem 4.1 [T-2.1–T-2.4].** Let $F$ be a forest with independence number $\alpha$, $1 \le r \le \alpha-1$,
$d = \alpha - r$. Then either $Q_r > 0$, or

$$\frac{Q_r}{p_{r-1}p_r} \;\ge\; \inf_{\sqrt r \,\le\, w \,\le\, 2(d+1)} q_{r,d}(w).$$

Consequently, if $P_{r,d}(w) \ge 0$ for all $w \in [0, 2(d+1)]$, then $\mathrm{ISO}_r$ holds for every forest with
independence number $\alpha = r + d$.

*Proof.* Put $T := t_r \in [1, 2]$ (by (Z)) and $u := t_r^{\,r}/t_{r-1}^{\,r-1}$, so that $r x = (d+1) u$ by (2.5).
Since $t_r \le t_{r-1} \le 2$ (FR, Z),

$$\frac{T^r}{2^{r-1}} \;\le\; u \;\le\; T. \tag{4.1}$$

By (2.1) and (2.5), $M := Q_r/(p_{r-1}p_r) = g(u) - (r+1) y \ge g(u) - dT$, where
$g(u) := (d+1) u + r/((d+1) u)$ is convex on $(0,\infty)$ with minimum $2\sqrt r$ at $u^* = \sqrt r/(d+1)$.
Set $w := (d+1)\,T^r/2^{r-1}$, so the left end of (4.1) is $w/(d+1)$, $g(w/(d+1)) = w + r/w$, and
$w \le (d+1) T \le 2(d+1)$. Three cases:

* $u^* < w/(d+1)$, i.e. $w > \sqrt r$: $g$ is increasing on $[w/(d+1), T]$, so $M \ge w + r/w - dT = q_{r,d}(w)$
  with $w \in (\sqrt r, 2(d+1)]$.
* $w/(d+1) \le u^* \le T$: $M \ge 2\sqrt r - dT$. Here $w \le \sqrt r$, i.e. $T \le T_c := (2^{r-1}\sqrt r/(d+1))^{1/r}$,
  hence $M \ge 2\sqrt r - d\,T_c = q_{r,d}(\sqrt r)$ (note $\sqrt r \le 2(d+1)$ in this case since $u^* \le T \le 2$).
* $u^* > T$: $M \ge g(T) - dT = T + r/((d+1)T) > 0$.

This proves the displayed bound. If $P_{r,d} \ge 0$ on $[0, 2(d+1)]$ then $q_{r,d} \ge 0$ on $(0, 2(d+1)]$, so
$M \ge 0$ in every case. $\square$

**Lemma 4.2 (equivalent forms of the criterion) [T-2.3].** $q_{r,d}$ is convex on $(0,\infty)$
($q'' = 2r/w^3 + c\,(r-1) r^{-2} w^{1/r-2} > 0$, $c = d(2^{r-1}/(d+1))^{1/r}$) and strictly decreasing on
$(0, \sqrt r]$ (there $q' = 1 - r/w^2 - (c/r) w^{1/r-1} < 0$). Hence

$$P_{r,d} \ge 0 \text{ on } [0, 2(d+1)] \iff q_{r,d} \ge 0 \text{ on } (0, 2(d+1)] \iff \inf_{[\sqrt r,\, 2(d+1)]} q_{r,d} \ge 0 .$$

Moreover the criterion contains Theorem 3.1: if $d^2 \le r$ then for $w \le 2(d+1)$,
$q_{r,d}(w) \ge 2\sqrt r - d\,(2^{r-1}\cdot 2(d+1)/(d+1))^{1/r} = 2\sqrt r - 2d \ge 0$.

**Definition and table.** Let $r_B(\alpha)$ be the least $r$ such that $P_{r',\alpha-r'} \ge 0$ on $[0, 2(\alpha-r'+1)]$
for every $r' \in [r, \alpha-1]$. The script decides each criterion exactly: $P_{r,d}(0) = (d+1) r^r > 0$ and
`sympy.Poly.count_roots(0, 2(d+1))` (Sturm sequences, rational endpoints) counts the real roots in the
interval; zero roots means $P > 0$ there, and whenever roots exist a rational point with $P < 0$ is
exhibited, so no case is left undetermined [T-2.4]. Results for $\alpha \le 60$:

* $r_B(\alpha) \le r_A(\alpha)$ always (Lemma 4.2), and $r_B(\alpha) - r_A(\alpha) \in \{0, -1, -2\}$: it is $-2$ only for
  $\alpha = 4$, $-1$ for $\alpha \in \{3, 5, 10, 11, 18, 19, 29, 41, 55\}$, and $0$ otherwise. So the Fisher–Ryan
  chain improves the root range by at most one index (asymptotically: at $w = \sqrt r$ the criterion reads
  $d\,(\sqrt r/(2(d+1)))^{1/r} \le \sqrt r$, i.e. $d \le \sqrt r\,(1 + O(\log r / r))$).
* $r_B(\alpha) \le L(\alpha)$, i.e. **the whole tail is covered, exactly for $\alpha \in \{2,3,4,5,6,7,10\}$.**

**Corollary 4.3.** For every forest with $\alpha \in \{2,3,4,5,6,7,10\}$, $\mathrm{ISO}_r$ holds for all
$L(\alpha) \le r \le \alpha - 1$. For $\alpha \le 7$ this also follows from Theorem 3.1 together with $\mathrm{ISO}_3$
for forests (Theorem 11.1$'$ of the audit note) at $(\alpha, r) = (5, 3)$; the case $\alpha = 10$, $r = 7$ is new
and uses Theorem 4.1 ($d = 3$, $d^2 = 9 > 7 = r$, but $\inf_{[\sqrt 7, 8]} q_{7,3} \approx 0.11 > 0$).

---

## 5. The obstruction: what these tools cannot do

### 5.1 The abstract system

Consider the following system $\Sigma(\alpha)$ of constraints on positive reals $p_0, \dots, p_\alpha$, which
collects everything the tools (LM), (FR), (Z), TAIL and $\mathrm{WR}$ assert about a forest:

* $(\Sigma 1)$ $p_0 = 1$ and (LM): $(k+1)p_{k+1} \le 2(\alpha-k) p_k$ for $0 \le k \le \alpha-1$;
* $(\Sigma 2)$ (FR) in polynomial form: $(p_k/\binom{\alpha}{k})^{k+1} \ge (p_{k+1}/\binom{\alpha}{k+1})^{k}$ for $1 \le k \le \alpha-1$;
* $(\Sigma 3)$ (Z): $\binom{\alpha}{k} \le p_k \le 2^k\binom{\alpha}{k}$;
* $(\Sigma 4)$ TAIL ($p_k \ge p_{k+1}$ for $k \ge L(\alpha)$) and $\mathrm{WR}_k$ ($p_{k-1} \le k p_k$) for all $k$;
* $(\Sigma 5)$ $p_1 = n \le 2\alpha$, and (when $r \ge 4$) the exact forest identities
  $p_2 = \binom n2 - e$, $p_3 = \binom n3 - e(n-2) + S$ of Theorem 3.1 of the audit note, with the data
  $n = 2\alpha$, $e = \alpha$, $S = 0$ of the perfect matching $\alpha K_2$.

**Theorem 5.2 (obstruction) [T-2.5].** Let $2 \le \alpha \le 60$ and $L(\alpha) \le r < r_B(\alpha)$ (these pairs
exist exactly for $\alpha \in \{8, 9\} \cup \{11, \dots, 60\}$; there are 343 of them). Then $\Sigma(\alpha)$ has a solution
with $Q_r < 0$. Explicitly, with $d = \alpha - r$ and a rational $T \in (1,2)$ found by the script,

$$p_k = 2^k \binom{\alpha}{k}\ (k \le r-1), \qquad p_k = \binom{\alpha}{k}\,T^k\ (k \ge r)$$

satisfies $(\Sigma1)$–$(\Sigma5)$ and $Q_r < 0$; all of this is verified with exact rational arithmetic.

*Why it works.* This sequence has $t_k = 2$ for $k < r$ and $t_k = T$ for $k \ge r$, so (FR) holds
(constant, then a drop), (Z) holds, (LM) at $k \le r-2$ holds with equality (the matching values), at
$k = r-1$ it reads $T^r \le 2^r$, at $k \ge r$ it reads $T \le 2$. Its margin is exactly
$M = g(u) - dT$ with $u = T^r/2^{r-1}$, i.e. $M = q_{r,d}(w)$ with $w = (d+1)T^r/2^{r-1}$: the first case of the
proof of Theorem 4.1 is attained. By Lemma 4.2, whenever the criterion fails there is $w_0 \in [\sqrt r, 2(d+1)]$
with $q_{r,d}(w_0) < 0$, and $T = (2^{r-1} w_0/(d+1))^{1/r} \in [1,2]$ realises it (the script finds a nearby
rational $T$ with $Q_r < 0$ exactly). Examples:

| $(\alpha, r, d)$ | $T$ | $x = p_r/p_{r-1}$ | $y = p_{r+1}/p_r$ | window $(x_-, x_+)$ | $Q_r/(p_{r-1}p_r)$ |
| --- | --- | --- | --- | --- | --- |
| $(8, 5, 3)$ | $207/128$ | $0.5531$ | $207/256 = 0.8086$ | $(0.2, 1)$ | $-0.278$ |
| $(9, 6, 3)$ | $27/16$ | $0.4811$ | $81/112 = 0.7232$ | $(0.212, 0.788)$ | $-0.097$ |
| $(11, 7, 4)$ | $217/128$ | $0.4492$ | $217/256 = 0.8477$ | $(0.143, 1)$ | $-1.41$ |
| $(30, 20, 10)$ | $119/64$ | $0.2559$ | $85/96 = 0.8854$ | $(0.0528, 0.947)$ | $-9.57$ |

**Consequence.** No proof of $\mathrm{ISO}_r$ for all forests at such $(\alpha, r)$ can consist solely of
inequalities implied by (LM), (FR), (Z), TAIL, $\mathrm{WR}_k$ and the exact formulas for $p_1, p_2, p_3$ — in
particular the whole tail $r \ge L(\alpha)$ is out of reach of these tools for every $\alpha \ge 8$, $\alpha \ne 10$.
For $\alpha \le 60$ the uncovered tail indices are $\{r : L(\alpha) \le r < r_B(\alpha)\}$, e.g. $\{5\}$ for $\alpha = 8$,
$\{6\}$ for $\alpha = 9$, $\{7\}$ for $\alpha = 11$, $\{13,14,15\}$ for $\alpha = 20$, $\{20,\dots,24\}$ for $\alpha = 30$
(listed in the report under `tail_uncovered_indices`); asymptotically about $\alpha/3 - \sqrt\alpha$ indices.

### 5.2 Which ingredient is missing

By Lemma 2.3, at a tail index the margin can only be negative when $x \in (x_-, x_+) \subset (1/r, 1)$
**and** $(r+1)y$ exceeds $r x + 1/x$. The tools give the sharp upper bound $(r+1) y \le 2d$ (tight for
$\alpha K_2$) but no *lower* bound on $x$ beyond $x \ge (d+1)/(r 2^{r-1})$ (from $(\Sigma 3)$), which is why the
abstract system can place $x$ at the AM–GM minimiser $1/\sqrt r$. Two facts from the data
(Section 6) show that a proof cannot come from excluding the window either:

* real trees *do* sit in the window: among the 36060 pairs (tree, $r$) with $n \le 16$, $r \ge L(\alpha)$ and
  $d^2 > r$, 28197 (78%) have $x \in (x_-, x_+)$ (forests $n \le 14$: 11498 of 13443, 86%);
* for those pairs the LM bound on $y$ is never more than 63% tight: $\max (r+1)y/(2d) = 1408/2241 \approx 0.628$
  (trees) and $146/231 \approx 0.632$ (forests), while $(r+1)y/(2d)$ does reach $163/181 \approx 0.90$ (trees) and
  $1$ (forests, $2K_2$) at tail pairs with $x > 1$, where $\mathrm{ISO}_r$ is trivial by (2.7).

So the **key obstruction** is the absence of an upper bound on $y = p_{r+1}/p_r$ that improves on
$2(\alpha-r)/(r+1)$ *when $x < 1$*: what is needed is an inequality of the type
$(r+1)\,y \le r x + 1/x$ itself, i.e. $E_r \le E_{r-1} + r/E_{r-1}$ for the mean extension counts
$E_k := (k+1)p_{k+1}/p_k$ (a weak form of log-concavity that tolerates the known log-concavity failures,
which all have small $x$). Neither (LM) nor (FR) relates $E_r$ to $E_{r-1}$ in this direction.

### 5.3 The variance form and the two-point extension statistics

**Proposition 5.4 [T-1.7, T-4.1].** Let $1 \le r \le \alpha-1$ and let $S$ be uniform over the independent
$(r-1)$-sets; write $a_S := e(S) = |V(H_S)|$ and $m_S := |E(H_S)|$. Then
$r\,p_r = \sum_S a_S$ and $\binom{r+1}{2} p_{r+1} = \sum_S p_2(H_S)$ with $2p_2(H_S) = a_S^2 - a_S - 2m_S$, hence

$$Q_r \;=\; \frac{p_{r-1}^2}{r}\Bigl(\mathbb E[a]^2 + r - \mathbb E[a^2 - a - 2m]\Bigr), \qquad
\mathrm{ISO}_r \iff \operatorname{Var}(a_S) \;\le\; \mathbb E[a_S] + 2\,\mathbb E[m_S] + r .$$

*Proof.* Each independent $r$-set contains $r$ independent $(r-1)$-sets and each $(r-1)$-set $S$ extends to
$a_S$ of them (Lemma 2.3 of LM / identity (4) of Basit–Galvin); each independent $(r+1)$-set contains
$\binom{r+1}{2}$ independent $(r-1)$-sets, and $S$ extends to an $(r+1)$-set exactly by an independent pair
of $H_S$, of which there are $\binom{a_S}{2} - m_S$. Substituting into $Q_r$ gives the identity
(checked symbolically), and $\mathbb E[a^2] - \mathbb E[a]^2 = \operatorname{Var}(a)$. All identities are also
verified by brute-force enumeration of independent sets on all 947 pairs (tree, $r$) with $n \le 10$,
together with the per-set bounds $a_S \le 2(d+1)$, $2p_2(H_S) \le 2d\,a_S$ and $e(T) \le 2d$ for $r$-sets. $\square$

The per-set (LM) inequality is $p_2(H_S) \le d\,a_S$, with equality iff $H_S = (d+1)K_2$. Averaging it gives
exactly Theorem 3.1. The two-point statistics [T-1.8]

$$(a_S, p_2(H_S)) = \begin{cases} (2(d+1),\ 2d(d+1)) & \text{with probability } q = \tfrac{d}{2(d+1)} \\ (0, 0) & \text{otherwise}\end{cases}$$

(a fraction $q$ of the $(r-1)$-sets extends to a perfect-matching forest with $d+1$ edges, the rest are
maximal independent sets) satisfy every per-set bound and give
$\mathbb E[2p_2] - \mathbb E[a]^2 - r = d^2 - r$: **exactly** the AM–GM threshold. So the per-set bound alone can
never beat Theorem 3.1; only a *coupling* between different $S$ (a structural statement about forests,
e.g. that maximal independent $(r-1)$-sets and $(r-1)$-sets with $H_S \cong (d+1)K_2$ cannot coexist in the
proportions above) could.

**Remark 5.5.** Basit–Galvin's Theorem 1.6 ($e(S) \ge 1$ when $|S| < (n-\alpha+1)/2$, trees) removes the atom
at $a_S = 0$ only for $r - 1 < (n - \alpha + 1)/2 \le (\alpha+1)/2$, never at tail indices $r \ge L(\alpha) \approx 2\alpha/3$
for $\alpha \ge 5$; and even then replacing the atom $0$ by $1$ moves the threshold only to $d \lesssim \sqrt r + 1/2$.
The "trivial" bound $x \le \binom{\alpha}{r}/\binom{\alpha}{r-1} = (\alpha-r+1)/r$ is false: it fails for 213617 of the
277096 pairs (tree, $r$) with $n \le 16$ (Fisher–Ryan only gives $t_r \le t_{r-1}$, an upper bound on $x$ by
$(d+1) t_{r-1}/r \le 2(d+1)/r$); in any case upper bounds on $x$ are useless here.

---

## 6. Numerical study: the true tail margin versus what is proved [T-3.1–T-3.3]

All 32508 trees with $n \le 16$ (counts equal OEIS A000055) and all 15205 forests with $n \le 14$
(A005195), via `erdos993lib.trees` and `indpoly_parent_array`; all numbers exact.

* $Q_r \ge 0$ at **every** index $1 \le r \le \alpha-1$ for all of them (277096 resp. 114941 pairs), in
  particular on $[r_A, \alpha-1]$, on $[r_B, \alpha-1]$ and on the whole tail; and on the proved range the exact
  lower bound $Q_r/(p_{r-1}p_r) \ge 2\sqrt r - 2d$ of Theorem 3.1 holds (compared via squares).
* Minimum tail margin $\min_{r \ge L(\alpha)} Q_r/(p_{r-1}p_r)$: trees $11/6$ (at $K_{1,3}$, $r = 2 = \alpha-1$);
  forests $3/2$ (at $2K_1$, $\alpha = 2$, $r = 1$). By order $n$, the tree minimum is $2.17$ ($n = 10$), $2.16$ ($11$),
  $2.17$ ($12$), $2.19$ ($13$), $2.28$ ($14$), $2.31$ ($15, 16$), attained at $(\alpha, r) = (8, 5)$ for
  $10 \le n \le 14$ and $(11, 7)$ for $n = 15, 16$. By $\alpha$ (trees, $n \le 16$): the minimiser is always
  $r = L(\alpha)$ for $\alpha \ge 4$, with values $2.39, 1.89, 2.22, 2.50, 2.16, 2.41, 2.62, 2.31, 2.53, 2.75, 2.48, 2.67$ for
  $\alpha = 4, \dots, 15$. So the tail is far from critical: the true margin at the start of the tail is $> 1.8$,
  whereas the binomial sequence has margin $1 + r/(d+1)$ and the matching $\alpha K_2$ has $1 + r/(4(d+1))$.
* For comparison, the global minimum over *all* indices is $233/840 \approx 0.277$ at $r = 2$ for the star
  $K_{1,15}$ (forests: $88/273$ at $r = 2$ for $K_{1,13}$): the difficulty of $\mathrm{ISO}$ sits entirely in the prefix.
* The gap: proved for $r \ge r_B(\alpha) \approx \alpha - \sqrt\alpha$; true (for $n \le 16$, and for all $n \le 25$ by the
  repository's scans) for $r \ge L(\alpha) \approx 2\alpha/3$ with margin $> 1.8$; in between, roughly
  $\alpha/3 - \sqrt\alpha$ indices per $\alpha$, where the tools are provably insufficient (Theorem 5.2) although
  the inequality is comfortably true on all available data.

---

## 7. What is NOT proved

1. $\mathrm{ISO}_r$ for $L(\alpha) \le r < r_B(\alpha)$ is **not proved** for any $\alpha \ge 8$ with $\alpha \ne 10$; the first
   open tail instance is $(\alpha, r) = (8, 5)$. By Theorem 5.2 it cannot be proved from (LM), (FR), (Z), TAIL,
   WR and the low-order formulas alone. The framework of the audit note does not need these instances
   (it needs $\mathrm{ISO}_r$ only for $r \le L(\alpha)-1$), so nothing there is affected.
2. Theorem 4.1's table is exact only for $\alpha \le 60$ (the criterion is decidable for any given $(\alpha, r)$ by the
   same computation); the statement "$r_B \in \{r_A - 2, r_A - 1, r_A\}$" is verified for $\alpha \le 60$ only.
3. The variance formulation (Proposition 5.4) is an exact reformulation, not a proof strategy that has been
   carried out; the coupling statement suggested in Section 5.3 is a conjecture-shaped remark.
4. All enumerations are finite consistency checks.

---

## 8. Map of the machine verification (`scripts/prove_iso_tail.py`)

| Item | What is checked |
| --- | --- |
| [T-1.1]–[T-1.4] | (2.1), (2.2), (2.6), (2.3) by `sympy` |
| [T-1.5] | (2.7) for all $\alpha \le 300$, all $r$ |
| [T-1.6] | Corollary 3.2: $d_{\max}$, the set identity, $r_A \ge L$ ($\alpha \le 10^5$), $r_A = L$ iff $\alpha \in \{2,3,4,6,7\}$ |
| [T-1.7], [T-1.8] | Proposition 5.4's identity; the two-point computation $d^2 - r$ |
| [T-2.1]–[T-2.3] | (2.5) (symbolic $\alpha \le 15$, ratios $\alpha \le 200$); $P_{r,d}/w^r$ identity ($r \le 12$); $q''$ |
| [T-2.4] | exact table $r_B(\alpha)$, $\alpha \le 60$, by `count_roots`; $B \supseteq A$; negative points exhibited |
| [T-2.5] | 343 rational witnesses for Theorem 5.2, each checked against $(\Sigma1)$–$(\Sigma5)$ and $Q_r < 0$ |
| [T-2.6] | Theorem 3.3 table for $n/\alpha \in \{1, 3/2, 2\}$; agreement with $r_A$ at $n/\alpha = 2$ |
| [T-3.1]–[T-3.3] | Section 6 (trees $n \le 16$, forests $n \le 14$) |
| [T-4.1] | brute-force variance form on all trees $n \le 10$ |

Markers: `PASS_EXACT_ISO_TAIL_RANGE_ROOT`, `PASS_EXACT_ISO_TAIL_FR_REFINEMENT`,
`PASS_EXACT_ISO_TAIL_OBSTRUCTION_WITNESSES`, `PASS_EXACT_ISO_TAIL_NUMERIC_CONSISTENCY`,
`PASS_EXACT_ISO_TAIL_VARIANCE_FORM`. Report: `reports/iso_tail_proof.json` (SHA-256 printed by the script).


---

<!-- FILE: docs/LEAF_INDUCTION_PROBE.md -->

# Leaf-deletion induction for ISO: a structural probe

**Scope.** This note records an exact, exhaustive probe of the natural inductive route to the
open target theorem of this repository (ISO$_r$ for every forest and every $1 \le r \le L(\alpha)-1$,
which together with WR and TAIL would settle Erdős #993): delete a leaf, apply the induction
hypothesis to the two smaller forests that appear in the leaf recursion, and control the
residual. Everything below is computed by `scripts/probe_leaf_induction.py` (exact integers and
`Fraction`s; the only floating point is inside the HiGHS LP solver, and every LP solution is
rationalised and re-verified exactly against the data). The machine-readable results are in
`reports/leaf_induction_probe.json`. Notation follows `docs/REDUCTION_LEMMA_AND_PROVED_CASES.md`:
$p_k$ = number of independent $k$-sets, $\alpha = \deg I$, $L(\alpha) = \lceil (2\alpha-1)/3 \rceil$,

$$Q_r(p) = r p_r^2 + p_{r-1}^2 - (r+1)\,p_{r-1}p_{r+1}, \qquad \mathrm{ISO}_r \iff Q_r \ge 0,$$

with the convention $p_k = 0$ for $k \notin [0,\alpha]$ (so $Q_0 = 0$ and $Q_r \ge 0$ trivially for $r \ge \alpha$).

**Summary of findings (details and tables below).**

1. **The plain leaf induction closes on all data.** For every tree with $3 \le n \le 16$, every
   leaf $l$ (244 690 rooted instances from 32 506 trees) and every index $1 \le r \le \alpha-1$
   (2 133 459 rows), the residual
   $R := Q_r(T) - Q_r(A) - Q_{r-1}(B)$ is **strictly positive**. The same holds on every forest
   instance tested (a tree instance with any forest added on the remaining vertices). So the
   single inequality $R \ge 0$ (the *leaf lemma*) would prove ISO$_r$ at **every** index for
   **every** forest by induction on $n$; no product-closure argument is needed.
2. **The cross term is negative only on stars at $r=2$.** CROSS $<0$ on exactly 99 of the
   2 133 459 rows, all of them $(K_{1,m}, \text{any leaf}, r=2)$ with $7 \le m \le 15$. Closed forms:
   CROSS $= 2m - \binom{m-1}{2}\cdot\!1 = -(m^2-7m+2)/2$, but $R = 3m-1 > 0$: the log-concavity
   term $b_1^2 - b_0b_2 = \binom m2$ of $B = \overline{K_{m-1}}$ pays for CROSS exactly at leading
   order. The normalised residual $R/(p_1p_2) = (6m-2)/(m^3-m) \sim 6/m^2$ is the global minimum
   ($11/420$ at $m=15$): the leaf lemma is asymptotically tight on stars at $r = 2$ and any proof
   must be exact there. At descent indices ($p_r \le p_{r-1}$) the minimum jumps to $2/3$, and for
   $r \ge 3$ it is $2/7$ (all rows) resp. $53/65$ (descent rows).
3. **Strengthening the hypothesis by a non-negative quadratic form can never help**: for
   $\Phi_r = \sum \mu_{ij} p_ip_j$ with $\mu \ge 0$, superadditivity gives
   $\Phi_r(a)+\Phi_{r-1}(b) \le \Phi_r(T)$. In particular the "payment" LP of the task is degenerate
   (its optimum is $\lambda = 0$); what is meaningful is (i) which payments are *affordable*
   (capacities) and (ii) whether $R$ has a *certificate* as a non-negative combination of provable
   quadratic forms. Result: the IH is usable in full ($\lambda_a=\lambda_b=1$) at every $r$ — even
   $Q_2(T) \ge \tfrac{41}{37} Q_2(A) + Q_1(B)$ holds on all data, tight on $K_{1,15}$ — the payment
   LPs are feasible with exactly verified rational coefficients, and at $r = 2$ the binding rows of
   the dual are $K_{1,15}$ and near-stars (spiders with one hub of degree 6–10). Of the
   synchronisation inequalities only $p_r b_{r-1} \ge p_{r-1} b_r$ is universal; the one suggested in
   the task, $a_{r-1}b_r \le a_r b_{r-1}$, fails on every star at $r = 2$.
4. **No certificate exists in the natural cone.** For every $2 \le r \le 8$ the exact certificate LP
   (write $R$, or the closing polynomials of the FLC/PLC inductions, identically as a non-negative
   combination of products of the non-negative linear forms $b_k, c_k, b_k-c_k$ together with
   ISO / LC / FLC hypotheses on $B$ and $C$ and the synchronisation inequalities that hold on the
   data) is **infeasible**; only $r = 1$ is certified. So the leaf lemma is true on all data but is
   *not* a formal consequence of the induction hypotheses plus the obvious coordinate relations:
   a proof needs genuinely new structure linking $b = I(B)$ and $c = I(C) = I(B - N(v))$.
5. **FLC and PLC are consistent induction targets in the prefix, not at all indices.** On all
   trees $n \le 18$ FLC ($Q_r \ge p_{r-1}^2$) and PLC ($p_r^2 \ge p_{r-1}p_{r+1}$) never fail in the
   prefix, and the closing inequalities of their leaf inductions ($E_{\rm FLC} = R - 2a_{r-1}b_{r-2} \ge 0$,
   $E_{\rm PLC} \ge 0$) hold on every tree instance $n \le 16$ at every index. On the
   non-log-concave trees $T_{3,4,4}$, $T^*_{3,3,4}$ and `bush([3,3,3])` both FLC and PLC fail only in
   the tail $r \ge L$, and there the closing inequalities fail too (as they must).
6. **Convolution closure.** ISO at all indices is *not* closed under convolution for general
   (even log-concave) sequences, so "forests reduce to trees" is false for ISO as an abstract
   property; it is true on all tree data because trees $n \le 18$ satisfy the stronger FLC at all
   indices and FLC *is* convolution-closed (Liggett). For a forest induction this is irrelevant:
   the leaf identity holds for forests verbatim and the base case is the binomial $(1+x)^n$.

---

## 0. Setting and the exact identity

Let $T$ be a forest with at least one edge, $l$ a leaf and $v$ its neighbour. Put
$A = T - l$, $B = T - l - v$, $C = T - N[v]$ and $a = I(A)$, $b = I(B)$, $c = I(C)$. Then
$I(T) = I(A) + x I(B)$ and $I(A) = I(B) + xI(C)$, i.e.

$$p_r(T) = a_r + b_{r-1}, \qquad a_r = b_r + c_{r-1}, \qquad p_r(T) = b_r + b_{r-1} + c_{r-1}.$$

If $W = N(v)\setminus\{l\}$ and $T_w$ is the component of $B$ containing $w \in W$ (rooted at $w$)
then $B = \bigsqcup_w T_w$, $C = \bigsqcup_w (T_w - w)$, so $b = \prod_w I(T_w)$ and
$c = \prod_w I(T_w - w)$. Expanding $Q_r(T)$,

$$Q_r(T) = Q_r(a) + \underbrace{\bigl[r b_{r-1}^2 + b_{r-2}^2 - (r+1) b_{r-2}b_r\bigr]}_{= Q_{r-1}(b) + LC_{r-1}(b)} + \mathrm{CROSS},$$

$$\mathrm{CROSS} = 2r a_r b_{r-1} + 2 a_{r-1} b_{r-2} - (r+1)\bigl(a_{r-1} b_r + a_{r+1} b_{r-2}\bigr),
\qquad LC_{r-1}(b) = b_{r-1}^2 - b_{r-2} b_r,$$

and the **residual** is $R := Q_r(T) - Q_r(a) - Q_{r-1}(b) = LC_{r-1}(b) + \mathrm{CROSS}$. In the
free coordinates $(b_{r-2},b_{r-1},b_r,b_{r+1},c_{r-2},c_{r-1},c_r)$:

$$R = \bigl[b_{r-1}^2 + (r-1) b_{r-1}b_r + 2 b_{r-2}b_{r-1} - b_{r-2}b_r - (r+1) b_{r-2}b_{r+1}\bigr]
 + \bigl[2r\, b_{r-1}c_{r-1} + 2 b_{r-2}c_{r-2} - (r+1)\, b_r c_{r-2} - (r+1)\, b_{r-2} c_r\bigr].$$

The script checks $p_r = a_r + b_{r-1}$, $a_r = b_r + c_{r-1}$ and $R = LC_{r-1}(b) + \mathrm{CROSS}$
on every row. **Induction scheme.** If $R \ge 0$ for every forest instance, then ISO$_r$ at every
index follows for every forest by induction on $n$: a forest with an edge has a leaf, $A$ and $B$
are forests with fewer vertices, $Q_r(a) \ge 0$ and $Q_{r-1}(b) \ge 0$ by the hypothesis (trivially
true outside the index range by the zero convention), and the base case $(1+x)^n$ satisfies
$Q_r > 0$ by Newton's inequalities (Theorem 7.1 of the audit note). Normalisation throughout is
$N := p_{r-1}(T)\,p_r(T)$, the scale of the dimensionless ISO margin.

## 1. Signs of CROSS and of the residual (all trees $n \le 16$, every leaf)

Data: 32 506 trees ($3 \le n \le 16$, counts match OEIS A000055), 244 690 (tree, leaf)
instances, 2 133 459 (instance, $r$) rows with $1 \le r \le \alpha(T)-1$.

| restriction | rows | CROSS $<0$ | fraction | $R<0$ | $R=0$ | worst $R/N$ | attained at |
| --- | --- | --- | --- | --- | --- | --- | --- |
| all indices | 2 133 459 | 99 | $4.6\cdot10^{-5}$ | **0** | 0 | $11/420 = 0.0262$ | $K_{1,15}$, $r=2$ |
| prefix $r \le L-1$ | 1 348 526 | 99 | $7.3\cdot10^{-5}$ | **0** | 0 | $11/420$ | $K_{1,15}$, $r=2$ |
| descent $p_r \le p_{r-1}$ | 891 080 | 0 | 0 | **0** | 0 | $2/3$ | $K_{1,3}$, $r=2$ |

Per index (all indices; the prefix rows have the same minima wherever the index is in the prefix):

| $r$ | rows | CROSS $<0$ | min $R/N$ | witness |
| --- | --- | --- | --- | --- |
| 1 | 244 690 | 0 | $3/16$ | $P_{16}$ ($R = 3$ always at $r=1$: $R = 1 + 2(e_T - e_A) = 3$) |
| 2 | 244 686 | 99 | $11/420$ | $K_{1,15}$, any leaf |
| 3 | 244 673 | 0 | $2/7$ | $n=16$, one hub of degree 13 plus a pendant $P_3$ (leaf of the $P_3$) |
| 4 | 244 623 | 0 | $8273/19497 = 0.424$ | $n=16$, hubs of degree 9 and 6 |
| 5 | 244 416 | 0 | $1276885/2247699 = 0.568$ | $n=16$ double star, degrees 9 and 7 |
| 6 | 243 473 | 0 | $413/570 = 0.725$ | $n=16$ double star, degrees 14 and 2 |
| 7 | 238 813 | 0 | $17/20$ | same |
| 8 | 214 602 | 0 | $1$ | same |
| 9–14 | 141 031 … 15 | 0 | $17/15, 19/15, 21/15, 23/15, 25/15, 27/15$ | (stars; $R/N = (2r-1)/15$) |

**Forest instances** (`leaf_lemma_forest_instances`): every distinct tree instance with $n_0 \le 11$
combined with every forest on the remaining vertices up to total order 16 (648 275 rows): $R > 0$
on every row; worst $R/N = 3/28$ at $K_{1,10} \sqcup K_1$, $r=2$. The leaf identity is verbatim the
same for forests, so the induction of Section 0 runs over all forests.

The 99 rows with negative CROSS are exactly $(K_{1,m}, \text{leaf}, r=2)$ for $7 \le m \le 15$
($m$ leaves each, $\sum_{m=7}^{15} m = 99$). **Star closed forms** (verified symbolically with sympy
and numerically for $3 \le m \le 40$): with $b = (1+x)^{m-1}$, $c = 1$, $a = (1+x)^{m-1} + x$,

$$\mathrm{CROSS}(K_{1,m}, r=2) = 2m - \tbinom{m-1}{2} = -\tfrac{m^2 - 7m + 2}{2} \ (<0 \iff m \ge 7),
\qquad LC_1(b) = \tbinom m2, \qquad R = 3m - 1,$$

$$\frac{R}{p_1 p_2} = \frac{6m-2}{m^3 - m} \sim \frac{6}{m^2} \to 0 .$$

So the expectation "stars give negative CROSS at $r = 2$" is confirmed, but the *residual* is
positive: the log-concavity term of $B = \overline{K_{m-1}}$ (which is just $n_B^2 \ge p_2(B)$)
cancels CROSS to leading order and leaves $3m-1$. For $r \ge 3$ the star residual is large
($R/N = 1/2, 7/10, 9/10, 11/10$ at $r = 3..6$ for $m = 10$).

**Consequences for the shape of a proof.** $R > 0$ everywhere, but $R/N \to 0$ along stars at
$r=2$ while all individual terms of $R$ are of order $m^3$: any proof of the leaf lemma must be
exact to two orders on stars. At $r=2$ one can write (from Theorem 3.1 of the audit note, with
$N_B = |B|$, $e_B$, $S_B = \sum_u \binom{d_u}{2}$ over $B$)

$$R_{r=2} = 3N_B + 2 + 2e_B(N_B - 1) - 3 S_B + 4 c_1 N_B - 3 c_2 ,$$

which is a degree-data inequality of the type proved in Theorem 5.1 — a concrete sub-lemma.

**Descent propagation and range bookkeeping** (relevant for the prefix / descent-conditional
versions of the theorem):

* At descent rows of $T$, $A$ also descends at $r$ in every case, but $B$ descends at $r-1$ in
  only a minority (e.g. $r=4$: 268 of 1130 rows; $r=3$: 12 of 66). A *descent-conditional*
  induction hypothesis therefore does not propagate to $B$; the hypothesis must be unconditional.
* If the target is the prefix statement only, the hypothesis on $A$ at $r$ and on $B$ at $r-1$ is
  available only when $r \le L(\alpha(A)) - 1$ and $r-1 \le L(\alpha(B)) - 1$. This fails on a
  large share of prefix rows at higher $r$ (e.g. $r = 5$: 49 867 of 214 602 rows; $r=6$:
  70 358 of 141 031; $r = 8$: 1807 of 2042) because $\alpha(A)$ or $\alpha(B)$ drops. A prefix-only
  induction needs a separate argument for the top index; the all-indices statement (which the
  data support for trees $n \le 25$ and forests $n \le 22$) has no such gap.

## 2. Payment terms, capacities, LPs and the certificate attempt

### 2.1 Which candidate terms are universally non-negative on the data

Candidate terms evaluated on every row (all indices, $n \le 16$); "provable" means non-negative
for every forest instance by a known argument (IH on a smaller forest, product of counts,
$c_k \le b_k$ because $C$ is an induced subgraph of $B$, or a square).

| term | provable? | universal on data (all indices) | universal in prefix |
| --- | --- | --- | --- |
| $Q_r(b)$, $Q_{r-1}(c)$, $Q_r(c)$ | yes (IH) | yes | yes |
| $LC_{r-1}(b)$, $LC_r(b)$, $LC_{r-1}(c)$, $LC_r(c)$ | no ($T_{3,4,4}$) | yes for $n \le 16$ | yes |
| $FLC_{r-1}(b)$, $FLC_r(b)$, $FLC_{r-1}(c)$ | no | yes for $n \le 16$ | yes |
| $c_{r-1}b_{r-1}$, $c_{r-1}b_{r-2}$, $c_{r-1}b_r$, $c_{r-1}a_{r-1}$, $c_{r-1}^2$, $c_{r-1}c_{r-2}$ | yes | yes | yes |
| $(b_k - c_k)\cdot(\text{count})$ | yes | yes | yes |
| squares $(c_{r-1}-b_{r-1})^2$, $(b_{r-1}-b_{r-2})^2$, $(a_r - p_{r-1})^2$ | yes | yes | yes |
| sync $a_r b_{r-1} - a_{r-1} b_r$ (task's suggestion) | no | **fails** on 519 581 rows (first: $K_{1,3}$, $r=2$) | fails |
| sync $a_{r-1} b_r - a_r b_{r-1}$ (reverse) | no | fails on 1 503 040 rows ($K_{1,2}$, $r=1$) | fails |
| sync $a_{r+1}b_r - a_r b_{r+1}$ and reverse | no | both fail | both fail |
| sync $b_r c_{r-1} - b_{r-1} c_r$ / reverse | no | fail (95 471 / 1 808 401 rows) | fail |
| sync $b_{r-1}c_{r-2} - b_{r-2}c_{r-1}$ / reverse | no | fail (75 351 / 1 702 085 rows) | fail |
| sync $a_{r-1}c_{r-1} - a_r c_{r-2}$ / reverse | no | fail | fail |
| sync $p_r a_{r-1} - p_{r-1} a_r$ | no | fails on 522 tail rows only ($n=12$, $r=6$) | **yes** |
| sync $p_r b_{r-1} - p_{r-1} b_r$ | no | **yes** (2 133 459 rows) | yes |
| reverses $p_{r-1}a_r - p_r a_{r-1}$, $p_{r-1}b_r - p_r b_{r-1}$ | no | fail on (almost) every row | fail |
| ULC $(r+1)b_{r-1}b_r - (r-1)b_{r-2}b_{r+1}$ | no | yes for $n \le 16$ | yes |

The exact per-term verdicts with a witness for every failure are in
`task2_payment.universality`; per-$r$ verdicts in `task2_payment.per_r[r].universality`. The
synchronisation inequality $a_{r-1} b_r \le a_r b_{r-1}$ suggested in the task is **false**
(it is equivalent to $c_{r-1} b_{r-1} \ge c_{r-2} b_r$, violated by every star at $r = 2$ where
$c_1 = 0$); the only ratio-ordering that holds everywhere is
$p_r/p_{r-1} \ge b_r/b_{r-1}$ ("$T$ grows faster than $B$"), equivalently
$LC_{r-1}(b) + c_{r-1}b_{r-1} - c_{r-2}b_r \ge 0$.

### 2.2 Why the literal payment LP is degenerate, and what was solved instead

The task asks for $\lambda \ge 0$ with $Q_r(T) - \sum_i \lambda_i t_i \ge 0$ on all instances,
maximising the minimum slack. Since every $t_i \ge 0$, adding payments only lowers the slack, so
the optimum is always $\lambda = 0$ (the untouched statement ISO$_r(T)$). Moreover, for the
strengthened-hypothesis reading ($Q_r \ge \Phi_r$ with $\Phi_r$ a non-negative quadratic form
in $p_{r-1}, p_r, p_{r+1}$), the closing slack changes by
$\Phi_r(a) + \Phi_{r-1}(b) - \Phi_r(T) = -(\text{cross terms}) \le 0$
because $p_k(T) = a_k + b_{k-1}$ — so no non-negative-form strengthening can ever help a leaf
induction (e.g. FLC costs exactly $2a_{r-1}b_{r-2}$; see Section 4). Three non-degenerate
questions were therefore solved, all with HiGHS and exact re-verification:

* **IH-usage LP.** $\max \lambda_a + \lambda_b$ s.t. $Q_r(T) \ge \lambda_a Q_r(a) + \lambda_b Q_{r-1}(b)$
  on all rows, $0 \le \lambda \le 1$. Optimum $\lambda_a = \lambda_b = 1$ at every $r$ (exactly
  verified) — the plain induction closes. The exact extremal ratios
  $\max\{\lambda_a : Q_r(T) \ge \lambda_a Q_r(a) + Q_{r-1}(b)\}$ are $41/37$ ($r=2$, tight on
  $K_{1,15}$), $52553/39653 = 1.325$ ($r=3$), $623853/414104 = 1.507$ ($r=4$); the analogues
  for $\lambda_b$ are $11/3$, $8/3$, $219/107$ (`task2_payment.per_r[r].ih_usage_*`). They measure
  how much *more* than the hypotheses is true: at $r=2$ only 11 % of $Q_2(A)$ is spare on stars.
* **Payment capacities.** For each universal term $t$, the largest universal coefficient
  $\lambda_t^{\max} = \min_{\text{rows}, t>0} R/t$ such that $R \ge \lambda_t^{\max}\, t$ still
  holds on all data (exact; `capacity_all_indices`, `capacity_prefix`). At $r = 2$ every
  $b$-only term is pinned by $K_{1,15}$: $LC_1(b)$: $44/105$ (on stars $(3m-1)/\binom m2 \sim 6/m \to 0$,
  so CROSS eventually eats the whole log-concavity term), $Q_2(b)$: $22/735$, $LC_2(b)$: $44/3185$,
  $FLC_2(b)$: $22/637$, ULC: $22/1729$ — while the $c$-terms (which vanish on stars) have
  capacities $\ge 0.63$ ($c_1 b_2$: $107/169$; $c_1b_1$: $321/91$; $c_1^2$: $642/169$; witnesses are
  the double stars with degrees $(14,2)$). At $r = 3$ the smallest capacities are the ULC form
  ($2285/15522$), $(a_r - p_{r-1})^2$ ($12900/61009$), $Q_3(b)$ ($3530/11011$) and $LC_3(b)$ ($2055/5423$),
  witnessed by trees with one hub of degree 12–13.
* **Payment LP.** $\max \sum_i w_i \lambda_i$ s.t. $\sum_i \lambda_i t_i \le R$ on all (de-duplicated,
  $N$-normalised) rows with $w_i$ the mean normalised size of $t_i$ — i.e. the *strongest* true
  lemma of the form $Q_r(T) \ge Q_r(a) + Q_{r-1}(b) + \sum_i \lambda_i t_i$ in this family. Solved for
  the provable terms and for all universal terms, all indices and prefix ($r = 2$: 244 686 rows,
  11 734 distinct; $r=4$: 122 325 distinct). Every solution was rationalised (floored to a
  $10^{-3}$ grid) and re-verified exactly on all rows (`exact_verification.ok = true`, zero
  violations). The optimal supports consist of $FLC_r(b)$, $FLC_{r-1}(b)$, $FLC_{r-1}(c)$, $Q_r(c)$
  and $c$-products such as $(b_{r-1}-c_{r-1})c_{r-1}$, $c_{r-1}b_{r-2}$, $c_{r-1}^2$ (and at $r=4$ the
  universal sync form $p_r b_{r-1} - p_{r-1} b_r$). The binding rows (non-zero duals) are reported
  with full witnesses in `binding_rows`: at $r = 2$ they are $K_{1,15}$ (dual weight $0.31$, 15
  instances), a spider with hub degrees $(10,5,2)$ ($0.43$), spiders with one hub of degree 6–7
  and pendant $P_2$'s, and the $(14,2)$ double star; at $r = 3, 4$ they are hub-dominated trees and
  the path $P_{16}$ — i.e. exactly the "stars and near-stars" the task anticipated, now identified
  as the *binding* constraints of a feasible LP rather than as an infeasibility certificate.

### 2.3 Certificate LP: can $R \ge 0$ be *proved* from the hypotheses? (No, not in the natural cone)

The residual is a quadratic form in $x = (b_{r-2},b_{r-1},b_r,b_{r+1},c_{r-2},c_{r-1},c_r)$. A
proof from the induction hypotheses plus the obvious relations would be an identity

$$R \equiv \sum_j \nu_j\, u_j(x), \qquad \nu_j \ge 0,$$

where the $u_j$ are quadratic forms known (or hypothesised) to be non-negative on every instance:

* level 0: the 55 pairwise products of the non-negative linear forms $b_k$, $c_k$, $b_k - c_k$
  ($C \subseteq B$ induced);
* level 1: $+\,Q_r(b)$, $Q_{r-1}(c)$ (ISO on the smaller forests $B$, $C$: the induction hypotheses);
* level 2: $+\,LC_{r-1}(b)$, $LC_r(b)$, $LC_{r-1}(c)$ (log-concavity hypotheses);
* level 3: $+\,FLC_{r-1}(b)$, $FLC_r(b)$, $FLC_{r-1}(c)$ (fractional log-concavity hypotheses);
* extra: the synchronisation / ULC forms that are universal on the data (hypothetical).

Coefficient matching on the 28 monomials gives a small LP (HiGHS), and any float-feasible
solution is converted to an exact rational certificate and checked symbolically with sympy.
**Result:** for $r = 1$ the residual is certified at level 0: in the free coordinates
$R = b_0^2 + 2 b_0 c_0$ ($=3$ for every instance since $b_0 = c_0 = 1$), and $E_{\rm FLC}$,
$E_{\rm PLC}$ are certified too. For **every $2 \le r \le 8$, every level 0–3, and also with the
universal synchronisation form $p_r b_{r-1} - p_{r-1} b_r$ and the ULC form added, the LP is
infeasible** (HiGHS status "Infeasible") — for $R$ and for the closing polynomials $E_{\rm FLC}$,
$E_{\rm PLC}$ of Section 4. For instance at $r=2$ the target is

$$R = b_0^2 + b_0b_1 + 2b_0b_{-} + 4b_0c_0 - b_1b_{-} - 3b_1c_{-} - 3b_2b_{-} - 3b_{-}c_1 + 2b_{-}c_{-}$$

(with $b_{-} = b_{r-2}$, $c_{-} = c_{r-2}$, $b_0 = b_{r-1}$, $c_0 = c_{r-1}$), whose negative
monomials $-3b_2 b_{-}$, $-3 b_1 c_{-}$, $-3 b_{-}c_1$ cannot all be absorbed by the 63 available
forms. Hence $R \ge 0$ is not a formal consequence of {ISO/LC/FLC of $B$ and $C$} + {$0 \le c_k \le b_k$}
+ {the ratio orderings that hold on the data}: a proof must use relations between $b$ and $c$
that these do not capture. The tight family shows what is missing: on $K_{1,m}$ at $r=2$ the term
$-3 b_{r-2} b_{r+1} = -3\binom{m-1}{3}$ is cancelled only by $b_{r-1}b_r = (m-1)\binom{m-1}{2}$,
i.e. by the *splitting inequality* $b_1 b_2 \ge 3 b_3$ (each independent triple arises from three
(vertex, pair) splits), which is non-homogeneous and lies outside every homogeneous quadratic
cone above. In general one needs, for the pair
$b = \prod_w I(T_w)$, $c = \prod_w I(T_w - w)$: a bound of the form
$b_{r-2} b_{r+1} \le \frac{r-1}{r+1}\, b_{r-1} b_r$ (this is exactly what FLC$_{r-1}$ and FLC$_r$
of $B$ give, and it is tight for the binomial $b$ of the star), plus control of
$(r+1) b_r c_{r-2} - 2r\, b_{r-1} c_{r-1}$ by $b$-quantities — i.e. an inequality relating the
"root-deleted" polynomial $c$ to $b$ that is exact when $c = 1$.

## 3. Descent-conditional and $r \ge 3$ versions

Restricting to descent rows ($p_r(T) \le p_{r-1}(T)$; these are the only indices at which
Theorem 2.2 needs ISO$_r$):

| $r$ | descent rows | CROSS $<0$ | $R < 0$ | min $R/N$ | witness |
| --- | --- | --- | --- | --- | --- |
| 2 | 3 | 0 | 0 | $2/3$ | $K_{1,3}$ |
| 3 | 66 | 0 | 0 | $53/65 = 0.815$ | $n=7$, hub of degree 4 with a pendant $P_3$ |
| 4 | 1 130 | 0 | 0 | $1671/1891 = 0.884$ | $n=10$, hubs $(4,4,2,2)$ |
| 5 | 20 016 | 0 | 0 | $17123/18480 = 0.927$ | $n=11$ double star $(6,5)$ |
| 6 | 203 632 | 0 | 0 | $47553/51904 = 0.916$ | $n=15$ |
| 7 | 238 148 | 0 | 0 | $474673/504900 = 0.940$ | $n=16$ |
| 8–14 | 214 602 … 15 | 0 | 0 | $1, 17/15, \dots, 27/15$ | stars |

No row with negative CROSS is a descent row (stars ascend at $r=2$), so the entire tightness of
the leaf lemma sits at *ascent* indices, which Theorem 2.2 never uses: at descent indices the
residual is at least $2/3$ of the margin scale $N$ and grows with $r$. For $r \ge 3$ (where
$r=2$ is excluded because ISO$_2$ is a theorem, Theorem 5.1): CROSS $\ge 0$ on all
1 644 087 rows, min $R/N = 2/7$ over all rows (prefix too) and $\ge 53/65$ over descent rows; all
payment LPs are feasible with exact rational coefficients, and the IH-usage optimum is again
$(1,1)$ (`task3_descent_and_r_ge_3`). The "feasibility" question of the task therefore has a
positive answer in every version — the LPs are never infeasible because $R>0$ always; the
*obstruction* is provability (Section 2.3), not truth. Excluding $r=2$ removes the only
asymptotically tight family, which is why the certificate problem is not easier at $r \ge 3$ in
the cone sense but should be much easier analytically (relative margin $\ge 2/7$ instead of
$\sim 6/m^2$).

Two caveats for a descent-conditional induction, from the data of Section 1: the hypothesis
must be unconditional on $B$ (descent does not propagate to $B$ at $r-1$), and the prefix range
gap must be handled.

## 4. Strengthened targets FLC and PLC as induction hypotheses

FLC$_r$: $p_r^2 \ge (1+\tfrac1r) p_{r-1}p_{r+1}$, equivalently $r!\,p_r$ log-concave, equivalently
$Q_r \ge p_{r-1}^2$ (since $Q_r - p_{r-1}^2 = r p_r^2 - (r+1)p_{r-1}p_{r+1}$). PLC$_r$:
$p_r^2 \ge p_{r-1}p_{r+1}$, equivalently $Q_r \ge p_{r-1}(p_{r-1} - p_{r+1})$ (sign-indefinite
strengthening). Normalised slacks: FLC $1 - (1+1/r)p_{r-1}p_{r+1}/p_r^2$, PLC $1 - p_{r-1}p_{r+1}/p_r^2$.

**Validity on trees $n \le 18$** (`task4_flc_plc.trees_scan`, 205 000 trees): FLC and PLC never
fail — neither in the prefix nor at any other index — for any tree with $n \le 18$. Minimal
normalised slacks over the prefix: FLC $1/136$ (star $K_{1,17}$, $r=2$; on stars the FLC$_2$ slack
is $1 - \frac{3(m+1)(m-2)}{2m(m-1)}\cdot\frac{(m-1)}{(m-1)} \approx 1/(8n)$, decreasing like $0.4/n$ down
the table $0.625, 0.167, 0.100, \dots, 0.0074$), PLC $1/5$ ($K_{1,17}$, $r = 8$); minimal ISO
prefix margin $149/612$ ($K_{1,17}$, $r=2$, the star value $2/n + 2n/((n-1)(n-2))$). In the tail the
minima are FLC $1/7$ and PLC $3/14$ ($K_{1,17}$, $r=11$). So on trees $n \le 18$, FLC is a
*strictly* stronger true statement than ISO at every index.

**Named non-log-concave trees** (`task4_flc_plc.families`): $T_{3,4,4}$ ($n=26$, $\alpha=14$,
$L=9$) and $T^*_{3,3,4}$ fail FLC and PLC exactly at $r = 13$ (tail; $\alpha - 1$), $T_{3,6,6}$
($\alpha = 18$, $L = 12$) at $r = 17$, `bush([3,4,4])` at $r=13$; `bush([3,3,3])` satisfies both
everywhere; all satisfy ISO at every index, and their minimal prefix FLC slacks ($19/169$,
$365/4224$, $16/121$) are far from zero. So both strengthened targets fail **only in the tail
$r \ge L$**, exactly where TAIL takes over.

**Closing inequalities of the FLC / PLC leaf inductions.** By the identity of Section 0, if
$Q_r(a) \ge \Phi_r(a)$ and $Q_{r-1}(b) \ge \Phi_{r-1}(b)$ then $Q_r(T) \ge \Phi_r(T)$ follows iff
$E_\Phi := R + \Phi_r(a) + \Phi_{r-1}(b) - \Phi_r(T) \ge 0$:

$$E_{\rm FLC} = R - 2a_{r-1}b_{r-2}, \qquad E_{\rm PLC} = R - 2a_{r-1}b_{r-2} + a_{r-1}b_r + b_{r-2}a_{r+1}.$$

On all 2 133 459 tree rows $n \le 16$ both are $\ge 0$ at every index (`closing_inequalities_on_instances`;
on stars at $r = 2$, $E_{\rm FLC} = 3m - 1 - 2m = m - 1$). Following the leaf recursion on
$T_{3,4,4}$ (`leaf_identity_rows_on_non_log_concave_trees`): at the tail row $(l = 3, r = 13)$,
$A$ satisfies FLC$_{13}$ and $B$ satisfies FLC$_{12}$ but $E_{\rm FLC} = -10925 < 0$ and $T$ fails
FLC$_{13}$ — the FLC leaf induction breaks *exactly* where FLC itself becomes false, and only
there (no negative $E_{\rm FLC}$ or $E_{\rm PLC}$ row lies in the prefix on any of the three
trees), while $R$ stays positive on every row. So FLC/PLC are viable *prefix* induction targets on
the data, with the range-gap caveat of Section 1 (which bites harder for them, because their
hypothesis is genuinely false beyond the prefix), and their closing polynomials are — like $R$ —
not certifiable in the natural cone (Section 2.3).

## 5. Convolution closure (forests versus trees)

`task5_closure`: for all pairs of tree polynomials with $n_1, n_2 \le 12$ (487 578 pairs) and
200 000 random pairs from $n \le 14$, the product satisfies ISO, FLC and PLC at every index
whenever the factors do; multiplying trees $n \le 12$ by $(1+x)^k$, $k \le 5$, never breaks ISO.
For random log-concave integer sequences (both factors ISO at all indices) ISO of the product
**fails in a large fraction of pairs**, and also for random ISO-only factors; FLC and PLC are never
broken. So ISO is not convolution-closed as an abstract property of sequences; the closure seen on
tree data is explained by FLC: trees $n \le 18$ satisfy FLC at every index, and the ordinary
convolution of $p, q$ is the *binomial* convolution of $r!p_r$, $r!q_r$, which preserves
log-concavity (T. M. Liggett, *Ultra logconcave sequences and negative dependence*, JCTA 79
(1997), the ULC($\infty$) case; see also Wang–Yeh, JCTA 114 (2007)). Consequently a proof of ISO
for forests cannot go "trees first, then convolution" unless it proves FLC (false in the tail); the
leaf induction of Section 0, which treats forests directly, avoids the issue entirely.

## 6. Conclusion: is a leaf-deletion induction viable?

* **Numerically, yes, in its plainest form.** The exact residual $R = Q_r(T) - Q_r(T-l) - Q_{r-1}(T-l-v)$
  is strictly positive on every one of the 2 133 459 tree rows ($n \le 16$, every leaf, every
  index) and on every forest instance tested. No strengthening, payment or descent restriction is
  needed to make the step *true*; the induction hypothesis is used with coefficient exactly one,
  the base case is Newton's inequality for $(1+x)^n$, and forests need no separate reduction.
  This upgrades the target from "ISO$_r$ for $r \le L-1$" to "ISO$_r$ at every index for every
  forest", which is what the exhaustive data already suggest.
* **Formally, not yet.** The whole difficulty is compressed into one quadratic inequality in the
  seven coordinates of $(b, c) = (I(B), I(B - N(v)))$. It has vanishing relative margin along stars
  at $r=2$ ($R/N \sim 6/m^2$, $R = 3m-1$ against terms of size $m^3$), and it is **not** implied by
  the induction hypotheses on $B$, $C$ (ISO, or even LC / FLC) together with $0 \le c_k \le b_k$ and
  the synchronisation inequalities that hold on the data: the exact certificate LP is infeasible
  for all $2 \le r \le 8$. Strengthening the hypothesis by any non-negative quadratic form is
  provably useless for the closing step (superadditivity), and the sign-indefinite strengthenings
  (PLC) are false in the tail.
* **What a proof would need.** An inequality tying $c = I(B - W)$ to $b = I(B)$ that is exact
  when $c \equiv 1$ (stars) and homogeneous of degree two in the relevant coordinates — e.g. of the
  form $(r+1) b_r c_{r-2} \le 2r\, b_{r-1} c_{r-1} + (\ldots)$ together with the FLC-strength bound
  $b_{r-2}b_{r+1} \le \frac{r-1}{r+1} b_{r-1} b_r$ — or a non-homogeneous ingredient such as the
  splitting inequalities $b_j b_k \ge \binom{j+k}{j} b_{j+k}$ (which is what makes $R_{r=2}$ work on
  stars). At $r = 2$ the lemma reduces to the explicit degree-data inequality
  $3N_B + 2 + 2e_B(N_B-1) - 3S_B + 4c_1N_B - 3c_2 \ge 0$ and should be provable by the methods of
  Theorem 5.1; a proof at $r = 3$ would already give ISO$_3$ for all forests by a new route, and
  the general-$r$ statement is the natural next conjecture to attack, with the star family as the
  extremal case to calibrate every estimate.

## 7. Replay

```
pip install scipy            # HiGHS for the LPs (only floating-point component; all results re-verified exactly)
python3 scripts/probe_leaf_induction.py --nmax 16 --nmax-flc 18 --forest-n0 11 --forest-ntot 16 --cert-rmax 8
```

writes `reports/leaf_induction_probe.json` (SHA-256 printed at the end; the report carries no
timestamp so a replay is byte-for-byte reproducible; seed 993 for the random closure tests).
Runtime is a few minutes; the report is written incrementally after each task.


---

<!-- FILE: docs/LEAF_LEMMA_STRUCTURED.md -->

# The structured leaf lemma and its exact certificates (r = 2, 3)

Replay: `python3 scripts/certify_leaf_lemma_degree3.py --r 2 3 --smax 3 --degree4 3,0`
(report `reports/leaf_lemma_certificates.json`, marker
`PASS_EXACT_LEAF_LEMMA_DEGREE3_CERTIFICATES`); exploratory searches:
`scripts/search_leaf_certificate_structured.py`.

## 1. Why this inequality

`docs/LEAF_INDUCTION_PROBE.md` showed that the single inequality

```text
R_r(T, l) := Q_r(T) - Q_r(T - l) - Q_{r-1}(T - l - v) >= 0        (l a leaf, v its neighbour)
```

would prove `ISO_r` for every forest at every index by induction on the number
of vertices (base case: edgeless forests, binomial coefficients), and that
`R_r > 0` on every one of 2.1 million (tree, leaf, index) instances, but that
`R_r` is *not* a nonnegative combination of the induction hypotheses and the
obvious coordinate relations. The induction only needs the inequality for
**one** leaf per forest, so we may choose the leaf.

## 2. The deepest-leaf structure

Root a non-trivial component anywhere and let `l` be a deepest leaf. Its
neighbour `v` then has `s >= 0` further children, all leaves, and either a
parent `w` or none (then the component is the star `K_{1,s+1}`). Put
`F' = T` minus `v` and its `s+1` leaf children, and

```text
gamma = I(F' - w),    delta = I(F' - N[w]),    beta = I(F') = gamma + x delta      (exact),
b = I(T - l - v) = (1+x)^s beta,   a = I(T - l) = b + x gamma,   p = I(T) = (1+x)^{s+1} beta + x gamma.
```

(`v ∈ S` forces `w ∉ S` and all leaves of `v` out; the leaves are isolated in
`T - l - v`.) In the no-parent case `gamma = beta`, `delta = 0`. So the leaf
lemma becomes a statement about a forest `F'` with one marked vertex `w`,
through the coordinates `(gamma_k, delta_k)`, with `s` as a parameter.

## 3. Relations that are true for every forest `F'` and vertex `w`

Every generator below is a polynomial in the coordinates that is `>= 0` for all
actual `(F', w)`; each has a one-line proof.

- `gamma_k >= 0`, `delta_k >= 0`, `gamma_k - delta_k >= 0` (`F' - N[w]` is an
  induced subforest of `F' - w`, so it has no more independent `k`-sets).
- Single-mark relation (built into `beta = gamma + x delta`): an independent
  `k`-set of `F'` containing `w` is `w` plus an independent `(k-1)`-set of
  `F' - N[w]`.
- **Super-multiplicativity.** If `X` is an induced subforest of `Y` then
  `i_j(Y) i_k(X) >= C(j+k, j) i_{j+k}(X)`: every ordered splitting `S = J ⊔ K`
  of an independent `(j+k)`-set `S` of `X` gives a distinct pair
  `(J, K) ∈ I_j(Y) × I_k(X)`. Applied to all pairs among `F' ⊇ F'-w ⊇ F'-N[w]`.
- Edge-count bounds: `p_2 <= C(p_1, 2)` and `2 p_2 >= p_1 (p_1 - 3)` for every
  forest (a forest on `n` vertices has `e <= n - 1` edges, and
  `2 p_2 = n(n-1) - 2e`; the second form is chosen so that it also holds for the
  empty forest `n = 0`, which does occur as `F' - N[w]`).
- **Induction hypothesis:** `Q_i(beta), Q_i(gamma), Q_i(delta) >= 0` for
  `1 <= i <= r` (`F'`, `F' - w`, `F' - N[w]` are smaller forests).

A Handelman/Positivstellensatz-type certificate is an identity

```text
m(gamma, delta) · R_r  ==  sum_j lambda_j · g_j,      lambda_j >= 0,
```

with `m` a positive combination of the linear generators (constant term
forced positive, so `m > 0` on the whole domain) and each `g_j` a product of
generators. Its existence proves `R_r >= 0` for every forest of the given
configuration `(r, s)`. The float LP (HiGHS) only proposes a support; the
coefficients are then re-solved exactly over the rationals and the identity is
verified symbolically (sympy) before anything is called certified.

## 4. Results

| configuration | degree-2 certificate | degree-3 (linear multiplier) | degree-4 (quadratic multiplier) |
| --- | --- | --- | --- |
| `r = 1`, any `s` | yes | — | — |
| `r = 2`, `s = 0,1,2,3` | yes (needs super-multiplicativity and the single-mark relation) | yes, exact | — |
| `r = 2`, star-like (no parent), `s <= 3` | yes | yes | — |
| `r = 3`, `s = 1,2,3` | no | **yes, exact** | — |
| `r = 3`, `s = 0` | no | no | **yes, exact** (29,161 candidate products, support 179) |
| `r = 3`, star-like, `s = 1,2,3` | no | yes (float) | — |
| `r = 3`, star-like, `s = 0` | no | no | not tried |
| `r = 4`, `s = 0..3` | no | no | no (`s = 1..3` infeasible; `s = 0` numerically unresolved) |

All "yes, exact" entries are rational identities verified symbolically and
stored with their coefficients in `reports/leaf_lemma_certificates.json`.

Consequences and limits:

- The leaf lemma — hence the inductive mechanism — is now **proved exactly at
  `r = 2` and `r = 3` for every forest whose deepest-leaf neighbour has at
  most four leaf children** (and, at `r = 2`, for star-like components). These
  are the first certified cases beyond `r = 1`; the earlier LP found none
  because it lacked super-multiplicativity and the single-mark relation.
- Because `ISO_2` and `ISO_3` are already proved for all forests by other
  means (`docs/REDUCTION_LEMMA_AND_PROVED_CASES.md`, `docs/ISO3_FORESTS_THEOREM.md`),
  these certificates do not enlarge the set of proved `ISO` indices; their
  value is that they show *how* an inductive proof can be assembled and what
  it costs.
- The cost grows with `r`: `r = 2` needs degree 3 (or degree 2 with structure),
  `r = 3` needs degree 3–4, and `r = 4` is infeasible through degree 4. A
  proof for all `r` therefore needs either a certificate family whose degree
  grows with `r` (found by hand, not by LP), or additional relations between
  `(gamma, delta)` that collapse the degree. The candidate missing relations
  are of the kind identified in `docs/ISO4_TREES_PROBE.md`: second moments of
  the distance-2 counts, i.e. how `I(F' - N[w])` relates to `I(F' - w)` through
  the degrees of the neighbours of `w` — the two-mark objects of the handoff.
- All results are for `s <= 3`; a theorem for all `s` needs a certificate that
  is polynomial in `s` (the binomial factor `(1+x)^{s+1}` makes the target a
  polynomial in `s`), which was not attempted.

## 4b. The degree relation and the first exact certificate at `r = 4`

Replay: `python3 scripts/certify_leaf_lemma_r4.py --r 4 --s 1 --d 2`
(report `reports/leaf_lemma_r4_certificates.json`, marker
`PASS_EXACT_LEAF_LEMMA_R4_CONFIGURATIONS`; needs `python-flint` for the exact
row reduction, about 10 minutes).

If `w` has `d` neighbours in `F'`, every independent `k`-set of `F' - w` that
meets `N(w)` contains one of them, and removing it leaves an independent
`(k-1)`-set of `F' - w`; hence the **degree relation**

```text
gamma_k - delta_k <= d · gamma_{k-1}          (k >= 1),
```

a family of linear generators with `d = deg_{F'}(w)` as a parameter (the
handoff's "marked occupation coordinates" in a different guise). Effects:

| configuration | without degree relation | with degree relation |
| --- | --- | --- |
| `r = 3`, `s = 0`, any `d ∈ {1,2,3,6}` | degree 4 | degree 3 |
| `r = 4`, `s = 0..2`, `d ∈ {1,2,3,6}` | infeasible (deg 3, 4) | infeasible at degree 3 |
| `r = 4`, `s = 1`, `d = 2` | — | **degree 4: exact certificate** (`1,821` monomials, `478` multipliers, `114,481` candidate products; support `52 + 1,124`) |
| `r = 4`, `s = 0`, `d = 2` | — | degree-4 LP hit the 15-minute limit |

The `r = 4` certificate was only accepted after a first attempt failed
exactly: the default-tolerance LP solution had a support whose unique exact
solution contained 24 negative coefficients; re-solving with
`primal/dual_feasibility_tolerance = 1e-10` produced a support with an exact
non-negative rational solution, verified coefficient-by-coefficient and at
random rational points. Floating feasibility alone proves nothing — the
handoff's rule 2, observed here in practice.

What this does and does not mean: `ISO_4` is **not** proved for all forests
(that needs every `(s, d)`, the no-parent case, and uniformity in `s` and `d`).
It does show that the inductive mechanism reaches `r = 4` once the
second-neighbourhood information enters through the degree relation, which is
precisely the direction the three independent obstruction analyses pointed
to. The cost is steep (degree 4, `10^5` candidate products, minutes of exact
linear algebra per configuration), so a proof for all `r` needs the
certificates to be *understood* and written uniformly, not enumerated.

## 4c. Uniformity in `s`, and the complete inductive proof for `r <= 3`

Replay: `python3 scripts/certify_leaf_lemma_r3_complete.py` (about one minute;
report `reports/leaf_lemma_r3_complete.json`, marker
`PASS_EXACT_LEAF_LEMMA_R3_ALL_CONFIGURATIONS`); the uniform certificates alone:
`scripts/certify_leaf_lemma_uniform_s.py`.

The residual `R_r` is a polynomial in `s` (through the binomial coefficients of
`(1+x)^s`). Writing `s = 1 + t` and allowing the certificate coefficients to be
polynomials in `t` with **nonnegative** coefficients gives one identity that is
valid for every `s >= 1` at once (`t >= 0`). Such identities exist and were
verified exactly:

| `r` | parent, `s >= 1` (uniform) | parent, `s = 0`, every `deg(w)` | no parent, `s >= 1` (uniform) | no parent, `s = 0` |
| --- | --- | --- | --- | --- |
| 1 | degree 3 | degree 3 | degree 3 | degree 3 |
| 2 | degree 3 (16 generators) | degree 3 | degree 3 | degree 3 |
| 3 | degree 3 (108 generators) | degree 4 (no degree relation, hence all `deg(w)`) | degree 3 | degree 3 |

Since a deepest leaf always falls into exactly one of these four
configurations, and the base case (edgeless forests, `(1+x)^n`, margin
`1 + r^2/(n-r+1) > 0`) is explicit, this is a **complete, exact, inductive
proof that `ISO_1`, `ISO_2`, `ISO_3` hold for every forest at every index**:
`Q_r(T) >= Q_r(T-l) + Q_{r-1}(T-l-v) >= 0`. It is a second proof of `ISO_3`
(the first, `docs/ISO3_FORESTS_THEOREM.md`, went through explicit coefficient
formulas) and the first that runs through the leaf induction itself.

At `r = 4` the same programme is incomplete: one configuration
(`s = 1, deg(w) = 2`) is certified (Section 4b); uniform-in-`s` and
uniform-in-`deg(w)` versions were not attempted at degree 4 (LP size), the
no-parent configurations are infeasible through degree 4, and the
`s = 0` degree-4 LP with the degree relation exceeded 15 minutes. Two negative
findings narrow the search: making the degree relation uniform in `d` fails at
degree 3 even at `r = 3` (polynomial-in-`d` coefficients up to degree 6, also
with a `d`-dependent multiplier), so `d`-uniformity needs a different
mechanism than nonnegative polynomial coefficients; and inducting on the
stronger FLC (`r! p_r` log-concave) instead of ISO does **not** make `r = 4`
easier — its residual `E_FLC = R - 2 a_{r-1} b_{r-2}` is infeasible through
degree 4 in every configuration tested.

## 5. A cautionary example that the method caught

A first version of this search used the recursion that deletes `v` instead of
the leaf, `I(T) = I(T - v) + x I(T - N[v])`. Its residual is **negative** on
stars (`-m^3/2 + 3m^2/2 + m` for `K_{1,m}`, `m >= 4`), so the "infeasible for
`s >= 2`" pattern it produced was the LP correctly refusing to prove a false
statement — and a generator (`p_2 >= C(p_1 - 1, 2)`) that fails for the empty
forest briefly produced a spurious feasible certificate at `r = 3, s = 0`.
Both were removed. The exact-replay discipline of the handoff is what makes
this kind of search safe.


---

<!-- FILE: docs/DISPERSION_LEAD.md -->

# A single-level sufficient condition: the dispersion inequality (lead, not a theorem)

Replay: `python3 scripts/probe_dispersion.py --trees-max 19 --forests-max 16`
(report `reports/dispersion_probe.json`).

## Setting

For a forest `F` on `n` vertices and `0 <= k < alpha`, let `U_k` be the uniform
distribution on the independent `k`-sets `T`, and

```text
e(T) = n - |N[T]|        (number of one-vertex extensions of T; N[T] = closed neighbourhood)
```

Everything below is exact and machine-checked in the script (the DP for the
joint distribution of `(|T|, |N[T]|)` is cross-checked against brute force).

## Four exact facts

**(i)** `E_k[e] = (k+1) p_{k+1} / p_k` (each independent `(k+1)`-set is an
extension of exactly `k+1` of its subsets).

**(ii)** For an independent `k`-set `S` and any `T = S - {v}`,
`e(S) = e(T) - |N[v] ∩ Free(T)| <= e(T) - 1`. Summing over the `k` subsets of
every `S` and over all `S`:

```text
k (k+1) p_{k+1}  <=  sum_{|T| = k-1} e(T)^2  -  k p_k .
```

**(iii)** Consequently, writing `mu = E_{k-1}[e] = k p_k / p_{k-1}`,

```text
Var_{U_{k-1}}(e) <= E_{U_{k-1}}(e)     ==>     k p_k^2 >= (k+1) p_{k-1} p_{k+1}     (FLC_k),
```

and `FLC_k` implies `ISO_k` with `Q_k = [k p_k^2 - (k+1) p_{k-1} p_{k+1}] + p_{k-1}^2 >= p_{k-1}^2`.
(`FLC` = "factorial log-concavity": the sequence `r! p_r` is log-concave;
equivalently the average number of extensions of a random independent set is
non-increasing in its size.)

**(iv)** `sum_{|T|=k} e(T)(e(T)-1) = (k+1)(k+2) p_{k+2} + 2 M_k`, where
`M_k = #{(T, uv in E) : u, v both free for T}`. Hence

```text
DISPERSION_k :  Var_k(e) <= E_k(e)   <=>   (k+1)^2 p_{k+1}^2 - (k+1)(k+2) p_k p_{k+2}  >=  2 M_k p_k ,
```

i.e. the dispersion inequality is exactly `FLC_{k+1}` strengthened by the
explicit non-negative term `2 M_k p_k`. In probabilistic language it says
`E_k[e(e-1)] <= (E_k e)^2`: the extension count is sub-Poissonian.

So the chain is

```text
DISPERSION_{r-1}  ==>  FLC_r  ==>  ISO_r  ==>  (with WR_r and the Levit–Mandrescu tail)  unimodality,
```

and the framework needs it only for `r <= L(alpha) - 1`, i.e. `DISPERSION_k`
for `k <= L(alpha) - 2`.

## Evidence

- All trees with `n <= 19` and all forests with `n <= 16`: `DISPERSION_k`
  holds at every prefix level. The maximal ratio `Var/E` is attained by the
  star `K_{1,m}` at level `k = 1`, where it equals `(m-1)/(m+1)` exactly
  (`-> 1`, never reaching it; at levels `k >= 2` the star has `e` constant,
  `Var = 0`).
- Structured families to order ~250 (paths, double brooms, `T_{3,m,n}`,
  `T*_{3,m,n}`, bushes, spiders, multi-arm stars): no failure; typical ratios
  `0.13–0.55`. In particular the published non-log-concave trees satisfy the
  dispersion inequality on the whole prefix with ratio `~0.13`.
- `FLC` itself holds at *every* index for all trees `n <= 20` and fails, in
  the non-log-concave families, exactly at the indices where log-concavity
  fails (all in the tail `r >= L`).

## What is proved about it

`DISPERSION_1` holds for every forest: with `M_1 = n e - 2e - 2S`
(`S = sum_v C(d_v,2)`), the inequality reads
`2 (C(n,2)-e)^2 - 3n C(n,3) + 2n(n-2) e - n S >= 0`; using `S <= C(e,2)` the
right side is concave in `e` for `n >= 5` with values `n^2(n-1)/2` at `e = 0`
and `(n-1)(n-2)` at `e = n-1`, and `n <= 4` is checked directly. (This is the
dispersion analogue of the `ISO_2` theorem; it is consistent with the star's
ratio `(m-1)/(m+1)`.)

## Why it is interesting, and what it is not

- It is a **single-level** statement about one uniform measure `U_k`, not a
  relation between three consecutive coefficients, so it is amenable to
  coupling / correlation arguments rather than only to algebraic "payment"
  inductions. In covariance form it says
  `sum_{v != w} Cov_k(F_v, F_w) <= sum_v P_k(F_v)^2` where `F_v` is the event
  "`v` is free"; pairs at distance `>= 3` tend to be negatively correlated
  (fixed size), pairs at distance `<= 2` positively.
- Negative association of `U_k` would make it easy, but `U_k` is **not**
  negatively associated even on paths (`P_4`, `k = 2`: the occupation events of
  the two vertices at distance 2 are positively correlated), so a proof must
  control the positive short-range covariances against `sum_v P(F_v)^2`.
- It is stronger than the framework needs, and it is **not proved** for
  `k >= 2`. It is recorded here because it is the cleanest candidate found in
  this project for a statement that could be proved by a genuinely different
  method than coefficient algebra, and because it has real slack on every
  family except stars (which are handled exactly).


---

<!-- FILE: docs/ISO4_TREES_PROBE.md -->

# `ISO_4` on trees — numeric feasibility probe for an `ISO_3`-style bound chain

Replay: `python3 scripts/probe_iso4_trees.py` (exact arithmetic throughout,
runs in ~25 s; prints `PROBE_ISO4_DONE`; report `reports/iso4_trees_probe.json`).
Status: **complete probe — no certificate attempted.** Bottom line: the `p_5`
formula is verified exactly; a universally *valid* degree-only bound chain
exists and is exact on stars, but its lower bound `G4` is **negative for
`n <= 40`** (scan) and on double brooms up to `n = 41`; it becomes positive
for all scanned `n >= 45` (`+0.66` normalised at `n = 200`). The blockers are
three `O(1/n)` leaks (`M2`, `N_chair`, `T3`) that are individually harmless for
large `n` but together exceed the true margin (`~1.0`) below `n ~ 45`.

Target: `Q_4 = 4 p_4^2 + p_3^2 - 5 p_3 p_5 >= 0` for every tree. Exhaustively
`Q_4/(p_3 p_4) >= 1.2229` for `n <= 16` (minimiser at `n = 16`: hubs of degree
8 and 7 joined through one middle vertex, i.e. the `k = 1` double broom).

## Notation

`e = n-1`, degrees `d_v`, `l` leaves, `Delta` max degree,
`S = sum C(d_v,2)`, `T3 = sum C(d_v,3)`, `T4 = sum C(d_v,4)`,
`P = sum_{uv in E}(d_u-1)(d_v-1)` (3-edge paths),
`M_c = sum_{b~c}(d_b-1)` (= number of vertices at distance exactly 2 from `c`),
`M2 = sum_c M_c^2`, `D2 = sum_{d_v>=2} d_v = 2n-2-l`.
Five-vertex sub-forests with 3 or 4 edges: `X` (2-edge path + disjoint edge),
`N_P5` (4-edge paths), `N_chair` (spider 2,1,1), `N_K14 = T4`.
"Double broom `DB(m,k)`": two hubs of degree `m` (`m-1` leaves each) joined by
a path with `k` internal vertices, `n = 2m+k`; the extremal family is `k = 1`
(hubs joined by a 3-vertex path `h1-x-h2`).

## Step 1 — exact formula for `p_5` (inclusion–exclusion) — VERIFIED

Summing `(-1)^{|F|} C(n-|V(F)|, 5-|V(F)|)` over edge subsets `F` (sub-forests
on at most 5 vertices):

```text
p_5 = C(n,5) - e C(n-2,3) + S C(n-3,2) + (C(e,2)-S)(n-4) - (P+T3)(n-4) - X
      + N_P5 + N_chair + T4
X       = S(n-3) - 3 T3 - 2 P
N_P5    = (1/2) sum_c [ M_c^2 - sum_{b~c}(d_b-1)^2 ] = M2/2 - 3 T3 - S
N_chair = sum_{uv in E} [ C(d_v-1,2)(d_u-1) + C(d_u-1,2)(d_v-1) ] = sum_v C(d_v-1,2) M_v
```

Derivation of `X`: `S(e-2)` (path, non-path edge) pairs minus those sharing a
vertex; for the path `u-v-w` these number `(d_v-2) + (d_u-1) + (d_w-1)` (no
edge meets two of `u,v,w`: no triangles). Summing over paths,
`sum (d_v-2) = sum_v C(d_v,2)(d_v-2) = 3 T3` and
`sum [(d_u-1)+(d_w-1)] = sum_{(u,v) ordered adjacent} (d_u-1)(d_v-1) = 2P`.
For `N_P5` use `sum_b d_b (d_b-1)^2 = 6 T3 + 2 S`. Compact form:

```text
p_5 = C(n,5) - e C(n-2,3) + C(e,2)(n-4) + S [C(n-3,2) - 2n + 6]
      - P (n-6) - T3 (n-4) + M2/2 + N_chair + T4
```

Verification: on all 987 trees with `n <= 12`, every count (`P`, `T3`, `X`,
`N_P5`, `N_chair`, `T4`) was enumerated directly from the edge list
(3- and 4-edge subsets classified by vertex count and degree pattern), the
closed forms for `X`, `N_P5`, `N_chair` (both the edge-sum and the identity
`sum_v C(d_v-1,2) M_v`) agree with the enumeration, and both displayed `p_5`
formulas equal the coefficient from `indpoly_parent_array`. The compact
formula is additionally asserted on all 32,494 trees with `7 <= n <= 16` and on
every family member used below (up to `n = 203`). **PASS.**

## Step 2 — candidate bound chain (degree-only relaxation)

Write `A = C(n,4) - e C(n-2,2) + S(n-4) + C(e,2)` (so `p_4 = A - P - T3`),
`B = C(n,5) - e C(n-2,3) + C(e,2)(n-4) + S[C(n-3,2)-2n+6]`, `p_3 = C(n,3) - e(n-2) + S`.
`Q_4 = 4(A-P-T3)^2 + p_3^2 - 5 p_3 p_5` needs an **upper** bound on `p_5`.

The single structural fact `M_v <= n-1-d_v` (all vertices at distance 2 lie
outside `N[v]`) gives, with `sum_v M_v = 2S` and `sum_v (d_v-1) M_v = 2P`:

```text
(i)   M2 = sum_v M_v^2 <= sum_v M_v (n-1-d_v) = 2S(n-2) - 2P
(ii)  N_chair = sum_v C(d_v-1,2) M_v <= sum_v C(d_v-1,2)(n-1-d_v) = (n-1)(S-n+2) - 3 T3
      [because d C(d-1,2) = 3 C(d,3) and sum_v C(d_v-1,2) = S-(n-2)]
(iii) 2P = sum_v (d_v-1) M_v <= sum_v (d_v-1)(n-1-d_v)  =>  P <= C(n-1,2) - S
(iv)  T4 = sum C(d_v,3)(d_v-3)/4 <= T3 (Delta-3)/4
(v)   T3 >= C(Delta,3) + max(0, (2S'^2/D2' - S')/3),  S' = S - C(Delta,2), D2' = D2 - Delta
      (Cauchy–Schwarz as in ISO_3 Step 3, applied after removing the max-degree vertex)
(vi)  T3 <= S (Delta-2)/3,   0 <= P <= min(C(n-1,2)-S, (n-2)^2/4, (Delta-1)r + r^3), r = n-1-Delta
```

(i)–(iii) are exact for trees of diameter `<= 3` (stars, double stars);
(iv) is exact whenever all vertices of degree `>= 4` have degree `Delta`
(stars and balanced double brooms); (v) is exact on stars and spiders with legs of length ≤ 2.
Hence

```text
p_5 <= B + S(n-2) + (n-1)(S-n+2) - P(n-5) - T3 (n-1) + T3 (Delta-3)/4
Q_4 >= f(P,T3) := 4(A-P-T3)^2 + 5 p_3 (n-5) P + 5 p_3 [(n-1) - (Delta-3)/4] T3
                  + p_3^2 - 5 p_3 [B + S(n-2) + (n-1)(S-n+2)]
```

and `G4(n,l,Delta,S) := min f(P,T3)` over the box `0 <= P <= Pmax`,
`T3lo <= T3 <= T3hi` (a convex quadratic; the minimum is computed exactly from
the clamped one-dimensional minimisers on the four box edges). The
feasible `(l, Delta, S)` region: `2 <= Delta <= l <= n-1`,
`Smin(l,Delta) <= S <= Smax(l,Delta)` (one vertex of degree `Delta`, the other
internal degrees balanced resp. greedily majorised with cap `Delta-1`).

Note that, unlike `ISO_3`, `Q_4` is *not* monotone in `P` or `T3` a priori
(`p_4` enters squared); the box minimisation handles this. In every scanned
row the minimiser sat at `P = 0`, `T3 = T3lo`.

## Step 3 — validity and tightness on all trees `n <= 16`

All 32,494 trees `7 <= n <= 16`: every inequality (i)–(vi), the `Smin/Smax`
constraints and `G4 <= Q_4` hold with **zero violations**
(`bound_violations_by_name = {}`); `(a)` the `N_chair` identity holds exactly.
But `G4 < 0` on almost every tree:

| n | trees | min `Q_4/(p_3 p_4)` | min `G4/(p_3 p_4)` | trees with `G4 < 0` |
|---|---|---|---|---|
| 7 | 11 | 2.3333 | -91.18 | 10 |
| 10 | 106 | 1.6667 | -8.48 | 105 |
| 12 | 551 | 1.4364 | -4.82 | 549 |
| 14 | 3159 | 1.3048 | -3.26 | 3156 |
| 16 | 19320 | 1.2229 (`8071/6600`) | -2.39 | 17226 |

The only trees with `G4 >= 0` are stars (exact) and a few near-stars.

## Step 4 — parameter scan up to `n = 200`

Grid: `l`, `Delta`, `S` on at most 40/40/48 points each (all integers for
`n <= 30`), exact `(P,T3)` box minimisation, normalised by `p_3 (A - T3lo)`.

| n | min `G4/(p_3 p_4)` | at (`l`, `Delta`, `S`) |
|---|---|---|
| 7 | -17.00 | path (2, 2, 5) |
| 16 | -2.25 | (12, 7, 44) |
| 24 | -0.896 | (20, 11, 112) |
| 30 | -0.464 | (26, 14, 184) |
| 35 | -0.242 | (30, 16, 243) |
| 40 | -0.078 | (36, 19, 344) |
| 45 | **+0.030** | (40, 21, 423) |
| 50 | +0.124 | (45, 24, 532) |
| 60 | +0.254 | (55, 29, 787) |
| 80 | +0.407 | (73, 38, 1374) |
| 100 | +0.497 | (92, 48, 2169) |
| 150 | +0.609 | (141, 73, 5050) |
| 200 | +0.664 | (189, 98, 9040) |

The minimiser is always a "two-hub-like" point: `Delta ~ n/2`, `l ~ 0.9 n`,
`S ~ 2 C(Delta,2)` — the double-broom region — with `P = 0`, `T3 = T3lo`.
Negative exactly for the scanned `n <= 40`, positive for every scanned
`n >= 45`; the normalised minimum grows like `~0.9 - c/n`.

(A first version of the chain with `N_chair <= (Delta-2) P` instead of (ii) and
`M2 <= 2S(n-2)` instead of (i) was negative for *all* scanned `n` up to 200:
coupling `N_chair` to `P` makes the bound decrease in `P` and lets the
minimiser push `P` to its cap. Bounding via `M_v <= n-1-d_v` fixed this.)

## Step 5 — stars and balanced double brooms (exact)

Stars `K_{1,m}`: every inequality (i)–(vi) is an equality, so
`G4 = Q_4 = C(m,3)^2 (m+1)/4` and `Q_4/(p_3 p_4) = (m+1)/(m-3)` exactly
(`m=5: 3`, `m=10: 11/7`, `m=20: 21/17`, `m=40: 41/37`, `m=100: 101/97`). All gaps are `0`.

`k = 1` double brooms `DB(m,1)` (`n = 2m+1`), exact values; "cost" = loss of
`Q_4/(p_3 p_4)` caused by each relaxation (`5·gap/p_4` for the `p_5`-side terms;
the residual is the `T3 -> T3lo`, `P -> 0` relaxation):

| m | n | `Q_4/(p_3 p_4)` | `G4/(p_3 p_4)` | cost M2 (gap) | cost N_chair (gap) | cost T4 | residual (T3 gap) |
|---|---|---|---|---|---|---|---|
| 5 | 11 | `1225/804` = 1.5236 | -5.075 | 3.134 (168) | 1.791 (48) | 0 | 1.673 (`15/7`) |
| 8 | 17 | `17296/14555` = 1.1883 | -1.922 | 1.390 (798) | 1.024 (294) | 0 | 0.696 (`48/5`) |
| 10 | 21 | `518225/467756` = 1.1079 | -1.187 | 1.013 (1638) | 0.801 (648) | 0 | 0.481 (`160/9`) |
| 12 | 25 | `151396/142785` = 1.0603 | -0.757 | 0.796 (2926) | 0.659 (1210) | 0 | 0.362 (`200/7`) |
| 15 | 31 | `487150/479089` = 1.0168 | -0.368 | 0.603 | 0.520 | 0 | 0.261 |
| 20 | 41 | `2160100/2211069` = 0.9769 | -0.014 | 0.430 | 0.386 | 0 | 0.175 |
| 23 | 47 | `56074/58275` = 0.9622 | **+0.116** | 0.367 | 0.334 | 0 | 0.145 |
| 30 | 61 | `17227225/18321954` = 0.9403 | +0.309 | 0.273 | 0.255 | 0 | 0.103 |
| 40 | 81 | 0.9230 | +0.460 | 0.200 | 0.190 | 0 | 0.073 |
| 60 | 121 | 0.9064 | +0.604 | 0.131 | 0.126 | 0 | 0.046 |
| 100 | 201 | `68129622500/76247102141` = 0.8935 | +0.715 | 0.077 | 0.075 | 0 | 0.026 |

Minimum true margin over the families: `0.8935` (`DB(100,1)`; tends to `7/8`);
minimum of the best bound: `-5.08` (`DB(5,1)`); `G4 < 0` exactly for
`m <= 20` (`n <= 41`). Path-length comparison (`m = 20`): `k = 1,2,3,4,5` give
true margins `0.977, 1.032, 1.070, 1.109, 1.149` — `k = 1` is the extremal
double broom (consistent with the exhaustive minimisers).

Tightness of the individual bounds on `DB(m,1)`: `T4` bound (iv) exact;
`P <= C(n-1,2)-S` loose (`P = 2(m-1)` vs cap `~m^2`, irrelevant since `P`
is dropped); `M2` gap `2S(n-2) - 2P - M2 ~ 2m^3` (true `M2 ~ 2m^3`, i.e. a
factor 2); `N_chair` gap `~m^3` (true `N_chair = 2C(m-1,2) ~ m^2`); `T3` gap
`~m^2/2` (from the `k` path vertices in the Cauchy–Schwarz denominator). Each
of the three costs is `~ 5·gap/p_4 = Theta(1/m)` with constants `7.5`, `7.5`,
`~2.5` (in units of `1/m`), total `~17/m`, against a margin `~0.9 + 2/m`:
break-even near `m ~ 21`, exactly as observed.

## Verdict

- `p_5` formula: **verified exactly** (brute-force sub-forest counts, `n <= 12`;
  compact form on all trees `n <= 16` and all family members).
- A universally valid bound chain with all relaxations degree-only
  (parameters `n, l, Delta, S`; `P`, `T3` eliminated by exact box minimisation)
  **exists and is exact on stars**, but its minimum normalised value is
  **negative for `n <= 40`** (`-17` at `n = 7`, `-0.90` at `n = 24`, `-0.08` at
  `n = 40`) and positive for all scanned `n >= 45` (`+0.03` at `45`,
  `+0.66` at `200`). So an `ISO_3`-style proof for `n >= 45` looks attainable
  in principle (the region is 3-parametric rather than 1-parametric, so the
  certificate would be harder than `ISO_3`'s Step 6), while `n <= 44` cannot be
  covered by this chain and is out of reach of exhaustive enumeration
  (trees on 44 vertices: ~10^16). **Not attainable as is.**
- What blocks it: on the extremal double brooms the chain leaks `~7.5/m` from
  `M2 <= 2S(n-2) - 2P` (needs `M_c <= n-1-d_c` replaced by the true distance-2
  counts: for `DB` the leaves of one hub have `M = m-1 ~ n/2`, not `n-2`),
  `~7.5/m` from `N_chair <= (n-1)(S-n+2) - 3T3` (same cause, at the hubs), and
  `~2.5/m` from Cauchy–Schwarz on `T3`. The quantity that must be kept exactly
  (or bounded with the *right* constant) is the degree–distance correlation
  `sum_v M_v^2` together with `sum_v C(d_v-1,2) M_v`, i.e. the second moment of
  the distance-2 counts — equivalently `N_P5 + N_chair` (the number of 4-edge
  sub-trees that are not `K_{1,4}`). A bound of the form
  `M2 <= 2S·(Delta-1) + (lower order)` (which is what actually holds on
  double brooms, where `M_leaf = d_hub - 1`) would remove the factor-2 leak,
  but it is false for spiders (`M_leaf` of a long leg is small while the
  degree-2 vertices have `M ~ Delta`); a valid version needs the number of
  vertices adjacent to a `Delta`-vertex as an extra parameter. Without such a
  refinement the `n <= 44` gap remains.


---

<!-- FILE: docs/LITERATURE_STATUS_2026-09-02.md -->

# Erdős Problem #993 — Literature Status (primary-source audit)

**Date of audit:** 2026-09-02 (all URLs accessed on this date unless stated otherwise).

**Scope.** Erdős Problem #993 (erdosproblems.com/993): the 1987 question/conjecture of Alavi, Malde, Schwenk and Erdős that the independent-set sequence \(i_0(T), i_1(T), \dots, i_{\alpha}(T)\) (coefficients of the independence polynomial) of every tree, and of every forest, is unimodal. This document records, source by source, exactly what each primary source claims, with its publication type, and then extracts the facts that bear on the WR + ISO + TAIL proof framework audited in this repository (`erdos993lib/checks.py`). Every factual statement below was checked against a fetched copy of the source; where a fetch failed, this is stated and the claim is marked **unverified**. Nothing is stated from memory alone.

**Verification legend.** `[fetched]` = the primary document itself was retrieved and read; `[fetched-archive]` = retrieved from a Wayback Machine capture; `[cited-only]` = the statement is known only through another fetched source that cites it; `[computed]` = re-derived here by exact integer arithmetic in a throw-away script (`/tmp`, not part of the repository); `[unverified]` = could not be fetched.

---

## 0. Verdict

As of 2026-09-02 the conjecture remains open: no proof and no counterexample is known, for trees or for forests. The problem page at erdosproblems.com lists the status as open with zero proof claims and zero proof expositions, and every 2025–2026 preprint located in an arXiv sweep (Galvin; Ramos–Sun; Bautista-Ramos; Bautista-Ramos–Guillén-Galván–Gómez-Salgado; Li; Li–Li–Yang–Zhang; Levit–Kadrawi; Hibi–Kara–Vien; Bendjeddou–Hardiman) is either a partial positive result for a restricted family, a construction of trees that are unimodal but not log-concave, or a computational report; none claims a proof or a counterexample. The strongest general theorem is still the Levit–Mandrescu tail theorem (for bipartite / König–Egerváry graphs, hence trees and forests): \(s_{\lceil(2\alpha-1)/3\rceil}\ge\cdots\ge s_{\alpha-1}\ge s_{\alpha}\). Exhaustive computation has confirmed unimodality for every tree on \(n\le 29\) vertices in a Zenodo preprint with public artifacts (8,691,747,673 trees, a figure that matches OEIS A000055 exactly), and a repository-only report from August 2026 claims an independent extension to \(n\le 32\); the log-concavity strengthening is false, failing first at \(n=26\) (exactly two trees, break at index \(\alpha-1=13\)). The forest half does not reduce to the tree half: by Hoggar's product theorem a non-unimodal forest must contain a non-log-concave tree component, and a structured search over 253,695 such products found no non-unimodal forest, but no proof for forests exists either.

---

## 1. Sources

### 1.1 erdosproblems.com/993 — problem page

- URL: https://www.erdosproblems.com/993 — `[fetched]` (live page, 2026-09-02). Type: curated problem database (T. F. Bloom), not peer-reviewed.
- Problem statement as displayed: "The independent set sequence of any tree or forest is unimodal. In other words, if \(i_k(G)\) counts the number of independent sets of vertices of size \(k\) in a graph \(G\), and \(T\) is any tree or forest, then for some \(m\ge 0\): \(i_0(T)\le i_1(T)\le\cdots\le i_m(T)\ge i_{m+1}(T)\ge i_{m+2}(T)\ge\cdots\)."
- Remarks on the page: "A question of Alavi, Malde, Schwenk, and Erdős [AMSE87], who showed that this is false for general graphs \(G\) (in fact every possible pattern of inequalities is achieved by some graph). The sequence which counts the number of independent sets of edges of a given size was proved to be unimodal (for any graph) by Schwenk [Sc81]. In [AMSE87] they also ask whether every possible unimodal pattern of inequalities is achieved by some graph."
- Status fields on the live page: "Proof expositions (0)", "Proof claims (0)", "Comments (7)", "Formalised statement? No", "OEIS A000055, possible", "This page was last edited 01 February 2026", reactions: "Currently working on will0708". The Wayback capture of 2026-07-09 additionally shows the label "FALSIFIABLE — Open, but could be disproved with a finite counterexample" and "There are no solutions, partial or complete, claimed in the comments." `[fetched-archive]` https://web.archive.org/web/20260709212408id_/https://www.erdosproblems.com/993
- [AMSE87] = Y. Alavi, P. J. Malde, A. J. Schwenk, P. Erdős, "The vertex independence sequence of a graph is not constrained", Congressus Numerantium 58 (1987) 15–23 `[cited-only]` (bibliographic data taken from the reference lists of Levit–Mandrescu arXiv:math/0406623 and Kadrawi–Levit arXiv:2305.01784, both fetched; the 1987 paper itself was not fetched).

### 1.2 Forum thread erdosproblems.com/forum/thread/993

- URL: https://www.erdosproblems.com/forum/thread/993. The live thread could **not** be fetched on 2026-09-02: every attempt (direct fetch, `curl`, `?order=newest`, `?order=oldest`, `/forum/discuss/993`, a proxy) returned a Cloudflare JavaScript challenge or timed out. The thread was read from the Wayback Machine capture of 2026-07-09 21:46 UTC `[fetched-archive]` https://web.archive.org/web/20260709214610id_/https://www.erdosproblems.com/forum/thread/993, which contains **4 comments**. The live problem page reports **7 comments**, so up to three comments posted after 2026-07-09 could not be read directly; one of them is partially visible in a search-engine snippet (see 1.12.1). Type: user forum; the site states "Comments appearing on this page are not verified for correctness."
- The four archived comments, verbatim in substance (author, timestamp as displayed):
  1. **JakeMallen — 18:13 on 07 Jan 2026.** "I verified computationally that the independent set sequence is unimodal for every tree with \(n\le 29\) vertices, extending Radcliffe's \(n\le 25\) verification cited in Basit and Galvin [arXiv:2006.12562]. Basit and Galvin also show that asymptotically almost surely ~49.5% of the sequence is increasing and ~38.8% of the sequence is decreasing."
  2. **BrettRey — 14:42 on 12 Mar 2026.** "A follow-up to the Jan. 7, 2026 comment: I have public code/result artifacts for the n <= 29 verification here: https://github.com/BrettRey/erdos-problem-993. In particular, the completed exhaustive runs record: n = 28: 2,023,443,032 trees, 0 unimodality failures; n = 29: 5,469,566,585 trees, 0 unimodality failures. I also completed a log-concavity / near-miss audit at n = 28: 19 log-concavity failures, all at k = 14; 0 non-unimodal trees; top near-miss ratio 0.8565665724120973 at k = 13. I have not yet completed the analogous LC / near-miss audit at n = 29. On the structural side, I also have a manuscript in preparation developing a subdivision-contraction identity \(I(T_e;x)=I(T;x)+xI(T/e;x)\), together with a reduction via Hub Exclusion + Transfer to the d_leaf <= 1 regime and a mean bound mu(T) < n/3 in that regime. I am not claiming a full solution at this stage; one closure route remains conditional on a separate mode-mean inequality, which I have verified computationally through n <= 23. Disclosure: AI assistance was used for computational exploration, code development, and proof-strategy exploration, but the numerical claims above come from executed computations recorded in the linked repository."
  3. **mysticflounder — 20:20 on 18 Apr 2026.** Two references: "Kadrawi and Levit (2023, arXiv:2305.01784, 'The independence polynomial of trees is not always log-concave starting from order 26') is the original source for the log-concavity failures Brett's n=28 audit extends: they found exactly two trees on 26 vertices that are unimodal but not log-concave, plus infinite families of larger trees by standard graph operations. Ramos and Sun (Oct 2025, arXiv:2510.18826, 'An AI enhanced approach to the tree unimodality conjecture') used the PatternBoost ML architecture to sample tens of thousands of additional LC counterexamples on trees in the 27 to 101 vertex range. every one of them is still unimodal." (Nuance, see 1.5: the two order-26 trees were first reported in the four-author IntechOpen chapter; arXiv:2305.01784 has two authors and extends it. The Ramos–Sun paper itself does not contain an explicit sentence asserting unimodality of every found tree; see 1.9.2.)
  4. **Will Blair — 18:07 on 05 Jun 2026.** "It seems there's been good progress on checking single trees (BrettRey and JakeMallen to \(n=29\), PatternBoost up to 101). The 'or forest' half is worth a look too, and it's easier to pin down. A forest's independence polynomial is the product of its components'. By Hoggar's theorem (Hoggar 1974) a product of log-concave sequences stays log-concave, so a forest can only be non-unimodal if one of its tree components is already non-log-concave. The smallest of those has 26 vertices (Kadrawi–Levit), so the non-log-concave trees are the only place a forest counterexample can hide. I generalized the Kadrawi–Levit families \(T_{3,m,n}\), \(T^*_{3,m,n}\) to a class of rooted 'bush' trees and pulled out 4,445 non-log-concave ones (up to 60 vertices, log-concavity defects down to ~\(-12\)). Forests built from the 80 most extreme (all pairs and triples, powers to the 20th, products with paths \(P_1\) through \(P_{16}\), 253,695 in total) are all unimodal. Code and witnesses: [link]. Polynomials computed exactly with the integer in/out DP, checked against brute force on trees up to 11 vertices. Used GPT 5.5 Pro and Claude for the code and search; the numbers come from the runs." The "here" link in the archived HTML is https://github.com/willblair0708/verified-combinatorics/tree/main/erdos-993 and the Hoggar link is https://doi.org/10.1016/0095-8956(74)90071-9 (see 1.12.2, 1.12.3).
- Logical content of the Hoggar argument (checked): Hoggar's theorem says the convolution of two finite positive log-concave sequences is log-concave (statement verified through two fetched secondary sources, see 1.12.3). Independence polynomials have positive coefficients, so a forest all of whose components have log-concave polynomials is log-concave, hence unimodal. Contrapositive: a non-unimodal forest has a component that is not log-concave. The argument does **not** show that unimodality of all trees implies unimodality of all forests (a product of two unimodal, non-log-concave sequences can be non-unimodal in general), so the forest half is genuinely separate; Blair's search is evidence, not proof.

### 1.3 BrettRey/erdos-problem-993 (GitHub) and Zenodo record 19100781

- GitHub: https://github.com/BrettRey/erdos-problem-993 — README `[fetched]` via the GitHub API (default branch `master`; repository description "Computational search for a counterexample to Erdős Problem #993: is the independent set sequence of every tree unimodal?"; last push 2026-08-28T16:31:24Z; 0 stars). Type: repository (not peer-reviewed).
- Zenodo: https://zenodo.org/records/19100781 — page and JSON API `[fetched]`. Title: "Mean bounds, structural reductions, and exhaustive verification for tree independence polynomial unimodality"; creator: Reynolds, Brett; resource type: **Preprint**; DOI 10.5281/zenodo.19100781 (concept DOI 10.5281/zenodo.18745546); created 2026-03-18; single file `main_v2.pdf` (452.7 kB, md5 02c1f75ad906edef02ef10d907a731ef); labelled "Version v3" (earlier versions: 10.5281/zenodo.18745547, 2026-02-23; 10.5281/zenodo.18866031, 2026-03-04). Related identifier: "Is supplement to Software: https://github.com/BrettRey/erdos-problem-993/releases/tag/paper-v2-2026-03-04-doi5". Zenodo description (quoted): "The paper proves that the mean independent-set size satisfies mu(T) < n/3 for every tree with d_leaf <= 1, develops structural reductions that constrain any counterexample, and reports exhaustive verification of unimodality for all 8,691,747,673 trees on n <= 29 vertices. It also includes asymptotic results for leaf attachment and a computer-assisted extremal analysis for spider families. This version is the minor-revision polish snapshot dated 2026-03-18. … The conjecture that every tree independence polynomial is unimodal remains open." The PDF itself was not opened; claims below are from the README and the Zenodo metadata.
- README claims (quoted or closely paraphrased; README section "Current public targets, August 2026" opens with "This repository does not contain a proof of Erdos Problem #993."):
  - Manuscript (`paper/main_v2.tex`) "Proved theorems": subdivision-contraction identity \(I(T_e)=I(T)+xI(T/e)\) for any tree edge \(e\); conditional subdivision lemma ("If edge contraction shifts the mode by at most 1 (ECMS), then subdivision preserves unimodality, making any minimal counterexample homeomorphically irreducible"); mean bound "mu(T) < n/3 for every d_leaf <= 1 tree on n >= 3 vertices"; a conditional "PNP framework" ("PNP itself does not prove unimodality"); edge bound "P(u) + P(v) < 2/3 for every tree edge (hard-core model)"; leaf-attachment asymptotics "nm(s) = 1 − C/s + O(1/s²) with C in [4, 8)".
  - "Computational verification": "Exhaustive: all 8,691,747,673 trees on n <= 29 are unimodal (0 violations)"; "n = 29: 5,469,566,585 trees, 0 unimodality failures"; "n = 28: 2,023,443,032 trees, 0 unimodality failures, 19 log-concavity failures (all at k = 14), best near-miss ratio 0.8565666"; "n = 27: 751,065,460 trees, 0 unimodality failures, 0 log-concavity failures, best near-miss ratio 0.8571425"; "ECMS verified for 24.7M edges (n <= 20), 0 violations"; "Conjecture A verified for 931,596 trees (n <= 23), 0 violations"; "Multi-arm stars identified as the extremal family (surpassing brooms)". Target 6: "Exhaustive tree unimodality is verified through n <= 29; the analogous n = 29 log-concavity / near-miss audit has not been completed."
  - Cross-check `[computed]`: OEIS A000055 (b-file fetched from https://oeis.org/A000055/b000055.txt) gives a(27)=751,065,460, a(28)=2,023,443,032, a(29)=5,469,566,585 and \(\sum_{n=1}^{29}a(n)=8{,}691{,}747{,}673\), all matching the README figures exactly.
  - "Additional repository result" (Lean): "Every finite tree with at most two vertices of degree at least three has a log-concave—and therefore unimodal—independence polynomial. The complete Lean 4 development is in `formalization/clan_normalization_aristotle/`: its 8,078-job build replays locally, contains no proof escape hatches, and the principal theorem depends only on Lean's standard `propext`, `Classical.choice`, and `Quot.sound` axioms. This result has not been peer reviewed and is not yet part of the submitted manuscript." The directory exists `[fetched]`; its README states the project "was edited by Aristotle (aristotle.harmonic.fun)", uses Lean 4.28.0 / Mathlib v4.28.0, "contains no `sorry`, `admit`, `axiom`, or `implemented_by`", and names the theorem `ClanAudit.indepPoly_logConcave_of_isTree_of_branchVerts_card_le_two`; `RESULT.md` grades the result `C2_COMPLETE`. The Lean project was **not** built or checked here; only its READMEs were read.
  - Double brooms: "Every double broom—a path with any number of leaves attached at either endpoint—has a log-concave independence polynomial. The proof covers all numbers of leaves and every connector length; see `notes/double_broom_log_concavity.md`. An exact replay audits the formulas and coefficient identities but is not the proof of the all-parameter theorem." Also: "a computer-assisted extension to every two-hub tree with at most 24 vertices on its pendant arms and an arbitrarily long connector. The exact certificate covers 163,523 unordered pendant-core pairs." The README adds: "These repository results arose through substantive generative-AI assistance and have not been peer reviewed."
- **Peer-review status.** Zenodo record = preprint (self-archived). README refers to "the submitted manuscript", i.e. submitted but no journal publication was found. The Lean result and the double-broom note are repository-only and, by the author's own statement, not peer reviewed. A second, independent implementation (Orden, repository-only, see 1.12.1) reports reproducing the \(n=28\) and \(n=29\) counts and zero failures; this is the only external corroboration found, and it is itself not peer reviewed.

### 1.4 arXiv:2603.03025 — G. M. X. Li, "Unimodality of independence polynomials of two family of trees" (2026)

- URL: https://arxiv.org/abs/2603.03025 — full text `[fetched]`. v1 submitted 2026-03-03; no journal reference on arXiv. Type: **preprint**. Single author: Grace M. X. Li, School of Mathematics and Data Science, Shaanxi University of Science and Technology, Xi'an.
- Definitions (quoted): "Both \(T_{3,m,n}\) and \(T^*_{3,m,n}\) have a root vertex \(v_0\) with three children \(v_1,v_2,v_3\). In \(T_{3,m,n}\), \(v_1\) has three children \(v_{11},v_{12},v_{13}\), \(v_2\) has \(m\) children \(v_{21},\dots,v_{2m}\), and \(v_3\) has \(n\) children \(v_{31},\dots,v_{3n}\), and then each \(v_{ij}\) has a child \(v'_{ij}\)." "If we replace the edge \(v_{13}v'_{13}\) with a path \(P_4\), which we label as \(v_{13},v'_{13},x,y\), then we get the tree \(T^*_{3,m,n}\)." Thus \(|T_{3,m,n}|=10+2m+2n\), \(|T^*_{3,m,n}|=12+2m+2n\), \(\alpha(T_{3,m,n})=m+n+6\) (stated in the paper). The two order-26 trees are \(T_{3,4,4}\) and \(T^*_{3,3,4}\).
- Theorem 1.2 (attributed to Kadrawi–Levit–Yosef–Mizrachi [13]): "For any \(k\ge 3\), both \(T_{3,k+1,k+1}\) and \(T^*_{3,k,k+1}\) have non-log-concave independence polynomials."
- Theorem 1.3 (attributed to Kadrawi–Levit [12]): "For any \(k\ge 4\), \(T_{3,k,k+1}\), \(T_{3,k,k+2}\), \(T^*_{3,k-1,k+1}\), \(T^*_{3,k,k+3}\) and \(T^*_{3,k,k}\) all have non-log-concave independence polynomials."
- Main results: Theorem 1.4 "For any \(m,n\ge 1\), the independence polynomial of \(T_{3,m,n}\) is unimodal." Theorem 1.5 "For any \(m,n\ge 1\), the independence polynomial of \(T^*_{3,m,n}\) is unimodal."
- Method (quoted from Section 4): via chromatic symmetric functions, \(Y_G=\sum_\alpha X_G^\alpha\), and Corollary 2.5 (\([s_{(k,k)}]Y_G\ge 0 \iff i_k^2\ge i_{k-1}i_{k+1}\)): "Consequently \(Y_{T_{3,m,n}}\) is 2-\(s\)-positive except for the term \(s_{(m+n+5,m+n+5)}\). … by Corollary 2.5 we see that the sequence \(\{i_k\}_{k=0}^{m+n+5}\) is log-concave. Together with Theorem 2.10, this implies that \(I_{T_{3,m,n}}(t)\) is unimodal." I.e. all log-concavity inequalities except the last one (\(k=\alpha-1\)) are proved, and the last descent \(i_{\alpha-1}\ge i_\alpha\) is supplied by the Levit–Mandrescu tail theorem, quoted there as Theorem 2.10 ([15, Corollary 3.3]): "For a fixed tree \(T\), let \(t\) denote the size of a maximum stable set in \(T\), and let \(c_k\) denote the coefficient of \(x^k\) in the independence polynomial of \(T\). Then \(c_{\lceil(2t-1)/3\rceil}\ge\cdots\ge c_{t-1}\ge c_t\)."
- Other statements in the introduction: Levit–Mandrescu [14] (Carpathian J. Math. 20 (2004) 73–80) "conjectured that every forest has a log-concave independence polynomial"; verified up to 20 vertices by Yosef–Mizrachi–Kadrawi and up to 25 by Radcliffe; refuted at 26 by [13]. Also cites Ramos–Sun [19], Galvin [9] and Bautista-Ramos [5] for "breaks".

### 1.5 Kadrawi, Levit, Yosef, Mizrachi (2023) and Kadrawi, Levit (arXiv:2305.01784; Ars Math. Contemp. 2025)

Two distinct works, often conflated:

- **(a) Four-author chapter.** O. Kadrawi, V. E. Levit, R. Yosef, M. Mizrachi, "On Computing of Independence Polynomials of Trees", in *Recent Research in Polynomials* (ed. F. Özger), IntechOpen, 2023, Chap. 7, https://www.intechopen.com/chapters/1130709 — `[fetched]` (DOI 10.5772/intechopen.1001130 as given in the Graphs & Combinatorics 2026 reference list, `[cited-only]`). Type: peer-status of IntechOpen chapters is editorial; treat as **book chapter**. Claims: a linear dynamic-programming algorithm; "it was verified that for all trees up to 25 vertices, their independence polynomials are log-concave (and, consequently, unimodal)"; "when the number of vertices of a tree reached 26, there were found two trees having their independence polynomials unimodal but not log-concave"; Lemma 6.1 "All trees of the 3,k,k structure, where \(k\ge 4\), have non-log-concave independence polynomials"; Lemma 7.1 "All trees of the 3*,k,k+1 structure, where \(k\ge 3\), have non-log-concave independence polynomials." (In Li's notation: \(T_{3,k,k}\), \(k\ge4\), and \(T^*_{3,k,k+1}\), \(k\ge3\).)
- **(b) Two-author paper.** O. Kadrawi, V. E. Levit, "The independence polynomial of trees is not always log-concave starting from order 26", arXiv:2305.01784 (submitted 2023-05-02) `[fetched]`; journal version: *Ars Mathematica Contemporanea* 25 (2025) #P4.03, DOI 10.26493/1855-3974.3207.2ad — the DOI resolver timed out, but the journal's article page https://amc-journal.eu/index.php/amc/article/view/3207 was `[fetched]` (authors Kadrawi, Levit; dated 2025-07-30; abstract: "in 2023, this conjecture was shown to be false by Kadrawi, Levit, Yosef, and Mizrachi. In this paper, we provide further evidence against this conjecture by presenting infinite families of trees with independence polynomials that are not log-concave"). Type: **peer-reviewed journal article** (AMC) with arXiv preprint.
  - The two order-26 polynomials (quoted; re-derived exactly here `[computed]`, both match):
    \(I(T_1;x)=x^{14}+51x^{13}+2979x^{12}+18683x^{11}+55499x^{10}+100144x^9+121376x^8+103736x^7+63933x^6+28551x^5+9142x^4+2040x^3+300x^2+26x+1\), "non-log-concavity is demonstrated by the coefficient of \(x^{13}\): \(51^2=2601<2979\)";
    \(I(T_2;x)=x^{14}+48x^{13}+2372x^{12}+15498x^{11}+48086x^{10}+90178x^9+112870x^8+98968x^7+62183x^6+28147x^5+9089x^4+2037x^3+300x^2+26x+1\), "\(48^2=2304<2372\)". Here \(T_1=T_{3,4,4}\), \(T_2=T^*_{3,3,4}\); \(\alpha=14\); the unique break is at \(k=13=\alpha-1\); both sequences are unimodal (mode at \(k=8\)).
  - Families proved non-log-concave (theorem statements as in the arXiv text): 3,k,k (\(k\ge4\)); 3,k,k+1 (\(k\ge4\)); 3,k,k+2 (\(k\ge4\)); 3*,k,k+1 (\(k\ge3\)); 3*,k,k+2 (\(k\ge3\)); 3*,k,k+3 (\(k\ge4\)); 3*,k,k (\(k\ge4\)). All breaks in these families are at \(\alpha-1\). Also exhibited: "an exceptional tree of order 28" not in the families (\(\alpha=15\), break at \(k=14\): \(55^2=3025<3139\)), and a tree with a break at \(\alpha-2\) (\(\alpha=19\); \(1989^2=3956121<4314883=71\cdot60773\) at \(k=17\)). Conjecture 5.1: "The log-concavity may be broken at the \(\alpha(G)-k\) coefficient for arbitrary \(k\in\{1,2,\dots,\alpha(G)-1\}\)."
  - Historical statements in the paper: Levit–Mandrescu (2004) conjectured log-concavity for every forest; Galvin (2011) suggested the log-concavity strengthening for trees, forests and bipartite graphs; Bhattacharya–Kahn (2013) constructed a bipartite graph with non-unimodal independence polynomial and Schwenk later found smaller ones (so the unimodality conjecture is **false for bipartite graphs in general**; cf. arXiv:1301.1752, abstract fetched via search: "There are bipartite graphs \(G\) for which \(i(G)\) is not unimodal").

### 1.6 Basit and Galvin, "On the independent set sequence of a tree" (arXiv:2006.12562; Electron. J. Combin. 2021)

- URL: https://arxiv.org/abs/2006.12562 — full text `[fetched]` (v2, 2021-07-03, "To appear in Electron. J. Combin."). Journal: Electronic Journal of Combinatorics 28(3) (2021) P3.23, DOI 10.37236/9896 `[cited-only]` (from the Kadrawi–Levit reference list). Type: **peer-reviewed**.
- Abstract (quoted): "We show that for the uniformly random (labelled) tree, asymptotically almost surely (a.a.s.) the initial approximately 49.5% of the sequence is increasing while the terminal approximately 38.8% is decreasing. Our approach uses the Matrix Tree Theorem, combined with computation. We also present a generalization of a result of Levit and Mandrescu, concerning the final one-third of the independent set sequence of a König-Egerváry graph."
- Precise statements: Theorem 1.4: for the uniform random labelled tree on \(n\) vertices, a.a.s. \((X_\ell,\dots,X_n)\) is weakly decreasing with \(\ell=0.347n\). Theorem 1.7: a.a.s. \((X_0,\dots,X_\ell)\) is weakly increasing with \(\ell=0.280n\). (Percentages are relative to \(\alpha(\mathbf T)\approx\rho n\), \(\rho\approx0.5671\).) They note Heilman (arXiv:2006.04756) proved a.a.s. increase up to \(0.265n\).
- Theorem 1.2 (attributed to Levit–Mandrescu [20] = Congr. Numer. 179 (2006) 109–119): "For a König-Egerváry graph \(G\), \(i_{\lceil(2\alpha-1)/3\rceil}\ge i_{\lceil(2\alpha-1)/3+1\rceil}\ge\cdots\ge i_{\alpha-1}\ge i_\alpha\)." They add: "Theorem 1.2 is easily seen to be tight: the graph consisting of \(\alpha\) vertex disjoint edges … has independent set sequence which is weakly decreasing from exactly \(i_{\lceil(2\alpha-1)/3\rceil}\) on."
- Theorem 1.3 (their generalization to **all** graphs): "Let \(G\) be a graph (not necessarily a tree or a König-Egerváry graph) with \(n\) vertices and maximum independent set size \(\alpha\). The sequence \((i_k)_{k=\ell}^{\alpha}\) is weakly decreasing, where \(\ell=\lceil \alpha(n-1)/(\alpha+n)\rceil\). If \(\kappa\) satisfies \(\alpha\ge\kappa n\) then \(\ell\le\lceil \alpha/(1+\kappa)-\kappa/(1+\kappa)\rceil\)." With \(\kappa=1/2\) (every KE graph has \(\alpha\ge n/2\)) this recovers Theorem 1.2. Proof: Fisher–Ryan (\((i_k/\binom{\alpha}{k})^{1/k}\) non-increasing) plus Zykov (\(i_k\le\binom{\alpha}{k}(n/\alpha)^k\)); "\(i_{k+1}>i_k\) forces \(k<(\alpha n-\alpha)/(\alpha+n)\)."
- Theorem 1.5: "Let \(G\) be a graph in which every maximal (by inclusion) independent set has size at least \(\lambda\). Then the initial portion \((i_0,\dots,i_{\lceil\lambda/2\rceil})\) is weakly increasing." Theorem 1.6: for a tree, every maximal independent set has size \(\ge\lceil(n-\alpha+1)/2\rceil\), so the sequence is weakly increasing up to \(\ell=\lceil(n-\alpha+1)/4\rceil\). Both rest on the double-counting identity (4): \(\sum_{I\in\mathcal I_j}e(I)=(j+1)\,i_{j+1}\), where \(e(I)\) is the number of one-vertex extensions of \(I\).
- Computational history as stated: "The unimodality of the independent set sequence of all forests on at most 25 vertices has been verified computationally [27, 31]" ([27] = A. J. Radcliffe, personal communication; [31] = Yosef–Mizrachi–Kadrawi arXiv:2101.06744, trees to 20 vertices); Section 2: "Radcliffe [27] has verified that every tree on up to 25 vertices has ordered log-concave independent set sequence."

### 1.7 Levit and Mandrescu — the tail theorem (exact source)

- **Primary source fetched:** V. E. Levit, E. Mandrescu, "Very well-covered graphs and the unimodality conjecture", arXiv:math/0406623 (submitted 2004-06-30), https://arxiv.org/abs/math/0406623 — full text `[fetched]`. Published (with a changed title) as "Independence Polynomials and the Unimodality Conjecture for Very Well-covered, Quasi-regularizable, and Perfect Graphs", in *Graph Theory in Paris* (Proceedings of a Conference in Memory of Claude Berge), Trends in Mathematics, Birkhäuser, Basel, 2007, pp. 243–254, DOI 10.1007/978-3-7643-7400-6_19 — publisher abstract `[fetched]` via search ("In this paper we prove that \(s_{\lceil(2\alpha-1)/3\rceil}\ge\dots\ge s_{\alpha-1}\ge s_\alpha\) are valid for (a) bipartite graphs; (b) quasi-regularizable graphs on \(2\alpha\) vertices. In particular, we infer that these inequalities are true for (a) trees …"). Type: **peer-reviewed conference proceedings** (Birkhäuser) with arXiv preprint. arXiv:2603.03025 cites the published version as "[15, Corollary 3.3]"; in the arXiv version the same statements are Corollary 2.7 (bipartite) and Corollary 2.8 (trees). The Birkhäuser full text was not accessible, so the "3.3" numbering is `[cited-only]`.
- **Exact statements (arXiv version, quoted):**
  - Notation: for a graph \(G\) of order \(n\) with \(\alpha(G)=\alpha\), "\(\omega_{\alpha-k}=\max\{n-|N[S]| : S \text{ is a stable set with } |S|=k\}\), \(0\le k\le\alpha\)."
  - **Lemma 2.3.** "If \(G\) is a graph of order \(n\ge1\) with \(\alpha(G)=\alpha\), then \((k+1)\cdot s_{k+1}\le\omega_{\alpha-k}\cdot s_k\), \(0\le k<\alpha\), in particular, \(\alpha\cdot s_\alpha\le\omega_1\cdot s_{\alpha-1}\le\omega(G)\cdot s_{\alpha-1}\)."
  - **Proposition 2.4.** If \(G\) is quasi-regularizable on \(n=2\alpha(G)\) vertices, then (i) \(\omega_{\alpha-k}\le2(\alpha-k)\); (ii) \((k+1)s_{k+1}\le2(\alpha-k)s_k\), \(0\le k<\alpha\); (iii) \(s_{\lceil(2\alpha-1)/3\rceil}\ge\cdots\ge s_{\alpha-1}\ge s_\alpha\).
  - **Proposition 2.6.** "If \(G\) is a perfect graph with \(\alpha(G)=\alpha\) and \(\omega=\omega(G)\), then \(s_{\lceil(\omega\alpha-1)/(\omega+1)\rceil}\ge\cdots\ge s_{\alpha-1}\ge s_\alpha\)."
  - **Corollary 2.7.** "If \(G\) is a bipartite graph with \(\alpha(G)=\alpha\ge1\), then \(s_{\lceil(2\alpha-1)/3\rceil}\ge\cdots\ge s_{\alpha-1}\ge s_\alpha\)."
  - **Corollary 2.8.** "If \(T\) is a tree with \(\alpha(T)=\alpha\), then \(s_{\lceil(2\alpha-1)/3\rceil}\ge\cdots\ge s_{\alpha-1}\ge s_\alpha\)."
- **Proof idea (as in the paper).** Lemma 2.3: form the bipartite inclusion graph between stable \(k\)-sets and stable \((k+1)\)-sets; every \((k+1)\)-set contains exactly \(k+1\) stable \(k\)-subsets, and a stable \(k\)-set \(X\) extends to \(X\cup\{v\}\) exactly for \(v\in V(G)\setminus N[X]\), i.e. at most \(\omega_{\alpha-k}\) times; hence \((k+1)s_{k+1}\le\omega_{\alpha-k}s_k\). Proposition 2.6: for a stable \(k\)-set \(S\), \(H=G-N[S]\) is induced with \(\alpha(H)\le\alpha-k\), so by Lovász's perfect-graph theorem \(|V(H)|\le\omega(H)\alpha(H)\le\omega(\alpha-k)\), giving \(\omega_{\alpha-k}\le\omega(\alpha-k)\); then \(s_{k+1}\le s_k\) whenever \(k+1\ge\omega(\alpha-k)\), i.e. \(k\ge(\omega\alpha-1)/(\omega+1)\). Bipartite graphs are perfect with \(\omega\le2\), which gives Corollaries 2.7–2.8 with threshold \(\lceil(2\alpha-1)/3\rceil\). (Equivalently for trees: a stable \(k\)-set has at most \(2(\alpha-k)\) one-vertex extensions.)
- **Scope caveat (important for the framework).** The theorem is **not** valid for every graph with independence number \(\alpha\); it is proved for bipartite graphs, for quasi-regularizable graphs on \(2\alpha\) vertices (hence very well-covered graphs), for perfect graphs (with the \(\omega\)-dependent threshold), and—in the Congr. Numer. 179 (2006) paper "Partial unimodality for independence polynomials of König–Egerváry graphs", pp. 109–119 `[cited-only]`, no online copy found—for König–Egerváry graphs. The fetched paper itself exhibits general graphs violating the \(\lceil(2\alpha-1)/3\rceil\) threshold: \(G=\sqcup 4C_5\) has \(\alpha=8\), \(I(G;x)=1+20x+170x^2+800x^3+2275x^4+4000x^5+4250x^6+2500x^7+625x^8\) and "\(s_5=4000<4250=s_6\)" although \(\lceil(2\cdot8-1)/3\rceil=5\); and \(G=K_{24}+(K_3\sqcup K_3\sqcup K_4)\) has \(I(G;x)=1+34x+33x^2+36x^3\), \(\alpha=3\), \(\lceil5/3\rceil=2\), \(s_2<s_3\). Both re-checked `[computed]`. For arbitrary graphs the correct general statement is Basit–Galvin Theorem 1.3 (threshold \(\lceil\alpha(n-1)/(\alpha+n)\rceil\), which reduces to \(\lceil(2\alpha-1)/3\rceil\) exactly when \(n=2\alpha\)).
- **Not the source:** the DMTCS 2003 paper "On unimodality of independence polynomials of some well-covered trees" (LNCS 2731, 237–256; arXiv:math/0211036, abstract `[fetched]`) proves that well-covered spiders have unimodal independence polynomials and reduces some well-covered trees to claw-free graphs; it does not contain the tail theorem. The European J. Combin. 27 (2006) 931–939 paper "Independence polynomials of well-covered graphs: generic counterexamples for the unimodality conjecture" (arXiv:math/0309151, abstract `[fetched]`) constructs non-unimodal well-covered graphs for every \(\alpha\ge8\); it is not the source either.

### 1.8 Li, Li, Yang, Zhang — 2-s-positivity and spiders (arXiv:2501.04245)

- URL: https://arxiv.org/abs/2501.04245 — full text `[fetched]`. "A symmetric function approach to log-concavity of independence polynomials", Ethan Y. H. Li, Grace M. X. Li, Arthur L. B. Yang, Zhong-Xue Zhang; v1 2025-01-08; no journal reference on arXiv. Type: **preprint**. (The Lean README in the BrettRey repository cites it under the title "Log-concavity of independence polynomials of some families of graphs, arXiv:2501.04245"; the arXiv listing shows only the title above.)
- Theorem 1.3 (quoted in substance): for \(P(t)=a_0+\dots+a_dt^d\) with positive coefficients and \(F_P(\mathbf x)=\prod_i P(x_i)\), the following are equivalent: (i) \([s_\lambda]F_P\ge0\) for all \(\lambda\) with \(\ell(\lambda)\le2\); (ii) \([s_{(k,k)}]F_P\ge0\) for all \(k\ge1\); (iii) \(P\) is log-concave; (iv) \(P\) is strongly log-concave. Since \(F_{I_G}=Y_G=\sum_\alpha X_G^\alpha\) (Stanley), Corollary 2.2/2.4: \(I_G(t)\) is log-concave iff \(Y_G\) is 2-Schur-positive ("2-\(s\)-positive": \([s_\lambda]f\ge0\) for all \(\lambda\) of length \(\le2\)). Key identity: \([s_{(k,k)}]F_P=a_k^2-a_{k-1}a_{k+1}\).
- Theorem 3.1: "Let \(\lambda\) be a partition and \(S(\lambda)\) be the corresponding spider. Then \(Y_{S(\lambda)}\) is 2-\(s\)-positive, or equivalently, the independence polynomial \(I_{S(\lambda)}(t)\) is strongly log-concave." (A spider is "a tree with only one vertex of degree at least 3".) Hence **all spiders have log-concave, therefore unimodal, independence polynomials.** Theorem 3.5: pineapple graphs (complete graph joined to the torso of a spider) are log-concave. The paper also re-derives Hamidoune's log-concavity for claw-free graphs via 2-s-positivity and recalls that Chudnovsky–Seymour strengthened it to real-rootedness.

### 1.9 2025–2026 arXiv sweep for proofs or counterexamples

Queries run against the arXiv API on 2026-09-02 (sorted by submission date): `"independence polynomial" AND tree AND unimodal`; `"independent set sequence" AND tree`; `"independence polynomial" AND trees AND "log-concave"`; `abs:Alavi AND abs:Schwenk AND abs:unimodal`; `"unimodality conjecture" AND trees AND independence`; `"Erdős problem" AND 993`; `"independence polynomial" AND unimodal`; `"independence polynomials" AND forest AND unimodal`; `"independent set sequence" AND unimodal`; `"tree unimodality conjecture"`; `"independence sequence" AND tree AND unimodal`. A general web search for "Erdős Problem #993" proof/counterexample was also run. **Result: no preprint or paper claims a proof of the tree or forest conjecture, and none claims a non-unimodal tree or forest.** Items found (all abstracts `[fetched]` via the arXiv API unless noted):

1. **D. Galvin, "Trees with non log-concave independent set sequences", arXiv:2502.10654** (v1 2025-02-15, v2 2026-01-23). Abstract: "We construct a family of trees with independence numbers going to infinity for which the log-concavity relation … fails at around \(\alpha(T)(1-1/(16\log\alpha(T)))\). … This resolves a conjecture of Kadrawi and Levit." (Full text fetched: Kadrawi–Levit's Conjecture 1.2 there = for every \(\ell\ge1\) a tree with a break at \(\alpha-\ell\).)
2. **E. Ramos, S. Sun, "An AI enhanced approach to the tree unimodality conjecture", arXiv:2510.18826** (v1 2025-10-21, v2 2025-10-22) — full text `[fetched]`. Abstract: "finding tens of thousands of new counter-examples to log-concavity with vertex set sizes varying from 27 to 101". Text: about 35,000 non-log-concave trees on 60 vertices in the repository https://github.com/ericgramos/TreeUnimodalityPatternBoost; "All of the counter-examples we were able to find using our methods exhibit the breakage of log-concavity within 3 indices of the top of the independence sequence"; they could not produce breaks at \(N/2-1\) for odd \(N\); "if something like unimodality does eventually fail, it would likely happen at a vertex count that is far beyond our computational abilities." The paper does not state a theorem about unimodality; the forum's "every one of them is still unimodal" is the commenter's summary, consistent with but not literally in the paper.
3. **C. Bautista-Ramos, "Multiple breaks of log-concavity in the independence polynomials of trees", arXiv:2511.00334** (2025-11-01). Abstract: "We construct infinite families of trees whose independence polynomials violate log-concavity at an arbitrary number of indices. This affirmatively answers a question of D. Galvin." Theorem 1: for each \(m\) and all large \(t\), the tree \(TG_{m,t}\) breaks log-concavity at \(m\) indices.
4. **C. Bautista-Ramos, C. Guillén-Galván, P. Gómez-Salgado, "Linear recurrences for non-log-concave independence polynomials of trees", arXiv:2603.14204** (2026-03-15); published in *Graphs and Combinatorics* (2026), DOI 10.1007/s00373-026-03054-4 (publisher page `[fetched]` via search). Abstract: linear recurrences for the known families; non-isolated limit points of their zeros lie on \(|z+1/3|=1/3\); infinite families breaking log-concavity at one, two and three consecutive indices and finite families at four and five. Type: **peer-reviewed**.
5. **G. M. X. Li, arXiv:2603.03025** (2026-03-03) — see 1.4 (unimodality of \(T_{3,m,n}\), \(T^*_{3,m,n}\)).
6. **V. E. Levit, O. Kadrawi, "Closing Trees into Unicyclic Counterexamples", arXiv:2603.17114** (2026-03-17). Abstract: an explicit infinite family \(U_{k,r}\) of **unicyclic** graphs with unimodal but non-log-concave independence polynomials; "The paper also places the KL family inside a broader reservoir program involving Galvin, Ramos-Sun, and Bautista-Ramos trees." Not about trees' unimodality per se.
7. **T. Hibi, S. Kara, D. Vien, "Symmetric and unimodal independence polynomials of trees", arXiv:2604.18824** (2026-04-20) — full text `[fetched]`. States: "As of April 2026, the conjecture remains open in general, and has been computationally verified for trees on at most 29 vertices [15]", where [15] is the Reynolds Zenodo preprint (v3). Content: existence of trees on \(n\) vertices with symmetric and unimodal independence polynomials for all \(n\notin\{2,4,5,7,10\}\), and of such polynomials of every degree \(d\ne3\) (via a "Bridge Lemma"). An existence result, not a proof of the conjecture.
8. **A. Bendjeddou, L. Hardiman, "Lorentzian polynomials and the independence sequences of graphs", arXiv:2405.00511** (v2 2025-02-28); journal ref on arXiv: Bull. London Math. Soc. 57 (2025) 1305–1323 (**peer-reviewed**). Abstract: all graphs in the image of the operator \(R_{W_4}\) (replace each edge by a caterpillar of size 4) are "pre-Lorentzian", hence have log-concave (therefore unimodal) independence sequences; "makes progress on a conjecture of Alavi, Malde, Schwenk and Erdős".
9. **A. Du, S. Heilman, G. Panova, arXiv:2605.02193** (2026-05-04): non-log-concave *dominating*-set sequences of trees via PatternBoost, adapting Bautista-Ramos's construction; not about independent sets.
10. **K. Pereyra, arXiv:2605.14076** (2026-05-13): proves a 2-quasi-regularizability conjecture of Hoang–Levit–Mandrescu–Pham for \(W_2\) graphs and gives coefficient criteria for log-concavity/unimodality of \(W_p\) graphs; not about trees.
11. **D. Galvin, C. Sharpe, arXiv:2409.15555** (v5 2026-01-30): independent set sequences of linear hyperpaths/hyperstars are log-concave; hypergraph analogue.
12. **O. P. Bhardwaj et al., arXiv:2607.08480** (2026-07-09): multiplicity of \(-1\) as a root of independence polynomials; "a new sufficient condition for independence polynomials of graphs to be log-concave"; no claim about all trees.

### 1.10 Chudnovsky–Seymour (claw-free graphs)

- M. Chudnovsky, P. Seymour, "The roots of the independence polynomial of a clawfree graph", *J. Combin. Theory Ser. B* 97(3) (2007) 350–357, DOI 10.1016/j.jctb.2006.06.001 (online 2006). Author manuscript `[fetched]` https://web.math.princeton.edu/~pds/papers/roots/roots.pdf: "1.1 If \(G\) is clawfree then all roots of \(I(G,x)\) are real." Extends Heilmann–Lieb (matching polynomials = independence polynomials of line graphs) and answers Hamidoune (1990) and Stanley. Since the coefficients are positive, real-rootedness gives Newton's inequalities, hence log-concavity and unimodality; log-concavity for claw-free graphs was proved earlier by Y. O. Hamidoune, JCTB 50 (1990) 241–244 `[cited-only]`. Paths \(P_n\) are claw-free, so path independence polynomials are real-rooted and log-concave. Type: **peer-reviewed**.

### 1.11 "Newton-type" inequality \(r\,p_r^2+p_{r-1}^2\ge(r+1)\,p_{r-1}p_{r+1}\)

Two targeted web searches (exact-form and paraphrased) and the arXiv sweep returned **nothing** discussing this inequality, under this or any other name, for independence polynomials. The only "Newton" inequalities that appear in the fetched literature are the classical ones for real-rooted positive polynomials, \(a_i^2\ge\frac{i+1}{i}\cdot\frac{n-i+1}{n-i}\,a_{i-1}a_{i+1}\) (stated e.g. in Cameron–Brown arXiv:1709.08236 and Galvin–Sharpe arXiv:2409.15555, both `[fetched]`), which is a different inequality. Absence of a source is all that can be reported; no source contradicts the inequality either.

### 1.12 Additional sources encountered

1. **Tyorden/erdos-993-trees-n31 (GitHub), exhaustive check to \(n\le32\).** https://github.com/Tyorden/erdos-993-trees-n31 — README, `results_per_order.txt`, commit log `[fetched]` via the GitHub API (repository created 2026-08-02; commits 2026-08-02 "Exhaustive unimodality verification … to n=31" and 2026-08-05 "Extend exhaustive verification to n=32"; author signs "Tyler Satchel Orden, Los Angeles, 2026"). README: "Result: unimodality holds for every free tree on up to 32 vertices"; table n=30: 14,830,871,802 trees, 0 failures; n=31: 40,330,829,030, 0; n=32: 109,972,410,221, 0; "Every per-order tree count matches OEIS A000055 exactly"; method: `gentreeg` (nauty) → `listg -eq` → single-file C++ exact in/out DP with u64 coefficients (safe: a 32-vertex tree has fewer than \(2^{32}\) independent sets) → rise-then-fall scan; n=31 "~2 days wall-clock in 16 parts", n=32 "(Aug 3–4, 2026) ~27 hours in 16 parts" on one Apple M3 Max; "Pipeline written and run with Claude (Anthropic) assistance". A search-engine snippet of the live forum thread shows a comment by this author announcing the \(n\le31\) result and stating that "My independent runs of the smaller orders reproduce BrettRey's published counts exactly (n=28: 2,023,443,032; n=29: 5,469,566,585; zero failures) — two independent implementations in full agreement." The forum comment text itself is `[unverified]` (thread not fetchable); the repository is `[fetched]`. OEIS cross-check `[computed]`: A000055(30)=14,830,871,802, A000055(31)=40,330,829,030, A000055(32)=109,972,410,221 — all match. Type: repository-only, not peer reviewed, single author, no third-party reproduction found.
2. **willblair0708/verified-combinatorics/erdos-993 (GitHub).** README `[fetched]` (directory contents: `verify_993_kernel.py`, `search_993.py`, `search_993_v2.py`, `search_993_v3_wide.py`, `verify_993_result.py`, `generate_results.py`, `results.json`, seed edge lists). Claims: "bush" trees = "root degree 2–5, per-branch child counts 2–6, pendant-path depths 1–3"; "112,916 trees scanned (orders 26–60), yielding 4,445 distinct non-log-concave independence polynomials, with log-concavity defect down to ≈ −12"; "0 non-unimodal single trees"; "253,695 forest objects over the 80 most-severely-non-log-concave seeds — all pairwise and triple products, powers through the 20th, and products with paths \(P_1\dots P_{16}\)"; "All unimodal"; "This does not resolve #993". Exact big-integer arithmetic; kernel self-tested against brute force "(436/436 trees, 6/6 forests)". Type: repository-only, not peer reviewed.
3. **S. G. Hoggar, "Chromatic polynomials and logarithmic concavity", J. Combin. Theory Ser. B 16 (1974) 248–254, DOI 10.1016/0095-8956(74)90071-9.** The publisher page returned HTTP 406 `[unverified as primary]`. The theorem used in the forest reduction—"the convolution of two finite, positive, log-concave sequences is log-concave"—is confirmed in two fetched secondary sources: O. Johnson and C. Goldschmidt, "Preservation of log-concavity on summation" (preprint dated 2005, hosted at stats.ox.ac.uk; "We extend Hoggar's theorem that the sum of two independent discrete-valued log-concave random variables is itself log-concave", citing Hoggar [9] with the JCTB 16 (1974) 248–254 data), and S. G. Bobkov, A. Marsiglietti, J. Melbourne, "Concentration functions and entropy bounds for discrete log-concave distributions", Combin. Probab. Comput. (2021), DOI 10.1017/s096354832100016x, whose Proposition 4.2 ("If the coefficients of two polynomials are positive and form log-concave sequences, then so does their product") is attributed to Hoggar, with the explicit remark that positivity cannot be dropped (\((1+z)(1+z^3)=1+z+z^3+z^4\)).
4. **Yosef, Mizrachi, Kadrawi, arXiv:2101.06744** (v5 2022-03-07), abstract `[fetched]`: trees up to 20 vertices are log-concave, hence unimodal.
5. **Levit–Mandrescu survey, "The independence polynomial of a graph – a survey"** (Proc. 1st Int. Conf. Algebraic Informatics, Thessaloniki, 2005, 231–252), copy `[fetched]` from a third-party mirror: Proposition 3.8 there states that centipedes \(W_n\) and all well-covered spiders have log-concave independence polynomials (superseded for spiders by 1.8).

---

## 2. Facts relevant to the WR + ISO + TAIL framework

Notation as in `erdos993lib/checks.py`: \(p=(p_0,\dots,p_a)\) with \(a=\alpha\); \(L(a)=\lceil(2a-1)/3\rceil\); WR\(_r\): \(p_{r-1}\le r\,p_r\); ISO\(_r\): \(r p_r^2+p_{r-1}^2\ge(r+1)p_{r-1}p_{r+1}\); TAIL: \(p_r\ge p_{r+1}\) for all \(r\ge L(a)\).

### (i) The tail theorem, exactly as proved in the literature

- **Statement (Levit–Mandrescu, arXiv:math/0406623 Cor. 2.7/2.8 = Birkhäuser 2007 "Cor. 3.3"; Congr. Numer. 179 (2006) for KE graphs).** If \(G\) is a bipartite graph (in particular a tree or a forest) — more generally a König–Egerváry graph, or a quasi-regularizable graph on \(2\alpha\) vertices — with \(\alpha(G)=\alpha\ge1\), then \(s_{\lceil(2\alpha-1)/3\rceil}\ge s_{\lceil(2\alpha-1)/3\rceil+1}\ge\cdots\ge s_{\alpha-1}\ge s_\alpha\). So **TAIL holds unconditionally for every forest**, with exactly the cutoff \(L(a)\) used in `checks.py`.
- **Mechanism.** For any graph, \((k+1)s_{k+1}\le\omega_{\alpha-k}s_k\) where \(\omega_{\alpha-k}=\max_{|S|=k}(n-|N[S]|)\) (Lemma 2.3, inclusion double counting; identical to Basit–Galvin identity (4) \(\sum_{|I|=k}e(I)=(k+1)i_{k+1}\)). For bipartite (perfect, \(\omega\le2\)) graphs, \(\omega_{\alpha-k}\le2(\alpha-k)\) by Lovász's theorem applied to \(G-N[S]\); hence \((k+1)s_{k+1}\le2(\alpha-k)s_k\), and \(s_{k+1}\le s_k\) as soon as \(k+1\ge2(\alpha-k)\), i.e. \(k\ge(2\alpha-1)/3\).
- **It is not a theorem about all graphs.** Counterexamples inside the same paper: \(\sqcup4C_5\) (\(\alpha=8\), \(s_5=4000<s_6=4250\)) and \(K_{24}+(K_3\sqcup K_3\sqcup K_4)\) (\(\alpha=3\), \(s_2=33<s_3=36\)). The all-graphs generalization is Basit–Galvin Theorem 1.3 with threshold \(\ell=\lceil\alpha(n-1)/(\alpha+n)\rceil\); since every tree has \(n\le2\alpha\) and \(\alpha(n-1)/(\alpha+n)\) is increasing in \(n\), this threshold is at most \(L(\alpha)\) for every tree, with equality when \(n=2\alpha\), and it is strictly better (a longer decreasing tail) for trees with \(\alpha\) well above \(n/2\), as Basit–Galvin remark. Any use of TAIL for non-bipartite auxiliary graphs must therefore go through Basit–Galvin's version or be justified separately.
- **Tightness.** \(\alpha\) disjoint edges (a forest) decrease from exactly \(\lceil(2\alpha-1)/3\rceil\) (Basit–Galvin).
- **TAIL alone is far from sufficient**: it holds for all bipartite graphs, yet bipartite graphs with non-unimodal independence sequences exist (Bhattacharya–Kahn 2013; Schwenk's smaller examples, as reported by Kadrawi–Levit). Hence for those bipartite graphs WR\(_r\) or ISO\(_r\) must fail for some \(r<L(a)\); whatever is tree-specific in the framework has to live in WR/ISO.
- **Increasing-side analogue in the literature.** Basit–Galvin Theorem 1.5/1.6 (from the same identity): \(i_{k-1}\le i_k\) for \(k\le\lceil\lambda/2\rceil\) where \(\lambda\) is the minimum size of a maximal independent set; for a tree \(\lambda\ge\lceil(n-\alpha+1)/2\rceil\), giving monotone increase up to \(\lceil(n-\alpha+1)/4\rceil\). The well-covered inequality \(s_{k-1}\le k\,s_k\) (Brown–Dilcher–Nowakowski, quoted in Levit–Mandrescu Section 2) is exactly WR\(_k\), but it is proved only for well-covered graphs; for general trees WR is a hypothesis, not a theorem.

### (ii) Exhaustive-verification frontiers

- Unimodality of trees: \(n\le20\) (Yosef–Mizrachi–Kadrawi 2021, via log-concavity); \(n\le25\) (Radcliffe, personal communication reported in Ball–Galvin–Hyry–Weingartner 2022 and Basit–Galvin 2021, via log-concavity; Basit–Galvin phrase it for forests on \(\le25\) vertices); \(n\le26\) (Kadrawi–Levit–Yosef–Mizrachi 2023, all unimodal); \(n\le29\) (JakeMallen forum comment 2026-01-07; Reynolds Zenodo preprint v3 and repository, 8,691,747,673 trees total, with per-order counts n=27: 751,065,460; n=28: 2,023,443,032; n=29: 5,469,566,585 — all equal to OEIS A000055); \(n\le32\) (Orden repository, August 2026, repository-only: n=30: 14,830,871,802; n=31: 40,330,829,030; n=32: 109,972,410,221, all equal to A000055; reproduces the n=28,29 counts independently). No independent third reproduction of \(n=30\)–\(32\) was found. Beyond exhaustive range: Ramos–Sun's tens of thousands of non-log-concave trees with 27–101 vertices, none reported non-unimodal; Blair's 4,445 non-log-concave bush trees up to 60 vertices and 253,695 forests, all unimodal. (The Reynolds README also lists targeted-family and evolutionary near-miss search scripts; no results from those are quoted here.)
- Log-concavity failures: none for \(n\le25\); exactly two trees at \(n=26\) (\(T_{3,4,4}\), \(T^*_{3,3,4}\); \(\alpha=14\); single break at \(k=13=\alpha-1\)); \(n=27\): 0 failures (Reynolds README); \(n=28\): 19 failures, all at \(k=14\) (Reynolds README and forum comment; Kadrawi–Levit's "exceptional" order-28 tree, with \(\alpha=15\) and its break at \(k=14=\alpha-1\), is necessarily one of them if the audit is correct); \(n=29\): LC audit not completed (Reynolds). Breaks at \(\alpha-2\) exist (Kadrawi–Levit example with \(\alpha=19\), break at \(k=17\)); breaks at distance \(\Theta(\alpha/\log\alpha)\) from \(\alpha\) exist (Galvin 2025); arbitrarily many breaks exist (Bautista-Ramos 2025), with up to three consecutive breaks in infinite families and five in finite ones (Bautista-Ramos–Guillén-Galván–Gómez-Salgado 2026). Ramos–Sun's machine-found examples all break within 3 indices of \(\alpha\).
- `[computed]` For both order-26 non-log-concave trees, WR\(_r\) and ISO\(_r\) hold for all \(1\le r\le L(14)-1=8\) and TAIL holds from \(L(14)=9\); the log-concavity break at \(k=13\) lies inside the tail region, where the framework does not need ISO. (This is a check on the two smallest hard cases only, not evidence about the general hypotheses.)

### (iii) Known unimodal (mostly log-concave) infinite families of trees

- Paths (claw-free ⇒ real-rooted, Chudnovsky–Seymour 2007; log-concave, Hamidoune 1990) and stars (trivial).
- All spiders (one vertex of degree \(\ge3\)): strongly log-concave (Li–Li–Yang–Zhang, arXiv:2501.04245, Theorem 3.1; preprint). Earlier: well-covered spiders unimodal (Levit–Mandrescu, DMTCS 2003, LNCS 2731, peer-reviewed; abstract fetched), and well-covered spiders and centipedes \(W_n\) log-concave as stated in Levit–Mandrescu's 2005 survey, Proposition 3.8 (mirror copy fetched).
- \(T_{3,m,n}\) and \(T^*_{3,m,n}\) for all \(m,n\ge1\): unimodal (Li, arXiv:2603.03025; preprint). These are the smallest non-log-concave families; no earlier unimodality result for trees that are provably not log-concave was found in this audit.
- Trees with at most two vertices of degree \(\ge3\) (two-hub trees, including all double brooms): log-concave — Lean 4 development in the BrettRey repository (repository-only, AI-assisted, not peer reviewed, not independently checked here); double brooms also by a written note in the same repository.
- Image of \(R_{W_4}\) (every edge replaced by a caterpillar of size 4): log-concave via pre-Lorentzian multivariate polynomials (Bendjeddou–Hardiman, Bull. LMS 2025; peer-reviewed).
- Random trees: a.a.s. increasing for the initial \(\approx49.5\%\) and decreasing for the terminal \(\approx38.8\%\) of the nonzero part (Basit–Galvin 2021, peer-reviewed); this leaves an a.a.s. unresolved middle window and is not a unimodality proof even for almost all trees.

---

## 3. Superseding-work check

Checked on 2026-09-02: the erdosproblems.com problem page (open; 0 proof claims; 0 proof expositions), its forum thread (archived through 2026-07-09: no proof or counterexample claimed; the three later comments could not be read, but the only one visible in a search snippet is a computational \(n\le31\) report), the Reynolds Zenodo preprint (its own description: "The conjecture … remains open"; its README: "This repository does not contain a proof"), Hibi–Kara–Vien (April 2026: "the conjecture remains open in general"), and an arXiv API sweep of 2025–2026 submissions listed in 1.9. **No source proves the conjecture for trees, no source proves it for forests, and no source exhibits a non-unimodal tree or forest.** The most recent claimed advances are: (a) unimodality of the two Kadrawi–Levit families (Li, March 2026, preprint); (b) log-concavity for all two-hub trees (repository Lean development, August 2026, not peer reviewed); (c) exhaustive verification to \(n\le32\) (repository, August 2026, not peer reviewed). None of these supersedes or invalidates the WR + ISO + TAIL approach; the only literature input the approach relies on as a theorem—TAIL—is exactly Levit–Mandrescu's Corollary 2.7/2.8 (bipartite graphs/trees), valid for all forests but not for arbitrary graphs.

---

## 4. Fetch failures and unverified items

- Live forum thread https://www.erdosproblems.com/forum/thread/993 (7 comments): blocked by Cloudflare; read from the 2026-07-09 archive (4 comments). Comments 5–7 `[unverified]` except for the search-engine snippet quoted in 1.12.1.
- DOI resolver for Ars Math. Contemp. 25 (2025) #P4.03 timed out; the journal article page was fetched instead.
- Hoggar (1974) publisher page: HTTP 406; theorem statement confirmed via two secondary sources.
- Birkhäuser 2007 full text (Corollary "3.3" numbering) not accessible; arXiv version used.
- Congressus Numerantium 179 (2006) 109–119 (König–Egerváry version) and Congressus Numerantium 58 (1987) 15–23 (AMSE87): no online copies found; statements taken from fetched citing papers.
- Reynolds `main_v2.pdf` (Zenodo) was not opened; the Lean project was not built; the Orden C++ code was not run. All numerical claims from those sources are reported as claims, with the OEIS count cross-checks noted where they apply.


---

<!-- FILE: handoff/HANDOFF_2026-09-02_verbatim.md -->

# Erdős Problem #993 — complete working handoff for another model

> Preserved verbatim as received on 2026-09-02. It describes a workspace
> (`C:\Users\chris\erdos993_goal`) that is **not present** in this repository;
> none of the producers, JSON reports, or hashes named below could be replayed
> here. See `../STATUS_2026-09-02.md` for what was and was not verifiable.

**Snapshot:** 2026-09-02, America/New_York  
**Proof workspace:** `C:\Users\chris\erdos993_goal`  
**Persistent goal/thread ID:** `019f91b9-4f16-7941-9963-bb5ab47a4218`  
**Status:** not solved; exact progress is preserved below.  
**Current process state:** no proof solver and no subagent is running at this snapshot.

This is the one-file entry point for continuing the project. Read this file
fully before launching searches. The repository contains a long chronological
research record; older passages frequently describe gaps that were closed by
later addenda. Prefer the exact dependencies and current boundaries stated
here, then consult the canonical documents named below.

## 0. Non-negotiable correctness rules

1. The bar is an **exact, independently replayable proof** or a finite,
   independently verifiable nonunimodal tree/forest.
2. A floating LP solution is not a theorem until rational reconstruction and
   exact symbolic replay pass.
3. LP infeasibility is only an obstruction to that selected cone. It is not a
   negative forest cell, a counterexample, or evidence that the conjecture is
   false.
4. Finite enumeration, random testing, and positive collars are falsification
   evidence only. They never prove an unbounded tail.
5. Never promote a boundary theorem, a special leaf slice, or a terminal base
   into the universal statement without a gapless scope/partition audit.
6. Preserve the fixed checklist below. Do not increase its denominator or
   reopen a certified gate unless a named replay actually fails.
7. The user-facing `94%` is a frozen bookkeeping estimate, not a mathematical
   probability of success. The auditable status is **4 of 6 gates closed**.

## 1. Fixed six-gate checklist

- [x] **Gate 1 — rank-4/rank-5 foundation**
- [x] **Gate 2 — universal `C5` case**
- [x] **Gate 3 — rank-5 `G1`**
- [x] **Gate 4 — rank-5 `G2`**
- [ ] **Gate 5 — universal rank-6 `G1`, all-`N6` integration, rank-6/7
  propagation, and Newton-tail join**
- [ ] **Gate 6 — final proof assembly, independent replay, and current
  literature audit**

The active mathematical bottleneck is Gate 5. Within the rank-six
whole-bundle polynomial, `G2,...,G10` are certified; `G1` is the only open
coefficient. The terminal `N6` base has been pinned in the relevant exact
work, but the universal all-`N6` integration/assembly is still downstream of
`G1` and must not be called complete prematurely.

## 2. The target and why the framework would finish it

For a finite forest `F`, write

```text
I(F;x)=sum_(r=0)^alpha p_r x^r,    alpha=alpha(F).
```

The goal is to prove that `(p_0,...,p_alpha)` is unimodal. The proof framework
uses:

```text
L(alpha)=ceil((2alpha-1)/3)

WR_r(F):   p_(r-1) <= r p_r

ISO_r(F):  Q_r(F)
         = r p_r^2 + p_(r-1)^2 - (r+1)p_(r-1)p_(r+1) >= 0
```

The decreasing-tail theorem gives `p_r>=p_(r+1)` for `r>=L(alpha)`. The weak
prefix ratio `WR` is already proved on the required prefix. If a descent
occurs before the cutoff, put

```text
x=p_r/p_(r-1),  y=p_(r+1)/p_r.
```

Then `WR` gives `1/r<=x<1`, while `ISO` gives

```text
(r+1)y <= r x + 1/x <= r+1.
```

Thus `y<=1`: a descent cannot be followed by an ascent. Repetition through
the prefix plus the known tail proves unimodality. Therefore the global task
is an all-forest ISO/payment theorem. The current route attacks its remaining
rank-six whole-bundle payment.

Canonical framework file:

```text
C:\Users\chris\erdos993_goal\ERDOS993_PROOF_SKELETON_AND_EXACT_GAP_2026-08-29.md
```

## 3. Canonical current documents

Read these after this handoff:

1. `ERDOS993_MONOTONE_PROGRESS_LEDGER_2026-08-29.md`
   - theorem-level chronological ledger;
   - latest addenda supersede older status passages;
   - now includes the retained-isolate, marked-parent, and `H--K`
     ordinary-parent reductions from 2026-09-01.
2. `ERDOS993_CONDITIONAL_PROOF_DRAFT_2026-08-29.md`
   - conditional final assembly;
   - not a proof yet.
3. `ERDOS993_PROOF_SKELETON_AND_EXACT_GAP_2026-08-29.md`
   - `WR+ISO+TAIL` logic and dependency architecture.
4. `ERDOS993_LITERATURE_REFRESH_2026-08-25.md`
5. `ERDOS993_LITERATURE_STATUS_2026-08-27.md`
   - both literature files are older than this snapshot; refresh only after
     the mathematics is actually closed or if a new paper may supersede it.

## 4. Frozen upstream theorem chain

The following are genuine exact closures and should be treated as immutable
unless their own replays fail.

### 4.1 Rank four

The all-forest four-minor theorem

```text
N_4(B;u,v)>=0
```

is complete for every finite forest and distinct marks. Primary markers:

```text
PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT
PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_G1_BERNSTEIN
PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_AUDIT_BUNDLE_G12
```

### 4.2 Rank-six `G2,...,G10`

`G2` is complete across both mark geometries and all five canonical
deletion-parent modes. Together with the previously frozen `G3`, `G4`, and
`G5,...,G10` blocks, this yields a gapless assembly for every coefficient
`G2,...,G10`:

```text
PASS_EXACT_ISO_N6_BUNDLE_G2_ALL_GEOMETRIES_ALL_PARENT_MODES_ROOT
PASS_EXACT_ISO_N6_BUNDLE_G2_COMPLETE_INDEPENDENT_AUDIT_ROOT
PASS_EXACT_ISO_N6_BUNDLE_G2_G10_ROOT
PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G2_G10_ROOT
```

Top-level report hashes:

```text
G2 assembly:              775797AE5909BA103E25AF15EF48F9235CF7F46ADF3C1FDE8A2F9DC643333645
G2 independent audit:     139408F0ACA2F7E6BC605AF245A335B8136D233EC8310737A70FFD8F8F771D70
G2..G10 assembly:         6AE97573C08CD55B71C46D630F2ABE1769039D4C4023E0B166D1FFA761C601C1
G2..G10 independent audit: DEA1F857E6AD61ACE3035E6D1BA93E09E363B0A86706458FB85EA029200F2C82
```

This means a rank-six `G1` proof may freely use frozen `G2,...,G10` cells on
any legitimate actual forest/minor pair.

### 4.3 Terminal/Newton side results

- The zero-slack face is verified.
- The terminal `q3` theorem controls Newton indices `m>=8`.
- The low join `m=0,...,7`, full `q3` extension, all-`N6` integration, and
  final dependency assembly are not all closed merely by that tail result.
- The alpha-only heuristic has an exact counterexample and must not be used.

## 5. Exact rank-six `G1` leaf-mode decomposition

The isolated/deleted leaf mode is paid by the frozen `G2` theorem. The three
coupled families still requiring universal sign proofs are:

```text
1. retained isolate:
   g2_6(A,B) + Phi_B((1+x)A) >= 0

2. ordinary parent:
   g2_6(H,J) + F(H,K)
   + epsilon Q(H,L)
   + eta Phi_J((1+x)H+xK) >= 0,
   epsilon,eta in {0,1},
   K induced in H, J induced in H, L=J intersect K

3. marked parent:
   Omega_u(A,B) + eta Phi_T(A+x(A-u)) >= 0,
   eta in {0,1}
```

Random coupled testing found no negative complete increments, but the response
terms alone are often negative. Do not separate a response from its base
payment unless an exact dominance identity permits it.

## 6. Retained-isolate family — exact current boundary

### 6.1 Reduction to two q-free cores

Affine induced-minor elimination, exact order-interval elimination, and
retained-mark dominance reduce the entire retained-isolate family to exactly
two all-order polynomials:

```text
adjacent_u0_v0
nonadjacent_u0_v0
```

Primary artifacts:

```text
derive_iso_n6_bundle_g1_retained_isolate_coarse_q_lower_root.py
  SHA256 A2855A1190CC31B82F59F069870FEE43DAE977C1C5049CF94D89CC7EC4012CEB

iso_n6_bundle_g1_retained_isolate_coarse_q_lower_exact_root_20260901.json
  SHA256 239ED96A29102D24B205BAB4A7AD3180B60DEACF42C68C1059D061B0E0E784FE

audit_iso_n6_bundle_g1_retained_isolate_qfree_reduction_independent_root.py
  SHA256 86433DC48E4E79C55E73AEC683C9FEBAA6C98A5D8158AAEA212A45F10983CB23

iso_n6_bundle_g1_retained_isolate_qfree_reduction_independent_audit_root_20260901.json
  SHA256 44C73A646B5DD55ACB38B92689481C6F6A0217C47897575385FCE36004E368F2
  marker PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_REDUCTION_ROOT
```

The independent audit verifies exact `D`-linearity, all eight branch
replays, the order elimination, and coefficientwise domination by the two
zero-retention branches.

### 6.2 Finite collar

Every nonisomorphic forest of orders 8, 9, and 10 and every marked pair is
strictly positive:

```text
22,441 exact cells
adjacent minimum:    2712
nonadjacent minimum: 1976
```

Artifact:

```text
iso_n6_bundle_g1_retained_isolate_qfree_n8_n10_root_20260901.json
  SHA256 4FC3CDF022AF3F9F5264F26E5865D2A1E269CCCE7B1AC7880478F3631319375A
```

This does not prove order `>=11`.

### 6.3 Common-compatible minor structure

Adjacent marks:

- Let `R` be the vertices compatible with both marks.
- The induced minor is `M=K2(u,v)` disjoint union `R`.
- Exact rows:

```text
M_E=(1+2x)I(R),  M_U=M_V=(1+x)I(R),  M_W=I(R).
```

- `154` frozen `G4,...,G10` cells were imported first.
- Adding `CR7=i_7(R)` and

```text
CR7<=CW7,
7 CR7 <= (|R|-6) CR6
```

  imports the remaining `44` frozen `G2,G3` cells.
- The strongest adjacent cone therefore contains all `315` relevant frozen
  cells from `G2,...,G10`.

Artifacts:

```text
derive_iso_n6_bundle_g1_adjacent_common_frozen_cells_root.py
  3653B79E63F0D2B7DFD256BE8C0E91A5D018DFD1E7BBA72C31129952DCC6BC4B
iso_n6_bundle_g1_adjacent_common_frozen_cells_exact_root_20260901.json
  2BF5BB129F661D8B8FA10F217CC7F1AE6B66117F9ECCAB5A786672BEEFEA7D9B

derive_iso_n6_bundle_g1_adjacent_common_low_frozen_cells_root.py
  969751DD71872B1B4FD4FE56E6EA40EBAA067FED02C416D7FDB4309E16EE300C
iso_n6_bundle_g1_adjacent_common_low_frozen_cells_exact_root_20260901.json
  A96A62F64CA19405FAF79C4FC50F455C11AD5CDE1B94FEF4C80FBC62C24A9753
```

Nonadjacent marks:

- Let `R` be vertices adjacent to neither mark.
- `M` is two isolated marks disjoint union `R`.
- `CZ_(r+2)=i_r(R)`.
- Exact rows:

```text
M_E=(1+x)^2 I(R),  M_U=M_V=(1+x)I(R),  M_W=I(R).
```

- Existing coordinates import `132` frozen `G5,...,G10` cells.
- New coordinate `CR6=i_6(R)` imports all `22` missing `G4` cells using:

```text
CR6<=CA7,
CR6<=CB7,
CR6<=CW6,
CW6-CA7-CB7+CR6>=0,
6 CR6 <= (CZ3-5) CZ7.
```

Artifacts:

```text
derive_iso_n6_bundle_g1_nonadjacent_common_frozen_cells_root.py
  4FF5F0E24697D3FBB7B33A574B52960640EFEF444769AE8F3FA84FBD3ECB7628
iso_n6_bundle_g1_nonadjacent_common_frozen_cells_exact_root_20260901.json
  9232A6DACB9FAB74278A1D4532FE983144233DBCA3FE8E4CD109BBCA7209EBF6

derive_iso_n6_bundle_g1_nonadjacent_common_g4_frozen_cells_root.py
  EDF3FDE4DF9633805221A63634A386E96945892186AD493AF678F360233BB4E9
iso_n6_bundle_g1_nonadjacent_common_g4_frozen_cells_exact_root_20260901.json
  D9A60761BF7590BBA2E662E7D9BF960F2DAAA2CA669C9F34FEF114037642152F
  marker PASS_EXACT_ISO_N6_BUNDLE_G1_NONADJACENT_COMMON_G4_FROZEN_CELLS_ROOT
```

The `G4` producer's order-8/9 implementation replay has zero row failures and
zero negative cells. Its universal validity comes from induced-family
containment, the union bound, the forest extension inequality, and the frozen
`G4` theorem.

### 6.4 Final retained-isolate cone verdicts

The strongest completed adjacent search is infeasible:

```text
iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_low_frozen_ipm_search_root_20260901.json
  SHA256 DD61D212DF795F37AD931628D60A3FBB664DA0353F1CC1BA3261EDB74A0EDE75
  490,989 atoms, 43,834,351 nonzeros, 315 frozen cells
```

The completed nonadjacent search using the older `G5,...,G10` common-minor
cells is also infeasible:

```text
iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_frozen_ipm_search_root_20260901.json
  SHA256 0E020A4977A48C61F5A132E9DDDD56D696D0EFA50981F672530A42D4C33E3D4D
  433,700 atoms, 249 frozen cells
```

Neither result refutes either target. The strengthened nonadjacent search
including the new `G4` coordinate is prepared but has **not** been run:

```text
search_iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_root.py
  SHA256 130A63B41776C4FD009FF495942996304D502AFE83E5C0CC4DBAF246C9D1E000
```

Recommended immediate command:

```powershell
Set-Location C:\Users\chris\erdos993_goal
python .\search_iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_root.py
```

If it is feasible, do not report success until an exact rational replay is
written and passes. If infeasible, record only a cone obstruction and move to
a higher-degree semiring, stronger actual-minor relations, or a structural
induction argument.

## 7. Marked-parent family — exact current boundary

### 7.1 Full pair reduction

The deleted and retained targets were reconstructed together:

```text
eta=0:
G1(A+x(A-u),B)-G1(A,B)

eta=1:
G1(A+x(A-u),B+x(B-u))-G1(A,B)
```

The retained response remains coupled. Sixteen
geometry/state/mark-retention branches collapse to eight q-free full-forest
classes: two deleted and six retained. Every class is strictly positive on
the exact order-8/10 collar, with minima between `1848` and `3378`.

Artifacts:

```text
derive_iso_n6_bundle_g1_marked_parent_pair_qfree_lower_root.py
  8CB2E7F5A386062A0DA4492257222B86A14F4FEEC921EF5FA45B15C1BA326128
iso_n6_bundle_g1_marked_parent_pair_qfree_lower_exact_root_20260901.json
  715750BD2652F77277C79303296972A383FF08AE288CF34A1A70A9D6E5066B5F

audit_iso_n6_bundle_g1_marked_parent_pair_qfree_lower_independent_root.py
  276C8FD0DE982F0CAFC6688E8859B25E4B20B891FAAE5DB2D50379A37B2E728D
iso_n6_bundle_g1_marked_parent_pair_qfree_lower_independent_audit_root_20260901.json
  E5008550DB27119C99142F1007B69C37C57D509D9538D1F2AA958EC1864821B2
  marker PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_PAIR_QFREE_LOWER_ROOT
```

The independent audit matches both literal targets, all 16 branches, all
eight class hashes, and `490,048/490,048` direct forest/minor checks, with
minimum exact-minus-lower `0`.

### 7.2 Mask dominance: eight classes reduce to four sign cores

In each geometry, the two one-retained-mark expressions equal the retained
mask-00 core plus the same coefficientwise positive polynomial `D`; the
two-retained-marks expression equals the core plus `2D`. Therefore the only
genuine all-order signs are:

```text
adjacent_t0_u0_v0
adjacent_t1_u0_v0
nonadjacent_t0_u0_v0
nonadjacent_t1_u0_v0
```

Artifacts:

```text
derive_iso_n6_bundle_g1_marked_parent_pair_mask_dominance_root.py
  84F60823AFF822D8C4B244AAA4913AD6E34E01739097059F0D9A0A8968CBEACE
iso_n6_bundle_g1_marked_parent_pair_mask_dominance_exact_root_20260901.json
  C6A4BE2F13B3D2DED11AAFA753F44CB717BB709AF530518583A1CF1454E56602

audit_iso_n6_bundle_g1_marked_parent_pair_mask_dominance_independent_root.py
  F5BB6F98DC989FABB6340BE2C3858BB44D5CE026114C642EC64C5D67721F5755
iso_n6_bundle_g1_marked_parent_pair_mask_dominance_independent_audit_root_20260901.json
  00CF63EF72E4C8A1E60F6A3732D58492E167BDA4210519878F3C5D94A1D76411
```

### 7.3 Search status

A degree-two screen containing the natural valid generators is infeasible for
all six q-free leaf cores (the two retained-isolate targets and four
marked-parent targets):

```text
search_iso_n6_bundle_g1_leaf_qfree_degree2_screen_root.py
  68C4ED310A3E9627189426566F5934D94BC864C53261169A3B71048F8A2566B6
iso_n6_bundle_g1_leaf_qfree_degree2_screen_root_20260901.json
  6FD1784393ECFA25C2B49F59BFD9355715B552E47169A31B37C9A5EA0BA9418F
```

The strongest degree-four adjacent deleted-core search is also infeasible:

```text
iso_n6_bundle_g1_marked_parent_pair_t0_adjacent_common_low_frozen_ipm_search_root_20260901.json
  0233E280B524319E3DB738BEF42FFB7C5B6A64F59EE2022154D521326DB586B3
  490,989 atoms, 315 frozen cells
```

Prepared but not run:

```text
search_iso_n6_bundle_g1_marked_parent_pair_t1_adjacent_common_low_frozen_ipm_root.py
search_iso_n6_bundle_g1_marked_parent_pair_t0_nonadjacent_common_frozen_ipm_root.py
search_iso_n6_bundle_g1_marked_parent_pair_t1_nonadjacent_common_frozen_ipm_root.py
```

Before running the nonadjacent marked searches, adapt them to import the new
`CR6=i_6(R)` and `G4` cells from Section 6.3. Running the older weaker cone is
unlikely to add information.

## 8. Ordinary-parent family — exact current boundary

### 8.1 Rejected `H`-only relaxation

Sequentially eliminating `J`, `L`, and `K` produced 56 `H`-only expression
classes but destroyed essential coupling. On the exact order-8/10 collar it
has:

```text
142,913 negative lower cells
minimum -155,576
```

Artifacts:

```text
derive_iso_n6_bundle_g1_ordinary_parent_hfree_lower_root.py
  26F78EA8929113CD38A3C79137FD451902B77F08AAAD2B9228CC8022A72700EA
iso_n6_bundle_g1_ordinary_parent_hfree_lower_exact_root_20260901.json
  EC422B288A9C35103E1FD2B705D5BAC801D7BE3E8190BBBDCD59218BCE228110
```

This is not a counterexample to the original square. Do not retry this
relaxation without preserving new coupling information.

### 8.2 Valid `H--K` reduction

Keeping the actual induced subforest `K` while eliminating only `J<=H`,
`L<=K`, and the two order intervals gives 56 exact sufficient `H--K` lower
classes. `K` and its order remain explicit.

Artifacts:

```text
derive_iso_n6_bundle_g1_ordinary_parent_hk_lower_root.py
  EF7F91649A15386DB33EF8B4472ADB5072F7799246F6627ADAABC9C2ABAA3713
iso_n6_bundle_g1_ordinary_parent_hk_lower_exact_root_20260901.json
  22F1F54F597B2CBA68CD24BC547D1C36075B2BE73DCC0416699CEADEF4E02CDF
```

For an actual ordinary parent, `K` is obtained from `H` by deleting the
parent's neighbors. Because the completed graph is a forest, that deletion
set contains at most one vertex from each component of `H`.

An exact order-eight census over every nonisomorphic `H`, every marked pair,
and every such realizable `K` found:

```text
76 forests
2,715 attachable H--K relation instances
745,564 applicable class cells
0 negative cells
global minimum 2751
```

Artifacts:

```text
census_iso_n6_bundle_g1_ordinary_parent_hk_lower_n8_root.py
  A3A989C7BF526D9612B0A1C5873AE6AF2FA2DCEC2E318BCB7F650D14497D9274
iso_n6_bundle_g1_ordinary_parent_hk_lower_n8_census_root_20260901.json
  08CD091C18BFEE1C87C42E7B4872D23C6CFF2B84BE4414F5C50FA47C54CF95BE
```

This is strong evidence that preserving `K` repaired the false relaxation,
but it is still only an order-eight census.

### 8.3 `J`-mask dominance: 56 classes reduce to 24 cores

For every geometry, `epsilon`, `eta`, and `K` mask, the `j10` and `j01`
classes equal the `j00` core plus respective coefficientwise nonnegative
polynomials; `j11` adds their sum. Hence only 24 unique `j00` class hashes
remain.

Artifacts:

```text
derive_iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_root.py
  03B83FBBE630B1FFFBEB8DD42F88A43609029114CE23A46B0FCCB5F1D4441D72
iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_exact_root_20260901.json
  7B25D57EBEE367C236AA48CB9565877898BA093C27DE68ACB46CA46710D349D6

audit_iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_independent_root.py
  FA0292895A0CFF3C104A961372A39C11FB405280747000CF2D022995C5C194EE
iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_independent_audit_root_20260901.json
  338225DD6409F8107C3967267F9ABF6C734BD494E7F62A8BFC9A7DFA0978222C
```

### 8.4 Important next structural reduction

This observation was identified but has **not yet been frozen as a producer
and independent audit**:

- If the marks `u,v` are adjacent in `H`, an actual ordinary parent cannot
  delete both of them when forming `K`; otherwise the parent, `u`, and `v`
  form a cycle/triangle.
- Equivalently, the adjacent `K`-mask `k00` is impossible in the actual
  ordinary-parent domain.
- Freezing this scope lemma should remove four of the 24 `j00` cores, leaving
  20 actual cores.

Do not simply delete the four classes from an assembly. Write a tiny exact
structural producer and independent partition audit first.

### 8.5 Highest-value proposed search

The best unimplemented next route is a degree-two `H--K` cone for the 24 (or
20 after the structural audit) cores. Build it around the actual relation,
not the rejected `H`-only lower.

Recommended generators:

1. nonnegative monomials in the `H` and `K` marked occupation coordinates;
2. exact order constraints and category containment `K<=H`;
3. the star-attachable condition: the deleted set has at most one vertex per
   component of `H`;
4. forest extension/pair constraints separately on `H` and `K`;
5. every frozen `G2,...,G10` cell on legitimate pairs
   `H_state -> K_state`;
6. internal frozen cells on the mark-deletion states of `H` and of `K`.

For each index `2,...,10`, the valid cross pairs are

```text
(E,E), (E,U), (E,V), (E,W),
(U,U), (U,W),
(V,V), (V,W),
(W,W).
```

The internal state/zero pairs are the usual 13-pair list already used in the
q-free search scripts. Cache the cone by `(geometry,K-mask)` and solve the
four `(epsilon,eta)` right-hand sides against the same matrix. This is far
smaller and more structurally faithful than the 490k-atom q-free cones.

If a floating support is found, reconstruct its rational coefficients and
replay the exact polynomial identity before declaring any core closed.

## 9. Cone obstructions and routes not to repeat blindly

All of the following are cone/no-go results, not target counterexamples:

```text
iso_n6_bundle_g1_retained_isolate_qfree_handelman_frozen_monomial_obstruction_root_20260901.json
iso_n6_bundle_g1_retained_isolate_qfree_adjacent_mark_neighborhood_ipm_search_root_20260901.json
iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_compatible_ipm_search_root_20260901.json
iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_frozen_ipm_search_root_20260901.json
iso_n6_bundle_g1_retained_isolate_qfree_mark_cross_edge_lifted_ipm_search_root_20260901.json
iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_low_frozen_ipm_search_root_20260901.json
iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_frozen_ipm_search_root_20260901.json
iso_n6_bundle_g1_marked_parent_pair_t0_adjacent_common_low_frozen_ipm_search_root_20260901.json
iso_n6_bundle_g1_leaf_qfree_degree2_screen_root_20260901.json
```

Interpretation:

- adding more monomial multiples of the same insufficient constraints is
  unlikely to help;
- seek a missing structural coordinate/relation, a more faithful coupled
  domain, a higher-degree semiring with genuinely new products, or a direct
  induction/telescoping identity;
- the ordinary-parent `H--K` route is especially promising because its first
  exact collar repaired the only known coarse negative cells.

## 10. Concrete continuation order

Use this order unless new exact evidence changes it:

1. **Freeze and independently audit the adjacent-`k00` impossibility** in the
   ordinary-parent actual domain. Update the core list from 24 to 20 only if
   the audit passes.
2. **Build the cached `H--K` frozen-cell degree-two screen** described in
   Section 8.5. This is the highest-value new computation.
3. **Run the prepared strengthened nonadjacent retained-isolate `G4...G10`
   search**. Its output is new information; the older nonadjacent cone is
   already exhausted.
4. **Adapt the nonadjacent marked-parent core searches to the new `CR6/G4`
   coordinate** before running them.
5. If any search is floating-feasible, immediately write a separate exact
   rational replay and a separate independent auditor.
6. If all faithful cones fail, move to a direct leaf-induction or component
   convolution proof while preserving the exact three-family coupling.
7. Once all three rank-six `G1` families are proved, build a fail-closed
   universal `G1` assembler that checks the leaf-mode partition and every
   dependency hash.
8. Re-run the all-`N6` integration, propagate ranks 6 and 7, and connect the
   low Newton indices `m=0,...,7` to the already frozen terminal `m>=8` tail.
9. Assemble `WR+ISO+TAIL`, independently replay the whole proof, and only then
   refresh the current literature and state that Problem #993 is solved.

## 11. Replay and hash commands

PowerShell examples:

```powershell
Set-Location C:\Users\chris\erdos993_goal

# Re-run a producer/audit.
python .\derive_iso_n6_bundle_g1_marked_parent_pair_mask_dominance_root.py
python .\audit_iso_n6_bundle_g1_marked_parent_pair_mask_dominance_independent_root.py

# Verify bytes.
Get-FileHash .\iso_n6_bundle_g1_marked_parent_pair_mask_dominance_exact_root_20260901.json -Algorithm SHA256

# Start the prepared new nonadjacent retained-isolate search.
python .\search_iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_root.py

# Inspect only relevant running jobs.
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -like 'python*' -and $_.CommandLine -match 'iso_n6_bundle_g1|erdos993_goal' } |
  Select-Object ProcessId,CommandLine
```

Do not overwrite a certified source after recording its source hash. Prefer a
new versioned producer/report if a derivation is strengthened.

## 12. Current machine/task state at handoff

- No proof Python process is running.
- No subagent is running; the previously named agents are completed or
  usage-errored historical entries.
- The three long jobs that had been running all finished with cone
  infeasibility:
  - strongest adjacent retained-isolate cone;
  - older nonadjacent retained-isolate common-minor cone;
  - strongest adjacent deleted marked-parent core cone.
- No theorem gate was closed by those verdicts.
- The exact new progress immediately before this handoff is:
  - full marked-parent pair independently audited;
  - marked-parent eight-to-four mask dominance independently audited;
  - nonadjacent common-minor `G4` layer proved and replayed;
  - ordinary-parent `H--K` reduction derived;
  - its entire exact order-eight realizable collar strictly positive;
  - ordinary-parent 56-to-24 `J`-mask dominance independently audited.

## 13. What a legitimate final proof still has to contain

A final document must explicitly include, or dependency-pin exact files that
include:

1. the frozen rank-four/rank-five foundation;
2. universal rank-six `G2,...,G10`;
3. universal rank-six `G1` with a gapless proof of all three leaf families;
4. a leaf-mode scope audit proving no geometry/state is omitted;
5. all-`N6` integration and rank-6/7 propagation;
6. the low-index Newton join and the terminal `m>=8` tail;
7. the `WR+ISO+TAIL` assembly;
8. an independent replay of all algebra, partitions, and dependency hashes;
9. a current primary-source literature check showing no known prior proof or
   counterexample was missed.

Until all nine are present, the correct status is **substantial exact
progress, theorem still open**.
