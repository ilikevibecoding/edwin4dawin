# Continuous weighted-edge-pair lift for forest `i4/i5`

Date: 2026-08-20

Status: **PROVED EXACT ALL-ORDER COEFFICIENT INEQUALITY.**  The result gives a
continuous, piecewise lower bound for `i5(J)` from `m` and `i4(J)` for every
forest on `m>=5` vertices.  It also gives a stronger ceiling-based integer
companion.

## The sharp local five-vertex inequality

For a five-vertex forest `S` containing at least one edge, let `t(S)` be the
number of its bad four-subsets and put

```text
delta(S)=t(S)-3.
```

For an edgeless `S`, put `delta(S)=0`.  If `D(S)` and `A(S)` are the numbers
of disjoint and adjacent edge pairs in `S`, then

```text
delta(S) >= D(S)/2+A(S)/6.                                (1)
```

The verifier checks all `2^10` labelled graphs on five vertices and retains
all 291 forests.  The minimum margins by edge count `0,1,2,3,4` are

```text
0, 0, 5/6, 1/2, 0.
```

Equality at four edges occurs for `P5`, where `(D,A)=(3,3)` and the right
side is two, and for `K1,4`, where `(D,A)=(0,6)` and the right side is one.

## Global weighted-pair sum

Let `J` be an `m`-vertex forest, `m>=5`, and write

```text
a=i4(J),                 b=i5(J),
B4=C(m,4)-a,             B5=C(m,5)-b,
e=e(J),
A=sum_v C(deg(v),2).
```

Summing (1) over all five-subsets gives

```text
D0:=(m-4)B4-3B5
   >= (m-4)/2 * C(e,2)
      + [C(m-3,2)/6-(m-4)/2] A.                           (2)
```

Indeed, a disjoint edge pair occurs in `m-4` five-subsets and an adjacent
pair in `C(m-3,2)` five-subsets.  The coefficient of `A` in (2) is

```text
(m-4)(m-9)/12.                                             (3)
```

This sign change at `m=9` is essential.

## Continuous theorem for `m>=9`

Put

```text
E=B4/C(m-2,2),
g(E)=0                 for 0<=E<=1,
g(E)=E(E-1)/2          for E>=1,
A0=max(0,2E-m),
alpha=(m-4)/2,
beta=(m-4)(m-9)/12.
```

The union bound gives `e>=E`.  For `E>=1`, `C(x,2)` is increasing; for
`0<E<1`, the integer condition forces `e>=1`, so `C(e,2)>=0`.  Thus

```text
C(e,2)>=g(E).                                              (4)
```

Also `C(d,2)>=d-1` for positive `d`, so

```text
A>=max(0,2e-m)>=A0.                                       (5)
```

For `m>=9`, both coefficients in (2) are nonnegative.  Equations (2)--(5)
give

```text
D0 >= alpha*g(E)+beta*A0.                                 (6)
```

Since

```text
D0=3[b-C(m,5)+(m-4)B4/3],
```

the continuous coefficient inequality is

```text
b >= C(m,5)-(m-4)B4/3
     +[alpha*g(E)+beta*A0]/3.                             (7)
```

Its explicit pieces are

```text
0<=E<=1:
    D0>=0;

1<=E<=m/2:
    D0>=(m-4)E(E-1)/4;

E>=m/2:
    D0>=(m-4)E(E-1)/4
        +(m-4)(m-9)(2E-m)/12.
```

Both terms are nondecreasing across their active domains, and the pieces
agree at `E=1` and `E=m/2`.

The raw proposal `E(E-1)/2` is still a valid negative relaxation when
`0<E<1`, because the actual `e` is an integer at least one.  Replacing it by
zero in (4) is stronger and preserves continuity.

## The `5<=m<=8` sign branch

For `5<=m<=8`, the coefficient in (3) is negative, so substituting the lower
bound (5) would reverse the desired comparison.  Instead use

```text
A<=C(e,2).
```

Giving every edge pair the smaller adjacent-pair weight yields

```text
D0 >= C(m-3,2) g(E)/6,                                    (8)
```

followed by the same conversion from `D0` to `b`.  At `m=9`, (8) and (6)
coincide because `beta=0`.

## Exact integer companion

The continuous result can be strengthened without a tree census.  Replace
`E` by

```text
e0=ceil(B4/C(m-2,2))
```

inside `C(e0,2)` and `max(0,2e0-m)`, use the same sign branch at `m=9`, and
take the ceiling of the resulting rational lower bound for `b`.

For the order-27 application (`m=25`), the report records every integer
`a=8610,...,8854`.  For example,

```text
a=8634:
continuous b>=25495,
```

independent of the ambient `c5`.  This is much stronger than the unweighted
all-pair lift.

## Replay

Run

```powershell
python .\verify_forest_i45_continuous_weighted_pair_lift.py
```

The expected marker is

```text
PASS_EXACT_FOREST_I45_CONTINUOUS_WEIGHTED_PAIR_LIFT
```
