# Terminal q3 Newton m=0: arbitrary double-star middle targets

Date: 2026-08-31

Let the no-isolate remainder be the sorted double star `D_(a,b)`, with
`a>=b>=3`.  This certificate closes every target `4<=j<=b+2`.

For `4<=j<=b+1`, divide by `B=C(a+b,j)` and put

```text
rho=C(a,j-1)/B,
tau=C(b,j-1)/B,
u_a=j*a/(a+b)^2,
u_b=j*b/(a+b)^2.
```

The exact margin is affine in `(rho,tau)`, and the actual weights lie in the
triangle

```text
rho>=0, tau>=0, rho/u_a+tau/u_b<=1.
```

To prove the last inequality, cancel the binomial factors.  The left side is
`n/(n-1)` times the probability that a random `(j-2)`-subset of the two
blocks `(a-1)+(b-1)` lies entirely in one block.  Because `j-2>=2`, this event
forces the first two samples into the same block.  If the block sizes are
`A,B>=2` and `N=A+B`, its probability is at most

```text
1-2AB/(N(N-1)) <= 1-1/(N+2) = (n-1)/n.
```

The three triangle vertices produce coefficientwise-positive numerators with
273, 427, and 410 monomials respectively, each with minimum coefficient one.

At the seam `j=b+2`, the smaller-centre target row vanishes and its remaining
`f_(j-1)=1` row is positive, so it may be omitted.  The residual is affine in
one hypergeometric weight.  Its lower and upper endpoint numerators have 63
and 86 strictly positive monomials.  The exact anchor determinant is positive,
so the equal-side boundary is also covered.

This does not by itself close `j=3`, the `b=1` or `b=2` families, the
`j>=b+3` tail, other remainder forests, nonisolated marked roots, general
terminal `m=0`, or Erdős Problem #993; those are separate certificates.

Replay:

```powershell
python .\prove_terminal_q3_m0_marked_isolate_double_star_middle_all_order_root.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_DOUBLE_STAR_MIDDLE_ROOT
```
