# Positive two-layer lift for path-count convolutions

For nonnegative integers \(A,B,C,D,d\), put
\[
S_d(A,B,C,D)=
\sum_{u=0}^d\binom du
\binom{u+A}{C-u}
\binom{d-u+B}{D-(d-u)}.
\]
Then
\[
\boxed{
S_{d+2}(A+1,B+1,C+1,D+1)
\ge S_d(A,B,C,D).
}
\]

The proof is coefficientwise.  Set
\[
Z=z(1+z),\qquad W=w(1+w).
\]
The elementary identity
\[
\binom{u+A}{C-u}
=[z^C](1+z)^A Z^u
\]
and the binomial theorem give
\[
S_d(A,B,C,D)
=[z^Cw^D](1+z)^A(1+w)^B(Z+W)^d.
\]
Rewrite the old coefficient at the new targets \(C+1,D+1\) by
multiplying its integrand by \(zw\).  The lift difference is
therefore the coefficient of the old nonnegative integrand times
\[
K(z,w)=(1+z)(1+w)(Z+W)^2-zw.
\]
Direct expansion gives
\[
\begin{aligned}
K={}&z^5w+z^5+3z^4w+3z^4
+2z^3w^3+4z^3w^2+5z^3w+3z^3\\
&+4z^2w^3+8z^2w^2+5z^2w+z^2
+zw^5+3zw^4+5zw^3+5zw^2+zw\\
&+w^5+3w^4+3w^3+w^2,
\end{aligned}
\]
which has 21 strictly positive coefficients.

The certificate
`path_binomial_convolution_two_layer_lift_20260730.json` is generated
by `verify_path_binomial_convolution_lift.py`.

Every raw path count occurring in the stable P4 kernel has precisely
the form \(\binom{u+A}{C-u}\).  Thus this lemma proves the desired
two-layer lift for every unsigned pure-count convolution term.  The
remaining work is to show that the signed residual-moment phase
combination can be grouped into such positive terms; the full
coefficient-extraction derivation is being carried out separately.
