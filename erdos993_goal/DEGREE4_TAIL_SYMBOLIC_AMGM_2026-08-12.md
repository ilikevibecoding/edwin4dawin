# Symbolic AM--GM certificate for the degree-four lower tails

## 1. Families

Set `s=2N-delta`.  The two persistent core-degree-four lower-tail families
are

```text
delta=10, forced zero order N-9,
delta=11, forced zero order N-10.                         (1)
```

Near this boundary, every path coefficient has the polynomial form

```text
[v^(N-b)]P_(N-j)=binom(N+b-2j-1,2b-2j-1),                (2)
```

whose lower binomial argument is constant.  Thus the five nonzero gamma
coefficients, and every coefficient of their quartic discriminant, are
exact rational polynomials in `N`.  The replay constructs these expressions
directly from (2), the gamma recursion, and the explicit 16-term quartic
discriminant; it does not infer them from numerical interpolation.

## 2. Uniform midpoint relations

Write `A,B,C` for the discriminant coefficients at exponents

```text
A: (c,q,u)=(6,12,4),
B:           (6,10,6),
C:           (4, 8,6),                                  (3)
```

and write `-N1,-N2` for the coefficients at the midpoint exponents
`(6,11,5),(5,10,5)`.  In both tail families, exact symbolic simplification
gives

```text
B=4C,       N1=2N2.                                      (4)
```

Moreover,

```text
delta=10:
  2AB/N1^2 =
  441(N-7)^2(N-1)^4(N+3)^2 /
  (2(N^4+38N^3-716N^2+1314N+441)^2),                    (5)

delta=11:
  2AB/N1^2 =
  578(N-8)^2(N-1)^4(N+4)^2 /
  (5N^4+48N^3-1519N^2+2874N+1088)^2.                    (6)
```

After subtracting one, the numerator of (5), shifted by `N=m+12`, has
ascending coefficients

```text
36318340575, 32591657340, 12287518452, 2574193908,
329995882, 26598388, 1318020, 36700, 439,                (7)
```

and the corresponding numerator for (6) has ascending coefficients

```text
34650392512, 34118066400, 13561936844, 2943036012,
387536625, 31944324, 1613858, 45672, 553.                (8)
```

All are strictly positive.  Hence `2AB>N1^2` for every integer `N>=12`
whenever `N1` is nonzero; if `N1=0`, the desired absorption is immediate.
By (4), the second inequality `2AC>N2^2` is identical.

## 3. Consequence and exact scope

For every `N>=12` in both families, split `A c^6q^12u^4` equally and apply
AM--GM to (3).  This uniformly absorbs the two midpoint terms:

```text
(A/2)mA+B mB >= N1 c^6q^11u^5,
(A/2)mA+C mC >= N2 c^5q^10u^5.                          (9)
```

This is an all-`N` symbolic theorem for the first and persistent pair of
coefficientwise obstructions.  It is not by itself an all-`N` proof of the
entire discriminant: beginning at larger `N`, further negative coefficients
appear elsewhere in the same two tail families.  Finite exact exploration
shows that those additional terms also admit midpoint/SONC allocations, but
their symbolic allocation remains the next obligation.

Replay:

```powershell
python verify_degree4_tail_amgm_symbolic.py
```

