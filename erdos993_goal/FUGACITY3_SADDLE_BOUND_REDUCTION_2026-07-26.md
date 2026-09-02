# Fugacity-three saddle-bound reduction for Erdős Problem 993

Date: 2026-07-26

Status: **(F3) is now proved for every forest.**  The complete rooted-tree
induction is in `FUGACITY3_FOREST_THEOREM_PROOF_2026-07-26.md`, with the
finite polynomial sublemmas certified by
`verify_fugacity3_induction_lemmas.py`.  The theorem sharpens the
asymptotic pendant-cascade analysis but does not by itself solve Erdős
Problem 993.

## 1. Candidate occupancy inequality

For a graph \(G\), put

\[
Z_G(\lambda)=I(G;\lambda),\qquad
\mu_G(\lambda)=\frac{\lambda Z_G'(\lambda)}{Z_G(\lambda)}.
\]

The theorem is

\[
\tag{F3}
\boxed{\quad
\mu_F(3)\geq\frac{2\alpha(F)}3
\quad}
\]

for every forest \(F\).

The hard-core mean is strictly increasing in \(\lambda\).  Therefore (F3)
is equivalent to saying that the positive two-thirds saddle

\[
\frac{\rho I'(F;\rho)}{I(F;\rho)}
=\frac{2\alpha(F)}3
\]

satisfies \(\rho\leq3\).  In the repeated-branch terminal-bouquet limit
from `PENDANT_GSB_CASCADE_REDUCTION_2026-07-26.md`, this would give

\[
\lim_{m\to\infty}R_\infty(\rho,m)
=\frac{\rho}{1+\rho}\leq\frac34.
\]

This is close to the strongest numerical hierarchy presently known,
whose limiting ratio is \(0.7276546332\).

## 2. Exact maximum-independent-set expansion

Fix a maximum independent set \(A\) of \(G\), with \(|A|=\alpha\), and
put \(C=V(G)\setminus A\).  Every independent set \(I\) is uniquely
determined by

\[
B=I\cap C
\]

and an arbitrary subset of \(A\setminus N_A(B)\), where
\(N_A(B)=N(B)\cap A\).  Consequently

\[
\tag{1}
Z_G(\lambda)
=\sum_{\substack{B\subseteq C\\B\ {\rm independent}}}
\lambda^{|B|}(1+\lambda)^{\alpha-|N_A(B)|}.
\]

Write

\[
b(B)=|B|,\qquad c(B)=|N_A(B)|.
\]

Conditional on \(B\) at fugacity \(3\), the number of chosen vertices
from \(A\setminus N_A(B)\) is binomial with success probability \(3/4\).
Thus the conditional mean size is

\[
b(B)+\frac34\bigl(\alpha-c(B)\bigr),
\]

and the weight of this class is

\[
w(B)=3^{b(B)}4^{\alpha-c(B)}.
\]

It follows that (F3) is exactly the integer inequality

\[
\tag{2}
\boxed{\quad
\sum_{\substack{B\subseteq C\\B\ {\rm independent}}}
w(B)\bigl(\alpha+12b(B)-9c(B)\bigr)\geq0.
\quad}
\]

This is a substantially smaller proof target than a coefficient-by-
coefficient inequality.  For a forest, both \(G[C]\) and the incidence
graph between \(C\) and \(A\) are acyclic.

Maximumity of \(A\) also gives the Hall-type inequality

\[
\tag{3}
c(B)\geq b(B)
\]

for every independent \(B\subseteq C\): otherwise
\((A\setminus N_A(B))\cup B\) would be an independent set larger than
\(A\).

Conditions (1)--(3) are exact, but (3) alone does not make every summand
in (2) nonnegative.  A high-expansion set \(B\) can have
\(\alpha+12b(B)-9c(B)<0\); its compensating feature is the exponential
penalty \(4^{-c(B)}\).  The proof ultimately exploits acyclicity through
an exact rooted-tree recurrence rather than by pairing these terms
directly.

## 3. Matching-block interpretation

Choose a maximum matching whose unmatched nonisolated vertices are
leaves, as in `MATCHING_BLOCK_REDUCTION_2026-07-24.md`.  Contracting its
edges produces \(\alpha(F)\) one- or two-color blocks.  Every core edge
forbids the single oriented pattern

\[
(X\text{ at the tail},Y\text{ at the head}).
\]

At fugacity \(3\), (F3) says that at least two thirds of these blocks are
occupied on average.  Exhaustive abstract tests show that this statement
is false if the contracted matching is not maximum: the three-block path
with a two-color center and one one-color leaf forbidding each center
color has mean \(33/20<2\).  That block system expands to \(P_4\) with
the nonmaximum central-edge matching.  Hence maximum-matching structure
cannot be discarded in an induction.

## 4. Exact finite certificate

`verify_fugacity3_tree_bound.py` computes every tree independence
polynomial by exact rooted dynamic programming and checks

\[
\tag{4}
3\sum_k k\,i_k(T)3^k
-2\alpha(T)\sum_k i_k(T)3^k\geq0.
\]

Through order 17 it checks all 81,137 unlabeled trees, representing
64,989 distinct independence polynomials, with no failure.  The closest
tree is the same order-17 saddle champion found independently in the
asymptotic search:

\[
\begin{aligned}
I(T;x)={}&1+17x+120x^2+458x^3+1029x^4+1387x^5\\
&+1097x^6+482x^7+111x^8+15x^9+x^{10}.
\end{aligned}
\]

For it,

\[
Z_T(3)=3{,}370{,}300,\qquad
\sum_k k\,i_k(T)3^k=23{,}308{,}989,
\]

so the exact gap in (4) is

\[
2{,}520{,}967>0,
\]

and

\[
\frac{\mu_T(3)}{\alpha(T)}
=0.6915998279\ldots>\frac23.
\]

The SHA-256 hashes are

```text
09B1596B0EE080D8857BB75C17BB4636E36900240CFECC76971F37EBA406EDB2
  fugacity3_tree_bound_n17_20260726.json

50FA3519144DFF6B605CD3C20BF29DC422D24A63E895482A7DCED778F97A10E5
  verify_fugacity3_tree_bound.py
```

## 5. Necessary structural restriction

(F3) is false for general graphs.  The graph \(K_5\) with one edge
deleted has

\[
I(G;x)=1+5x+x^2,\qquad \alpha(G)=2.
\]

At fugacity \(3\),

\[
Z_G(3)=25,\qquad
\sum_k k\,i_k(G)3^k=33,
\]

and the left side of (4) is

\[
3\cdot33-4\cdot25=-1.
\]

Thus neither down-closedness of the independence complex nor the
maximum-set expansion (1) is sufficient.  A proof of (F3) must use the
forest incidence structure.

## 6. Resolved theorem and remaining proof obligation

The rooted-state proof establishes (2), and hence replaces the rigorous
but crude universal bound

\[
\rho\leq(1+2\cos(\pi/9))^3=23.8725781081\ldots
\]

by

\[
\boxed{\rho\leq3}.
\]

Thus every repeated-branch terminal-bouquet mechanism is below the
asymptotic cascade ratio \(3/4\).  The remaining task for Erdős Problem
993 is finite-copy PGC: it still requires a uniform coefficient-error
argument or a direct rankwise proof.
