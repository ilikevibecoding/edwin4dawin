# Rank eight: exact Delta2/Delta3 all-long deep degree-two root values

Date: 2026-08-25

Status: **exact PASS for the maximal deep degree-two root family, with an
independent original-coordinate symbolic audit and literal adjacency-list
include/exclude DP replay.**

## Exact theorem

Let `T` be an `e=2` double claw with all four pendant-arm lengths at least 7.
Let `q` be a degree-two vertex in either of the following families.

1. `q` lies on the branch-to-branch bridge and has edge-distance at least 8
   from each degree-three branch vertex.
2. `q` lies on one of the four pendant arms, has edge-distance at least 8 from
   its adjacent degree-three branch vertex, and has edge-distance at least 7
   from the pendant leaf.  The branch-to-branch bridge has length at least 8.

Then the rank-eight rooted residual value at `(T,q)` is strictly positive at
both `Delta2` and `Delta3`.

This covers one bridge-path orbit and all four pendant-arm orbits, including
side and arm reversal.

## Two literal parameterizations

For a deep bridge root, write the four arm lengths as

```text
A+7, B+7, C+7, D+7
```

and the distances from `q` to the two branches as `N+8` and `M+8`.  The full
bridge length is `N+M+16`, and

```text
n = 45 + A+B+C+D+N+M.
```

For a deep pendant root, write its distance to the branch as `N+8`, its
distance to the leaf as `U+7`, the paired arm as `B+7`, the two far arms as
`C+7,D+7`, and the branch bridge as `G+8`.  The selected pendant arm has
length `N+U+15`, and

```text
n = 45 + N+U+B+C+D+G.
```

All six displayed offsets are arbitrary nonnegative integers.

## Exact translation theorem

The producer separately constructs the two rooted profiles through grade
eight.  For each family it proves the eleven identities

```text
c0,c1,...,c8,h6,h7
```

against one reference profile.  In both parameterizations every coordinate
depends only on

```text
T = n-45,
```

not on the distribution of `T` among the six original length offsets.  Thus
the deep bridge and deep pendant cells are the same rooted profile through the
entire grade range used by the canonical rank-eight residual.  The exact
ordered power-coefficient digest of that reference profile is

```text
15977F550E3A9054F881CC94038CFBDB7124AABF0D4FC15EBF53A9224732A66F
```

The audit independently rederives all 22 zero polynomial identities using
direct products of the original two path polynomials in six variables.  It
does not import the producer's pair-sum compression.

## Univariate positivity certificate

Substitution in the canonical residual gives a polynomial in `T`.  Safe
degree bounds 27 and 26 retain one terminal zero guard at `Delta2` and
`Delta3`, respectively.

| Rank | Entries | Actual degree | Positive Newton | Zero | Negative | Origin |
|---|---:|---:|---:|---:|---:|---:|
| Delta2 | 28 | 26 | 27 | 1 | 0 | 537643174690673426752170669168 |
| Delta3 | 27 | 25 | 26 | 1 | 0 | 237219183357050251226988091100 |

The ordered coefficient digests, in increasing degree/order and including
the terminal zero, are

```text
Delta2 Newton  AF7B435173B09E737589D673F22ABF6D0A9408F952ABC8B2E974CDF17D4F61CD
Delta2 power   8153A2A9EEE5A58C302D04CE47CA6F8B3C6E8ACDCDFC8D269A6B81EC83230DE5
Delta3 Newton  19C84F2EC3FB2770D0A1B463F94A74C452A2F906C85056BBC8A45119E3864856
Delta3 power   F2A74D5228F28456FAF3C5E58C56ABFA175DD9347B1A380BC36B92A5CCB8E002
```

Every Newton coefficient is nonnegative and the origin coefficient is
strictly positive.  Hence the value is strictly positive for every integer
`T>=0`.

## Independent literal-DP audit

For each `T=0,...,27`, the audit distributes `T` along each of the six literal
coordinates and along a balanced six-part composition.  It constructs the
actual double-claw adjacency list, selects the corresponding internal root,
and runs recursive include/exclude DP on the core and on the root-deleted
forest.  This is repeated on the bridge path and on each of the four pendant
arm orbits.

All 980 literal profile comparisons agree.  The audit then rebuilds all 55
ordered samples, all 55 Newton coefficients, and all 55 power coefficients;
every digest matches and no coefficient is negative.

## Fail-closed boundary

This theorem adds only the deep degree-two root family to the separately
sealed all-long branch-root family.  Still open within the all-long root
partition are:

- bridge vertices within seven edges of a branch;
- pendant-arm vertices within seven edges of their branch or within six edges
  of their leaf; and
- the four leaf roots.

This is a rooted residual **value** theorem.  It is not a leaf-extension
increment, an inserted-new-leaf gate, a complete all-long all-root theorem, a
complete `e=2` theorem, or a proof of Erdos Problem 993.

## Immutable evidence hashes

```text
prove_rank8_delta23_e2_all_long_deep_degree2_root_value_agent_20260825.py
6F28332C5B3B358BCBADAEF6E6772C5F8D51574B71157988139FCC462843D75F

rank8_delta23_e2_all_long_deep_degree2_root_value_exact_agent_20260825.json
04C1CF61D334CBA6FD4999CE75FF9B5D54DD90C3EB6CEBEA8C78577C16E29D26

audit_rank8_delta23_e2_all_long_deep_degree2_root_value_agent_20260825.py
88A6627902AB566E5CC741A780139D86381D771BB0784F6798E5D0BC8441610D

rank8_delta23_e2_all_long_deep_degree2_root_value_independent_audit_agent_20260825.json
61A7104F92E5CDECAFED12381E57FC472A873DDE12795E54ACFDE33C77909920

assemble_rank8_delta23_e2_all_long_deep_degree2_root_value_gate_agent_20260825.py
BFEB1C1F1FB8846E3F5CA8844678C3E95D7F65640EE91441C000DA350020B050

rank8_delta23_e2_all_long_deep_degree2_root_value_gate_exact_agent_20260825.json
9109C73747463308BD4FC03845CEF33A7DB350F7D5A758EDA58E10B86550F24B

verify_rank8_q8_terminal_reduction.py
389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7
```
