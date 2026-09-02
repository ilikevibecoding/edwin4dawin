# Prefix three-halves curvature and leaf induction for Erdős Problem 993

Date: 2026-07-27

Status: **conjectural sufficient route, not a solution**.  The reductions
and identities below are exact.  The prefix reserve is now proved at
ranks \(3,4,5,6\) for trees, and the leaf-monotonicity mechanism is
proved at ranks \(3,4\).  The rank-uniform leaf and new-boundary
statements remain unproved.

This route was isolated after the stronger prefix \(2/k\) variance target
was falsified by the 25-vertex tree \(T_{6,3}\).  Subsequent work has
proved the required fixed-rank statement through rank \(6\); the
rank-uniform leaf invariant remains open.

## 1. The three-halves reserve

For

\[
P(x)=\sum_{j=0}^{\alpha}p_jx^j,
\]

put

\[
G_k(P)
=kp_k^2+p_{k-1}p_k-(k+1)p_{k-1}p_{k+1}
\]

and

\[
\sigma_k(P)=\frac{G_k(P)}{p_{k-1}p_k}.
\]

Define

\[
\begin{aligned}
Q_k(P)
&=2G_k(P)-3p_{k-1}p_k\\
&=2kp_k^2-p_{k-1}p_k
  -2(k+1)p_{k-1}p_{k+1}.
\end{aligned}
\tag{1}
\]

Then

\[
Q_k(P)\ge0
\quad\Longleftrightarrow\quad
\sigma_k(P)\ge\frac32.
\tag{2}
\]

The proposed prefix statement is

\[
\tag{3/2}
\boxed{\quad
Q_k(I(F))\ge0
\quad(3\le k<L(F)),
\quad}
\]

where

\[
L(F)=\left\lfloor\frac{2\alpha(F)+1}{3}\right\rfloor.
\]

This is stronger than prefix ordered log-concavity, which asks only
\(\sigma_k\ge1\).  Unlike the false \(2/k\) target, the lower bound here
does not approach \(2\) with the rank.

## 2. Exact factorial-curvature form

Let

\[
h_k=k!p_k,\qquad
C_k=h_k^2-h_{k-1}h_{k+1}.
\]

The standard identity

\[
G_k=\frac{kC_k}{(k!)^2}+p_{k-1}p_k
\]

gives

\[
\boxed{\quad
Q_k
=\frac{k}{(k!)^2}
\left(2C_k-h_{k-1}h_k\right).
\quad}
\tag{3}
\]

Thus (3/2) is the rank-uniform quantitative curvature bound

\[
\boxed{\quad
2(h_k^2-h_{k-1}h_{k+1})\ge h_{k-1}h_k.
\quad}
\tag{4}
\]

If

\[
r_k=\frac{h_k}{h_{k-1}}
=k\frac{p_k}{p_{k-1}},
\]

then (4) is equivalently

\[
r_k-r_{k+1}\ge\frac12.
\tag{5}
\]

## 3. Exact residual-forest form

Choose a uniform independent \((k-1)\)-set \(S\).  Let

\[
R_S=F-N[S],\qquad
e=|V(R_S)|,\qquad
q=|E(R_S)|.
\]

The size-biased extension identity gives

\[
\sigma_k
=2+\frac{2\mathbb E q-\operatorname{Var}(e)}
         {\mathbb E e}.
\]

Therefore (3/2) is exactly

\[
\boxed{\quad
\operatorname{Var}(e)
\le2\mathbb E q+\frac12\mathbb E e.
\quad}
\tag{6}
\]

If \(c\) is the number of nonempty components of \(R_S\), acyclicity
gives \(q=e-c\), so (6) becomes

\[
\boxed{\quad
\operatorname{Var}(e)+2\mathbb E c
\le\frac52\mathbb E e.
\quad}
\tag{7}
\]

This is a particularly compact forest Poincaré target.

## 4. Why (3/2) would prove unimodality

Ordered log-concavity at rank \(k\) is equivalent to
\(\sigma_k\ge1\).  Thus (3/2) proves it at every required rank
\(3,\ldots,L-1\).

Rank \(1\) is automatic for every graph.  Rank \(2\) is already proved
for every forest by the exact low-rank curvature certificates.  Hence
(3/2) would give ordered log-concavity throughout the prefix ending at
\(p_L\).  The known decreasing-tail theorem for bipartite graphs takes
over at \(L\), proving unimodality.

## 5. Conditional leaf-induction theorem for trees

