# Rank eight: exact Delta2/Delta3 all-long shallow degree-two root values

Date: 2026-08-25

Status: **exact PASS for every shallow degree-two root in the all-long `e=2`
double-claw class, with an independent original-coordinate symbolic audit and
literal adjacency-list include/exclude DP replay.**

## Exact theorem

Let `T` be an `e=2` double-claw tree whose four pendant arms have lengths at
least 7 and whose branch-to-branch bridge has length at least 8.  Let `q` be a
degree-two vertex satisfying either condition below.

1. `q` lies on the branch bridge and has edge-distance at most 7 from at least
   one degree-three branch.
2. `q` lies on a pendant arm and has edge-distance at most 7 from its branch
   or edge-distance at most 6 from its pendant leaf.

Then the rank-eight rooted residual value at `(T,q)` is strictly positive at
both `Delta2` and `Delta3`.

This covers bridge reversal and every one of the four pendant-arm orbits.

## Exact finite-position partition

For a bridge root, let `l,r` be its numbers of intervening vertices to the two
branches, so its edge distances are `l+1,r+1` and the full bridge length is
`l+r+2`.  The all-long source condition is `l+r>=6`.  Each gap is assigned a
state

```text
0,1,...,6, or L=7+X.
```

The pair is unordered by bridge reversal.  Removing the `L,L` deep cell and
imposing `l+r>=6` leaves exactly 23 disjoint bridge patterns.

For a pendant root, let `a` be its branch distance minus one and let `b` be
its leaf distance.  The selected arm has length `a+b+1`, so `a+b>=6`.
Here `a` has states `0,...,6,L=7+X`, while `b` has states
`1,...,6,L=7+Y`.  Branch and leaf directions remain oriented.  Removing the
`L,L` deep cell and imposing `a+b>=6` leaves exactly 40 disjoint pendant
patterns.

Thus the shallow residue is a pairwise-disjoint, exhaustive 63-pattern
partition: 23 bridge patterns and 40 oriented pendant patterns.

## Exact shifted-ray certificates

For every pattern, the producer separately constructs

```text
c0,c1,...,c8,h6,h7
```

from its active original arm, bridge, and long-segment offsets.  It proves all
eleven coordinates depend only on the sum of those offsets.  Each pattern is
therefore one shifted univariate ray

```text
n = baseline(pattern) + T,   T>=0.
```

There are 693 exact profile identities.  Substitution into the canonical
residual produces 126 cells: 63 patterns at each of `Delta2` and `Delta3`.
Every `Delta2` cell has 28 guarded entries and actual degree 26; every
`Delta3` cell has 27 guarded entries and actual degree 25.  In every cell the
Newton coefficients are nonnegative, exactly one terminal guard is zero, and
the origin coefficient is strictly positive.  Hence every admissible point
on every ray is strictly positive.

The exact gate stores the ordered sample, Newton, and power digests for all
126 cells.  In total each basis contains 3,465 ordered entries.

## Independent symbolic and literal-DP audit

The audit does not use the producer's compressed pair-sum formulas.  It
reconstructs each of the 63 profiles from direct products of the original
path polynomials and independently proves all 693 profile differences are
zero.

For every pattern and every total `T=0,...,27`, it places `T` on each active
original coordinate and on a balanced composition.  It builds the literal
double-claw adjacency list, selects the actual root vertex, and recursively
computes the core and root-deleted forest independence polynomials by
include/exclude DP.  Bridge roots are also checked after reversal; pendant
roots are checked on all four physical arm orbits.

All 30,688 literal profile comparisons agree.  All 3,465 ordered samples,
3,465 Newton coefficients, and 3,465 power coefficients replay exactly, with
zero digest mismatch and zero negative coefficient.

## Fail-closed boundary

This theorem concerns only the shallow degree-two rooted residual **VALUE**
within the stated all-long `e=2` source class.  It does not import the
separately proved deep degree-two, branch-root, or leaf-root conclusions.  It
is not a leaf-extension increment, an inserted-new-leaf theorem, a short-edge
theorem, a complete `e=2` theorem, or a proof of Erdos Problem 993.

## Immutable evidence hashes

```text
prove_rank8_delta23_e2_all_long_shallow_degree2_root_value_agent_20260825.py
C87690BB5FD14BF754A91C924B05FECF137C0EEA19DE7706A43CD082D24D904A

rank8_delta23_e2_all_long_shallow_degree2_root_value_exact_agent_20260825.json
E174AC1AC8A97F92CB3F8AFBF2E0B9CE4CF5A37E9613C88F5E1F7AC822A2D5BA

audit_rank8_delta23_e2_all_long_shallow_degree2_root_value_agent_20260825.py
BCE8513D9F9F567BDB1459A8D60E4A859BEEAF30E6AD0523070016E2AB56F10B

rank8_delta23_e2_all_long_shallow_degree2_root_value_independent_audit_agent_20260825.json
09908413E7C1E82C673EE0B22EE64D4FCAE93BB7C4200967D3B59DF82F3CE17D

assemble_rank8_delta23_e2_all_long_shallow_degree2_root_value_gate_agent_20260825.py
CE0413C233B14339CF198F06A5ABBC305079FE983A85B3E3C55756E4CED138B4

rank8_delta23_e2_all_long_shallow_degree2_root_value_gate_exact_agent_20260825.json
5A4093B2CF0E85DB67CC253F6F05674A942DFF541DA896DB8E8C2CA480EF1614

verify_rank8_q8_terminal_reduction.py
389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7
```
