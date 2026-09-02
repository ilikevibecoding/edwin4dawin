# Edge-interface subdivision reduction for Erdős Problem 993

Date: 2026-07-26

Status: the two identities below are proved.  The proposed unimodality and
mode-alignment properties of the interface graphs remain proof obligations;
therefore this note is not a proof of Erdős 993.

## Definition

Let \(T\) be a tree and let \(e=uv\) be an edge.  Put

\[
U=N_T(u)\setminus\{v\},\qquad
V=N_T(v)\setminus\{u\}.
\]

Define the **edge-interface graph** \(H_e\) by deleting \(u,v\) from \(T\)
and adding every edge between \(U\) and \(V\):

\[
H_e = T-\{u,v\} + K_{U,V}.
\]

Let \(T/e\) denote the tree obtained by contracting \(e\), and let \(T_e\)
denote the tree obtained by subdividing \(e\) once.

## Exact identities

For every edge of every tree,

\[
\tag{1} I(T;x)=I(T/e;x)+xI(H_e;x)
\]

and

\[
\tag{2} I(T_e;x)=(1+x)I(T/e;x)+xI(H_e;x).
\]

### Rooted-state proof of (1)

Let \(R_u\) be the independence polynomial of all components on the
\(u\)-side after deleting \(u\), and let \(J_u\) be the polynomial after
also forbidding every vertex of \(U\).  Define \(R_v,J_v\) analogously.
Splitting according to which endpoint is chosen gives

\[
\begin{aligned}
I(T) &=R_uR_v+xJ_uR_v+xR_uJ_v,\\
I(T/e)&=R_uR_v+xJ_uJ_v.
\end{aligned}
\]

In \(T-\{u,v\}\), an independent set survives the added complete
bipartite graph \(K_{U,V}\) precisely when it avoids all of \(U\), or
avoids all of \(V\).  Inclusion-exclusion therefore gives

\[
I(H_e)=J_uR_v+R_uJ_v-J_uJ_v.
\]

Subtracting the second rooted-state identity from the first proves (1).

### Proof of (2)

Apply (1) to either new edge of the subdivided tree, or use the standard
subdivision identity

\[
I(T_e)=I(T)+xI(T/e)
\]

and substitute (1):

\[
I(T_e)=(1+x)I(T/e)+xI(H_e).
\]

## Structure of the interface graph

The graph \(H_e\) has a particularly restricted block structure.
Deleting the added \(U\)-\(V\) edges leaves one tree component rooted at
each vertex of \(U\cup V\).  Hence every nontrivial two-connected cyclic
block of \(H_e\) lies in \(K_{U,V}\); all other blocks are bridges.
Equivalently, \(H_e\) is a complete bipartite core with a rooted tree
attached at each core vertex (with the degenerate cases \(U=\varnothing\)
or \(V=\varnothing\) allowed).  In particular, it is chordal bipartite:
it has no induced cycle of length greater than four.

## A possible subdivision closure route

Identity (2) turns subdivision closure into a sum of just two
nonnegative sequences:

\[
(1+x)I(T/e) \quad\text{and}\quad xI(H_e).
\]

Thus a sufficient program is:

1. prove that every edge-interface graph has a unimodal independence
   sequence;
2. prove that its shifted mode is aligned closely enough with the mode of
   \((1+x)I(T/e)\) that their sum is unimodal.

If these hold, and the conjecture is proved for trees with no
degree-two vertices, repeated suppression/subdivision resolves all trees.
Neither obligation is asserted here.

This program is not automatically simpler than the original conjecture.
If \(u\) is a leaf, then \(U=\varnothing\) and \(H_e=T-\{u,v\}\), an
arbitrary smaller forest.  Thus interface unimodality already contains the
forest conjecture in a degenerate case.  In a minimal-counterexample
argument that case can be supplied by induction; the genuinely new case is
the complete-bipartite core with both \(U,V\ne\varnothing\).

## Exact replay

`verify_edge_interface_identity.py` independently constructs \(T/e\),
\(T_e\), and \(H_e\), computes their independence polynomials by memoized
vertex deletion, and verifies (1) and (2) using integer arithmetic.  It
also records:

- any failure of unimodality of \(I(H_e)\);
- the first failure of log-concavity (log-concavity is already known not
  to be the right target);
- the maximum observed distance between the modes of the two summands in
  (2).

Reproduction command:

```powershell
python .\verify_edge_interface_identity.py `
  --max-order 13 `
  --output .\edge_interface_n13_exact_20260726.json
```

The extended order-16 run checked 32,507 unlabeled trees, 464,872 edge
instances, and 929,744 exact identities.  It found no nonunimodal
edge-interface polynomial.  It did find:

- the first non-log-concave interface at tree order 14, with polynomial
  \((1,12,51,105,110,52,7,1)\);
- a distance of three between the modes of the two summands in (2), first
  at tree order 15.

Consequently neither interface log-concavity nor adjacent-mode alignment
can be used as the missing general lemma.  The exact certificate is
`edge_interface_n16_exact_20260726.json`, with SHA-256
`54504C3293551A0AEF906FF5CF778A6A80C372397FB3B34484428B1A0DCA9690`.
