# Terminal q3 Newton m=1: exact leaf-bridge correction

Date: 2026-08-29

Status: **exact row identity proved and directly checked against the canonical
terminal implementation; the all-order sign is open.**

This note is a reduction, not an all-forest `m=1` theorem.

## Setup

Let `G` be a forest with marked vertex `w`.  Let `u` and `v` be leaves in
different nontrivial components, with `u` in the component of `w` and
`u!=w`, and put `T=G+uv`.  Write `F=G-w` and `H=G-N[w]`.

For an induced subgraph `X` containing `u,v`, let

```text
K_X = I_(X-N_X[u]-N_X[v]).
```

Let `S_X` be the rank-indexed polynomial counting subsets that induce exactly
one edge.  If `J_X` is the sum of the two incident-edge residual independence
polynomials (omitting a summand when an endpoint is isolated in `X`), then
literal subset partitioning gives

```text
I_(X+uv) - I_X = -x^2 K_X,
S_(X+uv) - S_X = x^2 K_X - x^2 S_(K_X) - x^3 J_X.       (1)
```

The verifier checks both full polynomial identities for `X=G,F,H` before it
uses any terminal formula.  If an endpoint is deleted from `H`, the bridge is
absent there and both changes are zero.

## Canonical fixed-low and target-high rows

At target `j`, put

```text
p0 = i3(G)+i2(G),             p1 = i2(G)+i1(G),
r0 = s4(G)+s3(G),             r1 = s3(G)+s2(G),
u0 = i_(j+1)(G)+i_j(G),       u1 = i_j(G)+i_(j-1)(G),
a2 = i2(F),                   b  = i_j(F),
c0 = s3(F)+i2(H)+a2,          e0 = s_(j+1)(F)+i_j(H)+b.
```

Thus `a2,c0,p0,p1,r0,r1` belong to the fixed terminal-`q3` block.  Only
`b,u0,u1,e0` use the target `j`.  This is the field map used by the pinned
canonical `terminal_rows` routine.

Applying (1) separately to `G,F,H` gives the ten row changes.  For example,

```text
delta a2 = -[x^0]K_F,
delta b  = -[x^(j-2)]K_F,
delta c0 = delta s3(F)+delta i2(H)+delta i2(F),
delta e0 = delta s_(j+1)(F)+delta i_j(H)+delta i_j(F).
```

The exact Newton coefficient is

```text
A0 = p0*c0-a2*r0,
A1 = p0*a2+p1*c0+p1*a2-a2*r1,
Q0 = (j+1)b(c0+r0)-3(p0+a2)e0,
Q1 = (j+1)b(a2+r1)-3p1*e0-3b(p0+a2+p1),
D1 = (j+1)a2(A0*u1+A1*u0+A1*u1)
     +a2(p0*Q1+p1*Q0+p1*Q1).                         (2)
```

Therefore the leaf-bridge correction is exactly

```text
D1(G,w,j)-D1(T,w,j) = D1(row_G)-D1(row_G+delta row),  (3)
```

with `delta row` supplied by (1).  The symbolic expansion has degree four in
the bridge interpolation parameter.  Its coefficient signs are mixed, so
(3) is not coefficientwise nonnegative without further correlated
inequalities among `K_G,K_F,K_H` and the one-edge rows.

## Exact finite audit and remaining blockers

The independent audit exhausts every multiset of nontrivial tree components
through order 9, every marked root, every eligible root-component leaf and
other-component leaf, and every target supported both before and after the
bridge.  It performs 15,402 full-polynomial bridge checks, 76,000 terminal
field checks, and 6,763 direct canonical `m=1` comparisons.  Every supported
bridge difference is positive; the minimum is `7116`.

Two genuinely open issues remain:

1. Prove the sign in (3) for all orders while preserving the shared kernel
   rows.  The finite audit is not a proof of this sign.
2. Handle support collapse.  In 837 audited bridge choices the source has
   `b=i_j(F)>0` but the joined tree has `b'=0`; at the source-cell level,
   105 of the 1,293 source-supported root/target cells through order 9 admit
   no support-preserving leaf bridge at all.  The
   connected normalized tree theorem cannot be invoked in those cells, so a
   direct unnormalized maximum-support lemma is required.

Permanent isolated components are separate: the exact isolate-shift identity
gives `d1(G disjoint_union K1)=d1(G)+d2(G)`, and the corrected all-forest
`m=2` theorem now makes that reduction valid.

## Replay

```powershell
python .\audit_terminal_q3_m1_leaf_bridge_correction_agent.py
```

It must print

```text
PASS_EXACT_LEAF_BRIDGE_IDENTITY_AND_FINITE_COMMON_FOREST_AUDIT
```

No part of this note proves forest `m=1`, forest `m=0`, the whole terminal
payment, the global `q3` envelope, unimodality, or Erdos Problem 993.
