# Local Poincare subproblem: exact normalizations and quantitative leads

This note records an independent attack on (73.2).  It does **not** claim an
all-order proof.

## 1. Dimensionless form

Put

```text
q_h(m)=g_(m+s,s,h)/g_(m+s-1,s,h),
u_h(m)=1-q_h(m)/q_(h-1)(m),
v_h(m)=1-q_h(m+1)/q_h(m).
```

In the notation of Section 73, `m=r-1`, `y_h=q_h(m)`, and therefore

```text
Delta_(h-1)/y_h=u_h/(1-u_h),
Delta_h/y_h=u_(h+1),
(y_h-x_h)/y_h=v_h.
```

Consequently (73.2) is exactly

```text
v_h >= 1/2 ((d-h)u_(h+1)^2+h(u_h/(1-u_h))^2).       (L1)
```

This removes all inessential coefficient scales.

## 2. An exact all-h recurrence for the Whipple coefficients

For fixed `m,s`, direct substitution in the three-term recurrence for `S_h`
gives

```text
g_(h+1)=U_h g_h+V_h g_(h-1),

U_h=(s-2h)(s-2h-1)
    (-4h^2+4hs-h+6m^2+8ms-3m+2s^2-s)
   /((h+1)(m+h)(2m+2h+1)(2m+2s-h-1)),

V_h=2(s-2h)(s-2h-1)(s-2h+1)(s-2h+2)
   /((h+1)(m+h)(2m+2h+1)(2m+2s-h-1)).              (L2)
```

Thus, if `R_h(m)=g_h(m)/g_(h-1)(m)`, then

```text
R_(h+1)(m)=U_h(m)+V_h(m)/R_h(m),
q_h(m)/q_(h-1)(m)=R_h(m)/R_h(m-1).                 (L3)
```

This is a concrete Riccati recurrence for an induction on `h`.

## 3. A rigorous first upper bound on u_h

Write `Y=3m+s` and `F_h(Y,s)=P_h(m,s)`.  From (68.8),

```text
q_h(m)=A_h(m)F_h(Y)/F_h(Y-3),
A_h(m)=((2m+s-1)(2m+s-2))
       /(2(m+h-1)(2m+2h-1)).                       (L4)
```

The convolution-power lemma in Section 69 says that
`F_h(Y)/F_h(Y-3)` is nondecreasing in `h`.  Hence

```text
u_h(m) <= Ubar_h(m)=(4a-1)/(a(2a+1)),
a=m+h-1.                                            (L5)
```

Exact tests through `s=300` and excesses `0,1,10,100,10000` support the
substantially sharper bound

```text
u_h(m) <= (5/8) Ubar_h(m).                          (L6, conjectural)
```

The maximum observed ratio approaches `5/8` at `h=1` on the lower forest
boundary; for very large excess it approaches `1/2`.

## 4. Effective-degree formulation and a necessary asymptotic correction

Put

```text
mu_h=Y partial_Y log F_h,       delta_h=h-mu_h.
```

If `T_h=F_h/F_(h-1)`, then

```text
Y partial_Y log T_h=mu_h-mu_(h-1)=1-(delta_h-delta_(h-1)).  (L7)
```

Also

```text
1-u_h=(1-Ubar_h) T_h(Y)/T_h(Y-3).                  (L8)
```

Thus a quantitative upper bound on `delta_h-delta_(h-1)` can prove (L6)
by integration over `[Y-3,Y]`.

The exact exponent decomposition is

```text
F(u)=exp(alpha K(u)+s psi(u)),       alpha=Y/2,
n[u^n]K=2(2-c_n)/3,
c_n=binom(2n,n)/4^n.                                (L9)
```

The size-two input is `2(2-c_2)/3=13/12`.  Consequently, with
`x=1/alpha=2/Y`, direct expansion gives the sharp large-`Y` term

```text
delta_h-delta_(h-1)
 =(13/12)(h-1)x+O(x^2)
 =13(h-1)/(6Y)+O(Y^-2).                             (L10)
```

Therefore the tempting bound

```text
delta_h-delta_(h-1) <= 2(h-1)/(3(m-1))
```

is false for sufficiently large excess: its leading constant is `12/12`,
whereas the exact leading constant in (L10) is `13/12` after converting
`Y~3m`.

The same expansion is visible in the roots of `F_h` as a polynomial in
`Y`.  If these roots are `alpha_i`, the top three `Y` coefficients give the
all-order power sums

```text
sum_i alpha_i=-13h(h-1)/12,
sum_i alpha_i^2=h(h-1)(122h-24s-75)/72.             (L11)
```

