# Rank-seven component PGC coupled reduction

Date: 2026-08-13

Status: **EXACT REDUCTION, COMPLETE ORDER-16 PENDANT AUDIT, AND EXACT
ORDER-20 RESIDUAL CENSUS; NOT AN ALL-ORDER PROOF.**  The subsequently proved
rank-six reserve, all-forest `V_6` theorem, and exhaustive exceptional-boundary
certificate close rank six, so rank seven is now the first open PGC rank.

## 1. Exact identity

For a pendant edge `lp`, put

```text
P=I(G),             B=I(G-{l,p}),
P=(1+x)B+xC.
```

Write

```text
H_k(R)=k^2(r_k^2-r_(k-1)r_(k+1))/r_(k-1)
       +k(r_k-r_(k+1)).
```

Define

```text
Q_7(P)=14p_7^2-p_6p_7-16p_6p_8,
V_7(B)=9b_5b_6+105b_5b_7-72b_6^2.
```

Direct exact algebra gives

```text
H_7(P)-H_6(B)
 =7Q_7(P)/(2p_6)+21c_6/2+V_7(B)/(2b_5).          (1)
```

Equivalently, the all-order target is

```text
7b_5Q_7(P)+21c_6p_6b_5+V_7(B)p_6 >= 0.          (2)
```

Rank seven lies in the required prefix when `alpha(G)>=12`.  The exact
component-separated reduction gives `alpha(B)=alpha(G)-1`, so the residual
range is `alpha(B)>=11`.

## 2. The standalone residual route is false

Through order 18, exact forest-polynomial enumeration misleadingly suggests
that `V_7(B)>=0` whenever `alpha(B)>=11`.  The first failure occurs at order
19.  The tree with graph6 code

```text
RpCH?C@_??g??@??_?G?@O????G??G
```

has independence polynomial

```text
B=(1,19,153,683,1854,3156,3353,2150,785,155,18,1),
alpha(B)=11,
V_7(B)=-1762236.
```

The complete exact census through order 20 finds 15 negative required-range
polynomial rows: seven at order 19 and eight at order 20.  All 15 are
connected-tree rows and each has one unlabeled-tree realization.  The most
negative value is

```text
V_7(B)=-6927276
```

at two order-20 rows.  Thus (1) cannot be proved by splitting its three
summands and declaring the residual nonnegative.

The literal deletion coupling is essential even at the coefficient level.
For the order-20 row

```text
B=(1,20,171,817,2393,4436,5188,3701,1500,306,27,1),
```

the box-feasible choice `(c_5,c_6,c_7)=(b_5,0,0)` satisfies
`0<=c_j<=b_j`, but gives

```text
Q_7(P)=-188795806,
7b_5Q_7(P)+21c_6p_6b_5+V_7(B)p_6=-5959884868472.
```

This box corner is not claimed forest-realizable.  It proves that generic
coefficient boxes cannot replace the rooted-product coupling.

## 3. Exact positive evidence

The order-20 census checks `Q_7>=0` in 2,256,058 required-range instances
with `alpha>=12`.  This count consists of every distinct forest polynomial
through order 19, every connected order-20 tree, and an exhaustive streamed
order-20 disconnected pass (with harmless duplicate products).  The exact
minimum is

```text
Q_7=609848
```

at an order-15 tree with independence polynomial

```text
(1,15,91,301,634,940,1024,834,505,221,66,12,1).
```

This is finite evidence, not an all-order rank-seven reserve theorem.

Every literal rooted extension of the 15 negative-`V_7` trees through order
20 was then audited exactly.  There are 293 rooted tree instances, collapsing
to 231 distinct `(B,C)` polynomial pairs, plus 15 untouched cases `C=B`
corresponding to a disjoint pendant `K_2`.  None has negative `Q_7(P)` or a
negative full margin.  The exact minimum full margin is

```text
740494109067/8823188 > 0.
```

Finally, the complete component-separated pendant audit through total order
16 checks 20,375 required rank-seven instances.  It has no negative reserve,
residual, or full margin, and its exact minimum margin is

```text
232328755/43648 > 0.
```

## 4. Replays

Run

```powershell
python .\replay_rank7_component_pgc_reduction.py
python .\scan_rank7_forest_residual_n20.py
python .\audit_rank7_negative_v7_rooted_extensions.py
```

The corresponding reports are

```text
rank7_component_pgc_reduction_exact_20260813.json
rank7_forest_residual_n20_exact_20260813.json
rank7_negative_v7_rooted_extensions_exact_20260813.json
```

## 5. Remaining theorem

An all-order rank-seven PGC proof still needs both of the following:

1. an all-order forest theorem supplying `Q_7(P)>=0` in the required range,
   or an equivalent reserve that can be used in (2); and
2. a proof of the coupled payment (2) on literal component-separated forest
   deletions when `V_7(B)<0`.

The 15 finite obstructions show exactly why the second item cannot be
discarded.  Conversely, the rooted audit shows that those first obstructions
are paid with a substantial exact margin; they are not counterexamples to
PGC or to the original unimodality conjecture.
