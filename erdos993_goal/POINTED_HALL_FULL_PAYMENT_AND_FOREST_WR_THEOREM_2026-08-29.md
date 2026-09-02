# Full pointed Hall payment and the forest weak-prefix ratio

Date: 2026-08-29

Status: **proved for every finite forest.**  This closes the pointed boundary
and proves the weak-prefix ratio `WR`.  The separate `ISO` inequality remains
open, so this is not yet a proof of unimodality or Erdos Problem 993.

## 1. The pointed boundary

Let `G` be a forest, let `p` be a vertex with

```text
alpha(G-p)=alpha(G)=alpha,
```

and choose a maximum independent set `A` avoiding `p`.  Put `C=V(G)-A`.
In either required residue `alpha=0,2 mod 3`, write

```text
r=ceil((2 alpha-1)/3),       e=alpha-r+1.
```

For every independent `Y subset C`, put `y=|Y|` and
`d=|N_A(Y)|`.  The exact Hall-interval decomposition says that the only
negative contributions to

```text
r i_r(G)-h_(r-1,p)(G)                             (1)
```

are the sets

```text
p in Y,       d-y=e,                              (2)
```

and every such set contributes exactly `-1`.  All other interval
contributions are nonnegative.

We pay the sets in (2) in three disjoint classes.

### Class I: at least two private neighbors

Put `Z=Y-{p}` and

```text
delta=|N_A(Y)-N_A(Z)|.
```

If `delta>=2`, the distinct `p`-free interval indexed by `Z` has positive
capacity

```text
r C(r-y-1+delta,r-y+1) >= r >= 1.
```

The map `Y -> Z` is injective, so one unit from each such interval pays this
class.  Only `Y={p}` can use the empty interval in this step, hence at most
one unit of empty-interval capacity is consumed.

### Class II: an immediate covered extension

Now suppose `delta<=1`.  If some `z in C-Y` makes `W=Y+z` independent and

```text
N_A(W)=N_A(Y),                                    (3)
```

then `W` has excess `e-1=alpha-r`.  Its interval ends exactly at rank `r`
and contributes

```text
r C(alpha-d,r-|W|)-C(alpha-d,r-1-|W|)=|W|.        (4)
```

Join every eligible `Y` to every successor `W` satisfying (3), and split
the negative unit of `Y` uniformly among its successors.  A fixed `W` has
at most `|W|` one-vertex predecessors, so its received load is at most its
exact capacity (4).  These target intervals contain `p`, whereas every
Class-I target avoids `p`; the two allocations cannot collide.

### Class III: the closed hard sets

It remains to consider `Y` having no successor in (3).  Define the top of
its Boolean interval by

```text
S_Y=Y union (A-N_A(Y)).                            (5)
```

Equation (2) gives `|S_Y|=alpha-e=r-1`.  Moreover, `S_Y` is maximal
independent.  Vertices of `N_A(Y)` are dominated by `Y`.  For
`z in C-Y`, either `z` has a neighbor in `Y`, or independence together with
the failure of (3) gives a neighbor in `A-N_A(Y)`.  Thus every vertex outside
`S_Y` is dominated.  Conversely, any successor in (3) would be undominated
by (5), so closedness and maximality are equivalent.  Finally,

```text
S_Y intersect C=Y,
```

so `Y -> S_Y` is injective.

## 2. A fixed-size maximal-independent-set bound

Let `m_k(F)` count maximal independent `k`-sets in a forest `F`.  Then

```text
m_k(F) <= 2^k                                      (6)
```

for every finite forest and every `k`.

This follows by induction.  An isolated vertex belongs to every maximal
independent set and reduces the index by one.  Otherwise choose a leaf
`ell` with neighbor `q`.  A maximal independent set either contains `ell`,
or it omits `ell` and therefore contains `q`.  Removing the forced selected
vertex in the two cases gives the exact recurrence

```text
m_k(F)
 =m_(k-1)(F-{ell,q})+m_(k-1)(F-N[q])
 <=2^(k-1)+2^(k-1)=2^k.                           (7)
```

Hence Class III contains at most `2^(r-1)` sets.

## 3. The empty interval has enough capacity

The empty interval contributes

```text
r C(alpha,r)=e C(alpha,e)=e C(alpha,r-1).          (8)
```

At the two required residues this is at least `2^(r-1)+1`.

If `alpha=3m`, then `r=2m`, `e=m+1`, and

```text
C(3m,m+1) >= C(2m,m) >= 4^m/(2m+1).
```

The last inequality holds because the central binomial coefficient is the
largest of the `2m+1` coefficients summing to `4^m`.  Therefore

```text
(m+1)C(3m,m+1) > 4^m/2 = 2^(r-1).
```

If `alpha=3m+2`, then `r=2m+1`, `e=m+2`, and

```text
C(3m+2,m+2) >= C(2m+1,m+1) >= 4^m/(m+1).
```

Thus

```text
(m+2)C(3m+2,m+2) > 4^m = 2^(r-1).
```

All quantities are integers, so the strict inequalities leave at least one
additional unit.  That unit covers the only possible Class-I use of the
empty interval, and (6) covers every Class-III set.  Classes I--III exhaust
(2), proving (1).

Therefore the pointed boundary theorem `BP` holds for every required forest
and point.

## 4. Consequence: WR for all forests

The exact leaf-boundary induction in
`WEAK_PREFIX_RATIO_LEAF_BOUNDARY_REDUCTION_2026-08-29.md` shows that `BP`
is the only missing boundary for

```text
i_(s-1)(F) <= s i_s(F),
1 <= s < ceil((2 alpha(F)-1)/3).                   (WR)
```

Since `BP` is now proved, `(WR)` holds for every finite forest.

This is one of the two conjectural inputs in the exact
`ISO + WR + known decreasing tail` implication.  The ordinary `ISO`
inequality itself remains open.

## Replay

Run

```powershell
python .\assemble_pointed_hall_full_payment_forest_wr_root.py
```

The assembler pins the two partial-payment certificates and the leaf
reduction, checks the binomial capacity through 6,666 residue cells, replays
the maximal-set recurrence and `m_k<=2^k`, and reconstructs the full
collision-free payment in every NetworkX atlas forest.  Its marker is

```text
PASS_EXACT_POINTED_HALL_FULL_PAYMENT_AND_FOREST_WEAK_PREFIX_RATIO
```
