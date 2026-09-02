# Terminal-isolate burden reduction

Status: **refuted, even for trees.**  The finite star-fork
construction in
`PIRD_AND_TERMINAL_BURDEN_COUNTEREXAMPLE_2026-07-29.md` has an
operative rank with normalized cleared margin
\(-36.9070284163\ldots\).  The identities in this note remain valid,
but the candidate inequality (TI) is false.

## 1. Setup

Let \(A\) be a forest rooted at a vertex \(q\), and add one isolated
vertex \(z\).  Put
\[
 F=A\sqcup K_1,\qquad W=\{q,z\}.
\]
Write
\[
 B(x)=I(F;x),\qquad C(x)=I(A-q;x),
\]
and let \(b_j=[x^j]B(x)\), \(c_j=[x^j]C(x)\).  Thus \(c_j\) counts the
independent \(j\)-sets avoiding the whole terminal set \(W\).

At a prefix rank \(r\), where \(b_r\ge b_{r-1}>0\), define
\[
 u=\frac{r b_r}{b_{r-1}},\qquad
 \rho_j=1-\frac{c_j}{b_j}.
\]
The pointed occupancy burden is
\[
 \mathcal B_r
   =r(u+1)\rho_{r-1}-(r+1)u\rho_r.
\]

## 2. Candidate lemma

For every rooted forest \((A,q)\) and every prefix rank \(r\),
\[
 \boxed{\mathcal B_r\le0.}
\tag{TI}
\]

Equivalently, after clearing positive denominators,
\[
 X_r=
 b_rb_{r-1}+r b_r c_{r-1}-b_{r-1}^2
 -(r+1)b_{r-1}c_r+b_{r-1}c_{r-1}\ge0.
\tag{1}
\]
If \(\Delta=b_r-b_{r-1}\), then
\[
 X_r=
 \Delta(b_{r-1}+r c_{r-1})
 +(r+1)b_{r-1}(c_{r-1}-c_r).
\tag{2}
\]
Consequently, the only nontrivial case is \(c_r>c_{r-1}\).

## 3. Root-deletion form

Let
\[
 C(x)=I(A-q;x),\qquad D(x)=I(A-N[q];x).
\]
Then
\[
 I(A;x)=C(x)+xD(x),\qquad
 B(x)=(1+x)(C(x)+xD(x)),
\]
and \(D\) is the independence complex of an induced subforest of
\(A-q\).

With
\[
 a=c_{r-2},\quad b=c_{r-1},\quad c=c_r,\qquad
 d=[x^{r-3}]D,\quad e=[x^{r-2}]D,\quad f=[x^{r-1}]D,
\]
we have
\[
 b_{r-1}=a+b+d+e,\qquad
 b_r=b+c+e+f,\qquad
 \Delta=c+f-a-d.
\tag{3}
\]
Any proof must use this root-deletion structure, or something at
least as strong.

## 4. Exact evidence

- Every rooted unlabeled tree \(A\) through order \(15\), with one,
  two, or three added isolates: 3,226,060 prefix checks, no failure.
- All rooted abstract simplicial complexes through six labeled
  vertices, after adding one cone vertex: 22,288,503 checks at order
  six alone, no failure.
- The complete 43,595-tree PatternBoost adversarial corpus, with both
  a maximum-degree root and a leaf root: 1,564,674 checks, no failure.
  The minimum exact margin \(-\mathcal B_r\) was \(4\).
- Random forest cores of orders \(3\) through \(200\), with terminal
  isolate counts \(0\) through \(20\): every one of the 46 positive
  burdens occurred when the isolate count was \(0\); none occurred
  when it was at least \(1\).

Machine-readable reports:

- `terminal_isolate_burden_n15_20260728.json`
- `cone_terminal_burden_all_complexes_n5_20260728.json`
- `rooted_complex_n6_terminal_isolate_20260728.json`
- `patternboost_terminal_isolate_burden_full_20260728.json`
- `random_terminal_set_pointed_iso_5k_isolate_sign_20260728.json`

## 5. Necessary scope warnings

The stronger assertion \(\rho_r\ge\rho_{r-1}\) is false, even for a
cone over an abstract simplicial complex.

