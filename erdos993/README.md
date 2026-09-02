# Erdős Problem #993 — exact computational foundation (independent replay)

Erdős Problem #993 is the Alavi–Malde–Schwenk–Erdős conjecture (1987): the
independence polynomial `I(F;x) = sum_r p_r x^r` of every tree (and forest) has a
unimodal coefficient sequence.  **The conjecture is open.  Nothing in this
directory proves it.**  See `docs/STATUS_2026-09-02.md` for the candid status
and for what the handoff programme still needs.

This directory is a self-contained, dependency-light, exact (integer-only)
verification suite, written from first principles so that it can serve as an
*independent replay* of the computational claims that the proof programme rests
on, and as a falsification search for its central open inequality (`ISO`).

## What is checked

For every non-isomorphic forest `F` on `n <= 22` vertices (and, via
`fast/treecheck.c`, every tree on larger `n`), with `alpha = deg I(F)` and
`L = ceil((2 alpha - 1)/3)`:

| name | statement | role |
|---|---|---|
| `UNIMODAL` | `p` is non-decreasing then non-increasing | the conjecture itself |
| `LC` | `p_r^2 >= p_{r-1} p_{r+1}` | log-concavity (also open for trees) |
| `ISO_r` | `r p_r^2 + p_{r-1}^2 >= (r+1) p_{r-1} p_{r+1}` | the programme's open payment inequality |
| `NW_r` | `r p_r^2 >= (r+1) p_{r-1} p_{r+1}` | weakened Newton; `NW_r => ISO_r` |
| `WR_r` | `p_{r-1} <= r p_r` | weak prefix ratio (needed for `2 <= r <= L-1`) |
| `TAIL` | `p_r >= p_{r+1}` for `L <= r <= alpha-1` | known decreasing-tail theorem |

`lemma_check.py` verifies the identity `r b^2 + a^2 - (r+1) a b = (r b - a)(b - a)`
symbolically; from it, `WR_r`, `ISO_r` and `p_{r-1} >= p_r` imply `p_r >= p_{r+1}`
(two-line proof in the docstring, plus an exhaustive integer-grid check), and
`TAIL` plus `WR_r`, `ISO_r` on the prefix `2 <= r <= L-1` imply unimodality
(prose proof, plus brute force on small sequences).  Hence the *only* open
ingredient of the `WR+ISO+TAIL` route is `ISO_r` (and `WR_r`) for all forests on
the prefix.

## Files

| file | purpose |
|---|---|
| `treegen.py` | two independent generators of unlabeled trees (WROM level sequences; canonical rooted trees + centre criterion), canonical forms |
| `counts.py` | A000081 / A000055 (Otter) / A005195 (Euler transform) computed from recurrences — used to certify completeness |
| `indpoly.py` | exact independence polynomials (rooted DP) and a brute-force reference |
| `checks.py` | the inequalities above, exact integer arithmetic only |
| `aggregate.py` | order-independent aggregation, extremal (tightest) cells, multiset hashes |
| `run_forests.py` | exhaustive run over all forests (and tree-only reports) for `n <= NMAX`, parallel |
| `lemma_check.py` | symbolic + finite verification of the descent lemma and the assembly |
| `iso2_theorem.py` | exact proof (machine-verified identities) that `ISO_2` holds for every forest |
| `extremal_families.py` | exact ISO ratios along the extremal families (stars, stars+isolates, double brooms, empty forest) |
| `known_counterexamples.py` | Kadrawi–Levit and Galvin non-log-concave tree families versus `ISO`/`WR`/`TAIL` |
| `selftest.py` | cross-validation of the two generators, DP vs brute force, count formulas |
| `certify_distinct.py` | certifies pairwise-distinct canonical forms + Otter count for the WROM enumeration up to `n = 22` |
| `crosscheck_independent.py` | compares the reports with the brute-force replay in `independent/` |
| `manifest.py` | SHA256 manifest of all sources and reports |
| `fast/` | C verifier for trees at larger `n` (WROM enumeration, `__int128` arithmetic) + cross-check vs Python |
| `independent/` | deliberately simple brute-force replay (2^n subsets) for `n <= 14` |
| `reports/` | JSON reports, one per `n`, plus summaries and the manifest |
| `docs/` | status, literature refresh, and the handoff-programme gap analysis |

## Headline results (all exact)

- Every forest on `n <= 22` vertices, every multi-component forest on `n = 23, 24`,
  and every tree on `n <= 28` vertices satisfies `UNIMODAL`, `ISO_r` (all `r`),
  `WR_r` on the prefix and `TAIL`.
- Log-concavity fails for exactly 2 trees at `n = 26`, none at `n = 27`, 19 at
  `n = 28`, and none at `n <= 25` (matching Kadrawi–Levit–Yosef–Mizrachi and the
  public record).
- Weakened Newton `NW_r` (= Basit–Galvin's *ordered log-concavity*, their
  Question 1.9) fails first at `n = 24` (exactly 1 tree, `3,3,4`, which is still
  log-concave), so it is not a valid universal strengthening; all failures found
  are in the tail.
- `ISO_2` is proved for all forests; the descent lemma and the assembly are
  verified symbolically.  The conjecture itself remains open.

## Running

```bash
cd erdos993
python3 selftest.py 14 10            # generators / DP / counts cross-checks
python3 certify_distinct.py 22       # PASS_TREE_ENUMERATION_DISTINCT_AND_COMPLETE
python3 lemma_check.py               # descent lemma and assembly (sympy)
python3 iso2_theorem.py              # ISO_2 for all forests (sympy identities + n<=11 replay)
python3 run_forests.py 22            # all forests and trees on n <= 22 (~10 min, 4 cores)
python3 run_forests.py 24 --nmin 23 --multi-only   # forests with >= 2 components, n = 23, 24
python3 independent/bruteforce_forests.py   # independent replay, n <= 11 (12/14 optional)
python3 crosscheck_independent.py    # CROSSCHECK_INDEPENDENT_PASS
make -C fast && fast/wromcheck --nmin 23 --nmax 28   # all trees, one JSON line per n (n=28: ~1.5 h)
make -C fast crosscheck              # CROSSCHECK_C_VS_PYTHON_PASS (n <= 22)
python3 known_counterexamples.py     # ISO on the known non-log-concave families
python3 manifest.py                  # hashes of sources and reports
```

`sympy` is required for `lemma_check.py` and `iso2_theorem.py`; `networkx` only for
`independent/bruteforce_forests.py`.  Everything else is standard library (Python 3.12) and C11.
