# Endpoint rays in forest layer 9

Date: 2026-08-13

This note extends `ENDPOINT_RAYS_FOREST_LOW_LAYERS_THEOREM_2026-08-13.md`
by one complete layer.  It is an all-parameter theorem for the fixed layer
`s=9`, not a bounded numerical scan.

## Theorem

Retain the aligned endpoint rays `E,F,G` from Section 105 of
`ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md`.  In the
forest cone put

```text
s=9,             N=2s+5+q=23+q,
q,c,u>=0.
```

Then both endpoint pencils

```text
E+cF,             F+cG
```

have only nonpositive real roots.  Together with the preceding low-layer
theorem, the endpoint square is therefore closed for every `2<=s<=9` and
every forest excess.

## Proof

After the harmless common zero powers are removed, both pencils have degree
four in the gamma variable `t`.  Their coefficients are polynomials in
`c,q,u` with nonnegative coefficients and strictly positive leading
coefficient in the open orthant.

For `E+cF`, exact symbolic elimination gives a discriminant with 1,960
monomials, every one having a strictly positive integer coefficient.  Thus
the discriminant is positive whenever `c,q,u>0`.

For `F+cG`, write its discriminant as a polynomial in `c`:

```text
Disc_t(F+cG)=sum_j c^j D_j(q,u).
```

All negative monomials occur in the single block `c^5D_5`; there are
exactly 144 of them.  Let `M(q,u)` be the absolute value of the negative
part of `D_5`.  The adjacent blocks `D_4,D_6` each have 259 strictly
positive monomials, and direct expansion gives

```text
4D_4D_6-M^2 > 0
```

coefficientwise, with 949 strictly positive monomials.  Hence, for positive
parameters,

```text
c^4D_4+c^6D_6
 >=2c^5 sqrt(D_4D_6)
 > c^5M.
```

This absorbs every negative term in the `c^5` block; all remaining
discriminant terms are already positive.  Therefore the second
discriminant is also strictly positive throughout the open orthant.

For fixed `q,u>0`, the base rays `E` and `G` are simple negative-rooted by
the strict Section 75 mixed-slice common interlacers.  Along either positive
`c`-ray, a real polynomial of fixed degree and positive leading coefficient
can acquire a nonreal conjugate pair only through a multiple root.  The
strictly positive discriminants exclude such a collision.  Thus both
pencils remain simple negative-rooted for `c,q,u>0`.  The cases where one
or more parameters vanish follow by coefficientwise limits; degree drops
and zero roots are harmless under closure.  This proves the theorem.

## Exact replay

Run

```text
python prove_endpoint_rays_forest_layer9_amgm.py
```

It reconstructs the two symbolic discriminants, verifies all coefficient
signs, isolates the unique negative `c^5` block, and proves the displayed
AM-GM margin coefficientwise.  The report is
`endpoint_rays_forest_layer9_amgm_exact_20260813.json`.

The SHA-256 hashes of the replay and report are respectively
`D84AEED0E4AF13F2BFE77C2B1BFDC8449BC72E43D8EA76D80DB99360A011B90A`
and
`B414B64C94E16D714CFC3438F0AC2A8A07825D0162E2151257E047889D079098`.

