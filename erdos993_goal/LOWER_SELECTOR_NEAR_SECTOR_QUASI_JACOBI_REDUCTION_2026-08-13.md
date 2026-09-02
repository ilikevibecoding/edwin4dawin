# Near-sector quasi-Jacobi reduction for the lower selector

Date: 2026-08-13

This note treats the first strip below the half-angle sector theorem.  It is
an all-order conditional reduction, not a proof of the remaining lower
Durán margin.

## 1. One exceptional base root in the near sector

For `m>=3`, `B>0`, and

```text
m-2<R<m-1,
```

put

```text
M_m(d;R)=P_B[(4q-d)^m](R).
```

The Pfaff conversion in Section 59 identifies the `d`-zeros with the zeros
of

```text
P_m^(alpha,beta)(x),
alpha=B-1>-1,       beta=R-m in (-2,-1),
d=4(1+x)/(1-x).                                      (1)
```

Let `b=beta+1`, so `b in (-1,0)`.  The elementary Jacobi connection

```text
(2m+alpha+beta+1)P_m^(alpha,beta)
 =(m+alpha+beta+1)P_m^(alpha,b) 
   +(m+alpha)P_(m-1)^(alpha,b)                       (2)
```

has two positive coefficients.  The two polynomials on the right are
consecutive members of one positive Jacobi system.  Their roots strictly
interlace in `(-1,1)`, so their positive linear combination has `m-1`
simple roots there and one remaining real root to the left of them.  The
endpoint value

```text
P_m^(alpha,beta)(-1)=(-1)^m binom(m+beta,m)
```

has sign `(-1)^(m+1)`, because exactly the factor `beta+1` in the generalized
binomial product is negative.  The leading coefficient is positive, so the
remaining root is below `-1`.  Under (1), the interval `(-1,1)` maps to
`(0,infinity)` and `(-infinity,-1)` maps to `(-4,0)`.  Therefore

```text
M_m(d;R) has m-1 positive simple roots and one root in (-4,0).  (3)
```

This is the exact order-one quasi-orthogonal replacement for the initial
orientation in Section 59.

## 2. Two polar derivatives remove the exceptional root at the real anchor

For `u,v>0`, define

```text
F(d)=Pi_(-v)^(m-1) Pi_(-u)^m M_m(d;R)
    =16P_B[(q+u/4)(q+v/4)(4q-d)^(m-2)](R).           (4)
```

Polar differentiation at a real point preserves real-rootedness.  The
usual interlacing sign argument applied to the `m-1` positive roots in (3)
shows after the first polar derivative that at most one root is nonpositive;
after the second, the degree-`m-2` polynomial `F` again has at most one
nonpositive root.  There is no first-step degree loss: after making `M_m`
monic, its root sum is `4mR/B>0`, so the coefficient of `d^(m-1)` in
`Pi_(-u)^m M_m` is a nonzero multiple of `-(4R/B+u)`.  Its leading
coefficient has sign `(-1)^(m-2)`: after
removing that sign, its magnitude is the positive number

```text
16 P_B[(q+u/4)(q+v/4)](R),
```

which is positive since `R>m-2>=1`.

Put

```text
theta=m-1-R in (0,1),       K=B+m-2.
```

At `d=0`, direct Pochhammer evaluation and extraction of the positive factor
`4^(m-2)(R)_(m-2)^fall/(B)_(m-2)^rise` give

```text
F(0)=positive_factor * Psi,

Psi=uv+4(u+v)(1-theta)/K
       -16theta(1-theta)/(K(K+1)).                   (5)
```

If `Psi>0`, the product of all roots of `F` is positive.  Since all but at
most one root are already positive, the last root is positive as well.
Thus (5) is a scalar sufficient condition for the complete real-anchor
orientation.

A convenient coarser condition is

```text
u,v>=1/K.                                             (6)
```

Indeed, with `c=K/(K+1)`, (5) implies

```text
K^2 Psi >= 9-8theta-16c theta(1-theta)
          >=5-4c-1/c
          =(3K-1)/(K(K+1))>0.                        (7)
```

