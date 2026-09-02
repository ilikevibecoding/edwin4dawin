# Active-box ULC reduces the local Poincare lemma to one deficit bound

Retain the active-box representation from Section 77.  For real `X>=j+h`,
put

```text
p_h(X)=sum_(ell=0)^h w_(j,h,ell) binom(X,j+ell),
j=s-2h,       K=j+L.
```

Normalize the summands to a probability law `pi_X` on `L`.  The Gegenbauer
theorem says that `w_ell/binom(h,ell)` is log-concave.  Since
`binom(X,j+ell)` is log-concave in `ell`, `pi_X` is ULC of order `h`.
Its terminal normalized odds are

```text
Omega_X=h pi_X(h)/pi_X(h-1)
       =9(X-j-h+1)/(5h+6j-2).
```

Consequently `pi_X` stochastically dominates `Binomial(h,p_X)`, where
`p_X=Omega_X/(1+Omega_X)`.  The standard ULC variance inequality gives

```text
E L >= h p_X,
Var L <= E L(1-E L/h) <= h p_X(1-p_X).             (1)
```

There is a direct continuous curvature estimate.  If

```text
a_X(K)=partial_X log binom(X,K)=sum_(r=0)^(K-1)1/(X-r),
b_X(K)=sum_(r=0)^(K-1)1/(X-r)^2,
```

then differentiation under the finite sum gives

```text
-(log p_h)''=E b_X(K)-Var a_X(K).                  (2)
```

The function `a_X(K)` is `1/(X-D)`-Lipschitz on `0<=K<=D=j+h`, so the
independent-copy variance identity gives

```text
Var a_X(K) <= Var K/(X-D)^2.                       (3)
```

For fixed `K`, Jensen's inequality in the `K` denominators gives

```text
b_X(K)>=K/{X-(K-1)/2}^2.
```

The function on the right is increasing and convex in `K`; its first two
derivatives have positive numerators

```text
4(K+2X+1),        8(K+4X+2),
```

over positive powers of `2X-K+1`.  A second Jensen application and (1)--
(3) therefore give, with `mu_0=j+h p_X`,

```text
-(log p_h)''
 >=mu_0/{X-(mu_0-1)/2}^2-h p_X(1-p_X)/(X-D)^2.    (4)
```

Let `N` be the middle exponent in the step-two size Turan quotient.  In the
minimal forest reserve, `N=3s+7+2e`, `e>=0`.  Integrating (4) against the
triangular second-difference kernel on `[N-2,N+2]` gives an explicit lower
bound `Kappa` and hence

```text
v_h=1-p_h(N+2)p_h(N-2)/p_h(N)^2
    >=4Kappa/(1+4Kappa).                           (5)
```

Here one may use the worst endpoints `X_min=N-2`, `X_max=N+2`,

```text
p=9(X_min-j-h+1)/{5h+6j-2+9(X_min-j-h+1)},
mu_0=j+hp,
Kappa=mu_0/{X_max-(mu_0-1)/2}^2
      -hp(1-p)/(X_min-D)^2.                        (6)
```

It remains to upper-bound the adjacent-layer slopes.  The single sufficient
bound is

```text
u_h <= (5/8)(4a-1)/{a(2a+1)},      a=m+h-1.        (7)
```

This bound is not proved here.  Conditional on (7), however, the rest of the
local Poincare inequality is now exact elementary algebra.  Substitute

```text
s=2h+2c+epsilon,    epsilon in {0,1},
N=3s+7+2e,          m=s+4+e.
```

After comparing (5)--(6) with

```text
1/2{c U_(h+1)^2+h(U_h/(1-U_h))^2},
U_k=(5/8)(4(m+k-1)-1)/{(m+k-1)(2m+2k-1)},          (8)
```

and clearing the positive denominator, every coefficient is positive:

* for `h=H+4`, `c=C+1`, both parities have 815 positive terms;
* for `h=H+9`, `c=0`, both parities have 135 positive terms.

The common minimum coefficient is `48157949952`.  The only layers not
covered by this scalar certificate are `c=0`, `4<=h<=8`.  Direct substitution
in the original local inequality proves all ten even/odd top families for
every excess `e>=0`: both numerator and denominator have strictly positive
coefficients.  The ten numerator polynomials contain 260 positive terms in
total.

Thus the all-order local Poincare frontier is precisely (7).  A sufficient
effective-degree formulation is

```text
{delta_h-delta_(h-1)}/(h-1) <= 7/(3Y),             (9)
```

with `Y=3m+s`; integrating (9) over one size step implies (7).  Exact data
suggest the stronger monotonicity that the left side of (9) decreases with
`h`, reducing (9) to its explicit `h=2` case.  That monotonicity remains to
be proved.

