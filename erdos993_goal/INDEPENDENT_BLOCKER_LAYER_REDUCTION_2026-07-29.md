# Independent-blocker layer reduction

Status: the exact structural identities are proved, but the
restricted coefficient target (6) is false even with the full
acyclic tree incidence structure.  See
`PIRD_AND_TERMINAL_BURDEN_COUNTEREXAMPLE_2026-07-29.md`.  The
compatible-blocker counterexamples below remain useful weaker
controls, but tree structure does not rescue (6).

## 1. Two layers below a rooted tree vertex

Let \(A\) be a tree rooted at \(q\), and write its neighbours as
\(v_1,\ldots,v_d\).  For each \(i\), let
\[
 U_i=N_A(v_i)\setminus\{q\},\qquad
 U=\bigcup_{i=1}^d U_i.
\]
Because \(A\) is a tree:

1. the sets \(U_i\) are pairwise disjoint;
2. \(U\) is an independent set;
3. every vertex of \(A-N_A[q]-U\) is joined to at most one vertex
   of \(U\);
4. the components below different vertices of \(U\) are disjoint.

The second point is stronger than merely requiring each \(U_i\) to
be a face of the residual independence complex: their entire union
is one face.

Put
\[
 O=A-N_A[q]-U.
\]
For an independent set \(X\) of \(O\), define
\[
 m_i(X)=
 \bigl|\{u\in U_i:N_A(u)\cap X=\varnothing\}\bigr|.
\tag{1}
\]
These are precisely the distance-two vertices in branch \(i\) that
remain available after \(X\) has been selected.

## 2. Exact star-mixture identities

Let
\[
 C(x)=I(A-q;x),\qquad D(x)=I(A-N_A[q];x).
\]
Fix \(X\in\operatorname{Ind}(O)\).  If \(v_i\) is omitted, any subset
of the \(m_i(X)\) available vertices of \(U_i\) may be selected.  If
\(v_i\) is selected, none of them may be selected.  Hence branch
\(i\) contributes
\[
 (1+x)^{m_i(X)}+x.
\]
If \(q\) and all \(v_i\) are deleted, only the first alternative
remains.  Summing over \(X\) proves
\[
\boxed{
 C(x)=
 \sum_{X\in\operatorname{Ind}(O)}
 x^{|X|}
 \prod_{i=1}^d\bigl((1+x)^{m_i(X)}+x\bigr),
}
\tag{2}
\]
and
\[
\boxed{
 D(x)=
 \sum_{X\in\operatorname{Ind}(O)}
 x^{|X|}
 (1+x)^{m_1(X)+\cdots+m_d(X)}.
}
\tag{3}
\]
Thus
\[
 I(A;x)=C(x)+xD(x).
\tag{4}
\]
After adding the terminal isolate \(z\), the polynomial and the
terminal-avoiding polynomial are
\[
 B(x)=(1+x)\{C(x)+xD(x)\},
 \qquad C_{\rm avoid}(x)=C(x).
\tag{5}
\]

Equations (2)--(5) replace an arbitrary deletion/link pair by a
downward-compatible mixture of explicit star factors.

The standalone verifier `verify_independent_blocker_layer.py`
reconstructs (2) and (3) directly and checks (4) independently for
every root of every unlabeled tree through order \(13\).  Its report
`independent_blocker_layer_n13_20260729.json` covers 2,288 trees,
27,919 rooted configurations, 2,050,438 lower-layer independent-set
summands, and 83,757 exact polynomial comparisons, with no failure.

### Equivalent recursive product form

The component ownership in a tree gives a second, sharper form.
For \(u\in U_i\), let \(T_u\) be the component below \(u\), rooted at
\(u\), and put
\[
P_u(x)=I(T_u;x),\qquad E_u(x)=I(T_u-u;x).
\]
Deleting \(q\) leaves the branches rooted at \(v_i\).  In branch
\(i\), either \(v_i\) is omitted and every \(T_u\) remains, or \(v_i\)
is selected and every \(u\in U_i\) is deleted.  Therefore
\[
\boxed{
C(x)=
\prod_{i=1}^d
\left\{
\prod_{u\in U_i}P_u(x)
+x\prod_{u\in U_i}E_u(x)
\right\},
}
\tag{2a}
\]
while deleting \(N[q]\) leaves every \(T_u\):
\[
\boxed{
D(x)=\prod_{i=1}^d\prod_{u\in U_i}P_u(x).
}
\tag{3a}
\]
Empty products equal \(1\).

