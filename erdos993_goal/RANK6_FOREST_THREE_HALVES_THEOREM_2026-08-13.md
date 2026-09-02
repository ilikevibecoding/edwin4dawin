# Rank-six three-halves theorem for forests

Date: 2026-08-13

Status: **PROVED ALL-ORDER THEOREM.**  This extends the existing rank-six
tree theorem to arbitrary forests.  It is an input to the rank-six pendant
cascade, not a proof of Erdős Problem 993: the remaining pendant payment
contains a separate term which can be negative.

## 1. The theorem

For every forest `F` with `alpha(F)>=10`, writing `i_j=i_j(F)`,

```text
Q_6(I(F))=12 i_6^2-i_5 i_6-14 i_5 i_7 >= 0.          (1)
```

Equivalently, for the factorially scaled coefficients

```text
q_j=2^j j! i_j,
```

the adjacent ratio drop at rank six is at least one.

## 2. Full-factor cones

The already proved low-rank forest inequalities imply the following gap
conditions for every factor which satisfies (1).  After a harmless common
homogenizing scale `h`, its consecutive factorial-ratio gaps obey

```text
delta_0 >= 2h,
delta_1 >= 0,
delta_1+delta_2 >= 2h,
delta_3,delta_4,delta_5 >= h.                         (2)
```

If `delta_1>=h`, this is the high cone.  If `delta_1<h`, write
`delta_1=r`; then `delta_2=2h-r+d_2` and the factor belongs to the low
cone.  These two parametrizations are exhaustive.

For two factors, their factorial coefficients combine by binomial
convolution.  Exact expansion of the rank-six margin gives three cases.

* high/high: 7,409,192 terms, all positive;
* low/high: 7,698,498 terms, with every negative term confined to one
  boundary face;
* low/low: 7,988,458 terms, with the same phenomenon on two adjacent
  boundary layers.

On the low/high hard face, the margin factors as

```text
(7b+ta+a3+a4+a5) R_LH,                               (3)
```

where `R_LH` has 9,024 terms and 74 negative coefficients.  On the low/low
hard face it factors as

```text
(7b+7c+ta+a3+a4+a5) R_LL,                            (4)
```

where `R_LL` has 24,975 terms and 89 negative coefficients.  The `c=0`
slice of `R_LL` is exactly `R_LH`; all slices of degree at least two in `c`
are coefficientwise positive.

Every remaining negative monomial is the midpoint of two positive
monomials.  The replay constructs and checks 74 and 89 exact AM-GM blocks,
respectively.  For each block

```text
A x^u+B x^v-C x^m >= 0,
u+v=2m,                 4AB>=C^2.                    (5)
```

It checks exact coverage of every negative coefficient and checks that the
total use of every positive coefficient does not exceed its available
coefficient.  Thus all three convolution cones preserve (1).

## 3. Small components and the first crossing

The tree theorem supplies (1) for every tree of order at least 13.  Trees
of order at most 12 are treated as small factors.  There are exactly 874
distinct small tree independence polynomials.

Each of those 874 factors was convolved symbolically with both full cones.
The high calculation contains 22,774,692 terms and the low calculation
30,849,578 terms.  Every coefficient is positive; the minimum coefficient
in both cases is one.  Hence adjoining any small tree factor preserves a
full factor.

It remains only to create the first full factor when every component is
small.  Immediately before the total order first reaches 13, the existing
partial forest has order at most 12 and the newly adjoined tree has order at
most 12.  Complete polynomial enumeration checks all 2,227,175 such
ordered products (1,609,907 distinct products).  Every crossing product
satisfies (1); the exact minimum is 9,738.

There is one small 12-vertex tree row with negative reserve,

```text
(1,12,55,122,135,68,12,1),   Q_6=-40.                (6)
```

The complete crossing certificate proves that this exception cannot
propagate beyond order 12.

Now take an arbitrary forest of order at least 13.  If it has a component
of order at least 13, start with that component and use full/full or
small/full closure for every other component.  Otherwise, start at the
first small-component crossing of order 13 and proceed identically.  This
proves (1) for every forest of order at least 13.  For the only remaining
required orders, the complete forest-polynomial base with `alpha>=10`
contains 94 rows (orders 10, 11, and 12); all pass, with exact minimum
`43624`.  This proves (1) whenever `alpha(F)>=10`.

## 4. Exact replay

Run

```powershell
python .\verify_rank6_three_halves_convolution_cones.py
python .\verify_rank6_three_halves_forest_certificate.py
```

The reports are

```text
rank6_three_halves_convolution_cones_exact_20260813.json
rank6_three_halves_forest_certificate_exact_20260813.json.
```

The AM-GM replay reconstructs the original symbolic cones; the JSON rows
are output certificates, not trusted inputs.

## 5. Remaining rank-six pendant term

For the component-separated pendant identity `P=(1+x)B+xC`, the exact PGC
margin is

```text
H_6(P)-H_5(B)
 =3Q_6(P)/p_5+9c_5+V_6(B)/b_4,

V_6(B)=4b_4b_5+39b_4b_6-25b_5^2.                   (7)
```

The theorem above closes the first term in every required rank-six PGC
instance.  It does not close (7), because `V_6` is negative on twelve exact
forest rows in the known order-18 census.  The remaining rank-six problem
is therefore the coupled payment in (7), not the forest reserve (1).
