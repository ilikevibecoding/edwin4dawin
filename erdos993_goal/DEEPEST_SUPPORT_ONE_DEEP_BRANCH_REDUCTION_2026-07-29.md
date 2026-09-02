# Deepest-support one-deep-branch reduction

Status: the structural reduction and zero-inward-branch base are
proved.  The restricted burden target (5), however, is false for a
finite one-deep star-fork tree; see
`PIRD_AND_TERMINAL_BURDEN_COUNTEREXAMPLE_2026-07-29.md`.  The full
C12 expression remains positive on that construction, so the
structural normal form survives but this scalar endpoint does not.

## 1. Choose the terminal bundle canonically

Root a nontrivial tree \(T\) at a center \(o\).  Choose a leaf
\(\ell\) of maximum depth \(h\), let \(p\) be its parent, and, when
\(h\ge2\), let \(q\) be the parent of \(p\).

Every child of \(p\) is a leaf.  Let \(m\ge1\) be the number of these
leaf children and delete \(p\) together with all \(m\) leaves.  Call
the remaining tree \(R\).  The standard terminal-bundle identity is
\[
 I(T;x)=(1+x)^m I(R;x)+xI(R-q;x).
\tag{1}
\]

The important extra fact is that \((R,q)\) is not an arbitrary rooted
tree.

## 2. Only one branch at \(q\) can be deep

Orient every edge away from the center \(o\).  The vertex \(q\) has
depth \(h-2\).  Hence every child of \(q\), other than the removed
child \(p\), has a descendant subtree of height at most two:

- the child itself lies at depth \(h-1\);
- any child below it lies at depth \(h\);
- there can be no further descendant by maximality of \(h\).

Thus every remaining outward branch at \(q\) is a star rooted at its
center.  The only branch that can have arbitrary depth is the single
inward branch containing \(o\).

This proves:

> **One-deep-branch lemma.**  The terminal bundle in (1) may always be
> selected so that, at the distinguished root \(q\), all but at most
> one incident branch are rooted stars.

The cases \(h\le1\) are stars, and \(h=2\) has no inward branch, so
they are included by the empty-factor convention below.

The standalone verifier
`verify_deepest_support_one_deep_branch.py` checks the structural
claim and all three polynomial identities below for every choice of
center and deepest leaf in every unlabeled tree through order \(15\).
It covers 53,784 configurations and 161,034 exact polynomial
comparisons, with zero failures; the largest observed outward height
is exactly two.  Its report is
`deepest_support_one_deep_branch_n15_20260729.json`.

## 3. Exact polynomial factorization

Let \(B\) be the inward branch rooted at the neighbour \(t\) of \(q\)
on the path to \(o\), and put
\[
 P(x)=I(B;x),\qquad E(x)=I(B-t;x).
\]
If there is no inward branch, put \(P=E=1\).

Suppose the remaining outward star branches have respectively
\(a_1,\ldots,a_s\ge0\) leaves.  The value \(a_i=0\) represents a
direct leaf child of \(q\).  Define
\[
 S_a(x)=(1+x)^a+x,\qquad
 K(x)=\prod_{i=1}^s S_{a_i}(x),\qquad
 L(x)=(1+x)^{a_1+\cdots+a_s}.
\]
Deleting \(q\) separates all branches, while deleting \(N[q]\)
also deletes every outward star center.  Therefore
\[
\boxed{
 C(x):=I(R-q;x)=P(x)K(x),
 \qquad
 D(x):=I(R-N[q];x)=E(x)L(x),
 }
\tag{2}
\]
and
\[
\boxed{
 I(R;x)=P(x)K(x)+xE(x)L(x).
 }
\tag{3}
\]

Consequently the one-sibling terminal-isolate configuration is
\[
\boxed{
 B_{\rm term}(x)
=(1+x)\{P(x)K(x)+xE(x)L(x)\},
\qquad
 C_{\rm avoid}(x)=P(x)K(x).
}
\tag{4}
\]

## 4. Restricted burden target

Write
\[
 b_j=[x^j]B_{\rm term}(x),\qquad
 c_j=[x^j]C_{\rm avoid}(x),
\]
and suppose \(b_r\ge b_{r-1}>0\).  The multi-leaf part of terminal
drift would follow from
\[
\boxed{
b_rb_{r-1}+r b_r c_{r-1}-b_{r-1}^2
-(r+1)b_{r-1}c_r+b_{r-1}c_{r-1}\ge0
}
\tag{5}
\]
only for pairs having the special form (4).

This target is strictly weaker than the arbitrary-rooted-tree
terminal-isolate lemma.  It has three advantages:

1. there is only one arbitrary rooted factor pair \((P,E)\);
2. every other factor is explicit, either
   \(S_a=(1+x)^a+x\) or \((1+x)^a\);
3. the false general-graph examples based on unions of several
   simplices cannot have the multiplicative form (4).

## 5. Proof program

The immediate algebraic target is a one-factor closure theorem:

> if the inward rooted pair \((P,E)\) has the inductive prefix
> invariants, then multiplying it by the explicit star block
> \((K,L)\) and applying (4) preserves (5).

This avoids the previously open closure problem for products of
several arbitrary rooted factors.  Star factors have explicit
binomial coefficients and their Toeplitz kernels are log-concave;
the remaining issue is the single cross term between \((P,E)\) and
\((K,L)\).

Even a proof only under the exact room condition
\[
(\alpha-r)(n-r)>(r+1)(r+2)
\]
would be sufficient in the current all-rank reduction.
