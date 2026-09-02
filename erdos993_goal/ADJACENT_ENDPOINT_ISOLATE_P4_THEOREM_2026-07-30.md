# Adjacent-endpoint isolate recurrence

Date: 2026-07-30

Let the protected component be the edge \(K_2\), with its two
endpoints protected, and let the rest of the forest consist of \(t\)
isolated vertices.  Write \(T_q(t)\) for the doubled terminal
leaf-recursion gap on this protected forest.  Then for every
\(q\ge4\) and \(t\ge0\),

\[
D_q(t):=T_q(t+1)-T_q(t)-T_{q-1}(t)\ge0.
\]

Thus the strong isolated-vertex recurrence (P4) holds on the entire
adjacent-endpoint terminal family.

## Exact certificate

For \(t\ge q-3\), direct substitution of the four residual-moment
rows gives

\[
D_q(t)=
\frac{4(t!)^2}{q!(q-2)!(t-q+3)!(t-q+4)!}\,P(q,t).
\]

Put

\[
q=r+4,\qquad t=q-3+x=r+x+1
\]

with \(r,x\ge0\).  The exact expansion of \(P(r+4,r+x+1)\) is

\[
\begin{aligned}
&6r^5x+6r^5
+18r^4x^2+90r^4x+78r^4\\
&+16r^3x^3+195r^3x^2+535r^3x+396r^3\\
&+4r^2x^4+136r^2x^3+812r^2x^2+1549r^2x+984r^2\\
&+24rx^4+403rx^3+1513rx^2+2179rx+1200r\\
&+36x^4+407x^3+1063x^2+1194x+576.
\end{aligned}
\]

All 24 coefficients are strictly positive (the smallest is \(4\)),
and the factorial prefactor is positive.  Hence \(D_q(t)>0\) on
\(t\ge q-3\).  For \(0\le t<q-3\), the involved independent-set
rows lie beyond the relevant independence numbers, and the defect is
zero.  This proves the claim.

## Reproducibility

`derive_adjacent_endpoint_isolate_p4.py` regenerates the identity and
the complete coefficient certificate in
`adjacent_endpoint_isolate_p4_identity_20260730.json`.

`verify_adjacent_endpoint_isolate_p4.py` independently constructs the
graphs, enumerates their residual moment rows, and compares the
generic phase evaluator with the closed formulas.