The pair is recursively closed.  If the children of \(u\) index
rooted subtrees \(T_w\), then
\[
P_u=
\prod_w P_w+x\prod_w E_w,
\qquad
E_u=\prod_w P_w.
\tag{3b}
\]
Thus (2a)--(3b), rather than the weaker colored-face axioms, encode
exactly the acyclic structure that survives all counterexamples
below.

## 3. Restricted coefficient target

Write
\[
 b_j=[x^j]B(x),\qquad c_j=[x^j]C(x),
\]
and suppose \(b_r\ge b_{r-1}>0\).  The terminal-isolate burden
inequality is
\[
\boxed{
 b_rb_{r-1}+r b_r c_{r-1}-b_{r-1}^2
 -(r+1)b_{r-1}c_r+b_{r-1}c_{r-1}\ge0.
}
\tag{6}
\]

The new proof target is (6) for the star-mixture pair (2)--(3).  A
still broader test class allows an arbitrary graph on \(O\) and
arbitrary edges from \(O\) to the independent set \(U\), while
retaining the disjoint color classes \(U_i\).  This broader class
contains the two-layer local structure of every tree, but drops the
tree restrictions in points 3 and 4 above.

## 4. Exact computational boundary

The following strictly weaker statements are false:

- disjoint blocker colors without compatibility;
- arbitrary local-type mixtures;
- even one blocker class if its vertices do not form a face.

The exact nonforest counterexamples are recorded in
`TERMINAL_ISOLATE_BURDEN_REDUCTION_2026-07-28.md`.

By contrast:

- every simplicial complex on five residual vertices, with every
  disjoint blocker coloring through degree four, passed
  110,608,663 exact prefix checks;
- 5,000 random complexes in which each blocker class was forced to
  be a face passed 32,055 exact checks;
- 5,000 random complexes in which the union of all colored vertices
  was forced to be a face passed 32,596 exact checks;
- 5,000 random arbitrary lower graphs with an independent blocker
  layer passed 34,274 exact checks.
- every simplicial complex on six residual vertices, every possible
  size of a fixed blocker face, and all 29 integer-partition shapes
  of that face into blocker classes passed 121,034,491 exact prefix
  checks across 37,060,037 configurations.  The minimum cleared
  margin was \(4\).

The corresponding reports are:

- `disjoint_blocker_ti_n5_d4_20260729.json`;
- `random_forced_color_faces_5k_20260729.json`;
- `random_forced_colored_union_face_5k_20260729.json`;
- `random_independent_blocker_graph_5k_20260729.json`.
- `colored_union_face_n6_all_partitions_20260729.json`.

All computations use integer coefficients and exact rational
burdens.  These results are evidence, not a proof.

## 5. Immediate proof route

For a fixed lower independent set \(X\), (2)--(3) are products of
the explicit pair
\[
 K_{\boldsymbol m}(x)
 =\prod_i\bigl((1+x)^{m_i}+x\bigr),
 \qquad
 L_{\boldsymbol m}(x)
 =(1+x)^{\sum_i m_i}.
\tag{7}
\]
The remaining issue is nonlinear closure of (6) under the mixture
over \(X\).  The mixture is not arbitrary:

- its index sets form an independence complex;
- \(m_i(Y)\le m_i(X)\) whenever \(X\subseteq Y\);
- in a tree, each lower component is assigned to one particular
  blocker vertex.

The exhaustive six-vertex result initially suggested the following
stronger target:

> **Compatible-blocker lemma.**  Let \(\Delta\) be any simplicial
> complex and let \(U_1,\ldots,U_d\) be disjoint vertex sets whose
> union is a face of \(\Delta\).  Define \(C,D,B\) by the colored-face
> version of (2)--(5).  Then (6) holds at every prefix rank.

