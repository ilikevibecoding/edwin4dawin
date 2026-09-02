# Mesh-one interval radial envelope

This note records an all-degree reduction for the Herglotz factor in Section 35
of `ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md`.  It is a
proved analytic lemma, but it does not by itself prove the remaining
last-coupling inequality.

## Statement

Let

```text
P(x)=prod_(i=1)^k (x-zeta_i),
0<zeta_1<...<zeta_k,
zeta_(i+1)-zeta_i>=1,
```

and let `z=X+iY` with `Y>0`.  Put

```text
R_P(z)=P(z-1)/P(z).
```

There is a unique `s>=0` such that

```text
arg R_P(z)=arg((z-s)/z),                                  (1)
```

where both arguments are taken continuously in `(0,pi-arg z)`.  For this
choice of `s`,

```text
|R_P(z)| >= |(z-s)/z|.                                   (2)
```

Consequently, for every `L>0`,

```text
A_P(z)=z/(z+L) * P(z-1)/P(z)
```

has the same argument as

```text
A_s(z)=(z-s)/(z+L)                                      (3)
```

and satisfies `|A_P(z)|>=|A_s(z)|`.

Thus, at a fixed nonreal point and on a fixed ray from the origin, an
arbitrary mesh-one positive factor can only increase the modulus relative to
one packed interval starting at zero.

## Proof

The mesh condition makes the unit intervals

```text
E=union_i [zeta_i,zeta_i+1]
```

pairwise disjoint.  With a continuous logarithm in the upper half-plane,

```text
log R_P(z)=-integral_E dx/(z-x).                          (4)
```

Define the positive density

```text
g_z(x)=Y/((X-x)^2+Y^2),       x>=0.                      (5)
```

Taking imaginary parts in (4) gives

```text
arg R_P(z)=integral_E g_z(x) dx.                         (6)
```

Since `E` is a subset of the positive half-line,

```text
0<=integral_E g_z <= integral_0^infinity g_z
                      =pi-arg z.
```

The function `s -> integral_0^s g_z` is continuous and strictly increasing
from zero to `pi-arg z`, so there is a unique `s` for which

```text
integral_0^s g_z(x) dx=integral_E g_z(x) dx.             (7)
```

Equation (4) applied to `[0,s]` now proves (1).

For the real part of (4), write `dnu=g_z(x)dx`.  Then

```text
log|R_P(z)|
 =integral_E (x-X)/((X-x)^2+Y^2) dx
 =(1/Y)(integral_E x dnu-X integral_E dnu).              (8)
```

Among measurable subsets of `[0,infinity)` having a prescribed `nu`-mass,
the initial interval has the smallest first moment.  This is the elementary
bathtub/rearrangement inequality: moving any positive `nu`-mass from a larger
`x` to an unoccupied smaller `x` cannot increase the first moment.  Using
(7),

```text
integral_E x dnu >= integral_0^s x dnu.                  (9)
```

Substitution in (8) proves (2).  Multiplication by the fixed factor
`z/(z+L)` proves (3) and the final modulus comparison.

The disjointness supplied by mesh one is essential: without it, (6) contains
multiplicity and the set rearrangement in (9) is unavailable.

## Role in the remaining proof

At stage `k` of the commuting-shift recurrence, Section 35 writes

```text
A(z)=z/(z+L) * P_k(z-1)/P_k(z)
```

with `P_k` having positive roots of mesh at least one.  The lemma removes all
of those roots from the radial comparison at a proposed nonreal crossing and
replaces them by the single real parameter `s`.

The resulting quadratic comparison is

```text
(z-s)/(z+L)  versus  Q_k(z)/Q_k(z-1).                    (10)
```

A disk bound on the roots of `Q_k` alone is not enough to settle (10): a
quadratic with a zero very near `z-1` gives counterexamples to that relaxed
statement.  The next obligation is therefore to combine the envelope with
the *reachable N_1 path constraint* on `Q_k`, rather than discard the coupling
between `P_k` and `Q_k`.  This is a strictly lower-dimensional formulation of
the all-order circle-crossing problem.
