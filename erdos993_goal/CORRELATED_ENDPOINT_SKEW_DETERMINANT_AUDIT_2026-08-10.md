# Correlated endpoint skew determinant: clean-room audit

## 1. Exact all-order identity

Let

\[
 C_n=\operatorname{tridiag}(1,2,1),\qquad
 D(q)=I_n+qC_n,
\]

and let `S=[e_1,e_n]`, so that `E=SS^T`.  Write

\[
 F_n(q)=\det D(q)=P_{n+1}(q),\qquad
 K(q)=S^TD(q)^{-1}S.
\]

For `n>=2`, the endpoint Green matrix is

\[
 K(q)={1\over F_n(q)}
 \begin{pmatrix}
 F_{n-1}(q)&(-q)^{n-1}\\
 (-q)^{n-1}&F_{n-1}(q)
 \end{pmatrix}.                                      \tag{1}
\]

The diagonal entry is the endpoint cofactor.  The off-diagonal entry is
the unique product of the `n-1` off-diagonal entries in the corresponding
cofactor.  Jacobi's complementary-minor identity gives

\[
 \det K(q)={F_{n-2}(q)\over F_n(q)}.                 \tag{2}
\]

Now put

\[
 M=\begin{pmatrix}D(vx)&aE\\-aE&D(vy)\end{pmatrix},
 \qquad a^2=u.
\]

Schur complementation and the rank-two determinant lemma give

\[
 \det M=F_n(vx)F_n(vy)\det\{I_2+uK(vx)K(vy)\}.      \tag{3}
\]

Substituting (1)--(2) into (3) proves

\[
\begin{split}
 \det M={}&P_{n+1}(vx)P_{n+1}(vy)
 +2uP_n(vx)P_n(vy)\\
 &+u^2P_{n-1}(vx)P_{n-1}(vy)
 +2u v^{2n-2}(xy)^{n-1}.                            \tag{4}
\end{split}
\]

Thus every `v`-layer of degree `s<2n-2=2N-4` is exactly the correlated
quadratic pencil.  The desired range `s<=2N-6` lies strictly below the
correction.

## 2. Audit of the permutation classification

The sparse permutation proof is also exhaustive.  A determinant cycle that
uses a cross arc has only three possibilities:

1. the two opposite cross arcs at one endpoint form a transposition;
2. both endpoint transpositions occur;
3. one cross arc is used at each endpoint, in opposite rail directions.

In the third case the cycle must travel between the two endpoints on each
path rail.  Since a path has a unique endpoint-to-endpoint route, it uses
every vertex and is one of the two oriented Hamiltonian `2n`-cycles.  No
other rail cycle can coexist with it.  A cross transposition contributes
`+u` after multiplying its permutation sign by its two matrix entries.
Each oriented Hamiltonian cycle contributes
`+u(v^2xy)^(n-1)`.  This reproduces (4), including signs and the factor two.

The restriction `n>=2` is necessary because the two endpoint selectors
coincide at `n=1`.

## 3. Exact matching/independence interpretation

The identity

\[
 P_{n+1}(q)=I(P_{2n};q)
\]

identifies the path determinant with the independence polynomial of a
path on `2n` vertices.  Form a graph `H_n` from two disjoint paths
`X=P_(2n)` and `Y=P_(2n)` and two nonadjacent vertices `L,R`.  Join `L` to
the first two vertices of both rails and `R` to the last two vertices of
both rails.  Give the `X` vertices activity `vx`, the `Y` vertices activity
`vy`, and `L,R` activity `u`.  Expanding according to the selected subset
of `{L,R}` gives exactly the first three terms of (4).

The graph `H_n` is claw-free: the neighborhood of `L` or `R` is two
disjoint edges, and at every rail vertex one of the two possible rail
neighbors is adjacent to the endpoint vertex.  Hence the weighted
independence polynomial is same-phase stable by the Engstrom / Leake--Ryder
claw-free theorem.

That theorem does not prove the required statement.  Same-phase stability
scales every selected vertex by one common phase.  Here `v` scales only the
two rails, the endpoint activities remain fixed at `u`, and then one
extracts one rail-degree layer.  This operation is not a closure operation
for same-phase stability.

There is a small generic counterexample.  Take the claw-free graph
`P_4` together with one isolated special vertex, color the four path
vertices alternately `X,Y,X,Y`, leave the special activity equal to one,
and extract rail independent sets of size two.  The resulting color
polynomial is

\[
 2(1+t+t^2),
\]

which has a nonreal conjugate pair.  Therefore a successful matching or
Lorentzian proof must exploit the special two-rail endpoint geometry; no
generic claw-free colored-section theorem can supply it.

## 4. What is and is not closed

The full skew determinant is not a standard Hermitian positive-semidefinite
determinantal certificate.  After factoring the constant block, the
effective matrix

\[
 \begin{pmatrix}I&aE\\-aE&I\end{pmatrix}^{-1}
 \operatorname{diag}(xC_n,yC_n)
\]

can have nonreal conjugate eigenvalues already at `n=2`.  Replacing the
skew cross block by a Hermitian one reverses the sign of the `u` deletion
terms.  Thus the usual mixed-characteristic-polynomial, PSD determinant,
and multivariate matching-stability theorems do not apply as stated.

The independent replay
`verify_correlated_endpoint_skew_determinant.py --max-n 6` reports
`PASS_EXACT_CORRELATED_ENDPOINT_SKEW_DETERMINANT_REPLAY` over five sizes
and 30 low layers.  The source and JSON SHA-256 hashes are respectively

```text
E3E0F8B509038555631AD747D61AED86EB6A1D1F62F10FA8235A5042211698BE
2DA5B002CD3BDEC0AEC7266382A5E6E51C264F1D67877DAC0BB1D3BFC53321D9
```

