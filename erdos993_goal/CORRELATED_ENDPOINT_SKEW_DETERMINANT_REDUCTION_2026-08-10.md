# Correlated endpoint deletion as one sparse skew determinant

This note gives an exact path-specific determinant representation for the
quadratic pencil in the lower-selector reduction.  It does **not** yet prove
the required stability of its fixed-grade layers.

Let

\[
 C_n=\operatorname{tridiag}(1,2,1),\qquad
 P_{n+1}(q)=\det(I_n+qC_n),
\]

and let (E=e_1e_1^T+e_ne_n^T) mark the two endpoints.  Put

\[
 D_x=I_n+vxC_n,\qquad D_y=I_n+vyC_n,
\]

and, with (a^2=u), define the two-rail matrix

\[
 \mathcal M_n=
 \begin{pmatrix}
 D_x&aE\\
 -aE&D_y
 \end{pmatrix}.                                      \tag{1}
\]

Then, for every (n\ge2),

\[
\begin{aligned}
 \det\mathcal M_n={}&P_{n+1}(vx)P_{n+1}(vy)
 +2uP_n(vx)P_n(vy)\\
 &+u^2P_{n-1}(vx)P_{n-1}(vy)
 +2u,v^{2n-2}(xy)^{n-1}.                            \tag{2}
\end{aligned}
\]

## Sparse-permutation proof

The nonzero pattern of (1) is two path rails joined at both endpoints.
In a determinant permutation, a used cross arc has only two possibilities.

* It is paired with the reverse cross arc at the same endpoint.  This is a
  cross transposition and contributes (+u).  Choosing neither endpoint,
  either one, or both gives the first four correlated principal-minor terms
  in (2).  Deleting one endpoint leaves (C_{n-1}); deleting both leaves
  (C_{n-2}).
* It is not paired locally.  Because each rail is a path, both endpoint
  cross arcs are then forced and the permutation is one of the two oriented
  Hamiltonian cycles around the two-rail graph.  Each has sign and entry
  product combining to (+u v^{2n-2}(xy)^{n-1}).

There are no other sparse permutation types, proving (2).

## Exact selector consequence

Set (N=n+1).  For every (s<2n-2=2N-4), the Hamiltonian term is above the
selected grade, so

\[
 [v^s]\det\mathcal M_n
 =[v^s]\{P_N(vx)P_N(vy)
 +2uP_{N-1}(vx)P_{N-1}(vy)
 +u^2P_{N-2}(vx)P_{N-2}(vy)\}.                       \tag{3}
\]

Under the usual palindromic gamma substitution, (3) is exactly

\[
 Q_u(t)=G_{N,s}(t)+2uG_{N-1,s}(t)+u^2G_{N-2,s}(t).   \tag{4}
\]

The entire nonterminal lower range in Section 89 has
(s\le2N-6), so (3)--(4) apply with two degrees of slack before the
Hamiltonian obstruction.

This is stronger structural information than an abstract common-interlacer
statement: it realizes the correlated endpoint deletions in one sparse path
matrix.  The remaining theorem is to prove that the low homogeneous layers
in (3) are stable/properly positioned.  The skew signs on the endpoint
blocks mean that (1) is not by itself a generic Hermitian determinantal
stability certificate, so that last implication must use the path/cycle
sparsity or an equivalent fixed-grade argument.

## Replay

`verify_correlated_endpoint_skew_determinant.py` checks (2) exactly for
(2\le n\le6), and checks all 30 layers below the Hamiltonian degree.  It
writes `correlated_endpoint_skew_determinant_exact_20260810.json` and reports
`PASS_EXACT_CORRELATED_ENDPOINT_SKEW_DETERMINANT_REPLAY`.