Indeed, only singleton `phi_1=1/2`, one size-two component
`phi_2=13/48`, and (for the second power sum) `phi_3=3/16` and
`psi_2=1/24` can contribute to the top three powers of `Y`.  Vieta's
formulas then give (L11) directly.  The first identity is another exact
explanation of `13/12`.

## 5. Determinant normalization

With

```text
a_h=g_(R,h), b_h=g_(R-2,h), c_h=g_(R-4,h),
D_h=b_h^2-a_hc_h,
E_h=b_hc_(h+1)-b_(h+1)c_h,
```

the local inequality is equivalently

```text
2D_h >= (d-h)(E_h/c_(h+1))^2
             +h(E_(h-1)/c_(h-1))^2.               (L12)
```

This exposes (73.2) as a quantitative comparison between one horizontal
Turan minor and the two adjacent mixed minors of the `(R,h)` coefficient
array.

## 6. Independent check of the Section 74 differential recurrence

For

```text
F_(R,s)=[z^s](1+z+t z^2)^R/(1-t z^2)^(2R+1),
```

direct symbolic differentiation verifies

```text
sF_(R,s)=(R-s+1)F_(R,s-1)
 +(6R+2)tF_(R,s-2)
 +(3R+s-1)tF_(R,s-3)
 +(2R+s-2)t^2F_(R,s-4).                            (L13)
```

Taking `[t^h]` gives a positive four-term recurrence in `(s,h)`.  A viable
remaining route is to combine (L12) and (L13) into an induction for the
three minors.

## 7. The active-box polynomial is negative-rooted in all orders

Put `j=s-2h`, `D(x)=x(3-x)/(1-x)^2`, and

```text
W_(j,h)(z)=sum_(ell=0)^h binom(j+ell,j)
 [x^h]D(x)^ell(1-x)^(-2j-1) z^ell.
```

The row generating function is

```text
sum_(h>=0)W_(j,h)(z)x^h
 =(1-x)/{1-(2+3z)x+(1+z)x^2}^(j+1).                (L14)
```

This proves, rather than merely suggests, that every `W_(j,h)` has `h`
simple roots in `(-8/9,0)`.  Set `lambda=j+1`.  For `-8/9<z<0`, write

```text
y=sqrt(1+z),
xi=(2+3z)/(2sqrt(1+z))=(3y^2-1)/(2y).
```

The map `z -> xi` is increasing from `(-8/9,0)` onto `(-1,1)`.  The
Gegenbauer generating function gives

```text
W_(j,h)(z)
 =y^(h-1){y C_h^lambda(xi)-C_(h-1)^lambda(xi)}.    (L15)
```

Let `r(xi)=C_(h-1)^lambda(xi)/C_h^lambda(xi)`.  By the standard positive
partial-fraction expansion for consecutive monic orthogonal polynomials,
`r` is strictly decreasing from `+infinity` to `-infinity` on every
interval between two consecutive zeros of `C_h^lambda`.  Meanwhile
`y(xi)` is strictly increasing.  Hence `r(xi)=y(xi)` has one root in each
of the `h-1` internal intervals.  It has one more root to the right of the
largest Gegenbauer zero because

```text
r(1)=h/(h+2lambda-1)=h/(h+2j+1)<1=y(1).
```

There is no root in the left outer interval because
`r(-1)=-h/(h+2j+1)<1/3=y(-1)` and `r` decreases there.  This accounts for
all `h` roots and proves (L15)'s assertion.

Consequently the coefficient sequence of `W_(j,h)` is PF-infinity and in
particular ultra-log-concave of order `h`.  Multiplication of its
coefficient `w_ell` by `binom(N,j+ell)` preserves ULC, so the probability
law

```text
Pr(L=ell) proportional to w_ell binom(N,j+ell)
```

is ULC on `{0,...,h}`.  Therefore

```text
Var(L)<=E(L)(1-E(L)/h).                             (L16)
```

The last adjacent coefficient ratio is explicit:

```text
w_h/w_(h-1)=9(j+h)/{h(5h+6j-2)},
h Pr(L=h)/Pr(L=h-1)
 =9(N-j-h+1)/(5h+6j-2)=:Omega.                     (L17)
```

ULC makes the normalized adjacent ratios decrease with `ell`, so this law
stochastically dominates `Binomial(h,p)` with `p=Omega/(1+Omega)`.  In the
forest range `N>=3s+5=3j+6h+5`, one has `Omega>=3`, while at the top
boundary `j=0` one has `Omega>9`.  Hence

```text
E(L)>=hp,
E(j+L)-Var(j+L)>=j+h p^2,                          (L18)
```

with `p>=3/4` generally and `p>9/10` when `j=0`.  This supplies a rigorous
quantitative active-degree reserve; the remaining step is to convert
(L18) into the required finite-step curvature lower bound for `v_h`.

