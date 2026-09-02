# Leaf-multiplier compensation and variance gluing

Date: 2026-07-26

Status: the identities in Sections 1--3 are proved.  They isolate a
rank-uniform leaf invariant and a possible induction mechanism, but the
needed inequality is not yet proved for every tree.  This note is not a
resolution of Erdős Problem 993.

## 1. Exact multiplier compensation

Let \(T\) be a tree, let \(p\in V(T)\), and add a new leaf adjacent to
\(p\).  Write

\[
P=I(T;x)=\sum_j a_jx^j,\qquad
B=I(T-p;x)=\sum_j b_jx^j,
\]

so the new independence polynomial is

\[
P'=P+xB,\qquad a'_j=a_j+b_{j-1}.
\]

Put

\[
h_j=j!a_j,\qquad
C_j=h_j^2-h_{j-1}h_{j+1},\qquad
\rho_j=\frac{h_{j-1}h_{j+1}}{h_j^2},
\]

and define the coefficient multiplier

\[
m_j=\frac{a'_j}{a_j}=1+\frac{b_{j-1}}{a_j}.
\]

Factorial scaling cancels in this last ratio, so \(h'_j=m_jh_j\).
Consequently,

\[
\tag{1}
\frac{C_j(P')-C_j(P)}{h_j^2}
=(m_j^2-1)-\rho_j(m_{j-1}m_{j+1}-1).
\]

Adding and subtracting \(m_{j-1}m_{j+1}\) gives the more informative
form

\[
\tag{2}
\boxed{\quad
\frac{\Delta C_j}{h_j^2}
=
\underbrace{m_j^2-m_{j-1}m_{j+1}}_{\text{multiplier curvature}}
+
\underbrace{(1-\rho_j)
 (m_{j-1}m_{j+1}-1)}_{\text{old-curvature payment}}.
\quad}
\]

Thus log-concavity of the multiplier sequence is sufficient for leaf
monotonicity, but it is not necessary.  In fact it fails extremely often
even in the required prefix.

When the multiplier curvature is negative, define

\[
\tag{3}
\theta_j=
\frac{m_{j-1}m_{j+1}-m_j^2}
     {m_{j-1}m_{j+1}-1}.
\]

All multipliers are at least one, and a negative numerator in (3) forces
the denominator to be positive.  Equation (2) then gives the exact
equivalence

\[
\tag{4}
\boxed{\quad
\Delta C_j\ge0
\quad\Longleftrightarrow\quad
\theta_j\le 1-\rho_j=\frac{C_j(P)}{h_j^2}.
\quad}
\]

This is the rank-uniform compensation target: the old normalized
curvature reserve must dominate the normalized defect of the leaf
multiplier.

In raw ordinary coefficients, the same identity is

\[
\tag{5}
\frac{\Delta C_j}{(j!)^2}
=2a_jb_{j-1}+b_{j-1}^2
-\frac{j+1}{j}
\left(
a_{j-1}b_j+a_{j+1}b_{j-2}+b_{j-2}b_j
\right).
\]

## 2. Exact finite evidence for compensation

`scan_leaf_multiplier_compensation.py` evaluates (1)--(4) with exact
rational arithmetic for every attachment vertex of every unlabeled tree
through a requested order.

Through old-tree order \(16\), it checked

- 32,508 unlabeled trees;
- 497,380 attachment vertices;
- 2,870,722 prefix ranks;
- 2,543,735 negative multiplier-curvature instances.

There was no compensation failure.  The largest observed payment ratio

\[
\frac{\theta_j}{1-\rho_j}
\]

was

\[
\frac{232}{285}=0.8140350877\ldots.
\]

It occurs at rank \(2\) for the 5-vertex path with the leaf attached to
the second vertex.  The old, deletion, and new polynomials are

\[
(1,5,6,1),\qquad (1,4,4,1),\qquad (1,6,10,5,1).
\]

The multiplier defect itself is therefore not a rare boundary
phenomenon: about 89 percent of the tested prefix instances have negative
multiplier curvature.  What survives robustly is precisely the
compensated inequality (4).

The complete output is
`leaf_multiplier_compensation_n16_20260726.json`.  These finite data are
falsification evidence, not a proof of (4).

## 3. Leaf-mixture variance gluing

The same obstruction has an exact probabilistic form.  Let \(G\) be
obtained from \(T\) by adding a leaf \(\ell\) at \(p\), and choose a
uniform independent \(k\)-set of \(G\).  Split according to whether
\(\ell\) is absent or present.

If \(\ell\) is absent, the set is a uniform \(S\in\mathcal I_k(T)\).
Let

\[
R_T(S)=V(T)\setminus N_T[S],\quad
e_T(S)=|R_T(S)|,\quad
q_T(S)=|E(T[R_T(S)])|.
\]

Then its residual statistics in \(G\) are

\[
\tag{6}
e_0=e_T(S)+\mathbf 1_{\{p\notin S\}},
\qquad
q_0=q_T(S)+\mathbf 1_{\{p\in R_T(S)\}}.
\]

If \(\ell\) is present, delete it.  The remainder is a uniform
\(Q\in\mathcal I_{k-1}(T-p)\), and

\[
\tag{7}
e_1=e_{T-p}(Q),\qquad q_1=q_{T-p}(Q).
\]

The mixture weights are

\[
\tag{8}
w=\frac{a_k}{a_k+b_{k-1}},\qquad 1-w=\frac{b_{k-1}}{a_k+b_{k-1}}.
\]

Writing \(\mu_i=\mathbb E e_i\) and
\(\sigma_i^2=\operatorname{Var}(e_i)\), the law of total variance gives

\[
\tag{9}
\operatorname{Var}(e_G)
=w\sigma_0^2+(1-w)\sigma_1^2
+w(1-w)(\mu_0-\mu_1)^2.
\]

The ordered-log-concavity inequality for \(G\) at the next rank is
equivalent to

\[
\tag{10}
\operatorname{Var}(e_G)
\le
w(\mu_0+2\mathbb E q_0)
+(1-w)(\mu_1+2\mathbb E q_1).
\]

Equations (9)--(10) expose why separate induction on \(T\) and \(T-p\)
is insufficient: their two Poincaré reserves must also pay the between-
class square

\[
w(1-w)(\mu_0-\mu_1)^2.
\]

Algebraically, this is the same cross-state reserve measured by (2) and
by the adaptive child-weighted rooted invariant.  A successful induction
must therefore preserve a marked/rooted variance reserve, not only
ordinary log-concavity of the two smaller forests.

## 4. Current proof target

The exact leaf route can now be stated without the false multiplier
shortcut:

> For every leaf attachment \(T\subset T'\) and every
> \(j<L(T')\), prove
> \[
> \theta_j\le \frac{C_j(I(T))}{(j![x^j]I(T))^2},
> \]
> together with nonnegative curvature at a newly exposed boundary rank.

Ranks \(1\) through \(4\) are already proved globally.  The remaining
task is to derive (4) from a rooted reserve stable under the product
recurrence, or to find a prefix attachment where it fails.
