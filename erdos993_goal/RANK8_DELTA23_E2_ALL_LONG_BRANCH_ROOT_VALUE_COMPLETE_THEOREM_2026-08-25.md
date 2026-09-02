# Rank eight: exact Delta2/Delta3 all-long `e=2` branch-root value cell

Date: 2026-08-25

Status: **exact PASS, with a complete ordered coefficient certificate and an
independent literal adjacency-list/include-exclude DP replay.**

## Exact theorem

Let `T=T(A,B,C,D,G)` be the double-claw tree whose two degree-three branch
vertices are joined by a path of length `G+8`, and whose four pendant-arm
lengths are

```text
A+7, B+7, C+7, D+7,
```

where `A,B,C,D,G` are arbitrary nonnegative integers.  Let `q` be either one
of the two degree-three branch vertices.  Then the rank-eight rooted residual
at `(T,q)` has strictly positive `Delta2` and `Delta3` values.

The order is

```text
n = 37 + A + B + C + D + G,
```

so this cell begins at order 37.  The statement covers both literal branch
vertices by reversing the two sides of the double claw.

## Exact reduction

For a path on `m` vertices, put

```text
p_k(m) = binom(m-k+1,k).
```

For grades `0<=k<=8`, the two-arm states of arms `A+7,B+7` depend only on
`S=A+B`.  Define

```text
Q_k(N) = sum_{j=0}^{floor(k/2)} p_(k-2j)(N-4j).
```

Then the state with the adjacent branch vertex excluded is `Q_k(S+14)`, and
the state with that branch vertex included is zero at grade zero and
`Q_(k-1)(S+12)` at grade `k>=1`.  Both the producer and the audit independently
expanded the direct two-path convolution and proved these identities as exact
zero polynomial differences through grade eight.  This eliminates the two
product coordinates `AB` and `CD` without treating them as independent graph
parameters.

Write `SL=A+B`, `SR=C+D`, and let `E_L,I_L,E_R,I_R` be the resulting excluded
and included state vectors.  With truncated polynomial multiplication through
grade eight, the core and left-branch-deletion profiles are exactly

```text
C = E_L E_R P_(G+7)
  + I_L E_R P_(G+6)
  + E_L I_R P_(G+6)
  + I_L I_R P_(G+5),

H = E_L (E_R P_(G+7) + I_R P_(G+6)).
```

Substitution into the immutable canonical residual makes each rank value a
polynomial in the three nonnegative integer coordinates `(SL,SR,G)`.  Safe
coordinatewise degree bounds are 27 for `Delta2` and 26 for `Delta3`; the
certificate deliberately includes the terminal zero slices.  Exact forward
differences give the Newton expansions

```text
sum a_(i,j,k) binom(SL,i) binom(SR,j) binom(G,k).
```

Every displayed coefficient is nonnegative and the origin coefficient is
strictly positive.  Therefore the value is strictly positive at every
nonnegative integer triple `(SL,SR,G)`.

## Complete ordered certificate

| Rank | Grid | Entries | Positive | Zero | Negative | Origin |
|---|---:|---:|---:|---:|---:|---:|
| Delta2 | `28^3` | 21,952 | 3,654 | 18,298 | 0 | 1030314348377467650729780480 |
| Delta3 | `27^3` | 19,683 | 3,276 | 16,407 | 0 | 610786420221289528579318400 |

The coefficient order is C order with `G` varying fastest, then `SR`, then
`SL`.  The exact ordered Newton-coefficient digests are

```text
Delta2  A56B5610A497B3428805844E9EA267CDDED15319FB11AD2651F4DCA204DED7D1
Delta3  F8337D2A379E6FE2575C8F7EBDAC2424A3BA42482981BBE140C25323AE128FDC
```

The total certificate contains 41,635 ordered sampled values and 41,635
ordered Newton coefficients.

## Independent literal-DP replay

The audit does not import the producer's compressed path engine.  For every
point of the larger `28^3` grid it constructs the literal representative with
arm lengths

```text
SL+7, 7, SR+7, 7
```

and bridge length `G+8`.  It runs a recursive include/exclude forest DP on the
literal adjacency list once for the core and once after deleting the selected
branch root.  Thus it reconstructs 21,952 distinct literal profiles with
43,904 forest-DP runs.  It then evaluates both canonical ranks and independently
repeats every finite-difference transform.  All 41,635 sampled-value entries
and all 41,635 Newton coefficients reproduce the producer's ordered digests.

The audit additionally performs 1,296 nontrivial literal arm-split comparisons
over 196 parameter rows, independently rederives the two-arm polynomial
identity, and directly checks right-root/left-root side reversal.  There are
zero digest mismatches and zero negative Newton coefficients.

## Fail-closed proof boundary

This package seals only the following cell:

```text
e=2 double claw
four pendant arms >= 7
branch-to-branch bridge >= 8
root at either degree-three branch
Delta2 and Delta3 rooted residual values
```

It is not an arbitrary-leaf strict-increment gate.  It does not cover an
inserted-new-leaf root, bridge-interior or pendant roots, an arm shorter than
7, a bridge shorter than 8, the complete `e=2` arbitrary-leaf layer, connected
`Q8`, forest `Q8`, rank-eight PGC, or Erdos Problem 993.

## Immutable evidence hashes

```text
prove_rank8_delta23_e2_all_long_branch_root_value_agent_20260825.py
DD99C567F24BC7970EDABE1FBF335FC639E18BE742C39848D75A2C699C377E58

rank8_delta23_e2_all_long_branch_root_value_exact_agent_20260825.json
1AECB3C08F2C4BDCE12F3AB3151AB32F00024D15F3168134C01645A5C94CB3A5

audit_rank8_delta23_e2_all_long_branch_root_value_agent_20260825.py
BB2F383DC750EAE39CBE03E4971B207EC99591225E588A75CA5E9ABAB77B9F09

rank8_delta23_e2_all_long_branch_root_value_independent_audit_agent_20260825.json
A2A5EC7ADFEF84CA81EB58CBE064A4589745CCF5FB55BA87CCE26A97E2F1E274

assemble_rank8_delta23_e2_all_long_branch_root_value_gate_agent_20260825.py
26DD7EAE428D5DBEB3D049617FFAD88397E2BB5EDFDC2ADBFB464757D167BDF3

rank8_delta23_e2_all_long_branch_root_value_gate_exact_agent_20260825.json
F98877F5E1B91C5A64A77A3D97868FC37342DEEF92E74959E4BEA2A4ECEF0E5B

verify_rank8_q8_terminal_reduction.py
389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7
```
