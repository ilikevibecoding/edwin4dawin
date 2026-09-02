# Terminal q3 payment: Newton degree 4 for arbitrary forest bases

Date: 2026-08-29

Status:
`PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M4`.

## Claim

For every finite forest base `G`, every marked vertex, and every supported
terminal-payment cell `j>=3`, the coefficient of `binom(t-1,4)` in the
normalized untruncated included-payment margin is nonnegative.

## Exact forest correction

Write `|G|=N+1` and `h=c(G)-1`.  Relative to a connected/tree base,

```text
p1 -> p1+h,       r2 -> N-h.
```

Replaying the full degree-four Newton product and dropping only nonnegative
parts gives

```text
L4 >= -2ab Q4(h),

Q4(h) = 20N^3+15N^2j+207N^2+78Nj+739N+138j+1158
        +12h(3N+j+15).
```

The required anchor bounds are

```text
A2 >= a(N^2+3N+8+3h),
A3 >= a(3N+10),
A4 = 4a.
```

After the standard shadow bounds and `a>=binom(N-1,2)` are substituted, the
coefficient of `h` in the cleared sufficient gap has 25 monomials in
`k=j-3` and `r=N-j`.  All 25 coefficients are positive; the least is `9`.
Thus the combined component correction is strictly favorable even though its
remainder part alone is adverse.

## Complete domain cover

- If `h=0`, `G` is a tree and the pinned all-order tree-base `m=4` theorem
  applies.
- If `h>=1` and `N>=14`, the positive tree large-order cone plus the positive
  `h` coefficient proves the result.
- If `h>=1` and `7<=N<=13`, positivity is minimized at `h=1`.  Exact minima
  over `3<=j<=N` are respectively
  `11526/7, 4185, 22922/3, 12132, 17778, 24698, 429150/13`.
- If `N<=6`, the literal all-forest graph-atlas replay covers every base and
  marking.

The literal replay checked 79 forests of order at most seven, 467 rooted
bases, and 848 supported cells, including 632 disconnected cells.  Both exact
forms of the payment were compared at 4,240 integer evaluations; every
degree-four Newton coefficient was strictly positive.  The minimum was
`208494` at graph6 `CF`, marked vertex `3`, target `j=3`.

## Reproducibility

```text
python audit_terminal_q3_low_newton_m4_forest_base_agent.py
```

Frozen artifacts:

```text
audit_terminal_q3_low_newton_m4_forest_base_agent.py
SHA256 A48B9AD019DA6B5CC41C1A70F75BEACC2BC507157D693C697C8FD7571F17964E

terminal_q3_low_newton_m4_forest_base_audit_20260829.json
SHA256 893BEAFDC7E4C410D5C8DAA9AD124A0F3F951C85CFD3851A6BA93B96B15681E4
```

## Dependencies and scope

The proof uses the pinned all-forest incidence bound for `e0`, the pinned
all-forest terminal anchor, ordinary set-shadow inequalities, and the pinned
all-order connected/tree-base `m=4` theorem for the `h=0` slice.

This closes only Newton degree `m=4` for forest bases.  It does not close
degrees `m=0,...,3`, the whole terminal payment, the global `q3` envelope,
unimodality, or Erdos Problem #993.
