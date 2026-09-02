# Rank-eight Delta1 inserted-leaf gate from source order 36

## Theorem

Let `A` be a tree with `|A|>=36`, let `v` be any vertex of `A`, and form
`A+w` by adjoining a new leaf `w` at `v`.  In the rank-eight terminal-broom
decomposition rooted at `w`, the Newton `Delta1` residual is nonnegative.

This is a theorem about the inserted-leaf root gate.  It is not, by itself,
the complete rank-eight Q8 theorem or Erdős Problem 993.

## New boundary order

Put `D=A-v` and `F=A-N[v]`.  The previously sealed gate covered
`|D|>=36`, equivalently `|A|>=37`.  The new exact calculation covers
`|D|=35`.

For endpoint mask 3, the integer order of `F` is partitioned without gaps:

- `0<=|F|<=18`: the small-order absolute-cap box;
- `19<=|F|<=25`: seven exact cap-ratio bridges;
- `|F|=26`: the forest-Q5 joint bridge;
- `27<=|F|<=34`: four ordinary exact-order shards.

The primary assembly contains 556 rational boxes and 675,000 Bernstein
coefficients.  Every coefficient is strictly positive.  A no-import audit
reconstructs the canonical endpoint numerator and recomputes the same
675,000 coefficients.

## The `|F|=26` joint bridge

The separate bounds

`f4/f5 <= 115/342`,  `f6/f5 <= 7/2`

have one negative relaxed boundary point when imposed independently.  That
point is not jointly realizable by a forest.  The already proved rank-five
forest inequality

`10 f5^2-f4 f5-12 f4 f6 >= 0`

gives, for `r=f4/f5>0`,

`f6/f5 <= (10-r)/(12r)`.

The shadow cap and Q5 cap meet exactly at `r=10/43`.  Splitting there gives
eight exact boxes (four `x` slabs crossed with two coupling regions) and
19,200 strictly positive coefficients.  An independent canonical replay
matches all 19,200.

## Full gate assembly

Endpoint masks 0, 1, and 2 already hold for every `|D|>=26`.  The gate is
separately concave in its two top endpoint variables.  Combining those facts,
the mask-3 certificate at `|D|=35`, and the prior all-larger-order gate proves
the statement for every `|A|>=36`.

## Replays

```powershell
python prove_rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_delta1d35.py
python audit_rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_delta1d35.py
python audit_rank8_delta1_order35_bound_chain_delta1d35.py
python assemble_rank8_delta1_new_leaf_mask3_order35_delta1d35.py
python audit_rank8_delta1_new_leaf_mask3_order35_assembly_delta1d35.py
python assemble_rank8_delta1_new_leaf_gate_source36_delta1d35.py
python audit_rank8_delta1_new_leaf_gate_source36_delta1d35.py
```

The final fail-closed artifacts are:

- `rank8_delta1_new_leaf_gate_source36_delta1d35_20260825.json`;
- `rank8_delta1_new_leaf_gate_source36_independent_audit_delta1d35_20260825.json`.

Their SHA-256 digests are, respectively,

`B822BA3C62162D34DC8806A44435B6274E334BC1BCDA750973062DBA663EEED7`

and

`EE864DBA461EB41E24A1BB71253C7A52929A4456B5CC3FE21810EF811D2CC742`.

