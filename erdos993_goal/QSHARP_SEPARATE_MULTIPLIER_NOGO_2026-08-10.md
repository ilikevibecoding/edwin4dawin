# Q-sharp normalization: exact factorization and sequential-transport no-go

Date: 2026-08-10

## Result

For the artificial alpha-zero row, the outer normalization does factor
algebraically into two strict finite multiplier sequences.  Nevertheless,
those two factors cannot be exposed sequentially as stability-preserving
steps from the pre-binomial row.  The obstruction occurs at the first
genuine lower cell `(N,d,s)=(5,5,1)`.

This does not disprove the Q-sharp theorem.  It proves that a successful
rectangular Wishart/ordered-partition representation must keep the two
factorial normalizations coupled, or equivalently use the single binomial
multiplier before the unstable pre-binomial specialization is taken.

## 1. Exact finite-multiplier factorization

Write the degree-`P` pre-binomial row as

```text
C(z)=sum_(j=0)^P C_j z^j.
```

The alpha-zero Q-sharp row is

```text
Qsharp(z)=sum_j binom(P,j) C_j z^j.                 (1)
```

Coefficientwise,

```text
binom(P,j)=P! {1/j!}{1/(P-j)!}.                     (2)
```

Both factors in braces are strict finite multiplier sequences of degree
`P`.  Their algebraic symbols are

```text
sum_j binom(P,j) z^j/j!       =L_P(-z),
sum_j binom(P,j) z^j/(P-j)!   =z^P L_P(-1/z),       (3)
```

and all Laguerre roots are positive and simple.  Hence both symbols have
simple negative roots.

Formula (2) is exactly the factorial split suggested by a shared pool of
`P` ordered-partition slots: the ordered bijections contribute a common
`P!`, while the two side allocations require division by `j!` and
`(P-j)!`.

## 2. Exact first-cell obstruction

At `(N,d,s)=(5,5,1)`, `P=6` and

```text
Gamma(t)=8-12t+4t^2=4(t-1)(t-2).
```

The corresponding pre-binomial row is

```text
C(z)=4(z+1)^2(z^2+z+1)(2z^2+3z+2).                (4)
```

Thus `C` has only two real zeros, both at `-1`, and two nonreal conjugate
pairs.  Apply the first factor in (2).  Apart from the positive scalar
`1/90`, the result is

```text
L(z)=z^6+27z^5+285z^4+1440z^3
     +3420z^2+3240z+720.                            (5)
```

Its exact discriminant is

```text
-1566351346982400000 < 0.                            (6)
```

An exact Sturm chain gives four negative real roots and one nonreal
conjugate pair.  Applying `1/(P-j)!` first gives the reciprocal of (5), so
it has the same defect.  Therefore neither ordering exposes a stable
intermediate polynomial.

The full coupled product does repair the last pair:

```text
Qsharp(z)=4(2z^6+54z^5+285z^4+480z^3
              +285z^2+54z+2),                       (7)
```

and an exact Sturm chain places all six roots on the negative axis.

Consequently, if a proposed stable rectangular parent specialized after
the first separate factorial multiplier to the scalar intermediate (5),
stability preservation and real specialization would force (5) to be
real-rooted, contradicting (6).  The two factorial factors cannot be
exposed sequentially in such a lift.

## 3. The gamma-coordinate split fails even earlier

Formula (717) contains the first diagonal gamma factor

```text
B_h=(P-2h)!/(P-h)!.
```

For `P=6` and input degree two, its finite symbol has discriminant
`-13/75`; it is not a finite multiplier sequence.  On the actual
`Gamma=8-12t+4t^2`, its image has discriminant `-368/75`.
Thus the positive-diagonal/Pascal/positive-diagonal display in (717) is not
a factorization into real-rootedness preservers either.

## 4. Exact scope

`prove_qsharp_separate_multiplier_nogo.py` verifies the Laguerre symbols
through degree 30, checks the coefficient factorization on every lower cell
with `5<=d<=10`, and reproduces (4)--(7), both exact Sturm counts, and both
gamma-coordinate discriminants.  It writes
`qsharp_separate_multiplier_nogo_exact_20260810.json`.

The Laguerre identities and the explicit rational counterexample are
all-order/exact statements; the finite ranges only audit transcription.
