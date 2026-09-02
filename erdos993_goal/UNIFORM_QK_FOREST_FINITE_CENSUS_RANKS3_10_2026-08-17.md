# Uniform `Q_k` forest finite census, ranks 3--10

## Result and scope

For

```text
Q_k(F)=2k i_k(F)^2-i_(k-1)(F)i_k(F)
       -2(k+1)i_(k-1)(F)i_(k+1)(F),
```

the complete set of distinct forest independence polynomials through order
20 was enumerated.  At each rank `3<=k<=10`, every row in the candidate
range

```text
alpha(F)>=2k-2
```

has `Q_k(F)>=0`.

This is an exact finite census, not an all-order theorem.  In particular, it
does not discharge the uniform `Q_k` obligation in Section 109.29 of the
master route.

## Exact totals

```text
rank  alpha cutoff  required rows  negative rows  exact minimum  order
  3          4       2,368,054          0               12        5
  4          6       2,367,899          0              224        8
  5          8       2,366,027          0            2,908       10
  6         10       2,334,409          0           38,808       13
  7         12       1,793,567          0          609,848       15
  8         14         413,145          0        8,726,265       17
  9         16          19,921          0      130,585,554       19
 10         18             274          0    1,998,436,550       20
```

The new information beyond the existing low-rank packages is the exact
rank-nine and rank-ten check: 20,195 required forest polynomials in total,
with no negative row.  The complete order-20 forest-polynomial catalog has
1,425,505 distinct rows.  At every order, both the ordinary free-tree count
and the distinct forest-polynomial count are asserted against the previously
audited count tables.

## Reproduction and replay

Run from `C:\Users\chris\erdos993_goal`:

```text
python scan_uniform_qk_forest_polynomials.py \
  --maximum 20 --rank-first 3 --rank-last 10
```

Two complete runs produced byte-identical JSON and byte-identical terminal
logs; both stderr files are empty.  The exact report is
`uniform_qk_forest_polynomials_r3_r10_n20_exact_20260817.json`.

SHA-256:

```text
scan_uniform_qk_forest_polynomials.py
DA78C271A46F85D622F5EBB3A0B059DDDA39A6FAAF726DBB6665D98E84298182

uniform_qk_forest_polynomials_r3_r10_n20_exact_20260817.json
03378730FC6D6BCAF16A6D9C694A7CD3F6542BBC28FF31C7083EB68177B224DB

primary and fresh-replay logs (each)
32658CE495173BBEBF894B3E604E27783D30992AB25F5176BF2F925B3143B36E
```

The final marker is

```text
PASS_EXACT_FINITE_UNIFORM_QK_FOREST_POLYNOMIAL_CENSUS
```
