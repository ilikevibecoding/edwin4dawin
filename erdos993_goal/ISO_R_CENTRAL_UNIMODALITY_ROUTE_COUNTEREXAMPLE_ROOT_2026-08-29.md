# Exact obstruction to the global R central-unimodality route

Date: 2026-08-29

Status: **exact finite counterexample to the componentwise `C_r >= 0`
route.** This is not a counterexample to the coupled isolate recurrence,
forest ISO, or Erdős Problem 993.

## Proposed payment that fails

For a marked forest `(B;u,v)`, put

```text
E=I(B), U=I(B-u), V=I(B-v), W=I(B-{u,v})
```

and define the symmetric derivative-free form

```text
R(z,w)=z^2 E(w)W(z)+w^2 E(z)W(w)
       +zw[U(w)V(z)+U(z)V(w)].
```

The exact isolate hierarchy has the curvature payment

```text
C_r=R_(r-1,r-1)-R_(r-2,r).
```

Thus central unimodality of every homogeneous slice of `R`, or equivalently
two-variable Schur positivity of those slices, would force `C_r >= 0`.
That assertion is false for a forest at an applicable isolate rank.

## Twelve-vertex witness

Let `B` be the disjoint union of

1. an isolated marked vertex `u=0`; and
2. an 11-vertex spider with arm lengths `2,2,2,4`.

Use vertices `1,...,11` for the spider, edges

```text
(1,2), (1,3), (1,5), (1,7),
(2,9), (3,4), (5,6), (7,8),
(9,10), (10,11),
```

and mark `v=2`, the first vertex on the length-four arm
`1-2-9-10-11`.

This marked forest is forest-realizable in the nested-leaf construction:
attach one new leaf at `u` and one at `v`. The two new leaves are
nonsiblings, and deleting them recovers exactly `(B;u,v)`.

Literal enumeration of all independent vertex subsets gives

```text
E=(1,12,56,132,168,111,31,1)
U=(1,11,45,87,81,30,1)
V=(1,11,47,100,112,63,15,1)
W=(1,10,37,63,49,14,1).
```

Hence `alpha(B)=7`. At `r=8=alpha(B)+1`, the upper rank that becomes
available after adjoining one unmarked isolate, the four defining products
give

```text
R_(6,8) = 0 + 31 + 0 + 30 = 61,
R_(7,7) = 14 + 14 + 15 + 15 = 58.
```

Therefore

```text
C_8=R_(7,7)-R_(6,8)=58-61=-3.
```

Equivalently, the degree-14 homogeneous slice of `R` has Schur coefficient
`[s_(7,7)]R=-3`. This is an exact obstruction to any all-forest induction
that pays the isolate hierarchy by proving `C_r` separately nonnegative.

## Exact scope boundary

The adjacent nested term on this witness is

```text
M_8=2N_(7,8)=2036,
```

so the actual coupled isolate payment is still positive:

```text
G_8=M_8+C_8=2033.
```

Thus the counterexample does **not** refute the isolate third-leaf
recurrence. It shows that the cancellation between `M_r` and `C_r` cannot
be discarded. A viable continuation must keep a coupled cone such as
`M_r+C_r`, or find a different payment; separate global Schur positivity of
`R` is unavailable.

No claim about `J_r` is made. One failed necessary component is enough to
rule out the proposed componentwise `C_r,J_r` positivity induction.

## Minimal-order exact census

The verifier constructs every unlabeled forest through order 11 uniquely as
a multiset of nonisomorphic tree components, then checks every unordered
marked pair and every rank `2 <= r <= alpha+1`. It covers

```text
1,346 forests
62,715 marked pairs
431,764 rank cells
0 negatives
minimum C_r = 1.
```

Together with the witness above, this proves that order 12 is the first
possible order for a negative applicable `C_r` among all marked forests.
The fixed witness itself is recomputed by a separate literal subset
enumeration, independent of the rooted-forest dynamic program used by the
minimal-order census.

## Replay and pins

Run

```powershell
python .\verify_iso_r_central_unimodality_route_counterexample_root.py
```

It ends with

```text
PASS_EXACT_ISO_R_CENTRAL_UNIMODALITY_ROUTE_COUNTEREXAMPLE
```

SHA-256 pins:

```text
verify_iso_r_central_unimodality_route_counterexample_root.py
F3C830F44AA46B1ECD49CFE980CDBD31BDEF45C6945DC651C7100A642BF49060

iso_r_central_unimodality_route_counterexample_exact_root_20260829.json
693D7520BAAFA03FC1B483020A211DC0CDA0D2D23D4D88146D5DFE41FBDAA203
```

The source and report hashes are also recorded in
`iso_r_central_unimodality_route_counterexample_sha256_root_20260829.txt`.
