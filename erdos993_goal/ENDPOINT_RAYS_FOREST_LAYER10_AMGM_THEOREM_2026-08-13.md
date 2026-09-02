# Endpoint Jacobi rays close at forest layer ten

Date: 2026-08-13

## Theorem

Retain the aligned endpoint notation

```text
C=P_(N-1), D=P_(N-2),
V=P_N-P_(N-1), W=P_(N-1)-P_(N-2),

E=J_s(C,C)+uJ_s(D,D),
F=J_s(C,V)+uJ_s(D,W),
G=J_s(V,V)+uJ_s(W,W).
```

At `s=10`, for every

```text
N=25+q,       q>=0,       c>=0,       u>=0,
```

both endpoint pencils

```text
E+cF,         F+cG
```

have only nonpositive real roots, with their forced zero roots retained.

## Exact discriminant certificate

Remove the common forced powers of `t`.  Both cores have degree five.
Exact multivariate resultant computation over `QQ[c,q,u]` gives:

* `Disc_t(E+cF)` has 4,617 monomials and every coefficient is strictly
  positive.
* `Disc_t(F+cG)` has 4,293 monomials.  Its 221 negative monomials all lie
  in its single `c^7` block; every coefficient outside that block is
  strictly positive.

Write the latter discriminant as

```text
sum_k c^k D_k(q,u),
D_7=P_7-N_7,
```

where `P_7,N_7` are coefficientwise positive and `N_7` contains exactly
the negative part.  The adjacent blocks `D_6,D_8` each have 477 strictly
positive coefficients, while `P_7,N_7` have respectively 256 and 221.
Exact multiplication gives

```text
4D_6D_8-N_7^2
```

with 1,785 strictly positive coefficients.  Therefore, for `c,q,u>0`,

```text
c^6D_6+c^8D_8
 >= 2c^7 sqrt(D_6D_8)
 > c^7N_7.
```

All remaining terms are positive, so both discriminants are strictly
positive in the positive parameter interior.

## Homotopy to the rooted endpoint rays

Section 75 proves that `E` is negative-rooted.  Along `E+cF`, the strictly
positive discriminant and fixed positive leading coefficient prohibit a
root collision or a degree loss as `c` increases from zero.  Thus the pencil
remains real-rooted.

Likewise Section 75 proves

```text
G=t{J_(s-2)(S,S)+uJ_(s-2)(T,T)}
```

negative-rooted.  Starting from the scaled limit
`c^(-1)(F+cG) -> G` as `c -> infinity`, its strictly positive discriminant
prohibits a collision at any finite positive `c`.  Thus `F+cG` is
real-rooted.  The verified positive coefficients of the pencils put every
nonzero real root on the negative axis.  The faces `c=0`, `q=0`, or `u=0`
follow by coefficientwise limits and closure of real-rootedness.

This is an exact theorem on the unbounded forest half-line, not a parameter
grid.  Combined with the prior layer-nine theorem, it closes every layer
`2<=s<=10`.

## Replay

`prove_endpoint_rays_forest_layer10_amgm.py` performs the exact FLINT
multivariate discriminants and coefficientwise AM--GM margin check.  It
writes `endpoint_rays_forest_layer10_amgm_exact_20260813.json` and reports

```text
PASS_EXACT_ENDPOINT_RAYS_FOREST_LAYER10_AMGM_REPAIR.
```

