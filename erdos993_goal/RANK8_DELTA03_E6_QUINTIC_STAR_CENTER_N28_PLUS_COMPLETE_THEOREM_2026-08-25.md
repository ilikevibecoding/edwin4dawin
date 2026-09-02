# Rank eight: exact Delta0--3 `e=6` quintic-star center values

Date: 2026-08-25

Status: **exact PASS for the unique center-root orbit of the five-arm
`e=6` star at every order `n>=28`, with a fail-closed independent direct-path
and literal adjacency-list DP audit.**

## Exact theorem

Let `T` be any subdivision of the five-arm star, with all five arm lengths
positive, and let `q` be its unique degree-five center.  If `|T|=n>=28`, then
all four rank-eight rooted terminal values

```text
Delta0(T,q), Delta1(T,q), Delta2(T,q), Delta3(T,q)
```

are strictly positive.

This is `e6_skeleton_01` in the independently audited surplus-six structural
partition.

## Exact no-gap short/long partition

Each arm is uniquely either short, with fixed length in `1,...,6`, or long,
with length `X+7` for a nonnegative offset `X`.  Arm symmetry gives the
following disjoint cells.

| Number of long arms | Cells |
|---:|---:|
| 5 | 1 |
| 4 | 6 |
| 3 | 21 |
| 2 | 56 |
| 1 | 126 |
| 0 | 7 |
| **Total** | **217** |

The seven zero-long cells are exactly the unordered five-tuples in
`{1,...,6}` whose sum is at least 27; they cover the all-short orders 28 to
31.

For a cell with `m>=1` long arms and fixed short arms, let `b` be its order
when all long offsets vanish.  The condition `n>=28` forces the long-offset
sum to be at least `N=max(0,28-b)`.  By symmetry and the pigeonhole principle,
one long offset is at least `ceil(N/m)`.  Subtracting that fixed shift from a
distinguished arm places every admissible source in the corresponding
nonnegative orthant.  The remaining long arms are grouped as two pairs plus
a single, two pairs, one pair plus a single, one pair, or one single as
`m=5,4,3,2,1`, respectively.

This proves the 217 cells are pairwise disjoint at the short/long-pattern
level and exhaust every center-rooted five-arm subdivision at `n>=28`.

## Exact coefficient certificate

The producer constructs `c3,...,c8,h6,h7` in each cell, substitutes them into
the canonical residual, and expands in the nonnegative grouped offsets.  All
power-basis coefficients are strictly positive.

| Rank | Cells | Coefficients | Negative | Zero | Minimum |
|---|---:|---:|---:|---:|---:|
| Delta0 | 217 | 20,125 | 0 | 0 | 1/2633637888000 |
| Delta1 | 217 | 20,125 | 0 | 0 | 1/2304433152000 |
| Delta2 | 217 | 18,781 | 0 | 0 | 1/121927680000 |
| Delta3 | 217 | 17,492 | 0 | 0 | 41/365783040000 |

Thus all 76,523 exact coefficients are positive, proving strict positivity
throughout every covered orthant.

## Independent direct-path and literal-DP audit

The audit does not import the producer's two-long-path compression.  It first
proves 102 zero polynomial identities directly in the two original path
offsets: excluded-path grades 0 through 8 and center-included reduced grades
0 through 7, for every distinguished shift `0,...,5` used by the partition.

It then reconstructs every cell as a product of five individual path
polynomials and independently substitutes those profiles into the canonical
residual.  All 868 ordered rank-cell term digests and all 76,523 coefficients
match the corrected producer report exactly.

Finally, every profile coordinate has degree at most eight in each grouped
variable.  The audit therefore evaluates the complete Cartesian uniqueness
grid `0,...,8` in every variable, totaling 4,561 grouped points.  It also
tests axis and balanced splits inside each paired long-arm sum.  This produces
8,901 literal five-arm trees.  For every tree, the audit builds a fresh
adjacency list and recursively runs include/exclude DP on the core and on the
center-deleted forest.

All 17,802 logical forest-DP runs and 71,208 profile-coordinate comparisons
agree, with zero digest mismatch and zero negative coefficient.

## Fail-closed boundary

This theorem seals only the unique center-root orbit of `e6_skeleton_01` for
orders `n>=28`.  The leaf and pendant-interior root orbits of this skeleton,
all root orbits of the other nine surplus-six skeletons, leaf-extension
increments, and the complete `e=6` layer remain separate obligations.  It is
not a proof of Erdos Problem 993.

## Immutable evidence hashes

```text
prove_rank8_delta03_e6_quintic_star_center_n28_plus_agent_20260825.py
D0F02C2F85C8A4B2C37CB1B48A26C5C13854E7EC9B4B0A679B580A49EBDD1556

rank8_delta03_e6_quintic_star_center_n28_plus_exact_agent_20260825.json
58F96E12D4F158F49F192F5B8086BE7B804B68FC78B690CE579BE1F0E2F9AD16

audit_rank8_delta03_e6_quintic_star_center_n28_plus_agent_20260825.py
28F29E1ADF4C430845D459C04B91B28F128DDB336CA13D11F226004CBF9F65A1

rank8_delta03_e6_quintic_star_center_n28_plus_independent_audit_agent_20260825.json
282BF13261F6E9B3576573171BF0C5D1821C55F9745ED6824C0C93CEF19ADAEF

assemble_rank8_delta03_e6_quintic_star_center_n28_plus_gate_agent_20260825.py
336FED016A36A264D8BFCC4C3E6B333D4BFC2FD9100BD80C219C6F0F0A4FF433

rank8_delta03_e6_quintic_star_center_n28_plus_gate_exact_agent_20260825.json
FF5CA4FC0F35B09B15A72E0D59287258C5344F9C70AAA9FEE087436C216FF76C

rank8_delta03_e6_skeleton_root_partition_exact_20260825.json
B8D2D160F679361AED1D337B9E814DA6B985ACCD19434DF629887DE0E7AE5307

rank8_delta03_e6_skeleton_root_partition_independent_audit_20260825.json
247DF3AC57F265839055CCF258BCC1E946A0470BAE83F2B79E61F1D8BD17E65F

verify_rank8_q8_terminal_reduction.py
389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7
```