Let \(T^+\) be obtained from a tree \(T\) by adjoining a new leaf.  The
following two statements would prove (3/2) for every tree:

\[
\tag{Q-LM}
Q_k(I(T^+))\ge Q_k(I(T))
\quad(3\le k<L(T)),
\]

and

\[
\tag{Q-BR}
L(T^+)=L(T)+1
\quad\Longrightarrow\quad
Q_{L(T)}(I(T^+))\ge0.
\]

To see this, root a tree and repeatedly delete a leaf at distance at
least two from the root until a star remains.  Add the leaves back in
reverse order.  Statement (Q-LM) preserves every existing prefix rank,
while (Q-BR) pays for the only new rank that can appear when the cutoff
increases.

For the star \(K_{1,q}\),

\[
I(K_{1,q};x)=(1+x)^q+x.
\]

At every \(k\ge3\) inside the support, the three relevant coefficients
are consecutive binomial coefficients, so \(\sigma_k=2\) and

\[
Q_k=p_{k-1}p_k>0.
\]

Thus stars are a strict induction base.

This theorem currently proves only the tree statement.  A separate
quantitative product lemma or direct forest induction is needed to
transfer the three-halves reserve to arbitrary disconnected forests.

## 6. Exact leaf increment

Write

\[
I(T;x)=\sum_ja_jx^j,\qquad
I(T-p;x)=\sum_jb_jx^j.
\]

After adjoining a new leaf at \(p\),

\[
a'_j=a_j+b_{j-1}.
\]

Direct expansion of (1) gives

\[
\boxed{
\begin{aligned}
\Delta Q_k={}&
4k a_kb_{k-1}+2k b_{k-1}^2\\
&-a_{k-1}b_{k-1}-b_{k-2}a_k-b_{k-2}b_{k-1}\\
&-2(k+1)\left(
a_{k-1}b_k+b_{k-2}a_{k+1}+b_{k-2}b_k
\right).
\end{aligned}}
\tag{8}
\]

The negative terms show that coefficientwise monotonicity is not
formal; the rooted relation between \(I(T)\) and \(I(T-p)\) is essential.

There is also an exact multiplier form.  Put

