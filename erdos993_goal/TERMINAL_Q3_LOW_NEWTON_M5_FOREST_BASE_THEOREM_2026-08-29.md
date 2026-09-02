# Terminal q3 payment: Newton degree 5 for arbitrary forest bases

Date: 2026-08-29

Status:
`PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M5`.

## Claim

Let `G` be a finite forest with a marked vertex `w`, let `F=G-w`, and form
the terminal extension by adjoining the stem `wv` and `t>=1` leaves at `v`.
For every supported target cell `j>=3`, the coefficient of `binom(s,5)`,
where `s=t-1`, in the normalized untruncated included-payment margin `delta`
is nonnegative.

This is the forest-base lift of the already audited tree-base `m=5` theorem.

## Exact component correction

Put `|G|=N+1`, `c=c(G)`, and `h=c-1`.  In the Newton expansions used by the
terminal-payment identity,

```text
p1 = N(N+1)/2 + 1 + h,
p2 = N+2,
r2 = N-h.
```

Thus the only changes from a tree base are `p1 -> p1+h` and
`r2 -> r2-h`.  Literal expansion gives

```text
L5(forest)-L5(tree) = -10ab h(j+13).
```

After dropping the nonnegative term `10(j+1)b(N-h)` before the outer factor
`a`, and using the unconditional forest-incidence bound
`e0<=z_j+h_j+b<=(j+2)b`, this becomes

```text
L5 >= -30ab(P5+4h),
P5 = 5N^2+2Nj+40N+7j+95.
```

The same component correction strengthens the anchor coefficient needed to
pay this remainder:

```text
A2 >= a(N^2+3N+8+3h),
A3 >= a(3N+10),
A4 = 4a.
```

The pair floor remains valid for every forest base:

```text
a=i2(F)>=binom(N-1,2).
```

## Positive cleared gap

Use the same three Kruskal-Katona shadow ratios as in the tree proof and put
`j=3+k`, `N=j+r`, with `k,r,h>=0`.  After the positive denominator

```text
(r+1)(r+2)(r+3)
```

is cleared, the sufficient payment gap is a polynomial in `k,r,h` with 61
nonzero monomials.  Every coefficient is positive and the least coefficient
is `5`.  The coefficient of `h` alone has 22 nonzero monomials, all positive,
with least coefficient `15`.  At the smallest `(k,r)` corner the numerator is

```text
60(48h+1043)>0.
```

Hence disconnected components cannot reverse the tree-base `m=5` proof;
their exact correction is coefficientwise favorable after the strengthened
`A2` payment is retained.

## Literal independent replay

The verifier also reconstructed `P,R,U,c,e,A,Q,delta` directly from
independence counts and edge-residual counts for all graph-atlas forests of
order at most seven, every marked vertex, and every supported `j>=3`:

```text
79 forests,
467 rooted bases,
848 supported cells,
5,088 evaluations of the two exact delta formulas,
848/848 strictly positive m=5 coefficients.
```

The smallest literal coefficient was `264870`, at graph6 `CF`, marked vertex
`3`, target `j=3`.

## Reproducibility

Run:

```text
python audit_terminal_q3_low_newton_m5_forest_base_agent.py
```

Frozen artifacts:

```text
audit_terminal_q3_low_newton_m5_forest_base_agent.py
SHA256 2EC37476F7E056463913DEDCAB277536BE77C43537F12272BE88F1CBE318C15E

terminal_q3_low_newton_m5_forest_base_audit_20260829.json
SHA256 8326E6055F666A0E3540FCBAF8A720FB7A79ACD78E898B9746AD45B5EBAD2AC3
```

## Scope

This proves only Newton degree `m=5` for arbitrary forest bases.  It does not
prove degrees `m=0,...,4`, the entire terminal payment, the global `q3`
envelope, independence-polynomial unimodality, or Erdos Problem #993.
