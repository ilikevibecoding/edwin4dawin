# Affine bridge: full-colour-fibre split budget

This note proves the all-order merged payment needed by the affine fibre
route and isolates one scalar split-loss inequality.  The latter has exact
finite support but is not yet proved all-order.

## 1. Vandermonde collapse of a complete colour fibre

Fix a source monomial `z^p w^q`.  Before summing its `T`-branches, the
Laguerre atoms use

\[
 A_v=a+v,\quad B_v=a+b-v,\quad
 \alpha_v=D-p-v,\quad\beta_v=D-q-b+v.
\]

Summing with the actual weights `binom(b,v)` simply reverses the expansion
of `T^b`.  Thus its four-layer row is

\[
 F_j=[z^{D-p}w^{D-q}](z+w)^j
       (1+z)^a(1+w)^aT^b.                           \tag{1}
\]

Put `d=p+q`, `E=2a+b`, and

\[
 \alpha=2D-d-b.
\]

If the two colours are merged by summing every coefficient of total degree
`2D-d`, then substituting `z=w=u` gives

\[
 S_j=2^{j+b}{E\choose\alpha-j}.                    \tag{2}
\]

For the binomially weighted rows `binom(n,j)F_j` and
`binom(n,j)S_j`, define their adjacent-curvature quotients
`Q_fib` and `Q_mer`.  With `P_j=F_j/S_j`, equations (1)--(2) give the exact
third-difference factorization

\[
 \boxed{Q_{\rm fib}=Q_{\rm mer}C_j},\qquad
 C_j={P_j^3P_{j+2}\over P_{j-1}P_{j+1}^3}
     =\exp(\Delta^3\log P_{j-1}).                  \tag{3}
\]

This is the exact split-loss scalar.  It retains all colour branches and is
strictly sharper than demanding that each branch improve the merged row.

## 2. Explicit merged quotient

Write `t=E-alpha`.  Direct cancellation in (2) gives

\[
\begin{split}
 Q_{\rm mer}={}&
 { (h+1)^2(n-h+1)(n-h-1)\over
    h(h+2)(n-h)^2}\\
 &\times {((\alpha-h)^2-1)(t+h+1)^2\over
    (\alpha-h)^2(t+h)(t+h+2)}.                    \tag{4}
\end{split}
\]

## 3. An all-order quantitative merged-payment theorem

Use the actual merged-atom chamber

\[
 n=2h+2+s,\qquad
 \alpha=2n-2+q-s,qquad
 h\ge1,\quad s,q\ge0,quad 0\le t\le2h+28s.       \tag{5}
\]

Then

\[
 \boxed{Q_{\rm mer}\left(1-{1\over hE^2}\right)\ge1.} \tag{6}
\]

Here is an exact algebraic proof.  The only `t`-dependent factor in the left
side of (6) is

\[
 G(t)={ (t+h+1)^2\over(t+h)(t+h+2)}
       \left(1-{1\over h(\alpha+t)^2}\right).
\]

Put `r=t+h` and `E=alpha+t`.  Its logarithmic derivative is twice

\[
 {1\over E(hE^2-1)}-{1\over r(r+1)(r+2)}.          \tag{7}
\]

Since `E>=r+1`, the second denominator is no larger.  More explicitly,
after `h=H+1`, `r=R+1`, and `E=r+1+G`, their difference has 16 nonnegative
integer monomials.  Therefore (7) is nonpositive and the minimum is at
`t=2h+28s`.

At that endpoint, substitute `h=H+1` and clear the positive denominator in
(6).  The numerator has 178 monomials in `H,s,q`, every coefficient a
strictly positive integer (minimum coefficient one).  This proves (6) for
all parameters in (5).

## 4. The sole remaining local split inequality

By (3) and (6), every full fibre is safe if

\[
 \boxed{C_h\ge1-{1\over hE^2}.}                   \tag{8}
\]

The independent exact replay reconstructs all 97,608 required fibres and
finds no failure of (8).  The largest observed normalized loss

\[
 hE^2(1-C_h)
\]

is approximately `0.894666`, below the required constant one.  A factor
`1/2` in (8) is false in 574 cells, so the displayed constant is not a
gratuitous weakening.

The all-order local problem has therefore been reduced to (8), an explicit
hypergeometric third-difference bound for the central allocation probability
`P_h` in (1)--(3).  Proving (8) immediately closes every full-colour fibre;
the separate fibre-mixture covariance lemma then pays the remaining positive
summation.

## 5. Replay

Run:

```text
python verify_affine_bridge_full_fiber_split_budget.py
```

The theorem (6) is all-order.  The checks of (8) are exact finite evidence,
not a proof of (8).
