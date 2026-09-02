# Rank-three component-variance theorem for trees

Date: 2026-07-29

## Theorem

Let \(T\) be a tree of order \(n\ge4\).  At rank three, choose a
vertex \(v\) with probability proportional to

\[
h_v=|V(T-N[v])|=n-1-d_v.
\]

Let \(c_v\) be the number of components of \(T-N[v]\), and set

\[
A_v=h_v-3+\frac{2c_v}{h_v}
\]

whenever \(h_v>0\).  Then

\[
\boxed{\operatorname{Var}_h(A_v)\le1+\mathbb E_h c_v.}
\]

Thus the component-variance inequality (CV) is proved for every tree
at global rank three.

## Proof

Put

\[
z_v=\frac{2c_v}{h_v}.
\]

Every component counted by \(c_v\) contains a vertex of
\(T-N[v]\), so \(0\le c_v\le h_v\).  Hence \(0\le z_v\le2\), and
Popoviciu's inequality gives

\[
\operatorname{Var}_h(z_v)\le1.
\tag{1}
\]

Since \(A_v=n-4-d_v+z_v\),

\[
\operatorname{Var}_h(A_v)
=\operatorname{Var}_h(d_v)+\operatorname{Var}_h(z_v)
-2\operatorname{Cov}_h(d_v,z_v).
\tag{2}
\]

It remains to prove

\[
\mathbb E_hc_v-\operatorname{Var}_h(d_v)
+2\operatorname{Cov}_h(d_v,z_v)\ge0.
\tag{3}
\]

Let

\[
N=n-2,\qquad x_v=d_v-1,\qquad
X_j=\sum_vx_v^j,\qquad
Q=\sum_{uv\in E(T)}x_ux_v.
\]

Because \(T\) is a tree, \(x_v\ge0\), \(\sum_vx_v=N\), and
\(Q\ge0\).  The total down-link mass is \(N(N+1)\).  Direct expansion
of the left side of (3), multiplied by \(N^2(N+1)^2\), is

\[
\begin{aligned}
P={}&2N^4-3N^3+N(N+1)X_3+6N(N+1)Q\\
&+(-6N^2+4N)X_2+5X_2^2.
\end{aligned}
\tag{4}
\]

Write \(a=X_2/N^2\) and \(b=X_3/N^3\).  Dropping the nonnegative
\(Q\)-term and dividing by \(N^3\) gives

\[
\frac{P}{N^3}\ge
N(N+1)b+5Na^2+(4-6N)a+2N-3.
\tag{5}
\]

Cauchy--Schwarz gives \(X_2^2\le NX_3\), hence \(b\ge a^2\).
Therefore the right side of (5) is at least

\[
f_N(a)=N(N+6)a^2+(4-6N)a+2N-3.
\tag{6}
\]

For \(N\ge2\), the global minimum of this quadratic is

\[
\min_{a\in\mathbb R}f_N(a)
=\frac{2(N-2)(N+1)^2}{N(N+6)}\ge0.
\tag{7}
\]

This proves (3).  Combining (1), (2), and (3) proves the theorem.

## Verification

Run `verify_rank3_tree_component_variance.py`.  It checks every
algebraic substitution, the numerator (4), and the quadratic minimum
(7) symbolically, then writes
`rank3_tree_component_variance_certificate_20260729.json`.

This is a genuine theorem, but it does not yet prove (CV) for
disconnected forests or for arbitrary rank.  It therefore does not
by itself settle Erdős Problem 993.