\[
m_j=\frac{a'_j}{a_j},\qquad
\rho_k=\frac{h_{k-1}h_{k+1}}{h_k^2},\qquad
r_k=\frac{h_k}{h_{k-1}}.
\]

For

\[
D_k=2C_k-h_{k-1}h_k,
\]

one obtains

\[
\boxed{
\frac{\Delta D_k}{h_k^2}
=2(m_k^2-m_{k-1}m_{k+1})
+2(1-\rho_k)(m_{k-1}m_{k+1}-1)
-\frac{m_{k-1}m_k-1}{r_k}.
}
\tag{9}
\]

Equation (9) is the live rooted-compensation target.

### A stripped local shortcut is false

If one uses only \(D_k\ge0\) to replace

\[
2(1-\rho_k)\ge\frac1{r_k},
\]

then (9) would follow from

\[
2r_k(m_k^2-m_{k-1}m_{k+1})
+m_{k-1}(m_{k+1}-m_k)\ge0.
\tag{10}
\]

Statement (10) is false even for a genuine seven-vertex star.  Take
\(T=K_{1,6}\), attach a new leaf to one old leaf, and use \(k=3\).
The left side of (10) is

\[
-\frac{13}{30},
\]

while the true reserve increment is strongly positive:

\[
Q_3(T)=300,\qquad Q_3(T^+)=570.
\]

Thus a proof of (Q-LM) must retain the *amount* of old curvature reserve,
not merely its sign.  This is the same compensation phenomenon seen in
the earlier leaf-multiplier program, now with a cleaner quantitative
target.

## 7. Proved initial ranks

The three-halves reserve and both leaf obligations are now proved globally
at ranks \(3\) and \(4\) for every tree.  At rank \(3\),

\[
Q_3(I(T))\ge0,\qquad
Q_3(I(T+\text{leaf}))\ge Q_3(I(T)).
\]

The proof uses exact inclusion-exclusion through \(i_4\), a line-graph
lower bound on connected three-edge subsets, and a five-coefficient
Bernstein certificate.  It is recorded in
`RANK3_THREE_HALVES_LEAF_CERTIFICATE_2026-07-27.md` and independently
replayed by `verify_rank3_three_halves_leaf_certificate.py`.

At rank \(4\), exact grouped rooted-moment inequalities and an adaptive
seven-variable Bernstein certificate prove leaf monotonicity for every
tree of order at least \(20\).  An exhaustive exact audit of all 522,959
unlabeled trees through order \(19\), covering 9,594,824 attachment
vertices, supplies the finite part and the new-boundary obligation.
Thus

\[
Q_4(I(T))\ge0\quad(4<L(T))
\]

for every tree.  This theorem is recorded in
`RANK4_THREE_HALVES_LEAF_CERTIFICATE_2026-07-27.md` and replayed by
`verify_rank4_three_halves_leaf_certificate.py` together with
`verify_rank4_three_halves_finite_output.py`.

At rank \(5\), the stronger global theorem

\[
Q_5(I(F))\ge0
\]

holds for every forest of order at least \(10\), and therefore covers
every tree instance in which rank \(5\) lies in the required prefix.
The proof is recorded in
`RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md`.

At rank \(6\),

\[
Q_6(I(T))\ge0
\]

holds for every tree of order at least \(13\).  The finitely many
smaller trees for which rank \(6\) lies in the required prefix also
pass exactly: there is one applicable order-11 tree and ten applicable
order-12 trees, with minimum reserves \(52920\) and \(43624\).
The theorem and audit are recorded in
`RANK6_TREE_THREE_HALVES_THEOREM_2026-07-28.md` and
`RANK6_PROOF_AUDIT_2026-07-28.md`.

Thus the proposed prefix statement is now unconditional at ranks
\(3,4,5,6\) for trees.  These are genuine fixed-rank theorems; the
all-rank leaf invariant remains conjectural.

## 8. Exact evidence as of 2026-07-27

All decisions below used integer cross-products.

1. Every one of the 28,044 distinct forest independence polynomials
   through order \(15\) satisfies (3/2).  The smallest value at
   \(k\ge3\) is

   \[
   \sigma_3=\frac74
   \]

   for

   \[
   (1,7,16,20,15,6,1)
   =I(K_{1,5}\cup K_1;x).
   \]

2. All 43,595 exact 60-vertex PatternBoost tree polynomials pass at
   781,096 applicable ranks.  The smallest observed value is
   approximately \(2.7025133639\).

3. The two-level family

   \[
   I(T_{m,t};x)
   =\bigl((1+x)^t+x\bigr)^m+x(1+x)^{mt},
   \]

   which falsified the stronger \(2/k\) target, has no three-halves
   failure in 44,760 exact boundary-window comparisons with
   \(m\le300,t\le15\).  The smaller structured scans find minimum
   \(1.7719182597\ldots\) at \(T_{2,3}\), rank \(4\).

4. Multiplying the strong order-32 terminal log-concavity witness by
   \((1+x)^s\) for every \(0\le s\le2000\) gives 1,350,675 applicable
   prefix comparisons and no failure.  The smallest value in that scan
   is approximately \(2.0045536517\).

5. A structured evolutionary search seeded by \(T_{2,3}\) tests 55,761
   trees of orders \(9\) through \(120\) without improving its
   \(\sigma_4=1.7719182597\ldots\).

6. Exact prefix leaf monotonicity (Q-LM), with nonnegative new boundary,
   holds in 633,174 attachment/rank comparisons generated from every
   unlabeled tree through old order \(15\).  The smallest observed
   increment is \(102\).

7. Sampling three attachment vertices in each of the 43,595 exact
   60-vertex trees gives 130,785 leaf attachments and 2,354,136 prefix
   comparisons.  None violates (Q-LM) or (Q-BR).

8. A new exact scan of Galvin's subdivided-star family

   \[
   \left((1+2x)^t+x(1+x)^t\right)^m+x(1+2x)^{tm}
   \]

   tests all four attachment orbits for \(m\le120,t\le15\).  It covers
   2,592,012 existing-prefix comparisons and 2,812 newly exposed
   boundaries without a failure.  The formulas are independently
   checked against direct tree dynamic programming for small
   parameters by
   `scan_prefix_three_halves_leaf_true_galvin.py`.

These are falsification tests, not a proof.

## 9. Live task

The immediate proof obligation is to strengthen the rooted state so that
the old normalized reserve in (9) pays every negative multiplier
curvature term and tensorizes across child branches.  The already-proved
fugacity-three rooted induction is a model for this: it succeeded only
after a second root-excluded reserve was carried simultaneously.

If (Q-LM) or (Q-BR) fails, identities (6)--(9) still remain useful for
the weaker exact target \(\sigma_k\ge1\), and the piecewise pendant
curvature cascade remains available.
