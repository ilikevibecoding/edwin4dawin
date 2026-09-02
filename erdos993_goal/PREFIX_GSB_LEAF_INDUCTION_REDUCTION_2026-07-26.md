# Prefix one-unit-drift leaf induction

Date: 2026-07-26

Status: the reduction theorem and identities below are proved.  The two
leaf statements (G-LM) and (G-BR) remain conjectural beyond the ranks
already covered by factorial curvature.  This is not yet a proof of
Erdős Problem 993.

## 1. The weaker reserve that still proves unimodality

Let

\[
I(T;x)=\sum_{k=0}^{\alpha}a_kx^k,\qquad
\mu_k=(k+1)\frac{a_{k+1}}{a_k}.
\]

Define the one-unit extension-drift reserve

\[
\tag{1}
G_k(T)
=k a_k^2+a_{k-1}a_k-(k+1)a_{k-1}a_{k+1}.
\]

Then

\[
\tag{2}
\frac{G_k(T)}{a_{k-1}a_k}
=1+\mu_{k-1}-\mu_k.
\]

Thus \(G_k\ge0\) is exactly

\[
\tag{GSB}
\mu_k\le\mu_{k-1}+1.
\]

Put

\[
L(T)=\left\lfloor\frac{2\alpha(T)+1}{3}\right\rfloor.
\]

The known bipartite decreasing-tail theorem starts at \(L(T)\).
Consequently:

> **Prefix-GSB reduction.** If every forest satisfies
> \[
> G_k(T)\ge0\qquad(1\le k<L(T)),
> \]
> then every forest has a unimodal independence sequence.

Indeed, if \(a_k\le a_{k-1}\), then
\(\mu_{k-1}\le k\).  Equations (GSB) and (2) give
\(\mu_k\le k+1\), hence \(a_{k+1}\le a_k\).  A first descent in the
prefix therefore propagates one rank at a time until it meets the known
decreasing tail.  If there is no prefix descent, the increasing prefix
meets that tail directly.

This target is strictly weaker than prefix ordered log-concavity.  In
variance form, for a uniform independent \(r\)-set with residual
extension count \(e\) and residual-edge count \(q\), it is

\[
\tag{3}
\operatorname{Var}(e)\le2\mathbb E e+2\mathbb E q.
\]

The ordered-log-concavity route has only \(\mathbb E e+2\mathbb E q\)
on the right of (3).

## 2. Exact leaf increment

Add a leaf at \(p\), and write

\[
P=I(T;x)=\sum a_kx^k,\qquad
B=I(T-p;x)=\sum b_kx^k.
\]

The new coefficients are \(a'_k=a_k+b_{k-1}\).  Direct expansion gives

\[
\tag{4}
\begin{aligned}
\Delta G_k={}&
2k a_kb_{k-1}+k b_{k-1}^2\\
&+a_{k-1}b_{k-1}+b_{k-2}a_k+b_{k-2}b_{k-1}\\
&-(k+1)\left(
a_{k-1}b_k+b_{k-2}a_{k+1}+b_{k-2}b_k
\right).
\end{aligned}
\]

This suggests the weaker analogues of the factorial-curvature leaf
obligations:

**(G-LM), prefix GSB leaf monotonicity**

\[
\tag{G-LM}
G_k(T+\text{leaf})\ge G_k(T)
\qquad(1\le k<L(T+\text{leaf})).
\]

**(G-BR), new-boundary reserve**

\[
\tag{G-BR}
L(T+\text{leaf})=L(T)+1
\quad\Longrightarrow\quad
G_{L(T)}(T+\text{leaf})\ge0.
\]

## 3. Conditional leaf-induction theorem

> If (G-LM) and (G-BR) hold for every leaf extension of trees, then every
> tree satisfies prefix GSB and hence has a unimodal independence
> sequence.

The proof is the same star-to-tree induction used for factorial curvature.
Root a tree, repeatedly delete a leaf at distance at least two from the
root until a star remains, and then add the leaves back in reverse order.
Existing prefix ranks are preserved by (G-LM), while (G-BR) handles the
single rank exposed when the cutoff rises.

For the star \(K_{1,q}\),

\[
I(K_{1,q};x)=(1+x)^q+x.
\]

Its reserve is

\[
\begin{aligned}
G_1&=4q+2,\\
G_2&=(q+3)\binom q2,\\
G_k&=2\binom q{k-1}\binom qk\qquad(3\le k\le q),
\end{aligned}
\]

with the evident zero-support boundary conventions.  Hence the induction
base is positive.

As with the factorial-curvature reduction, a forest conclusion requires
either forest leaf closure or a product lemma for the prefix-GSB class.
The statement above is therefore explicitly the tree version.

## 4. What is already unconditional

Let

\[
C_k=(k!a_k)^2-(k-1)!a_{k-1}(k+1)!a_{k+1}.
\]

Then

\[
\tag{5}
G_k
=\frac{k\,C_k}{(k!)^2}+a_{k-1}a_k.
\]

Therefore nonnegative factorial curvature implies positive GSB reserve.
Moreover, if factorial curvature is nondecreasing under a leaf attachment,
then (5) and coefficientwise monotonicity show that \(G_k\) is also
nondecreasing.

The global rank-1 through rank-4 factorial-curvature theorems consequently
prove (G-LM) and (G-BR) through rank \(4\).

## 5. Exact evidence and the necessary prefix restriction

`scan_prefix_gsb_leaf_monotonicity.py` checked every attachment vertex of
every unlabeled old tree through order \(16\):

- 32,508 trees;
- 497,380 attachments;
- 5,027,445 all-rank comparisons;
- 2,870,722 prefix comparisons;
- 177,883 cutoff increases.

It found no negative leaf increment at any rank in this finite range and
no negative newly exposed boundary reserve.  The minimum prefix increment
was \(4\).

The output is
`prefix_gsb_leaf_monotonicity_n16_20260726.json`.  This is finite evidence
only.

Global GSB leaf monotonicity is nevertheless false.  For Galvin's
239-vertex tree

\[
I(T_{14,8};x)
=\left((1+2x)^8+x(1+x)^8\right)^{14}
+x(1+2x)^{112},
\]

removing one outer leaf and adding it back decreases \(G_{114}\).
Here

\[
\alpha=126,\qquad L=84,
\]

so the failure is thirty ranks inside the already-decreasing tail.
`verify_galvin_gsb_leaf_delta_scope.py` checks this exactly.

Thus the surviving statement is genuinely (G-LM), not a hidden claim of
global generalized smoothness.
