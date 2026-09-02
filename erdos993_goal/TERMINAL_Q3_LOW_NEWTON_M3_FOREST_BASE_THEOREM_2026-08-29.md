# Terminal q3 payment: Newton degree 3 for arbitrary forest bases

Date: 2026-08-29

Status:
`PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M3`.

## Claim

For every finite forest base `G`, every marked vertex, and every supported
terminal-payment cell `j>=3`, the coefficient of `binom(t-1,3)` in the
normalized untruncated included-payment margin is nonnegative.

## Forest parameterization

Put `|G|=N+1`, `h=c(G)-1`, `m=|E(G)|=N-h`, and let
`W=sum_v binom(deg_G(v),2)`.  The exact coefficients that replace the
tree-specific identities are

```text
p1 = (N^2+N+2)/2+h,
p0 = N^3/6-N^2/2+Nh+N/3+W,
r2 = N-h,
r1 = N(N-h)-2W.
```

Since `0<=W<=binom(N-h,2)`, these imply

```text
p0 <= N(N-1)(N+1)/6 + h(h+1)/2,
r1 >= (N-h)(h+1),
p0 >= p0_low+h,
a=i2(G-w) >= binom(N-1,2).
```

Every monotone substitution in the verifier is differentiated first.  The
low remainder is nonincreasing in `e0` and `p0`; after
`e0<=(j+2)b`, its coefficient of `a` is

```text
b(3N(j-2)+7j-23)>0                 (N>=j>=4).
```

Thus all upper and lower replacements have the required direction.

## Targets j>=4

The forest remainder satisfies

```text
[P Q]_3 >= -(b/2) Q3(N,j,h),
```

where the full polynomial `Q3` is recorded verbatim in the JSON report.  The
positive anchor bounds are

```text
A1 >= a[p0_low+N+2+h(N+3)],
A2 >= a[N^2+3N+8+3h],
A3 >= a(3N+10).
```

After `j=4+k` and `N=j+r`, the cleared sufficient gap is quadratic and
concave in `0<=h<=N`: its `h^2` coefficient has 11 monomials and every one is
negative.  Its two endpoint polynomials, at `h=0` and `h=N`, each have 42
positive monomials with least coefficient `1`.  Concavity therefore proves
the complete forest interval.

## Target j=3

Put

```text
x=(z2+h2)/a.
```

The pinned all-forest `q3<=q2` theorem and pinned rooted-forest reserve give

```text
e0/b <= 4(1+x)/3.
```

The all-forest incidence theorem gives `z2<=2a`, while `H` is induced in
`F`, so `h2<=a`.  Hence `0<=x<=3`.

For this correlated case, the proof keeps `p0` and `r1` coupled through the
same wedge variable `W`; it does not combine incompatible wedge extrema.
After the remainder and anchor payment are combined, the coefficient of `W`
is exactly

```text
4(3N-2x-20).
```

This is positive for `N>=13` and `x<=3`, so `W=0` is a valid lower endpoint.
The resulting expression is affine in `x` and concave in `1<=h<=N`.  With
`N=13+q`, all four endpoint polynomials at
`x in {0,3}` and `h in {1,N}` have positive coefficients; their least
coefficient is `9`.  This proves every disconnected base with `N>=13`.
Connected bases are covered by the pinned all-order tree-base `m=3` theorem.

The remaining disconnected band, `N<=12`, was enumerated exactly as multisets
of nonisomorphic tree components.  The replay covered

```text
4,315 disconnected unlabelled forests through |G|=13,
48,266 rooted component cells,
48,256 supported j=3 cells,
193,024 evaluations of the two exact payment identities,
48,256 strictly positive m=3 coefficients.
```

The smallest coefficient was `112002`.

## Reproducibility

```text
python audit_terminal_q3_low_newton_m3_forest_base_agent.py
```

Frozen artifacts:

```text
audit_terminal_q3_low_newton_m3_forest_base_agent.py
SHA256 F411378049A5A715BCDF8D4C67F1E776ECA1B8ACCBB6CD4D9C65E9A228196E49

terminal_q3_low_newton_m3_forest_base_audit_20260829.json
SHA256 193945C8C188D43F9E63223E94515C514CFA2AD28A4C0E2099AE58105CCB6A42
```

## Dependencies and scope

Dependencies are the pinned all-order tree-base `m=3` theorem, the independently
audited all-forest `q3<=q2` theorem, the rooted-forest rank-three reserve, the
all-forest incidence theorem, and the all-forest terminal anchor.

This closes only Newton degree `m=3` for arbitrary forest bases.  It does not
close degrees `m=0,1,2`, the entire terminal payment, the global `q3`
envelope, unimodality, or Erdos Problem #993.
