# Face-factored mixed-support partition lemma

Fix either mixed endpoint face `(z,w)=(0,1)` or `(1,0)`, put
`P=a2+a3`, `Q=b2+b3`, and retain the ten ordinary slacks

```
A = {a0,b4,b5,b6,b7},
B = {a4,a5,a6,a7,b0}.
```

For any auxiliary polynomial `F` on that face and any monomial `m`, let
`supp_s(m)` be the set of ordinary slack variables having positive exponent in
`m`.  There is a disjoint exhaustive partition

```
Z  : supp_s(m) = empty,
EA : empty != supp_s(m) subset A,
EB : empty != supp_s(m) subset B,
X  : supp_s(m) meets A and supp_s(m) meets B.
```

Indeed, after deciding whether the support meets `A` and whether it meets `B`,
the four displayed cases are the four possible truth-value pairs.  No algebra
or sign assumption enters this partition.

This support partition removes the dangerous face-inclusion subtraction.  One
does **not** infer positivity merely from two restrictions and write

```
F = F_A + F_B - F_Z + F_X.
```

That formal identity exposes a negative copy of `F_Z`, which separate face
nonnegativity does not control.  Instead one certifies the coefficient sectors
of the single polynomial `F` directly:

1. The zero-slack Young certificate pays exactly the `Z` targets using `Z`
   sources.
2. Every A-only Young certificate has targets and sources with all B exponents
   zero and with positive A support, hence stays entirely in `EA`.
3. Every B-only Young certificate analogously stays entirely in `EB`.
4. The graded outer-slice scans establish raw coefficientwise nonnegativity in
   `X`; no source reserve is consumed there.

The four source pools are therefore disjoint.  In particular the zero-support
reserve is neither counted twice nor subtracted, and an A-only or B-only
payment cannot consume a coefficient needed by the zero-support certificate.

For `X`, total ordinary-slack degree is at least two.  Thus grades zero and one
are empty automatically.  The exact factor-degree bounds give maximum grades
16 for curvature and 17 for strong.  Consequently the finite cross check needs
only

```
curvature: degrees 2,...,16,
strong:    degrees 2,...,17.
```

Within each grade, the exact outer support `0<=exponent(b0)<=2` gives three more
disjoint exhaustive pieces.  This produces a two-level finite partition:

```
ordinary-slack support sector -> total slack degree -> b0 exponent.
```

After every indicated certificate/report and its independent audit is pinned,
the sector partition proves the entire ten-slack polynomial on each of the two
mixed endpoint faces.  It remains a component of the rank-eight low/low cone
bridge, not a claim of the all-order Erdős #993 conjecture.