The middle inequality is the exact minimum of the displayed convex
quadratic on `0<=theta<=1`.  Consequently (6) proves that all roots of (4)
are positive at `z=R` throughout the near-sector strip.

## 3. Lower-selector specialization and the two remaining gaps

For the corrected lower selector, the Pochhammer ambient parameter is

```text
N_D=d+s-a,       K=B+m-2=N_D-1.                      (8)
```

Let `rho_1,rho_2>1` be its two positive selector roots.  In the factor
normalization used by (4), `u=1/rho_1` and `v=1/rho_2`.  Hence the simple
selector-root ceiling

```text
rho_1,rho_2 <= N_D-1                                 (9)
```

implies (6), and therefore closes the real-anchor part of every lower cell
with

```text
(m-2)^2<A=R^2<(m-1)^2.                               (10)
```

There is a useful one-inequality route to (9).  With

```text
G_0=G_(N,s), G_1=G_(N-1,s), G_2=G_(N-2,s),
Gamma(t)=G_0(t)-2tG_1(t)+t^2G_2(t),
```

the already-proved strict Turán inequality gives

```text
Gamma(K)={(KG_2(K)-G_1(K))^2
           +(G_0(K)G_2(K)-G_1(K)^2)}/G_2(K)>0        (11)
```

whenever

```text
G_1(K)<K G_2(K).                                     (12)
```

The same inequality places the fixed point used in Section 67 below `K`;
the known two-positive-root sign pattern then makes (11) put both positive
roots below `K`.  Thus (12), evaluated only at the path-specific integer
`K=N_D-1`, is a particularly concrete all-order target for (9).

Two steps remain before this becomes a proof of the Durán margin:

1. prove (12), or equivalently the ceiling (9), for every lower-selector
   cell in (10);
2. extend the real-anchor orientation above through the rotating
   half-angle sector.  The base pencil can have one boundary branch with
   `D>R`; the original `R>m-1` no-crossing argument does not exclude it.

The strip (10) itself has only four parity types in the natural coordinates
of Section 106:

```text
(e,sigma)=(0,0),(1,0),(1,1),(2,1).                  (13)
```

This is an all-order parity calculation, not an observed list.  The four
values of `A` are respectively

```text
(m-1)(m-3/2), (m-2)(m-3/2),
(m-1)(m-3/2), (m-2)(m-3/2),
```

and both expressions lie strictly between `(m-2)^2` and `(m-1)^2` for
`m>=3`.  The omitted type `(0,1)` lies above the strip, while `e>=3` puts
`A` at or below `(m-2)(m-5/2)<(m-2)^2`.

On the forced chart only the last two types occur, and both have

```text
N=2m+a-2,       s=2m+2a-3,       R_0=2(N-2)-s-1=2m-6,
```

while `K` is `4m+a-5` or `4m+a-6`.  On the unforced chart, writing
`g=N-s`, the same four types give `R_0=s+2g-5`; its smallest value is again
`2m-6`.  Thus no hidden parity family is left in the near strip.

Finally, formula (74.1) turns (12) into one explicit rational-coefficient
inequality.  With

```text
A_K(z)=(1+z+Kz^2)/(1-Kz^2)^2,
B_K(z)=1/(1-Kz^2),
R_0=2(N-2)-s-1,
```

it is exactly

```text
[z^s] B_K(z) A_K(z)^R_0 {K-A_K(z)^2}>0.             (14)
```

After clearing the denominator, the only signed factor in (14) is

```text
D_K(z)=K(1-Kz^2)^4-(1+z+Kz^2)^2.                   (15)
```

Equations (13)--(15) reduce the selector-root part to a direct positive
coefficient/injection problem in two integer charts; they do not prove its
sign.

The companion replay checks the algebraic identities, performs an exact
Sturm audit of (9) for the 311 near-sector cells with `m>=7` and `d<=20`,
and checks (12) by exact integer arithmetic in all 3,131 near-sector cells
through `d=50`.  Those bounded audits are evidence only.  Equations
(1)--(8), (13)--(15), and the conditional implication (9)--(10) are the
all-order content of this note.