It is false.  Let \(d=1\), let the blocker face \(U_1\) have eight
vertices, and let \(\Delta\) be the union of the simplex \(2^{U_1}\)
and thirty isolated outside vertices.  Then
\[
\begin{aligned}
D(x)&=(1+x)^8+30x,\\
C(x)&=(1+x)^8+x+30x(1+x).
\end{aligned}
\]
With \(B=(1+x)(C+xD)\), at rank \(r=4\),
\[
(b_3,b_4,c_3,c_4)=(180,210,56,70),
\]
so
\[
u=\frac{14}{3},\qquad
\rho_3=\frac{31}{45},\qquad
\rho_4=\frac23,\qquad
\mathcal B_4=\frac{8}{135}>0.
\]
The equivalent cleared margin is \(-480\).
`verify_compatible_blocker_face_counterexample.py` independently
checks every coefficient and writes
`compatible_blocker_face_counterexample_20260729.json`.

This is not only a low-rank defect.  At the first rank needed after
the completed fixed-rank theorem, take a blocker simplex of size
\(12\) and \(335\) disjoint outside simplices of size \(3\).  Then
\[
\begin{aligned}
D(x)&=(1+x)^{12}
 +335\bigl((1+x)^3-1\bigr),\\
C(x)&=(1+x)^{12}+x
 +335(1+x)\bigl((1+x)^3-1\bigr).
\end{aligned}
\]
At \(r=6\),
\[
(b_5,b_6,c_5,c_6)=(2672,3003,792,924),
\]
the cleared margin is \(-11584\), and
\[
\mathcal B_6=\frac{543}{55778}>0.
\]
The exact verifier
`verify_compatible_blocker_rank6_counterexample.py` writes
`compatible_blocker_rank6_counterexample_20260729.json`.  Therefore
the rank cutoff \(r\ge6\) does not rescue the compatible-blocker
lemma.

Every outside vertex in this example conflicts with all eight
blockers.  This is impossible in a tree: by points 3 and 4 of
Section 1, a lower vertex is adjacent to at most one blocker and
every lower component belongs to one blocker subtree.

The first of those two restrictions is still insufficient without
acyclicity.  Let \(E\) be the independence polynomial of the complete
multipartite graph with parts
\[
7,\underbrace{1,\ldots,1}_{21\text{ times}},
\qquad
E(x)=(1+x)^7+21x.
\]
Add one blocker \(u\) adjacent to every vertex of that graph.  Each
lower vertex is adjacent to exactly one blocker.  With the selector,
root, and terminal isolate added as above,
\[
D=E+x,\qquad C=(1+x)E+x,\qquad B=(1+x)(C+xD).
\]
At rank \(4\),
\[
(b_3,b_4,c_3,c_4)=(155,182,56,70),
\qquad
\mathcal B_4=\frac{2468}{24025}>0,
\]
and the cleared margin is \(-617\).
`verify_sparse_incidence_graph_counterexample.py` checks this
32-vertex graph exactly and writes
`sparse_incidence_graph_counterexample_20260729.json`.

Again the defect persists at the first unsettled rank.  Let the lower
graph be complete multipartite with one part of size \(11\) and
\(217\) parts of size \(3\), and add a single universal blocker.
Every lower vertex still meets exactly one blocker.  At \(r=6\),
\[
(b_5,b_6,c_5,c_6)=(2216,2508,792,924),
\]
the cleared margin is \(-12928\), and
\[
\mathcal B_6=\frac{1212}{76729}>0.
\]
The 666-vertex graph is checked by
`verify_sparse_incidence_rank6_counterexample.py`, with report
`sparse_incidence_rank6_counterexample_20260729.json`.

Thus the proof cannot stop at the unit-loss condition
\(m(X)\ge |U|-|X|\).  It must use that the lower graph and its
components are forests.

The proof target must therefore use the full sparse, acyclic
component structure.  A one-component induction should show that
replacing a blocker leaf by a rooted subtree preserves (6), using the change
\(m_i\mapsto m_i-1\) only on independent sets meeting the child set
of that single blocker.  This is the current exact closure problem.
