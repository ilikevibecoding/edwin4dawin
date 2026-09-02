# Rank-seven PGC exact census and alpha-eleven boundary

Date: 2026-08-13

Status: **exact finite certificates and an exhaustive boundary strategy, not
by themselves an all-order rank-seven theorem.**  The calculations below
independently establish the literal pendant census through total order 18,
classify and pay every negative `V7` row through order 20, and prove `V7>0`
for every disconnected forest of orders 21 and 22.

## 1. Required range and exact identity

The prefix cutoff is

```text
L(G)=floor((2 alpha(G)+1)/3),       required ranks k<L(G).
```

Thus rank seven is required exactly when `alpha(G)>=12`.  If `lp` is a
pendant edge and

```text
P=I(G),  B=I(G-{l,p}),  P=(1+x)B+xC,
```

then a maximum independent set can be chosen to contain `l`, so

```text
alpha(B)=alpha(G)-1>=11.
```

Put

```text
Q7(P)=14p7^2-p6p7-16p6p8,
V7(B)=9b5b6+105b5b7-72b6^2.
```

Exact symbolic reduction gives

```text
H7(P)-H6(B)
 = 7Q7(P)/(2p6) + 21c6/2 + V7(B)/(2b5).             (1)
```

The cleared numerator is

```text
7b5 Q7(P)+21c6 p6 b5+V7(B)p6.                       (2)
```

## 2. Polynomial-complete pendant census through order 18

`replay_rank7_pgc_census_wave14.py` independently enumerates all 205,004
unlabeled trees through order 18.  It collapses them to 950,352 distinct
tree pendant-pair states by order, constructs all 381,095 distinct forest
polynomial rows through order 18, and multiplies each pendant state by every
admissible common forest factor.

This is polynomial-complete: every pendant edge in a forest lies in one tree
component, while every other component contributes a common polynomial
factor.  Different factorizations may repeat a check but cannot omit one.

The replay checks 2,276,138 products.  Of these, 727,568 are in the required
rank-seven range `alpha(P)>=12`.  In that required range it finds

```text
distinct Q7-negative P rows:       0
distinct V7-negative B rows:       0
distinct negative coupled pairs:   0
minimum H7(P)-H6(B):               232328755/43648
                                      = 5322.781227...
```

The separate single-row census makes 141,568 required `Q7` checks and
266,071 required `V7` checks.  Their exact minima are respectively
`609848` and `2561328`.

The replay also preserves the negative controls outside the required range.
There are exactly three distinct negative rank-seven residual pairs through
order 18:

| alpha(P) | order | components(P) | exact margin |
|---:|---:|---:|---:|
| 7 | 13 | 5 | `-6/5` |
| 7 | 13 | 6 | `-928/77` |
| 8 | 14 | 1 | `-76/25019` |

Thus the finite result is not being overextended to ranks where PGC does not
require rank seven.

## 3. The first required negative `V7` rows

The exact all-forest census through order 20 finds precisely 15 rows with

```text
alpha(B)=11 and V7(B)<0:
7 rows at order 19, 8 rows at order 20.
```

For a forest row of order `n`, its component count is recovered from its
first two coefficients by

```text
components=n-binomial(n,2)+b2.
```

All 15 rows have one component.  They are realized by exactly 15 unlabeled
trees.  Since `B` is connected, restoring the pendant support has only the
following possibilities:

```text
C=B                 if the support is unattached to B,
C=I(B-v)            if it is attached to vertex v of B.
```

`replay_rank7_alpha11_obstructions_wave14.py` exhausts 293 rooted-vertex
occurrences.  After polynomial deduplication and adding the 15 unattached
states, there are 246 distinct `(B,C)` checks.  Every check has `Q7(P)>=0`
and positive coupled margin.  The exact global minimum is

```text
740494109067/8823188 = 83925.913067...
```

It occurs for the order-19 row

