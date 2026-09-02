# Leaf-curvature induction reduction for Erdős Problem 993

Date: 2026-07-26

Status: the reduction theorem below is proved.  Its two local hypotheses
(LM) and (BR) remain conjectural.  This note is not a proof of Erdős
Problem 993.

## Factorial curvature

For

\[
P(x)=\sum_{k=0}^{\alpha}p_kx^k
\]

put

\[
h_k(P)=k!p_k,\qquad
C_k(P)=h_k(P)^2-h_{k-1}(P)h_{k+1}(P).
\]

Thus \(C_k(P)\ge0\) is exactly

\[
k p_k^2\ge(k+1)p_{k-1}p_{k+1}.
\]

For a forest \(T\), define

\[
L(T)=\left\lfloor\frac{2\alpha(T)+1}{3}\right\rfloor.
\]

The prefix ordered-log-concavity route asks for

\[
C_k(I(T))\ge0\qquad(1\le k<L(T)).
\tag{1}
\]

Together with the known decreasing-tail theorem for bipartite graphs,
(1) proves unimodality.

## The exact leaf increment

Let \(T\) be obtained from a tree \(T_0\) by adding a new leaf \(v\)
adjacent to \(p\).  Write

\[
P=I(T_0;x),\qquad B=I(T_0-p;x).
\]

The deletion recurrence is

\[
I(T;x)=P+xB.
\tag{2}
\]

If \(h=F(P)\), \(b=F(B)\), and

\[
(\sigma b)_k=k b_{k-1}=F(xB)_k,
\]

then polarization of \(C_k\) gives the exact identity

\[
\tag{3}
C_k(P+xB)-C_k(P)
=X(h,\sigma b;k,k)+C_k(xB),
\]

where

\[
X(a,b;k,k)
=2a_kb_k-a_{k+1}b_{k-1}-b_{k+1}a_{k-1}.
\]

Equivalently, the right side of (3) is

\[
2h_ks_k+s_k^2
-h_{k+1}s_{k-1}-s_{k+1}h_{k-1}-s_{k-1}s_{k+1},
\quad s=\sigma b.
\tag{4}
\]

## Two local proof obligations

Consider these statements.

**(LM), prefix leaf monotonicity.** For every leaf extension
\(T_0\subset T\),

\[
C_k(I(T))\ge C_k(I(T_0))
\qquad(1\le k<L(T)).
\tag{LM}
\]

**(BR), new-boundary reserve.** If

\[
L(T)=L(T_0)+1,
\]

then

\[
C_{L(T_0)}(I(T))\ge0.
\tag{BR}
\]

The point of (BR) is that the newly exposed rank was not covered by the
induction hypothesis for \(T_0\), so monotonicity alone does not control
its starting value.

## Conditional reduction theorem

> If (LM) and (BR) hold for all leaf extensions of trees, then every
> tree satisfies prefix ordered log-concavity (1), and hence every tree
> has a unimodal independence polynomial.

### Proof

Root a tree \(T\) at any vertex \(r\).  If \(T\) is not a star centered at
\(r\), one of the components of \(T-r\) has more than one vertex.  That
component has a leaf different from its distinguished vertex adjacent to
\(r\).  Hence \(T\) has a leaf \(v\) at distance at least two from \(r\).
Delete \(v\) and repeat.  This eventually reduces \(T\) to a star centered
at \(r\).

The star \(K_{1,q}\) has

\[
I(K_{1,q};x)=(1+x)^q+x.
\]

Its factorial coefficients are

\[
h_0=1,\quad h_1=q+1,\quad
h_k=q(q-1)\cdots(q-k+1)\quad(k\ge2).
\]

Consequently

\[
C_1=3q+1,\qquad C_2=2q(q-1),
\]

and, for \(3\le k\le q\),

\[
C_k=\frac{h_k^2}{q-k+1}.
\]

All remaining curvatures are zero, so the base is nonnegative at every
rank.

Now add the deleted leaves back one at a time.  Adding one vertex raises
the independence number by either zero or one, so its cutoff \(L\) rises
by either zero or one.  If a rank \(k\) was already below the old cutoff,
the induction hypothesis and (LM) make its new curvature nonnegative.  If
the cutoff has just risen, (BR) handles the sole newly exposed rank.
Therefore (1) holds for \(T\), proving the conditional theorem.
\(\square\)

