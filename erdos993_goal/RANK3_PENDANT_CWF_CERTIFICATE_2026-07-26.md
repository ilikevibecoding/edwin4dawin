# Exact rank-3 pendant-hub CWF certificate

This note proves the rank-3 case of the pendant-hub closure inequality
used in the current attack on Erdős Problem 993.  It remains a local lemma,
not a proof of the full conjecture.

## Additional forest statistics

Retain the notation of
`RANK2_PENDANT_CWF_CERTIFICATE_2026-07-26.md`: the old root-deleted forest
\(B\) has \(Q\) components, \(N=Q+z\) vertices, \(z\) edges, \(W\)
adjacent edge pairs, and \(c\) root-incident edges.  Let

- \(T\) be the number of connected three-edge subsets of \(B\);
- \(W_H\) be the number of adjacent edge pairs in the forest \(H\)
  obtained by deleting the \(Q\) component roots.

Inclusion-exclusion gives

\[
\begin{aligned}
b_4={}&\binom N4-z\binom{N-2}{2}
       +W(N-4)+\binom z2-T,\\
d_4={}&\binom z3-(z-c)(z-2)+W_H.
\end{aligned}
\tag{1}
\]

The second identity uses the fact that \(H\) has \(z\) vertices and
\(z-c\) edges.

For

\[
P=(1+x)^R(B+D),\qquad S=xB,
\]

and factorial coefficients \(p_k=k![x^k]P\),
\(s_k=k![x^k]S\), the rank-3 reserve is

\[
\mathcal T_3=
(R-1)(p_3^2-p_4p_2)
(R+1)(2p_3s_3-p_4s_2-s_4p_2).
\tag{2}
\]

## A line-graph lower bound

The line graph \(L(B)\) has \(z\) vertices and \(W\) edges.  If its
degrees are \(\delta_1,\ldots,\delta_z\), then its number \(P_2\) of
length-two paths satisfies

\[
\begin{aligned}
P_2
&=\sum_i\binom{\delta_i}{2}\\
&\ge \frac12\left(\frac{(2W)^2}{z}-2W\right)
 =\frac{2W^2}{z}-W.
\end{aligned}
\tag{3}
\]

Every length-two path in \(L(B)\) belongs to a connected three-vertex
set, and any such set contains at most three length-two paths.  Connected
three-vertex sets of \(L(B)\) are precisely connected three-edge subsets
of \(B\).  Therefore

\[
T\ge
\max\left(0,\frac{2W^2/z-W}{3}\right).
\tag{4}
\]

The other bounds used are immediate:

\[
0\le c\le z,\qquad
0\le W\le\binom z2,\qquad
W_H\le W.
\tag{5}
\]

## Exact finite certificate

Set \(R=r+2\) and \(Q=q+2\).  Expansion of (2) using (1) has 27
coefficients as a polynomial in \(r,q\).  The replay script proves each
coefficient nonnegative as follows.

First, the coefficient of \(T\) is the negative of the coefficient of
\(W_H\), and is a coefficientwise nonnegative polynomial after writing
\(z=u+1\).  Thus replacing \(W_H\) by \(W\) and \(T\) by the appropriate
lower bound in (4) gives a lower bound.

For every remaining monomial involving \(c\), positive monomials are
discarded.  In a negative monomial, \(c^j\le z^j\) gives a valid lower
bound.  What remains is quadratic in \(W\).

There are two ranges:

\[
0\le W\le z/2,\qquad
z/2\le W\le \binom z2.
\]

In the first, write \(W=zt/2\).  In the second, where \(z\ge2\), write

\[
W=\frac z2+\frac{z(z-2)}2t.
\]

In either case \(0\le t\le1\).  Each resulting quadratic
\(at^2+bt+c_0\) is written in the Bernstein basis:

\[
c_0(1-t)^2
2(c_0+b/2)t(1-t)
(c_0+b+a)t^2.
\tag{6}
\]

For all 27 parameter coefficients, all three Bernstein coefficients in
both ranges are polynomials with nonnegative coefficients after shifting
\(z\) to \(u+1\) or \(u+2\), respectively.  This is 162 exact polynomial
positivity checks.  The separate case \(z=0\) is coefficientwise positive
directly.

## Independent replay

Run:

```powershell
python .\verify_rank3_pendant_cwf_certificate.py
```

The script reconstructs (1) and (2), derives all 27 shifted parameter
coefficients, and performs the 162 exact Bernstein checks using rational
SymPy arithmetic.

