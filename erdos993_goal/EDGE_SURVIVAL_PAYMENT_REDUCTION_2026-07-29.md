# Edge-survival reduction of the component payment

Date: 2026-07-29

## Status

The reduction below is proved.  It refutes the stronger rank-free
floor on a standard Galvin tree while preserving the actual
rank-budgeted denominator-free target.

## Falling-factorial expansion

For independent \(q\)-sets \(K\), let

\[
E_q=\sum_K e(F-N[K]),
\]

and let \(W_q\) be the corresponding sum of residual wedges
\(\sum_v\binom{d(v)}2\).  Put

\[
\begin{aligned}
S&=(q+1)i_{q+1},\\
B&=(q+1)(q+2)i_{q+2},\\
C&=(q+1)(q+2)(q+3)i_{q+3}.
\end{aligned}
\]

Counting ordered extension vertices gives

\[
H_2=S+B+2E_q
\]

and, because a three-vertex subgraph of a forest has at most two
edges,

\[
H_3=S+3B+C-6E_q+6E_1-6W_q,
\]

where \(E_1=\sum_K h_Ke(F-N[K])\).

The rank-free quadratic form therefore reduces to

\[
Q=B^2-CS-4E_q^2+8SE_q-3SE_1+6SW_q.
\]

## Wedge cancellation

For each marked residual edge \(uv\), an extension vertex preserves
that edge unless it lies in \(N[u]\cup N[v]\).  Double counting gives

\[
\boxed{
E_1=(q+1)E_{q+1}+2W_q+2E_q.
}
\]

Consequently every wedge term cancels:

\[
\boxed{
Q=B^2-CS+2SE_q-3(q+1)SE_{q+1}-4E_q^2.
}
\tag{1}
\]

The actual denominator-free payment is

\[
\boxed{
P_q=qS^2+B^2-CS+2SE_q
-3(q+1)SE_{q+1}-4E_q^2.
}
\tag{2}
\]

Writing

\[
x=\frac BS,\qquad y=\frac CB,\qquad
t=\frac{2E_q}{S},\qquad
z=\frac{(q+1)E_{q+1}}{E_q},
\]

equation (2) becomes

\[
\frac{P_q}{S^2}
=q+x(x-y)+t\left(1-t-\frac32z\right).
\tag{3}
\]

Thus the remaining proof target is a quantitative compensation
between the adjacent factorial-ratio drop \(x-y\) and the survival
ratio of a marked residual edge.

## The rank budget is essential

The previously observed strengthening \(Q\ge0\) is false.
Galvin's tree \(T_{14,8}\), of order \(239\), has six exact ranks
where \(Q<0\).  Its worst normalized strong-floor gap is

\[
-0.8598823980\ldots
\]

at \(q=113\).  The actual payment \(P_q=Q+qS^2\) is positive at
every rank.  The same phenomenon occurs in larger Galvin and
Bautista--Ramos trees.

This explains why all-tree censuses through order 18 supported the
stronger floor: the first known non-log-concave phase-separated
families occur much later.  Any proof must retain the \(q\)-term.

## Verification

`verify_edge_survival_payment_reduction.py` symbolically checks
(1)--(2), independently verifies the wedge identity on every small
tree through order 10, and constructs \(T_{14,8}\) directly.  Its
machine-readable output is
`edge_survival_payment_reduction_certificate_20260729.json`.