If (LM) and (BR) are established for forest leaf extensions as well, the
same induction works component by component.  Its base is a disjoint union
of stars, whose full factorial coefficient sequence is log-concave by the
standard product closure.  The present finite scan certifies the tree
version; no forest closure is being silently assumed here.

## Proven initial ranks

Both local obligations are unconditional through rank 4.

Let \(T_0\) be a tree on \(n\) vertices, let \(p\) have degree \(d\), and
put

\[
S=\sum_{w\in V(T_0)}\binom{d(w)}2.
\]

The number \(S\) counts adjacent pairs among the \(n-1\) edges, so

\[
S\le\binom{n-1}{2},\qquad d\le n-1.
\tag{5}
\]

For an \(n\)-vertex tree, elementary inclusion-exclusion gives

\[
\begin{aligned}
i_2&=\binom n2-(n-1),\\
i_3&=\binom n3-(n-1)(n-2)+S.
\end{aligned}
\]

Consequently

\[
C_1=3n-2
\]

and

\[
\tag{6}
C_2=3n^3-7n^2+4-6nS
\ge2(n-1)(n-2)\ge0.
\]

Adding a leaf at \(p\) changes \(n\) to \(n+1\) and \(S\) to \(S+d\).
Therefore

\[
\Delta C_1=3
\]

and

\[
\begin{aligned}
\Delta C_2
&=9n^2-5n-4-6S-6d(n+1)\\
&\ge4(n-1)\ge0
\end{aligned}
\tag{7}
\]

by (5).  Hence (LM) holds globally at ranks 1 and 2, and (6) supplies
(BR) whenever the new boundary is one of those ranks.

`verify_rank2_leaf_curvature_certificate.py` checks (6)--(7)
symbolically.

The same two claims are proved at rank 3 in
`RANK3_LEAF_CURVATURE_CERTIFICATE_2026-07-26.md`, using the line graph of
the old tree and an exact Bernstein-basis certificate.

Rank 4 is proved globally in
`RANK4_GLOBAL_LEAF_CURVATURE_CERTIFICATE_2026-07-26.md`.  The proof
combines:

- exhaustive global leaf monotonicity through old-tree order 19;
- an exact moment-and-connected-shape reduction for every order at
  least 20;
- four strictly positive multivariate Bernstein certificates;
- a symbolic proof for the subdivided-double-star family containing the
  exact order-14 through order-19 extremizers.

Consequently \(C_4\) is nonnegative for every tree and never decreases
under a leaf attachment.  Both local proof obligations are therefore
unconditional through rank 4.

## Exact finite evidence

`scan_acwf_leaf_monotonicity.py` simultaneously checks the stronger rooted
reserve and the direct curvature statement above.  Through every planted
orientation of every unlabeled tree of order at most 14 it checked:

- 5,445 unlabeled trees;
- 205,536 planted states;
- 725,850 eligible leaf deletions;
- 3,779,999 prefix curvature changes, with no negative change;
- 346,558 cases where the cutoff rose by one, with no negative new
  boundary curvature.

The complete exact output is
`acwf_total_leaf_boundary_diagonal_n14_final_20260726.json`.

Two independent random Prüfer-code scans added 20,000 trees of orders
15--70 and 323,092 exact prefix curvature comparisons, again with no
failure:

- `random_acwf_leaf_monotonicity_10k_n15-70_20260726.json`;
- `random_acwf_total_leaf_monotonicity_10k_seed20260726.json`.

These computations are falsification evidence, not proofs of (LM) or (BR).

## Necessary cutoff: the 26-vertex witness

The cutoff in (LM) is substantive.  The standard tree \(T_{3,4,4}\) has
26 vertices,

\[
\alpha(T_{3,4,4})=14,\qquad L(T_{3,4,4})=9,
\]

and independence sequence

\[
\begin{aligned}
(1,26,300,2040,9142,28551,63933,103736,121376,\\
\phantom{(}100144,55499,18683,2979,51,1).
\end{aligned}
\]

Its factorial curvature is negative at rank 13.  Removing any one of its
11 outer leaves and then adding it back gives a negative curvature change
at rank 13, but none below \(L=9\).  Thus global leaf-curvature
monotonicity is false, exactly as required by the known failures of global
log-concavity; the surviving statement is genuinely prefix-specific.

`verify_t344_leaf_curvature_scope.py` reconstructs this tree and checks
these assertions with exact integers.