```text
B=(1,19,153,682,1844,3117,3279,2082,761,155,18,1),
V7(B)=-739395,
C=(1,18,136,562,1387,2096,1916,1017,295,44,3),
Q7(P)=155104002.
```

## 4. Complete disconnected orders 21 and 22

`replay_rank7_disconnected_n21_n22_wave14.py` regenerates all distinct tree
polynomials through order 21 and all distinct forest polynomials through
order 20.  It then uses a covering product decomposition with harmless
duplicates.

- At order 21, every disconnected forest has a component of order at most
  10.
- At order 22, a non-isolate component of order at most 11 is selected.  The
  only missing two-component form is `K1` times a connected order-21 tree,
  which is streamed separately.  If removing an isolate leaves a
  disconnected order-21 forest, that remainder has a component of order at
  most 10 and is covered by the second product family.  The edgeless case is
  checked directly.

The exact results are:

| order | covering products | min `V7`, alpha>=11 | min `V7`, alpha>=12 |
|---:|---:|---:|---:|
| 21 | 2,859,935 | 81,162,081 | 203,613,771 |
| 22 | 8,207,341 | 417,515,280 | 509,518,680 |

There are no negative rows in either slice.  This is an exhaustive theorem
for disconnected forests at these two orders, not a sample.

## 5. Finite boundary strategy analogous to rank six

The identity (1) gives a sharp route to closing rank-seven PGC:

1. Prove `Q7(P)>=0` for every required forest `alpha(P)>=12`.
2. Prove `V7(B)>=0` whenever `alpha(B)>=12`.
3. The sole residual boundary is then `alpha(B)=11`; bipartiteness forces
   `|B|<=22`.
4. The complete finite census shows that the only negative rows up to order
   20 are the 15 connected rows above, and their every actual pendant
   reconstruction is paid.
5. The independent disconnected order-21/22 certificate is strictly
   positive.  Complete connected-tree enumeration at orders 21/22 is the
   remaining finite companion needed within this package; the wider team has
   produced that certificate separately.

Consequently this package reduces the literal rank-seven pendant payment to
the all-order `Q7` reserve plus the separately packaged `V7` theorem and
connected medium-order census.  It does not claim those separate inputs from
the finite evidence here.

## 6. Exact replay and hashes

Run:

```powershell
python .\replay_rank7_pgc_census_wave14.py
python .\replay_rank7_alpha11_obstructions_wave14.py
python .\replay_rank7_disconnected_n21_n22_wave14.py
```

Expected terminal status lines:

```text
PASS_EXACT_FINITE_RANK7_PGC_CENSUS_THROUGH_ORDER_18_NOT_THEOREM
PASS_EXACT_FINITE_RANK7_ALPHA11_OBSTRUCTIONS_THROUGH_ORDER_20_NOT_THEOREM
PASS_EXACT_ALL_DISCONNECTED_FORESTS_V7_ORDERS21_22
```

SHA-256:

```text
EA1A9B0B3FF0EC8A6E5C1204D159DC7309F24768389EF43CE69A6CEBE88303C1  replay_rank7_pgc_census_wave14.py
FC24FFB09CACA50A37D99F60B09B3E58228597D1DC6CB6F174AA6DF94527B470  rank7_pgc_census_wave14_exact_20260813.json
31CB2F3B6379F8F3A82D69C3407AC7E19A89E963EB1701193EC3F290B9B37A41  replay_rank7_alpha11_obstructions_wave14.py
EA499787BC705976D5F78383AE12C5AE43E03652D43E98FD72C01476E7AD0A40  rank7_alpha11_obstructions_wave14_exact_20260813.json
F58671BF7E09042D51084C1CA3078B86E85EFC3B2803D68E54091A04BBF98536  replay_rank7_disconnected_n21_n22_wave14.py
8BF84174C8D7410CA19C8A87B68DFC6973CCF048F8458129983A700258BAF5BF  rank7_disconnected_n21_n22_wave14_exact_20260813.json
```
