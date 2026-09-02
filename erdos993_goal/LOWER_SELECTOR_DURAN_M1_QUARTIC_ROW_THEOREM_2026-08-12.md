# Reciprocal-resultant first-margin theorem for the quartic lower row

Date: 2026-08-12

## Result

For every `d>=5` and every lower-diamond parameter `0<=r<4`, the corrected
lower-selector Duran polynomial on `row_s=4` satisfies

```text
M1=(s_D-1)(s_D+beta-1)-G2>0.                         (1)
```

Together with the earlier row `1`, cubic-row `2,3`, and central-coefficient
theorems, both Duran margins are now proved in all orders on
`row_s=1,2,3,4`.

The proof is root-free in its parameter step.  A reciprocal resultant detects
the product boundary, exact Sturm counts partition the continuous order
parameter, and one exact rational Sturm/Vieta sample fixes the inequality in
each component.

## 1. Product boundary as a resultant

For `row_s=4` the corrected selector has no forced zero and has degree four.
Let `q` be its actual Duran polynomial and put

```text
F(x)=q(-x),
A=(s_D-1)(s_D+beta-1),
C=q(0)/LC(q),
T=C/A.                                                (2)
```

The Pochhammer theorem gives at least two negative roots of `q`, equivalently
at least two positive roots of `F`.  Let those two roots be `b1,b2`.  Vieta
gives

```text
G2=C/(b1 b2).                                         (3)
```

Hence (1) is equivalent to

```text
b1 b2>T.                                              (4)
```

Define the reciprocal transform

```text
F_T^*(x)=x^4 F(T/x).                                  (5)
```

If any pair of roots `rho_i,rho_j` of `F` (allowing `i=j`) has product `T`, then `rho_i` is
a common root of `F` and `F_T^*`.  Conversely every common root produces
such a pair.  The harmless self-pair cases `rho_i^2=T` make this a superset
of the distinct-pair boundary needed for M1.  Therefore the exact boundary
detector is

```text
R(k)=Res_x(F(x),F_T^*(x)).                            (6)
```

## 2. The eight symbolic families

Write

```text
d=2k+5  in odd order,
d=2k+6  in even order,         k>=0.                  (7)
```

There are eight families, indexed by `r=0,1,2,3` and the two parities.
Direct symbolic construction from

```text
p_(M,i)=binom(2M-i-1,i),
Gamma=G_(d+r,4)-2tG_(d+r-1,4)+t^2G_(d+r-2,4)          (8)
```

followed by the corrected Duran transform makes `R(k)` a rational function.
All denominator factors and all small numerator factors have no nonnegative
root.  The remaining factors have degrees `24`, `25`, or `26`.  Exact Sturm
counting gives:

| `r` | parity | nonnegative roots of large factors | component samples `k` |
|---:|:---:|:---|:---|
| 0 | odd  | one degree-24 root in `(3,4)`; one degree-25 root in `(1,2)` | `0,2,4` |
| 0 | even | one degree-24 root in `(2,3)`; one degree-25 root in `(1,2)` | `0,2,3` |
| 1 | odd  | one degree-24 root in `(2,3)` | `0,3` |
| 1 | even | one degree-24 root in `(2,3)` | `0,3` |
| 2 | odd  | one degree-24 root in `(2,3)` | `0,3` |
| 2 | even | one degree-24 root in `(1,2)` | `0,2` |
| 3 | odd  | one degree-24 root in `(2,3)` | `0,3` |
| 3 | even | one degree-24 root in `(1,2)` | `0,2` |

The report records narrow exact rational isolating intervals and SHA-256
digests of every large factor.  In particular, `R(k)` is nonzero at every
integer `k>=0`.

## 3. Root count cannot change

For each of the eight families, the discriminant of `F` has one nonconstant
factor of degree 33.  Exact Sturm counting proves that this factor has no
root on `[0,infinity)`.  Its remaining factors are manifestly nonzero there.
Also `F(0)=q(0)>0`, so no positive root crosses zero.

At `k=0`, an explicit exact `F.count_roots(0,infinity)==2` assertion gives
exactly two positive roots of `F`; the replay records this count in every
family and repeats it at every component sample.
Consequently `F` has exactly two positive simple roots throughout
`k>=0`.  They can be followed continuously, and their product can meet `T`
only at a zero of (6).

The isolated roots of (6) partition `[0,infinity)` into the components in
the table.  In each component the script performs one exact rational
Sturm/Vieta M1 certification at the displayed integer sample.  Every sample
is strict.  Continuity and (6) then give (4) throughout every component,
in particular at every integer `k>=0`.  Equations (2)--(4) prove (1).

## 4. Replay

`prove_lower_selector_m1_quartic_row.py` constructs all eight symbolic
families, factors the reciprocal resultants and discriminants, performs the
exact positive-axis Sturm counts, and reruns the exact rational M1 audit at
all component samples.  It writes
`lower_selector_duran_m1_quartic_row_exact_20260812.json` and reports

```text
PASS_EXACT_ALL_ORDER_LOWER_DURAN_M1_ROW_4.
```

This proves the complete quartic row, not the generic `row_s>=5` theorem.
