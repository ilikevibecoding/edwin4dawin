# Erdős Problem #993 — portable replay bundle

Snapshot: 2026-09-02

This bundle is the portable companion to
`ERDOS993_OTHER_MODEL_HANDOFF_2026-09-02.md`. It is intended to be attached
directly to another coding/research model; it does not require access to
`C:\Users\chris\erdos993_goal`, Google Drive, or the original 135 GB working
directory.

## Correct status

The theorem is still open. Gates 1–4 of the fixed six-gate ledger are closed;
Gate 5 (universal rank-six `G1` and its downstream joins) is open, and Gate 6
is final assembly/audit. The user-facing `94%` is frozen bookkeeping, not a
probability of success or a time estimate.

The package contains exact producers, reports, independent auditors, and their
recursive local Python/data dependencies. It is evidence that can be replayed;
it is not a completed proof.

## Start here

1. Read `ERDOS993_OTHER_MODEL_HANDOFF_2026-09-02.md` in full.
2. Run `python verify_portable_manifest.py` from this directory.
3. Inspect the exact rank-six boundary and do not relabel cone infeasibility as
   a counterexample or floating feasibility as a proof.
4. Work on the specific open rank-six `G1` program in Sections 8.4, 8.5, and
   10 of the handoff.

## Environment used for the snapshot

- Python 3.12.10
- networkx 3.6.1
- numpy 2.3.5
- scipy 1.18.0
- sympy 1.14.0
- python-flint 0.9.0

Install equivalents with:

```text
python -m pip install -r requirements-lock.txt
```

## Short exact replay

```text
python verify_portable_manifest.py
python derive_iso_n6_bundle_g1_marked_parent_pair_mask_dominance_root.py
python audit_iso_n6_bundle_g1_marked_parent_pair_mask_dominance_independent_root.py
python audit_iso_n6_bundle_g1_marked_parent_pair_qfree_lower_independent_root.py
python audit_iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_independent_root.py
python audit_iso_n6_bundle_g1_retained_isolate_qfree_reduction_independent_root.py
```

Some full producers/searches are computationally heavy. Existing reports and
their hashes are included so a reviewer can inspect them before choosing what
to rerun.

## Do not duplicate the broad stress tests

The proposed check of known hard trees is useful in principle but is already
substantially represented in this archive:

- exact exhaustive tree unimodality through order 29;
- the PatternBoost non-log-concave corpus and product surface;
- Galvin, Bautista–Ramos, Li/Kadrawi–Levit style families;
- forest products, powers, and beam searches.

See `ADVERSARIAL_TREE_DP_SEARCH_2026-08-13.md`,
`CHECKPOINT_2026-07-23.md`,
`CHORDAL_DRIFT_AND_ISO_RESERVE_CASCADE_2026-07-28.md`, and
`DENOMINATOR_FREE_LEAF_MONOTONICITY_CANDIDATE_2026-07-29.md`.
Those tests are non-proof support. The decision-relevant bottleneck remains a
universal proof (or exact counterexample) for rank-six `G1`.

## Integrity

`MANIFEST_SHA256.txt` pins every bundled file except the manifest itself.
`verify_portable_manifest.py` checks missing, altered, and unexpected files.

