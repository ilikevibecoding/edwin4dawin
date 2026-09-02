# Rank eight: exact Delta2/Delta3 all-long leaf-root values

Date: 2026-08-25

Status: **exact PASS for every leaf root in the all-long `e=2` double-claw
source class, with an independent original-coordinate symbolic derivation and
literal adjacency-list include/exclude DP replay.**

## Exact theorem

Let `T` be an `e=2` double-claw tree whose four pendant-arm lengths are all at
least 7 and whose branch-to-branch bridge length is at least 8.  Let `q` be
any one of its four degree-one pendant leaves.  Then the rank-eight rooted
residual value at `(T,q)` is strictly positive at both `Delta2` and `Delta3`.

This covers all four leaf orbits, including arm swaps and branch reversal.

## Exact parameterization and the deleted-leaf boundary

Write the arm and bridge lengths as

```text
A+7, B+7, C+7, D+7, G+8
```

with all five offsets nonnegative.  Thus

```text
n = 37 + A+B+C+D+G.
```

Choose the endpoint of the `A+7` arm as the root.  After deleting that leaf,
the selected and paired paths incident with its branch have lengths `A+6`
and `B+7`.  The producer proves exact path-pair compression identities for
this asymmetric pair through grades 0 to 7.  This is exactly the deletion
range used by `h6,h7`; no grade-eight identity for the deleted asymmetric pair
is asserted or needed.  It also proves the ordinary 7/7 pair identities
through grade eight for the core polynomial.  There are 34 such exact pair
identities in total.

## Exact total-offset ray

The producer constructs the rooted coordinates

```text
c0,c1,...,c8,h6,h7
```

and proves all eleven polynomial identities against one reference profile.
Every coordinate depends only on

```text
T = A+B+C+D+G = n-37,
```

not on the distribution of the offsets or the selected leaf orbit.  The
ordered power-coefficient digest of the reference profile is

```text
297C2FCAECD3F85EFD8EF68FBD5D406650562FE486AC94F3067DC1FC5FBD0538
```

The audit independently rederives the eleven identities from direct products
of the original five path offsets.  It does not import the producer's
compressed pair formulas.

## Univariate positivity certificate

Substitution in the canonical residual gives a polynomial in `T`.  Safe
degree bounds 27 and 26 retain one terminal zero guard at `Delta2` and
`Delta3`, respectively.

| Rank | Entries | Actual degree | Positive Newton | Zero | Negative | Origin |
|---|---:|---:|---:|---:|---:|---:|
| Delta2 | 28 | 26 | 27 | 1 | 0 | 957538257268661710124672000 |
| Delta3 | 27 | 25 | 26 | 1 | 0 | 572576372299443394836720640 |

The ordered coefficient digests, in increasing degree/order and including
the terminal zero, are

```text
Delta2 sample   F1130DB2AEBA493F908D1F3B9E2543B37BFB8445D724975B27A304863DB0EFE7
Delta2 Newton   EEA7C9120B66E4B59FC9C8B3375079DC38EDCD97E412A6C58A044D20AFF5D704
Delta2 power    339C2C3755C0CD19D0A30FF0F4E8C1CCA952DAAD3560E884E7C380EB53B1516B
Delta3 sample   A3ABA4C73441BF436A780DFB11C2D5F71A7EEDC3AB6EE788F818E3D3ABD99292
Delta3 Newton   9D182A824697729FD6E6FF4EF58403E971E9F28925C9548B2E46E15F9DA99533
Delta3 power    DF62DD4A4BDDC388A361DC9EE742EADA3D197987D4E1AE6770E13F4D5C18FB72
```

Every Newton coefficient is nonnegative and the origin is strictly positive,
so the rooted value is strictly positive for every integer `T>=0`.

## Independent literal-DP audit

For every `T=0,...,27`, the audit places the total offset on each of the five
literal coordinates and on a balanced five-part composition.  For every
composition it selects each of the four actual endpoint roots.  It builds the
literal adjacency list and recursively computes the core and root-deleted
forest independence polynomials by include/exclude DP.

All 672 literal profile comparisons agree.  The audit then independently
rebuilds all 55 ordered samples, 55 Newton coefficients, and 55 power
coefficients.  Every digest matches and no coefficient is negative.

## Fail-closed boundary

This theorem proves only the rooted residual **VALUE** for leaf roots in the
stated all-long `e=2` source class.  It is not a leaf-extension increment, an
inserted-new-leaf theorem, a short-edge theorem, a complete `e=2` theorem, or
a proof of Erdos Problem 993.

## Immutable evidence hashes

```text
prove_rank8_delta23_e2_all_long_leaf_root_value_agent_20260825.py
61C407C7C94B2CB5CAE7E7E0F886B9C16FC82AF6F6701596AC4799D97424712F

rank8_delta23_e2_all_long_leaf_root_value_exact_agent_20260825.json
3E35AE742BBFEEE39D17DA7AAE2E3DA53B611220CCDC5FE9D950A129687EA5F5

audit_rank8_delta23_e2_all_long_leaf_root_value_agent_20260825.py
194DC2F0B2FEC0EDAE7E34B73E2F32F0E8B83AEFD5E75954D4079D2E21E95F7D

rank8_delta23_e2_all_long_leaf_root_value_independent_audit_agent_20260825.json
0CA7726FBFE149BDA2AAE9D4E7CAC5308BBB1B7EDFDA2ACCC6A71FFB9E87104D

assemble_rank8_delta23_e2_all_long_leaf_root_value_gate_agent_20260825.py
9145D30A5BF8148E04CB07151B4305B9440FD4A968E027787115E87647F99992

rank8_delta23_e2_all_long_leaf_root_value_gate_exact_agent_20260825.json
E850B13D91E6C09F95111F9413559E989E0DFB6D057245FB61F33DC6CA11F0B3

verify_rank8_q8_terminal_reduction.py
389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7
```
