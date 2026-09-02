# Disjoint-union payment superadditivity candidate

Date: 2026-07-29

## Status

The tensor identities and the decomposition below are exact.  The
three displayed nonnegativity claims are candidates.  They survive
the finite audits described below, including phase-separated Galvin
trees.  Proving them would transfer the strong connected-tree
payment margin to arbitrary forests.

This component route is necessary because leaf monotonicity itself
does not survive disjoint unions:

\[
2K_2\sqcup K_1\longrightarrow3K_2
\]

has \(U_2\)-increment \(-32\).

## Superadditivity statement

Recall

\[
U_q(F)=P_q(F)-2S_q(F)^2,\qquad
R_q(F)=P_q(F)-S_q(F)^2=U_q(F)+S_q(F)^2.
\]

The candidate is

\[
\boxed{
U_q(A\sqcup B)\ge R_q(A)+R_q(B)
}
\tag{CS}
\]

for nonempty forests \(A,B\) and \(q\ge2\), with absent rank masses
interpreted as zero.

If the connected-tree leaf argument proves \(U_q(T)\ge0\) for every
tree, (CS) closes the forest case by induction on the number of
components.  Indeed \(R_q(T)\ge0\), and after the first union one has
\(R_q(F)=U_q(F)+S_q(F)^2\ge0\) for the next step.

## Exact tensor decomposition

For a rank family, write its aggregate vector as

\[
X=(N,S,H_2,H_3,C_0,C_1),
\]

where \(N\) is the number of independent sets and the other
coordinates have their usual residual meanings.  Define the
symmetric bilinear form

\[
\begin{aligned}
K_q(X,Y)={}&H_2(X)H_2(Y)
+2\{H_2(X)C_0(Y)+H_2(Y)C_0(X)\}\\
&-\frac12\{S(X)H_3(Y)+S(Y)H_3(X)\}\\
&-\frac32\{S(X)C_1(Y)+S(Y)C_1(X)\}\\
&+(q-3)S(X)S(Y).
\end{aligned}
\tag{1}
\]

Then \(K_q(X,X)=U_q(X)\).

For rank families \(X\) in \(A\) and \(Y\) in \(B\), their product
family has vector \(X\otimes Y\) given by

\[
\begin{aligned}
N&=N_XN_Y,\\
S&=S_XN_Y+N_XS_Y,\\
H_2&=H_{2X}N_Y+2S_XS_Y+N_XH_{2Y},\\
H_3&=H_{3X}N_Y+3H_{2X}S_Y+3S_XH_{2Y}+N_XH_{3Y},\\
C_0&=C_{0X}N_Y+N_XC_{0Y},\\
C_1&=C_{1X}N_Y+S_XC_{0Y}+C_{0X}S_Y+N_XC_{1Y}.
\end{aligned}
\tag{2}
\]

Fix \(q\), and put

\[
Y_j=X_{q-j}(A)\otimes X_j(B)\qquad(0\le j\le q),
\quad
M=\sum_{j=1}^{q-1}Y_j.
\]

Thus \(Y_0,Y_q\) are the two pure-component families and \(M\) is
the aggregate mixed-rank family.  Bilinearity gives the exact identity

\[
\begin{aligned}
U_q(A\sqcup B)-R_q(A)-R_q(B)
={}&\underbrace{K_q(Y_0,Y_0)-R_q(A)}_{\mathcal S_A}\\
&+\underbrace{K_q(Y_q,Y_q)-R_q(B)}_{\mathcal S_B}\\
&+\underbrace{K_q(M,M)
+2K_q(M,Y_0+Y_q)+2K_q(Y_0,Y_q)}_{\mathcal C}.
\end{aligned}
\tag{3}
\]

The three current component claims are

\[
\boxed{\mathcal S_A\ge0,\qquad \mathcal S_B\ge0,\qquad
\mathcal C\ge0.}
\tag{4}
\]

The finer split of \(\mathcal C\) is not valid in general.  In
particular, the mixed--pure cross term can be negative on larger
forests even though the complete \(\mathcal C\) is positive.  The
whole last bracket in (3) must be retained.

## Pure-family shift reduction

The term \(\mathcal S_A\) has a compact moment form.  Let a uniform
rank-\(q\) independent set of \(A\) have residual variables \(h,c\),
and write

\[
\mu=\mathbb Eh,\quad a=\mathbb Ec,\quad
v=\operatorname{Var}(h),\quad
t=\mathbb E(h-\mu)^3,\quad
w=\operatorname{Cov}(h,c).
\]

If \(B\) has order \(m\) and \(d\) components, its rank-zero residual
adds the constants \((m,d)\).  Put

\[
\lambda=q-2+a-v,\qquad
\beta=2\mu\lambda-t-3w.
\]

Direct expansion gives

\[
\boxed{
\mathcal S_A
=(d-1)\mu^2+4dv
+m^2\{\lambda+d-1\}
+m\{\beta+2\mu(d-1)\}.
}
\tag{5}
\]

Since \(m\ge d\ge1\), it is enough to prove the following three
uniform-rank moment inequalities:

\[
\boxed{
\lambda\ge0,\qquad
2\lambda+\beta\ge0,\qquad
4v+\lambda+\beta\ge0.
}
\tag{6}
\]

For \(d=1\), (5) is \(4v+m^2\lambda+m\beta\).  Its value at \(m=1\)
is the third quantity in (6), while

\[
G(m+1)-G(m)=(2m+1)\lambda+\beta
\]

is nonnegative by the first two.  Increasing \(d\) adds

\[
(d-1)(\mu^2+4v+m^2+2m\mu)\ge0.
\]

In unnormalized rank moments, if

\[
\Lambda=(q-2)N^2+C_0N-H_2N+S^2,
\]

\[
T=N^2H_3-3NSH_2+2S^3,\qquad
W=NC_1-SC_0,
\]

then the three numerators in (6) are

\[
\boxed{
\Lambda,\qquad
2N\Lambda+(2S\Lambda-T-3NW),\qquad
4N(NH_2-S^2)+N\Lambda+(2S\Lambda-T-3NW).
}
\tag{7}
\]

All three are themselves observed to be nondecreasing under forest
leaf or isolate addition.  More strongly, let their unnormalized
values be \(\Lambda_q,I_q,J_q\), let a new leaf have support \(v\),
and let \(G\) be the graph left after deleting both.  For \(q\ge3\),
the exact audits support

\[
\begin{aligned}
\Delta\Lambda_q&\ge \Lambda_{q-1}(G)+i_{q-1}(G)^2,\\
\Delta I_q&\ge I_{q-1}(G)+i_{q-1}(G)^3,\\
\Delta J_q&\ge J_{q-1}(G)+i_{q-1}(G)^3.
\end{aligned}
\tag{8}
\]

At \(q=2\), the three plain increments are nonnegative.  Equations
(8), if proved, give a closed rank/order induction for all three
pure-shift inequalities.  The independent audit is
`scan_uniform_shift_moment_recursion.py`, with replay
`uniform_shift_moment_recursion_certificate_20260729.json`.

## Evidence

The exact audit checks (2)--(3), the three terms in (4), and the
moment reductions (5)--(7).  Current coverage includes:

- every pair of atlas forests through order seven;
- random forest pairs with orders into the hundreds;
- matchings, paths, stars, and disconnected controls;
- Galvin trees \(T_{14,8}\), \(T_{21,11}\), and \(T_{40,20}\)
  paired with several small and phase-separated components.

No failure of (CS), any full term in (4), or any inequality in (6)
has been found.  The executable audit is
`scan_component_payment_superadditivity.py`.
