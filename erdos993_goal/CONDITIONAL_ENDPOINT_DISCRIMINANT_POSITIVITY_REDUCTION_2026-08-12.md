# Conditional endpoint compatibility via coefficientwise discriminants

## 1. Family

Use `U,X,Y,K_r` from
`CONDITIONAL_ENDPOINT_COMMON_INTERLACER_REDUCTION_2026-08-12.md`, and set

```text
q=r+1>=0,
Z_(c,q,u)(t)=X(t)+cK_(q-1)(t),     c>=0, u>0.       (1)
```

The common-interlacer target is precisely that (1) is negative-rooted for
all displayed parameters.

## 2. New exact signal

The replay exhausts all 112 core-degree-two/three/four/five cells for
`5<=N<=15`.  In 100 cells, the discriminant

```text
Disc_t Z_(c,q,u)                                    (2)
```

has strictly positive coefficients as a polynomial in `(c,q,u)`.
In particular it is positive throughout `c,q,u>0`.  This is a much better
certificate target than the resultant of `X` and `K_r`: those two
polynomials can share roots inside the parameter domain, whereas (2)
certifies that every interior member of the positive pencil remains
simple.

Representative exact term counts are:

```text
gamma degree 2:   23--27 positive terms,
gamma degree 3:   56--125 positive terms,
gamma degree 4:   339--343 positive terms,
gamma degree 5:   725--729 positive terms.          (3)
```

No negative or zero coefficient occurs in those 100 discriminants
(18,738 coefficients in total).  The remaining 12 cells (seven of core
degree four and five of core degree five) have an exact uniform exception.
For core degree four the only negative exponents are
`(6,11,5),(5,10,5)`, with magnitudes `N1,N1/2`; for core degree five they
are `(8,15,7),(7,14,7)`, again with magnitudes `N1,N1/2`.
Thus the literal coefficientwise pattern is false deeper in the lower cone.
The first exact obstruction found is `(N,s)=(12,13)`, with forced-zero
order two and nonzero-core degree four.  Its 339-term discriminant has
exactly two negative monomial coefficients:

```text
[c^6 q^11 u^5] Disc = -12161104935239856960000000,
[c^5 q^10 u^5] Disc =  -6080552467619928480000000.  (4)
```

Thus monomial coefficientwise positivity is not the all-order theorem.
In fact, (4) is not a compatibility counterexample: the two negative
monomials have the following exact grouped AM--GM certificate.  Put

```text
mA=c^6 q^12 u^4,  A=673459603004266670592000000,
mB=c^6 q^10 u^6,  B=317181089457987955200000000,
mC=c^4 q^8  u^6,  C= 79295272364496988800000000,
N1=12161104935239856960000000,
N2= 6080552467619928480000000.
```

The exponent midpoints give
`sqrt(mA mB)=c^6 q^11 u^5` and
`sqrt(mA mC)=c^5 q^10 u^5`.  Split the available term `A mA`
equally.  Weighted AM--GM gives

```text
(A/2)mA+B mB >= sqrt(2AB)c^6 q^11 u^5 >= N1 c^6 q^11 u^5,
(A/2)mA+C mC >= sqrt(2AC)c^5 q^10 u^5 >= N2 c^5 q^10 u^5.
```

Both last inequalities are exact after squaring: their positive margins are

```text
2AB-N1^2 = 427069408700428806223460450329322846515200000000000000,
2AC-N2^2 = 106767352175107201555865112582330711628800000000000000.
```

Every other coefficient is positive.  Therefore the entire `(12,13)`
discriminant is strictly positive on the positive cone despite its two
negative monomial coefficients.  This supplies the first concrete model
for the required grouped-positive expansion.

The replay applies the same construction exactly in all 12 exceptional
cells.  For core degree four it uses shared exponent `(6,12,4)` and partner
exponents `(6,10,6),(4,8,6)`.  For core degree five it uses shared exponent
`(8,16,6)` and partners `(8,14,8),(6,12,8)`.  In each cell it checks the
two integer inequalities `2AB>N1^2` and `2AC>N2^2`; every margin is
strictly positive.  Hence all 112 audited discriminants are pointwise
positive on the positive cone.

## 3. Why this would prove compatibility

At `c=0`, (1) is `X`, already negative-rooted by the mixed-slice theorem.
If (2) is positive for every `c>0,q>=0,u>0`, no two roots can collide as
`c` varies.  The leading coefficient and the common gamma ceiling control
degree loss; forced zero roots are retained before passing to the nonzero
core.  Hence the roots cannot leave the real line, and every `Z` is
real-rooted.  Its nonnegative coefficients then place all roots on the
nonpositive axis.  Thus an all-order positivity proof of (2), plus
the routine boundary limits `c=0`, `q=0`, would prove the fixed `X`
common-interlacer theorem and close the coherent lower selector.

For clarity, the finite result certified by the replay is already a theorem:

> **Fixed-cell theorem.**  For every one of the 112 `(N,s)` cells listed in
> the JSON report (100 coefficientwise-positive and 12 AM--GM-repaired),
> `X+cK_(q-1)` is negative-rooted for all
> `c,q,u>=0` (after restoring its common forced power of `t`).

Indeed, for fixed positive `q,u`, start at `c=0`.  The mixed-slice theorem
gives real-rooted `X`; the strictly positive discriminant and fixed positive
leading coefficient prevent collision or degree loss for `c>0`.  Nonreal
roots therefore cannot be born along this connected ray.  Coefficient
nonnegativity locates the roots on the nonpositive axis, and `c=0`, `q=0`,
or `u=0` follow by coefficientwise limits and closure of real-rootedness.
This is a finite family theorem, not yet the all-order compatibility theorem.

## 4. Exact obstruction to a resultant proof

The resultant `Res_t(X,K_r)` does vanish in the interior.  Already for
`(N,s)=(5,2)`, after `q=r+1`, its nontrivial factor is

```text
(16u^2+49u+39)q^2
-2(16u^2+49u+39)q
+13u^2+44u+31.                                     (5)
```

The two roots are

```text
q=1 +- sqrt((3u^2+5u+8)/(16u^2+49u+39)),           (6)
```

and both are positive.  Thus `X` and `K_r` exchange orientation through
allowed common-root collisions.  Positive compatibility survives, but a
proof by excluding all collisions of the endpoints cannot work.

## 5. Remaining theorem

The exact frontier is now:

> After removing the common forced power of `t`, every principal Hermite
> subdiscriminant of `Z_(c,q,u)` is nonnegative on
> `c,q,u>=0`; it is enough in the already-real-rooted homotopy to prove
> the full discriminant is strictly positive in the interior.

The finite low-row evidence suggests a grouped positive expansion, but the
literal monomial-coefficient version is refuted by (4).  A Cauchy--Binet
expansion of the Sylvester determinant, specialized
with the path recurrence

```text
P_N=(1+2v)P_(N-1)-v^2P_(N-2),
```

is the natural all-order target.  The exact expansions here are evidence,
not an all-order proof.
