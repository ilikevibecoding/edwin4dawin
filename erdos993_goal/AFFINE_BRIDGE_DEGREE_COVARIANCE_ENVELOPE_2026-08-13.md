# Affine bridge: degree-ULC covariance envelope

This note reduces the remaining positive mixture penalty to three explicit
path-source inequalities.  The variance/covariance algebra and the
telescoping constants are all-order.  The source inequalities are verified
exactly on all 953 required windows but are not yet proved all-order.

## 1. Aggregate complete fibres by source degree

For source degree `d=p+q`, let `F_(d,j)` be the sum of all complete colour
fibres of degree `d`, including their specialized positive source weights,
and put

\[
 x_d={\binom nh F_{d,h}\over\binom n{h-1}F_{d,h-1}},\qquad
 y_d={\binom n{h+1}F_{d,h+1}\over\binom nhF_{d,h}}.       \tag{1}
\]

Thus (1) is the exact adjacent-ratio formula; it is a quotient of two
explicit diagonal coefficients of

\[
 H_d(z,w)(z+w)^j A^aT^b,
\]

where `H_d` is the fixed homogeneous degree-`d` slice of the actual reserve
core.  The group support is `d=8,...,16` (`L=8`), while the bottom support is
`d=9,...,20` (`L=11`).

For comparison, put

\[
 \alpha_d=2D-d-b,\qquad t_d=E-\alpha_d.
\]

The two merged ratios are the rational functions

\[
 \bar x_d={2(n-h+1)(\alpha_d-h+1)\over h(t_d+h)},\qquad
 \bar y_d={2(n-h)(\alpha_d-h)\over(h+1)(t_d+h+1)}. \tag{2}
\]

Since `alpha_(d+1)=alpha_d-1` and `t_(d+1)=t_d+1`, their exact adjacent
relative drops are

\[
 b^x_d={\bar x_d\over\bar x_{d+1}}-1
 ={E+1\over(\alpha_d-h)(t_d+h)},                  \tag{3}
\]

\[
 b^y_d={\bar y_d\over\bar y_{d+1}}-1
 ={E+1\over(\alpha_d-h-1)(t_d+h+1)}.              \tag{4}
\]

The exact source hypotheses suggested by the census are

\[
 x_d\ge x_{d+1},\quad y_d\ge y_{d+1},\qquad
 {x_d\over x_{d+1}}-1\le b^x_d,\quad
 {y_d\over y_{d+1}}-1\le b^y_d.                  \tag{5}
\]

Equivalently, after dividing each colour coefficient by its merged total,
the angular correction has the required adjacent TP2 orientation in
`(d,j)`.  This is a path-specific statement, not a generic mixture fact.

## 2. The relative Lipschitz products telescope

Let `d_0` and `d_1=d_0+L` be the support endpoints and set

\[
 A=\alpha_{d_1}-h,\qquad B=t_{d_1}+h,\qquad B_0=B-L.
\]

The identity

\[
 1+b^x_d={ (\alpha_d-h+1)(t_d+h+1)
             \over(\alpha_d-h)(t_d+h)}             \tag{6}
\]

telescopes across every tail of the degree interval.  Equations (3)--(6)
give, exactly,

\[
 {\operatorname {Lip}(x)\over\min x}
 \le R_x={ (E+1)B\over(A+1)B_0(B_0+1)},           \tag{7}
\]

\[
 {\operatorname {Lip}(y)\over\min y}
 \le R_y={ (E+1)(B+1)\over A(B_0+1)(B_0+2)}.      \tag{8}
\]

This is substantially sharper than a range/Gruss bound and contains no
uncontrolled product over the 8 or 11 degree steps.

## 3. Normalized ULC supplies exactly the needed variance scale

Let `pi_d` be the layer-`h-1` degree law.  If

\[
 \pi_{d_0+k}/\binom Lk
\]

is log-concave, then the standard ULC variance inequality is

\[
 \operatorname {Var}(D)\le\mu(1-\mu/L)\le L/4.    \tag{9}
\]

Here is a short proof of the first inequality.  ULC makes

\[
 \theta_k={(k+1)\pi_{k+1}\over(L-k)\pi_k}
\]

decreasing.  Under the law tilted by `(L-k)`, opposite monotonicity of `k`
and `theta_k` gives

\[
 E[D(D-1)]\le {L-1\over L}\mu^2,
\]

after using `E[(L-D)theta_D]=mu` and
`E[D(L-D)theta_D]=E[D(D-1)]`.  This is equivalent to (9).

For independent copies `D,D'`, monotonicity and the Lipschitz bounds give

\[
 \operatorname {Cov}(x(D),y(D))
 ={1\over2}E[(x(D)-x(D'))(y(D)-y(D'))]
 \le\operatorname {Lip}(x)\operatorname {Lip}(y)\operatorname {Var}(D).
\]

Consequently the multiplicative covariance inflation obeys the all-order
conditional bound

\[
 {E(xy)\over Ex\,Ey}\le1+{L\over4}R_xR_y.         \tag{10}
\]

## 4. One explicit final comparison

Assume also the scalar split bound from Section 108.2,

\[
 C_h\ge1-{1\over hE^2}.                            \tag{11}
\]

The merged quotient times the right side of (11) decreases with source
degree, so every complete fibre has quotient at least

\[
 \lambda_0=Q_{\rm mer}(d_1)
             \left(1-{1\over hE^2}\right).         \tag{12}
\]

Combining the mixture lemma with (10), it is enough to prove the single
rational inequality

\[
 \boxed{\lambda_0\ge
 \left(1+{L\over4}R_xR_y\right)^3.}                \tag{13}
\]

Thus the all-order mixture bridge is reduced to: normalized degree ULC,
the adjacent TP2/slope bounds (5), the scalar split bound (11), and the
explicit rational comparison (13).  All quantities in (13) are displayed
rational functions; no covariance remains hidden.

## 5. Exact required-window audit

The replay checks 9,341 normalized-ULC inequalities and 10,294 adjacent
degree pairs.  There are no ULC, monotonicity, merged-slope, or conditional
budget failures.  The minimum exact ratio in (13) is approximately

\[
 1.0022170321
\]

at the bottom/odd cell `(m,x,n,h)=(30,60,50,11)`.  There
`lambda_0` is approximately `1.0061925301` and the right-side inflation
increment in (10) is at most `0.0013204901`.

Run:

```text
python verify_affine_bridge_degree_covariance_envelope.py
```

The finite audit is exact evidence for the remaining path-source hypotheses,
not an all-order proof of them.
