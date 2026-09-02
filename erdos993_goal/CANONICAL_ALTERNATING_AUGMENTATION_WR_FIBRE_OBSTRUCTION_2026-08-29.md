# Canonical alternating augmentation does not prove the weak ratio

Date: 2026-08-29

Status: **exact route counterexample, not a counterexample to the coefficient
inequality or to Erdos Problem 993.**

Fix a maximum independent set `A` of a forest.  A natural attempt to prove

```text
i_(r-1) <= r i_r
```

is to match the non-`A` part of every independent `(r-1)`-set into `A`, start
at the first unmatched `A` vertex, take its alternating closure, and toggle
that closure.  This always produces an independent `r`-set.  The missing
claim would be that every target has at most `r` preimages.

The claim is false inside the required strict prefix.  Take seven matched
units `(a_i,c_i)`.  Add the six edges `a_0 c_i`, `1<=i<=6`, and add five new
leaves at `c_0`.  This is a 19-vertex tree with independence number 12.  Put

```text
A={a_0,...,a_6} union {the five new leaves},
T={a_0,...,a_6}.
```

The target has rank `r=7`, while the known decreasing tail starts at rank 8.
For every subset `J` of `{1,...,6}`, form a rank-six set by leaving the
zeroth unit empty and choosing `c_i` rather than `a_i` exactly when `i` is in
`J`.  Under the deterministic lexicographic matching and first-root rule,
all `2^6=64` sources toggle to the same target `T`; six additional sources
do too, so the exact target fibre is 70.  Thus the proposed fibre bound is
`70<=7`, which is false.  Counting all unmatched roots gives the same target
degree 70 against the needed double-count bound `7*6=42`.

The actual coefficient inequality remains comfortably positive on this
tree.  The obstruction therefore kills only this augmentation-fibre proof.

Replay:

```powershell
python .\disprove_canonical_alternating_augmentation_wr_fibre_root.py
```

Required marker:

```text
FAIL_EXACT_CANONICAL_ALTERNATING_AUGMENTATION_WR_FIBRE_BOUND
```
