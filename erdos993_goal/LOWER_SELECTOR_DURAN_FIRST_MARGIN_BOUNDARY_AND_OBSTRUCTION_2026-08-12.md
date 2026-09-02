# Lower-selector Duran first margin: boundary theorem and generic obstruction

Date: 2026-08-12

## Result

The corrected first margin

```text
M_1=(s_D-1)(s_D+beta-1)-G_2
```

is proved in all orders on the first lower row `row_s=1` (which necessarily
has `r=0`).  More importantly, the same numerical normalization and the same
source root-sign pattern do **not** imply `M_1>0` for an arbitrary source:
an exact degree-four counterexample occurs at `(p,alpha,m)=(9,0,4)`, the
normalization of the actual cell `(d,r,row_s)=(5,0,4)`.

Thus the remaining all-order first-margin proof must use the special path
selector coefficients (or an equivalent path determinant/slot coupling).
It cannot be obtained by extending the generic two-outlier theorem below its
reserve threshold.

## 1. Complete first-row theorem

For `row_s=1`, the lower condition `r<row_s` forces `r=0`, hence `N=d`.
The selector is

```text
Gamma_(d,1)(t)=2(d-1)-4(d-2)t+2(d-3)t^2.            (1)
```

There are no benign roots to remove.  With `P=d+1`, the Duran polynomial has
leading coefficient `2(d-1)` and constant coefficient

```text
2(d-3)P(P-1)/16.
```

Therefore its residual product is exactly

```text
G_2=d(d+1)(d-3)/(16(d-1)).                          (2)
```

For both parities the first-margin base simplifies to

```text
(s_D-1)(s_D+beta-1)=(d-1)(d-2)/4.                  (3)
```

Putting `d=5+c`, `c>=0`, subtraction gives

```text
M_1={3c^3+31c^2+108c+132 over 16(c+4)}>0.           (4)
```

This proves the complete `row_s=1` family.

The only other degree-two core in the lower diamond is the isolated terminal
cell `(d,r,row_s)=(5,0,5)`.  Its corrected source is
`40+300t-80t^2`; its residual product is `-9`, so its first margin is
immediate.

## 2. Exact generic obstruction at the same normalization

Take

```text
(p,alpha,m,n,beta)=(9,0,4,4,1/2)
```

and the admissible abstract factor parameters

```text
(lambda_1,lambda_2,lambda_3,lambda_4)=(1,1,-100,-1000).
```

The source has exactly two roots at `1` and two negative roots at
`-1/100,-1/1000`.  Its actual Duran coefficient polynomial is

```text
Q(z)=z^4+(4953/2)z^3+447527z^2-1121286z+1181250.    (5)
```

Exact Sturm counting gives precisely two real roots, one in each interval

```text
(-2281,-2280),  (-199,-198),                         (6)
```

and no other real root.  Remove these two negative roots.  If their
magnitudes are `b_1,b_2`, then

```text
b_1 b_2 <2281*199=453919.
```

Since `Q` is monic with constant coefficient `1181250`, the residual
conjugate-pair product satisfies

```text
G_2=1181250/(b_1b_2)
   >1181250/453919
   >3/2.                                             (7)
```

But at this normalization

```text
(s_D-1)(s_D+beta-1)=3/2.                             (8)
```

Thus `M_1<0` exactly.  This does not refute the path-selector first margin:
the actual path source at `(5,0,4)` is

```text
5+140t+83t^2-104t^3+9t^4,
```

not the source above, and its exact audited margin is positive.  The example
instead proves that the path structure is indispensable.

## 3. Remaining all-order target

After the second-margin theorem of
`LOWER_SELECTOR_DURAN_SECOND_MARGIN_THEOREM_2026-08-12.md`, the sole Duran
obligation is now:

> For the path selector
> `Gamma=G_(N,s)-2tG_(N-1,s)+t^2G_(N-2,s)`, after its exact forced zero is
> removed, the two-root residual product of the corrected Duran transform is
> smaller than `(s_D-1)(s_D+beta-1)`.

The counterexample (5)--(8) rules out a proof using only `(p,alpha,m)`, two
positive source roots in `[1,infinity)`, and the remaining source roots
negative.  A successful proof must retain at least one of:

1. the explicit path allocation formula;
2. the correlated endpoint determinant;
3. a path-specific disk/sector exclusion for the two residual roots.

## Replay

`verify_lower_selector_duran_first_margin_obstruction.py` proves (1)--(4)
symbolically, constructs (5) from the factor parameters, performs the exact
Sturm counts in (6), verifies (7)--(8), and checks the actual path source is
different.  It writes
`lower_selector_duran_first_margin_obstruction_exact_20260812.json`.
