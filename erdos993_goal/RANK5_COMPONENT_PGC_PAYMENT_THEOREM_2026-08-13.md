# Rank-five component PGC payment theorem

Date: 2026-08-13

Status: **PROVED ALL-ORDER THEOREM.**  This closes the prefix pendant
cascade at rank five for every forest.  It does not resolve Erdős Problem
993: the first open PGC rank is now six.

## 1. Statement

Let `G` be a forest with pendant edge `lp`, put

```text
P=I(G;x),             B=I(G-{l,p};x),
```

and write

```text
H_k(R)=k^2(r_k^2-r_(k-1)r_(k+1))/r_(k-1)
       +k(r_k-r_(k+1)).
```

If `alpha(G)>=9`, then

```text
H_5(P)>=H_4(B).                                      (1)
```

This is exactly rank-five PGC throughout its required prefix range.

## 2. Exact decomposition

The component-separated pendant identity is

```text
P=(1+x)B+xC,
```

where `C` is another forest independence polynomial.  Hence

```text
p_5=b_4+b_5+c_4,        p_6=b_5+b_6+c_5.
```

Put

```text
Q_5(P)=10p_5^2-p_4p_5-12p_4p_6,
V_5(B)=7b_3b_4+55b_3b_5-32b_4^2.
```

Direct algebra gives

```text
H_5(P)-H_4(B)
 =5Q_5(P)/(2p_4)+15c_4/2+V_5(B)/(2b_3).             (2)
```

The first term is nonnegative by the proved rank-five forest
three-halves theorem; the second is manifestly nonnegative.  It remains to
prove `V_5(B)>=0` for every forest with `alpha(B)>=8`.

## 3. The new single-forest inequality

Every forest satisfies the two-extension inequality

```text
T=5b_3b_5-4b_4^2+3b_3b_4>=0.                        (3)
```

Every forest of order at least 16 satisfies the sharp certified defect
ceiling

```text
D=3575b_3b_5-2016b_4^2>=0.                          (4)
```

There are two exhaustive cases.

If `6b_4>=13b_3`, then

```text
V_5-11T=2b_4(6b_4-13b_3)>=0.                        (5)
```

If `6b_4<13b_3`, then

```text
V_5-(55/3575)D
 =b_4(5005b_3-704b_4)/715>0,                        (6)
```

because `5005*6-704*13=20878>0`.  Thus `V_5>=0` for every
forest of order at least 16.

For orders at most 15, forest bipartiteness and `alpha(B)>=8` leave a
finite complete boundary.  Exact polynomial enumeration checks 25,996
eligible forest rows.  The minimum is

```text
V_5((1+x)^8)=43120.
```

This proves the required single-forest inequality and therefore (1).

## 4. Exact replay

Run

```powershell
python .\replay_rank5_component_pgc_payment.py
```

The replay checks the symbolic decompositions, the complete order-at-most-15
boundary, and 294,045 forest-polynomial pendant pairs through total order 16.
The bounded pendant audit has no failure and exact minimum PGC margin

```text
2552316/3953.
```

The finite pendant audit is consistency evidence; the proof of (1) is the
all-order decomposition (2), the all-order inputs (3)--(4), and the complete
finite boundary.

## 5. Consequence and remaining cut

Ranks two, three, four, and five of PGC are now proved all-order.  Repeated
pendant deletion would prove the full prefix once the analogous theorem is
established at every rank `k>=6`.  Rank six is now the first open PGC rank;
no claim of forest unimodality is made here.
