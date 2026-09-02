# Rank-6 rooted-cross progress

Date: 2026-07-27

Status: **substantial reduction, not yet an all-orders theorem**.

## 1. Target

For a rooted tree \((T,p)\), put

\[
d=i_4(T),\quad e=i_5(T),\quad f=i_6(T),\qquad
h=i_4(T-p),\quad k=i_5(T-p).
\]

The rank-6 payment proof needs

\[
C_6(T,p):=d(e^2-df)-2e(eh-dk)\ge0.
\]

The proved rank-5 forest reserve shows that the stronger inequality

\[
S_6(T,p):=d(2e+d)-24(eh-dk)\ge0
\]
implies \(C_6(T,p)\ge0\).

## 2. Exact leaf-closure identity

`verify_rank6_cross_closure_identity.py` proves an exact normalized
decomposition

\[
\frac{C_6(A+U)}{x^2}
=(1+s)(1+cs)(g+csG)+s(c-1)K.
\]

Here \(g,G\) are the two individual rooted-cross reserves and \(K\) is
one mixed two-deletion compatibility term.  The mixed term can be
negative; exact scans show that the two reserves compensate for it.
Thus the correct induction invariant must retain all three terms.

## 3. Exact \(i_5\) motif formula

`verify_tree_independent5_motif_formula.py` proves, by
inclusion-exclusion and independent motif counts, that for every tree
of order \(n\), with \(m=n-1\),

\[
\begin{aligned}
i_5(T)={}&
\binom n5-m\binom{n-2}3
+S\binom{n-3}2
+\bigl(\binom m2-S\bigr)(n-4)\\
&-R(n-4)-U+V,
\end{aligned}
\]

where \(S\) is the number of wedges, \(R\) the number of connected
three-edge subtrees, \(U\) the number of \(P_3\sqcup K_2\) edge
subsets, and \(V\) the number of connected four-edge subtrees.

The verifier checks all 987 unlabeled trees through order 12.  The
formula itself is an exact inclusion-exclusion identity for every
tree.

`explore_rank6_root_ratio_moment_certificate.py` converts this formula
and \(S_6(T,p)\) into grouped excess-degree moments.  The remaining
sharp coupling is the rooted connected-four-subtree loss
\(V(T)-V(T-p)\).

## 4. Exact order-18 extremizer

`scan_rank6_strong_leaf_roots.py` exhausts the 123,867 unlabeled
18-vertex trees in four reproducible chunks.  Across 1,077,063 leaf
roots,

\[
\min S_6(T,p)=31\,256.
\]

The unique recorded minimum has graph6 string

```
QpCGGCC@?GG??@??_?G?@??C??G
```

and is a spider with arm lengths

\[
(1,1,1,2,12).
\]

The minimum among trees with at least two branch vertices is 174,192,
so the sharp boundary is genuinely the one-branch-vertex family.

## 5. Spider evidence and exact extremal families

`scan_rank6_spiders.py` enumerates all integer arm partitions.  Through
order 30:

- every rooted spider has positive \(S_6\) from order 18 onward;
- every tested one-vertex arm extension has positive increment;
- the order-18 minimum is \((1,1,1,2,12)\);
- from order 19 onward the minimum is
  \((1,1,1,1,n-5)\).

These are finite observations.  Two infinite family statements are
proved exactly by `verify_rank6_extremal_spider_families.py`:

\[
S_6((1,1,1,1,L),p)>0\qquad(L\ge13),
\]

\[
S_6((1,1,1,2,L),p)>0\qquad(L\ge12),
\]

when \(p\) is a unit-arm leaf.  After shifting \(L=13+t\) and
\(L=12+t\), respectively, every coefficient of the two numerator
polynomials is positive.  The first family's long-arm increment also
has all-positive shifted coefficients and begins at

\[
S_6(L+1)-S_6(L)=1\,031\,589\quad(L=13).
\]

## 6. Remaining rank-6 task

One of the following would complete the rooted rank-6 theorem:

1. prove that the spider arm-extension increment is nonnegative from
   order 18 and that a branch-reducing tree transformation cannot
   increase the deficit; or
2. finish the grouped-moment certificate by coupling
   \(V(T)-V(T-p)\) to the weighted edge-correlation moments; or
3. prove directly that the reserve combination in the leaf-closure
   identity is nonnegative.

Until one of these is certified, the rank-6 theorem and Erdős Problem
993 remain open.
