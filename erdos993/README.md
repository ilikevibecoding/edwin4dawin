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
