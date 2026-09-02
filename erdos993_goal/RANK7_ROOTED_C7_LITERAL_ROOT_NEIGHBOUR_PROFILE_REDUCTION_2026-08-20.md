# Rank-seven rooted-`C7` literal root-neighbour-profile reduction

Date: 2026-08-20

Status: **PROVED EXACT STRUCTURAL REDUCTION; NOT A UNIVERSAL `C7`
THEOREM.**  The live 100,199 excess-partition/root-degree profiles are refined
by the literal multiset of excesses at the neighbours of the root.  The new
bounds completely certify 1,914 old profiles and certify some placements in a
further 7,930.

## Statement

Let `T` be a tree in the live rooted-`C7` middle band, rooted at `p`.  Put

```text
x_v=deg(v)-1,
lambda=(positive x_v, in descending order),
r=deg(p),
xi=(x_u : u in N(p), in descending order).
```

The verifier enumerates a safe outer list of every possible `xi` for each of
the 100,199 surviving triples `(n,r,lambda)`.  For every row on which its exact
rational scalar is positive,

```text
C7(T,p)>0.
```

Consequently every old `(n,r,lambda)` row for which all generated neighbour
profiles pass is completely certified.  A surviving formal profile need not
be realised by a tree.

## Forced weighted-core placement

The vertices with positive excess induce a tree `K`.  Write

```text
E = sum_(uv in E(K)) x_u x_v,
V = number of connected four-edge subtrees of T.
```

If `r>1`, the root is a vertex of `K` with weight `r-1`.  Every positive
entry of `xi` forces an edge of `K` at the root.  Since every core edge has
weight product at least one,

```text
E >= |V(K)|-1 + sum_(s in xi, s>0) ((r-1)s-1).                 (1)
```

The exact three-shape formula for `V` consists of stars, brooms, and paths.
The global stars contribute `B3+B4`; the forced root edges and neighbour
pairs therefore give

```text
V >= B3+B4
     + sum_(s in xi, s>0) [C(r-1,2)s+C(s,2)(r-1)]
     + sum_(s<t in the positive entries of xi) st.             (2)
```

For a leaf root, (1)--(2) reduce to the old global lower bounds, but the leaf
occupies a literal leaf slot at its support.  That slot is retained in the
upper bound below.

## Capacity/rearrangement upper bound for `E`

Orient `K` away from a maximum-weight vertex `z`.  Every vertex other than
`z` is a child exactly once.  A vertex of core-degree cap `c` supplies at most
`c` child slots at `z` and `c-1` child slots elsewhere.  The ordinary cap at
weight `x` is `x+1`.  Two exact modifications are retained:

* for a leaf root, its support has cap at most `x`, because the named leaf
  already consumes one slot;
* for `r>1`, the root has exact core degree equal to the number of positive
  entries in `xi`, and all corresponding root edges are consumed with their
  forced directions.

After the forced edges are removed, pair the remaining child weights and
available parent-slot weights in descending order.  The rearrangement
inequality bounds the product sum of every actual pairing.  Maximising over
the possible maximum vertex and, when `z` is outside the root, the neighbour
branch containing `z`, gives an exact integer upper bound `Eslot` valid for
every placement.  The verifier uses

```text
E <= min(Eslot,
         n-3 + (2(n-4)B2-6B3)/7),                              (3)
```

where the second branch is the proved Zagreb bound.  This is a relaxation of
the remaining core placement, so it cannot exclude an actual tree.

## Rooted-`C7` scalar

In the exact rank-(4,5) motif identity

```text
L=A B2-B B3-C(E-(n-3))+5(n-3)(V-(n-4)),
```

the lower envelope obtained from the two old connected-subtree inequalities
and (2) is decreasing in `E`; indeed its possible slopes are `-C` and
`-(C-5(n-3))`, both negative in this band.  Thus (3) gives a valid lower
bound for `L`.  Formula (1) simultaneously improves the exact `i4` cap,
because

```text
i4 = C(n,4)-(n-1)C(n-2,2)+(n-2+B2)(n-4)+C(n-1,2)
     -(B2+B3+E).
```

The verifier then applies the already proved sharp piecewise transfer

```text
mu5 >= 2 Phi(mu4)/mu4
```

and the root-deletion scalar

```text
S7/d^2 >= 1+2x-28((n-r-5)/5-x)/(1+(n-r-5)/5).
```

Positivity proves `C7>0` because `14C7=i6*S7+i5*Q6` and `Q6>=0`.

## Exact reduction

The low-memory enumeration gives

```text
input partition/root profiles              100,199
literal root-neighbour profiles          1,265,586
certified neighbour profiles               109,813
remaining formal neighbour profiles      1,155,773

fully certified old partition profiles       1,914
partially certified old partition profiles    7,930
old profiles with no certified placement     90,355
```

The completely certified old profiles by order `25,...,38` are

```text
52, 62, 71, 79, 100, 88, 91, 110, 126, 149, 215, 283, 320, 168.
```

The canonical residual digest is

```text
503A80EF6F1F98E421EBAB6E2A82C4AA57980A80E4447C9AB95667E69A1E641F.
```

The smallest surviving formal profile, ordered by `(n,B2,r,lambda,xi)`, is

```text
n=25, r=1, B2=6,
lambda=(2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1),
xi=(1),
scalar=-33188867/5230413.
```

This is an obstruction to the present relaxation, not a tree
counterexample.

## Independent structural audit and replay

The separate audit enumerates every root of every free tree through order 10:

```text
199 free trees,
1,806 rooted checks,
minimum gaps E-Elower=0, Eupper-E=0, V-Vlocal=0.
```

Run

```powershell
python .\verify_rank7_rooted_c7_neighbor_profile_structural_audit.py
python .\verify_rank7_rooted_c7_neighbor_profile_reduction.py
```

The expected markers are

```text
PASS_EXACT_RANK7_ROOTED_C7_NEIGHBOUR_PROFILE_STRUCTURAL_AUDIT
PASS_EXACT_ROOTED_C7_LITERAL_ROOT_NEIGHBOUR_PROFILE_REDUCTION
```