The burden inequality is also false for arbitrary nested complexes
\(C\subseteq A\) if \(C\) is not required to be the deletion of a
vertex.  For example, take \(A\) to be the disjoint union of a
19-simplex and a 4-simplex, take \(C\) to be the 19-simplex, and set
\(r=2\).  Then
\[
 b_{r-1}=24,\quad b_r=200,\quad c_{r-1}=19,\quad c_r=171,
\]
and the burden is \(1/9>0\).

Therefore neither generic density monotonicity nor bare containment
of complexes can prove (TI).

More strongly, (TI) itself is false for general graphs.  Let \(C\) be
the independence complex of the complete multipartite graph having
one part of size \(6\) and thirteen parts of size \(1\).  Its
independence polynomial is
\[
 C(x)=(1+x)^6+13x.
\]
Add a universal vertex \(q\), and then add an isolated vertex \(z\).
The resulting graph has order \(21\), with terminal set
\(W=\{q,z\}\).  At rank \(r=3\),
\[
 b_2=b_3=35,\qquad c_2=15,\qquad c_3=20,
\]
so
\[
 u=3,\qquad \rho_2=\frac47,\qquad \rho_3=\frac37,
\]
and
\[
 \mathcal B_3
 =3(3+1)\frac47-4\cdot3\frac37
 =\frac{12}{7}>0.
\]
The verifier is
`verify_terminal_isolate_general_graph_counterexample.py`.

This example explains why small-complex enumeration did not settle
the lemma and proves that a successful argument must exploit
forest-specific structure, not merely the deletion/link axioms of an
abstract simplicial complex.

Even assuming that both deletion and link have unimodal face
sequences is insufficient.  Take the complete multipartite graph
whose part sizes are
\[
6,3,3,\underbrace{1,\ldots,1}_{9\ {\rm times}},
\]
then again add a universal root \(q\) and an isolated vertex \(z\).
The deletion sequence is
\[
(1,21,21,22,15,6,1),
\]
which is unimodal, and the link is the one-term sequence \((1)\).
Nevertheless, at \(r=3\),
\[
b_2=b_3=43,\qquad c_2=21,\qquad c_3=22,
\qquad \mathcal B_3=\frac{12}{43}>0.
\]
The same verifier checks both examples.  Therefore an inductive
assumption of unimodality for proper deletions does not prove (TI)
without an additional acyclic branch relation.

There is an even sharper obstruction.  Let the root-deleted graph be
the complete split graph whose independent part has size \(7\) and
whose clique part has size \(13\), add a universal root \(q\), and
then add the isolated terminal \(z\).  This is a chordal graph of
order \(22\).  The deletion and rooted-base sequences are
\[
\begin{aligned}
C&=(1,20,21,35,35,21,7,1),\\
I(A)&=(1,21,21,35,35,21,7,1),
\end{aligned}
\]
and both are unimodal.  At \(r=3\),
\[
b_2=42,\qquad b_3=56,\qquad
c_2=21,\qquad c_3=35,
\]
so \(u=4\), \(\rho_2=1/2\), \(\rho_3=3/8\), and
\[
\mathcal B_3
=3(4+1)\frac12-4\cdot4\frac38
=\frac32>0.
\]
Thus neither chordality nor unimodality of both smaller polynomials
is sufficient.  Any proof of (TI) must use the multiplicative
branch structure forced specifically by a forest.

## 6. Consequence for the Erdős problem

In the terminal-drift decomposition, if a support has at least two
terminal leaf neighbours, then deleting the selected leaf leaves at
least one sibling leaf as an isolated terminal vertex.  Lemma (TI)
would make the pointed burden of every such local downlink
nonpositive.

Thus the multi-leaf-support part of the terminal drift would reduce
to the ordinary unpointed ISO inequality.  All genuinely positive
pointed burden would be confined to supports having exactly one leaf
neighbour—the singleton-root remainder.

This is a substantial structural reduction, but it does not by
itself prove unimodality.  Two ingredients would still be required:

1. a proof of (TI), and
2. control of the singleton-root remainder together with the strong
   reserve/curvature inequality.