## 8. An all-order `5/8` bound from cycle curvature

This section closes the missing estimate used by the curvature proof:

```text
u_h <= (5/8) Ubar_h,                              (L19)
Ubar_h=(4a-1)/{a(2a+1)},  a=m+h-1.
```

The proof is independent of finite computation.  Put `Y=3m+s` and define

```text
p_n=Y(2-c_n)/3+s(1-2c_n)/3,
c_n=binom(2n,n)/4^n,
p_0=1,  p_1=Y/2.
```

Thus

```text
sum_(h>=0) F_h(Y,s)z^h=exp(sum_(n>=1)p_n z^n/n).
```

Introduce the log-curvature coordinates

```text
alpha_i=p_(i-1)p_(i+1)/p_i^2,
X_j=p_j/p_1^j=prod_(i=1)^(j-1) alpha_i^(j-i),
Q_h=h!F_h/p_1^h,
R_h=Q_h/Q_(h-1).                                  (L20)
```

Here `Q_h` is the total weight of permutations of `[h]` whose cycle of
length `j` has weight `X_j`.  If

```text
mu_h=Y partial_Y log F_h,  delta_h=h-mu_h,
```

then (L20) gives the exact identity

```text
delta_h-delta_(h-1)=-Y partial_Y log R_h.          (L21)
```

### 8.1 Only the first curvature coordinate can hurt

The first coordinate and its logarithmic speed are

```text
alpha_1=(13Y+2s)/(6Y^2),
kappa:=-Y partial_Y log alpha_1
      =(13Y+4s)/(13Y+2s).                         (L22)
```

For every `i>=2`, one has instead

```text
-Y partial_Y log alpha_i <=0.                     (L23)
```

Indeed, set `U=2Y+s`, `lambda=(Y+2s)/U`.  Then

```text
p_n=(U/3)(1-lambda c_n),
t_i:=1/alpha_i
 =(1-lambda c_i)^2/
   {(1-lambda c_(i-1))(1-lambda c_(i+1))}.
```

For `f(x)=x/(1-lambda x)`, which is increasing and convex,

```text
partial_lambda log t_i
 =f(c_(i-1))+f(c_(i+1))-2f(c_i)>=0.
```

The last inequality follows because `c_n` is convex:

```text
c_(n-1)-2c_n+c_(n+1)
 =3c_n/{2(n+1)(2n-1)}>0.
```

Since `partial_Y lambda=-3s/U^2<=0`, (L23) follows.

The same observation also verifies the log-concavity used below without a
separate appeal.  The positive sequence `q_n=1-lambda c_n` is increasing
and concave.  If `d_n=q_n-q_(n-1)`, then

```text
q_n^2-q_(n-1)q_(n+1)
 =q_n(d_n-d_(n+1))+d_n d_(n+1)>=0.
```

Thus `alpha_i<=1` for `i>=2`; (L22) and the forest lower bound on `Y`
also give `alpha_1<1`.

Moreover, every sensitivity of `R_h` is nonnegative:

```text
partial_(log alpha_i) log R_h>=0.                 (L24)
```

For completeness, differentiating `log Q_h` gives the expectation of

```text
S_i(sigma)=sum_(cycles C)(|C|-i)_+.
```

If `A_h=Q_h/h!`, then

```text
E_h S_i=sum_(j>i)(j-i)X_j/j * A_(h-j)/A_h.
```

The input sequence `(1,X_1,X_2,...)` is log-concave because all
`alpha_i<=1`; its exponential cycle transform `(A_h)` is log-concave.
Consequently each ratio `A_(h-j)/A_h` increases with `h`, proving (L24).
This is precisely the cycle-statistic form of the Section 71
effective-degree lemma.

It remains to bound the first sensitivity sharply.

### 8.2 Sharp first-coordinate sensitivity

Freeze `alpha_i`, `i>=2`, put `a=alpha_1`, and define the residual cycle
weights

```text
gamma_1=gamma_2=1,
gamma_j=prod_(i=2)^(j-1)alpha_i^(j-i)  (j>=3),
r_j=gamma_(j+1)/gamma_j=prod_(i=2)^j alpha_i.
```

The sequence `(gamma_j)` is log-concave and `r_j` decreases from `r_1=1`.
Let `P_n(a)` be the permutation total with cycle weights

```text
w_j=a^(j-1)gamma_j.
```

Thus `P_n=Q_n`.  Inserting the new label `n` as a singleton or into one
of the positions of an existing cycle gives the exact identity

```text
P_n/P_(n-1)=1+a E_a H,
H(sigma)=sum_(cycles C)|C|r_|C|,                  (L25)
```

where the expectation is on weighted permutations of `N=n-1` labels.
Their `a`-exponent is

