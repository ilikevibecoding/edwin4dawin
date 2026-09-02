# The bipartition-oriented matching-block model

Date: 2026-07-24

Status: **rigorous normal form, not a proof of unimodality.**

This is a refinement of `MATCHING_BLOCK_REDUCTION_2026-07-24.md`.
The earlier cover/complement coloring makes the pendant unmatched vertices
especially simple.  Coloring instead by the two sides of the forest's
bipartition makes every core constraint an oriented implication.  The two
normal forms are complementary.

## 1. Construction

Let \(F\) be a forest with bipartition \(X\sqcup Y\).  Choose, as in the
matching-block reduction, a maximum matching \(Q\) whose unmatched
nonisolated vertices are leaves.  Contract every edge of \(Q\).  A matched
block \(v\) contains one \(X\)-vertex and one \(Y\)-vertex, so its three
states are

\[
0,\qquad X,\qquad Y.
\]

An unmatched vertex is a singleton block with its one bipartition color.
The contracted graph \(H\) is a forest on

\[
|V(F)|-|Q|=\alpha(F)
\]

blocks.

Every nonmatching edge of \(F\) joins an \(X\)-vertex to a \(Y\)-vertex.
Orient its contracted edge in \(H\) from the block containing its
\(X\)-endpoint to the block containing its \(Y\)-endpoint.  The edge then
forbids exactly the local state pair

\[
\boxed{(X\text{ at the tail},\,Y\text{ at the head}).}
\tag{O}
\]

Thus independent sets of \(F\) are in rank-preserving bijection with
partial \(X/Y\)-colorings of an oriented forest in which every directed
edge has the same forbidden pattern (O).  This is more restrictive than
an arbitrary two-color constraint forest.

## 2. Pendant defects

All unmatched nonisolated blocks are leaves of \(H\).  Remove them and call
the remaining forest of two-color blocks \(K\).  For a core block \(v\),
write

- \(p_v\) for the number of unmatched \(Y\)-leaves adjacent to the
  \(X\)-endpoint of \(v\);
- \(q_v\) for the number of unmatched \(X\)-leaves adjacent to the
  \(Y\)-endpoint of \(v\).

If \(v\) is colored \(X\), its \(p_v\) pendant leaves are forced empty.  If
\(v\) is colored \(Y\), its \(q_v\) pendant leaves are forced empty.  The
other pendant leaves remain optional.  If \(u=|V(F)|-2|Q|\) is the total
number of singleton blocks (including isolated vertices), then

\[
\boxed{
I(F;x)=
\sum_{\sigma\ {\rm valid\ on}\ K}
x^{|\sigma|}
(1+x)^{
u-\sum_{\sigma(v)=X}p_v-\sum_{\sigma(v)=Y}q_v
}.
}
\tag{OB}
\]

Here validity means precisely that no oriented core edge has state
\((X,Y)\) from tail to head.  Formula (OB) follows by independently choosing
every pendant singleton not forced empty.

For a perfect-matching forest, \(u=0\), so its independence polynomial is
the rank enumerator of partial \(X/Y\)-colorings of an oriented forest with
the single forbidden pattern (O).

## 3. Equivalent induced-poset description

Fix a support \(S\subseteq V(K)\).  The orientation on the induced forest
\(K[S]\) defines an acyclic system of binary inequalities: identify
\(X=1\) and \(Y=0\), so an oriented edge \(a\to b\) forbids
\((1,0)\) and imposes \(a\le b\).  Consequently, the coefficient of
\(x^{|S|}\) before pendant weights is the number of isotone binary
labelings of this induced oriented forest.

The word *induced* is essential.  If an intermediate block is absent, the
two ends of a directed path acquire no transitive constraint.  The model is
therefore a sum of order-ideal counts over all induced subforests, not the
order polynomial of one fixed transitive closure.

## 4. Why this refinement matters

The cover/complement form permits three apparent edge-label types
\((C,C),(C,M),(M,C)\).  Formula (O) shows that those labels are not
independent: globally, every original edge always joins opposite sides of
one fixed bipartition.  A rooted or transfer-matrix proof may therefore use
one common directed forbidden pattern rather than an arbitrary binary CSP.

Any attempted induction that discards this orientation consistency is
strictly weaker than the forest problem and admits irrelevant
counterexamples.

## 5. Perfect matching does not imply log-concavity

The orientation structure does not make the polynomial log-concave.  The
independent verifier

`C:\Users\chris\erdos993_goal\verify_perfect_matching_lc_failure.py`

constructs a 102-vertex tree with a perfect matching and exact independence
degree \(51\).  Its final three coefficients are

\[
\begin{aligned}
a_{49}&=154683872968704,\\
a_{50}&=111690907648,\\
a_{51}&=82051072,
\end{aligned}
\]

and

\[
a_{49}a_{51}-a_{50}^{\,2}
=217118746959920758784>0.
\]

Hence log-concavity fails at index \(50\).  Nevertheless its first descent
is at index \(32\), all later coefficients decrease, and the live prefix
two-step extension inequality holds at every required rank.  Perfect
matching is therefore a useful structural regime, but not a route back to
the already-false log-concavity strengthening.

## 6. A genuine TP2 spin representation—and its exact limitation

Order the three block states as

\[
Y<0<X.
\]

For an oriented core edge \(u\to v\), the compatibility matrix (rows at
\(u\), columns at \(v\)) is

\[
K=
\begin{pmatrix}
1&1&1\\
1&1&1\\
0&1&1
\end{pmatrix}.
\]

Every \(2\times2\) minor of \(K\) is nonnegative.  Thus \(K\) is TP2, and
so is its transpose.  Products of the edge factors and arbitrary positive
one-vertex weights are log-supermodular on the product order.  Restricting a
singleton block to \(\{0,X\}\) or \(\{Y,0\}\) preserves this property.
Consequently the matching-block model of every forest is an attractive
three-state/MTP2 model, with independent-set size equal to the number of
nonzero spins.

This structure is rigorous but does **not** immediately imply the desired
rank inequalities, because the statistic

\[
\mathbf 1_{\{\text{state}\ne0\}}
\]

is not monotone in the order \(Y<0<X\).

A tempting stronger consequence is false.  Let \(c_{p,q}\) count independent
sets using \(p\) vertices from bipartition side \(X\) and \(q\) from side
\(Y\).  The reverse-TP2 inequalities

\[
c_{p,q}c_{p+1,q+1}
\le c_{p+1,q}c_{p,q+1}
\]

already fail globally for an eight-vertex tree.  They fail strictly before
the tail cutoff for the twelve-vertex tree

\[
\begin{aligned}
E=\{&(0,4),(0,11),(1,0),(1,2),(2,3),\\
    &(4,5),(4,6),(4,7),(4,8),(4,9),(4,10)\}.
\end{aligned}
\]

Here \(\alpha=9\), \(L=6\), and the minor at \((p,q)=(1,2)\), whose top
total rank is \(5<L\), is

\[
285>270.
\]

Therefore MTP2 may still support correlation or conditional-monotonicity
arguments on the full block-state space, but it cannot be collapsed to a
two-dimensional RR2 coefficient array by a generic aggregation theorem.

The exact bivariate DP and the small-tree falsification scan are

- `verify_bipartition_rr2.py`;
- `bipartition_rr2_stress.py`.