```text
D=sum_C(|C|-1)=N-number_of_cycles.
```

We next prove

```text
Cov_a(H,D)<=0.                                    (L26)
```

Set

```text
G(z)=sum_(ell>=1)gamma_ell z^ell/ell,
e_(N,k)=[z^N]G(z)^k/k!.
```

Thus `N!e_(N,k)` is the total `gamma`-weight of permutations with exactly
`k` cycles.  Differentiating `G^k` gives

```text
N e_(N,k)=sum_(ell>=1)gamma_ell e_(N-ell,k-1).    (L27)
```

The lower-triangular matrix

```text
A_(N,M)=gamma_(N-M)/N  (N-M>=1)
```

is TP2: it is a positive row scaling of the Toeplitz matrix of the
log-concave sequence `(gamma_j)`.  In vector notation, (L27) says
`e_k=Ae_(k-1)`.  The two-column matrix `[e_0,e_1]` is TP2, and induction
using

```text
[e_(k-1),e_k]=A[e_(k-2),e_(k-1)]
```

and Cauchy--Binet proves that every adjacent pair of columns is TP2.
Equivalently,

```text
e_(M,k)/e_(M,k-1) increases with M.               (L28)
```

Condition on `k` cycles and choose a uniformly random label.  If `L` is
the length of its cycle, exact marked-cycle enumeration and (L27) give

```text
Pr_k(L=ell)
 =gamma_ell e_(N-ell,k-1)/{N e_(N,k)}.            (L29)
```

By (L28), the likelihood ratio `Pr_(k+1)(L=ell)/Pr_k(L=ell)` decreases
with `ell`.  Therefore `L` decreases in monotone-likelihood-ratio order
as `k` rises.  Since `r_ell` decreases,

```text
E_(k+1) r_L >= E_k r_L.
```

But `E(H|k)/N=E_k r_L`, so `E(H|k)` increases with `k`, or decreases
with `D=N-k`.  The elementary covariance inequality for oppositely
monotone functions proves (L26).

Differentiate (L25).  Since the conditional weight is proportional to
`a^D`,

```text
d/da (P_n/P_(n-1))=E H+Cov(H,D)<=E H<=N=n-1.
```

Also `P_n/P_(n-1)>=1`.  Hence the desired sharp sensitivity estimate is

```text
partial_(log a) log R_n<=a(n-1).                  (L30)
```

### 8.3 Effective-degree and finite-step bounds

Use the chain rule in (L21), then (L23), (L24), and (L30).  All
coordinates after the first make nonpositive contributions, so

```text
delta_h-delta_(h-1)
 <=kappa alpha_1(h-1)
 =(h-1)(13Y+4s)/(6Y^2)
 <=7(h-1)/(3Y).                                   (L31)
```

The last step uses `4s<=Y`, valid in the forest cone
`m>=s+4`, `Y=3m+s`.

Let `T_h=F_h/F_(h-1)`.  Since

```text
Y partial_Y log T_h=1-(delta_h-delta_(h-1)),
```

integrating (L31) from `Y-3` to `Y` gives the following.  At the minimal
forest reserve, the left endpoint is `Y-3>=4s+9`; the proof of (L31)
only used `x>=4s` and therefore remains valid on this whole interval even
though its endpoint is one formal size step below the forest boundary.

```text
log{T_h(Y)/T_h(Y-3)}
 >=log{Y/(Y-3)}-7(h-1)/{Y(Y-3)}.
```

Using `exp(-z)>=1-z`,

```text
T_h(Y)/T_h(Y-3)
 >= {Y(Y-3)-7(h-1)}/{(Y-3)^2}.                   (L32)
```

Finally, the right side of (L32) is at least

```text
B(a)={1-(5/8)Ubar_h}/{1-Ubar_h}
    ={16a^2-12a+5}/{8(a-1)(2a-1)}.               (L33)
```

This last comparison is a positive-coefficient identity.  Write
`m=s+4+q`, `s=2h+c`, where `q,c>=0`.  After bringing (L32) minus (L33)
over the positive denominator

```text
8(h+m-2)(2h+2m-3)(3m+s-3)^2,
```

its numerator is

```text
80c^2h+48c^2q+16c^2
+288ch^2+352chq+648ch+84cq^2+296cq+60c
+144h^3+432h^2q+1272h^2
+236hq^2+1176hq+1036h
+36q^3+247q^2+414q+47,                            (L34)
```

which is strictly positive.  The exact relation

```text
1-u_h=(1-Ubar_h)T_h(Y)/T_h(Y-3)
```

together with (L32)--(L34) now proves (L19) for every admissible forest
parameter and every `h>=1` with `s>=2h`.
