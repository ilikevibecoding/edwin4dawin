# Extension variance and the leaf-rich reduction for Erdős Problem 993

Date: 2026-07-26

Status: the identities and reductions in Sections 1--3 are proved.  The
leaf-majority assertion in Section 4 is false, with an exact counterexample
recorded below.  This note is not a proof of Erdős Problem 993.

## 1. Ordered log-concavity as an exact variance inequality

Let \(G\) be a graph, let \(\mathcal I_k\) be its independent \(k\)-sets,
and put \(i_k=|\mathcal I_k|\).  For \(S\in\mathcal I_k\), define

\[
R(S)=V(G)\setminus N[S],\qquad
e(S)=|R(S)|,\qquad
q(S)=|E(G[R(S)])|.
\]

Thus \(e(S)\) is the number of one-vertex extensions of \(S\), while
an unordered pair in \(R(S)\) extends \(S\) precisely when it is not one
of the \(q(S)\) edges of \(G[R(S)]\).

Double counting one-vertex extensions gives

\[
\tag{1}
\sum_{S\in\mathcal I_k}e(S)=(k+1)i_{k+1}.
\]

Double counting an independent \((k+2)\)-set together with a distinguished
\(k\)-subset gives

\[
\tag{2}
\sum_{S\in\mathcal I_k}
 \left(\binom{e(S)}2-q(S)\right)
=\binom{k+2}2i_{k+2}.
\]

Let \(S_k\) be uniform on \(\mathcal I_k\), and write

\[
\mu_k=\mathbb E e(S_k),\qquad
\sigma_k^2=\operatorname{Var}(e(S_k)),\qquad
\bar q_k=\mathbb E q(S_k).
\]

Using (1)--(2), the ordered-log-concavity inequality at rank \(k+1\),

\[
\tag{3}
(k+1)i_{k+1}^2\ge (k+2)i_ki_{k+2},
\]

is equivalent, with no estimate or loss, to

\[
\tag{4}
\boxed{\ \sigma_k^2\le \mu_k+2\bar q_k\ }.
\]

Indeed, (1) gives \(i_{k+1}=i_k\mu_k/(k+1)\), while (2) gives

\[
(k+1)(k+2)i_{k+2}
=i_k\mathbb E\!\left[e(S_k)(e(S_k)-1)-2q(S_k)\right].
\]

After substitution into (3), the resulting inequality is

\[
\mu_k^2\ge
\mathbb E[e(S_k)^2]-\mu_k-2\bar q_k,
\]

which is exactly (4).

For a forest, \(G[R(S)]\) is again a forest.  The term \(2\bar q_k\)
therefore records precisely the adjacent pairs among the currently
available extension vertices.  This turns ordered log-concavity into a
Poincare-type variance bound for a very concrete statistic.

## 2. Ordered log-concavity is closed under forest products

For \(P(x)=\sum p_kx^k\), write

\[
\mathcal F(P)_k=k!p_k.
\]

If \(P,Q\) are multiplied in the ordinary polynomial ring, then

\[
\tag{5}
\mathcal F(PQ)_n
=\sum_{j=0}^n\binom nj
  \mathcal F(P)_j\mathcal F(Q)_{n-j}.
\]

Thus factorial transform converts ordinary coefficient convolution into
binomial (Hurwitz) convolution.  Binomial convolution preserves
log-concavity of finite nonnegative sequences without internal zeros.
Consequently:

> **Product lemma.** The product of two ordered-log-concave polynomials
> with nonnegative coefficients and no internal zeros is ordered
> log-concave.

This observation answers the convolution question raised immediately after
Question 11 in Basit--Galvin (2021): ordered log-concavity of every tree
would automatically imply ordered log-concavity of every forest.  It is
also the correct algebra behind the product steps in the rooted-tree
recurrence.

The binomial-convolution result follows, for example, from the double
LC-positivity of the Pascal triangle in Wang--Yeh, “Log-concavity and
LC-positivity,” *Journal of Combinatorial Theory A* 114 (2007), 195--210,
Theorem 2.3 and its Pascal-triangle example.  Walkup’s earlier paper,
“Pólya sequences, binomial convolution and the union of random sets,”
*Journal of Applied Probability* 13 (1976), 76--85, proves stronger
total-positivity variants under the corresponding stronger hypotheses.

## 3. Why homeomorphically irreducible trees are leaf-rich

Let \(T\) be a tree with no degree-two vertex.  Let \(L\) be its number of
leaves and \(H\) its number of nonleaves.  If \(H>0\), every nonleaf has
degree at least three, and the degree sum gives

\[
L+3H\le 2(L+H-1).
\]

Therefore

\[
\tag{6}
\boxed{\ L\ge H+2\ }.
\]

This is exactly the two-spare-leaf phenomenon visible after rooting \(T\):
every nonleaf below the root has at least two children.

Conversely, the known degree-two ordered-log-concavity control in
`hit_ordered_factorial_certificate.py` has \(L=12\) and \(H=16\), and it
violates (3) at rank \(14\).  It lies on the opposite side of (6).

## 4. The global leaf-majority shortcut is false

The following tempting strengthening of the HIT program is false:

> **False leaf-majority candidate.** If a tree has at least two more leaves
> than nonleaves, then its independent-set sequence is ordered log-concave.

Start with the 28-vertex degree-two control in
`hit_ordered_factorial_certificate.py` and attach six new leaves to vertex
2, which originally has degree two.  The resulting tree has 34 vertices,
18 leaves, and 16 nonleaves, so equality holds in (6).  Its independence
polynomial is

\[
\begin{aligned}
(&1,34,528,5000,32513,154912,563099,1603733,3642922,\\
 &6674810,9924127,11987433,11722535,9202113,5715687,\\
 &2747111,987051,250659,40642,3357,58,1).
\end{aligned}
\]

At rank \(20\), its ordered-log-concavity reserve is

\[
20(58)^2-21(3357)(1)=-3217.
\]

The ordinary log-concavity reserve at the same rank is still

\[
58^2-3357=7,
\]

and the whole sequence is unimodal.  Thus this is a precise counterexample
to the proposed shortcut, not to Erdős Problem 993.  It shows that the
local absence of degree-two vertices carries information which the global
leaf count \(L\ge H+2\) does not retain.

The condition admits the exact leaf decomposition

\[
\tag{7}
I(T;x)=
\sum_{\substack{S\subseteq H\\S\ {\rm independent}}}
x^{|S|}(1+x)^{L-\sum_{v\in S}\ell_v},
\]

where \(H\) is the tree induced by the nonleaves and \(\ell_v\) is the
number of leaf neighbors of \(v\).  Formula (7) follows by first choosing
the internal vertices in an independent set and then choosing any subset
of the leaves not adjacent to them.

Formula (7) remains useful, but (4) cannot be derived from (6) alone.
The live proof target must retain the no-unary local branching condition
or the stronger rooted factorial wide-minor reserve.  A proof based only
on whole-component switches in the symmetric difference also cannot work:
an induced star can jump over the adjacent rank.  The variance formulation
retains the local edge correction \(2q(S)\) needed to expose that
obstruction.

## 5. Exact falsification evidence

Before the counterexample above was constructed, an exhaustive pass over
every unlabeled tree through order \(18\) found:

* 58,283 trees satisfying \(L\ge H+2\);
* no failure of ordered log-concavity.

The executable `leaf_majority_ordered_lc_search.py` performs a separate
exact evolutionary search over a skeleton tree and arbitrarily distributed
pendant-leaf multiplicities.  It remains useful as a falsifier for variants
that add local hypotheses.  The direct replay
`verify_leaf_majority_ordered_lc_failure.py` independently reconstructs the
34-vertex counterexample, recomputes its polynomial with tree DP, and checks
both reserves.  Its certificate is
`leaf_majority_ordered_lc_failure_20260726.json`.

The evolutionary executable enforces the leaf condition using actual
degrees and scores the exact ratio

\[
\max_k
\frac{(k+1)i_{k-1}i_{k+1}}{k i_k^2}.
\]

A ratio above one is a finite counterexample to the candidate lemma; the
direct construction above has such a ratio at rank 20.

## 6. A one-unit extension-drift lemma is also false

Since

\[
\mu_k=(k+1)\frac{i_{k+1}}{i_k},
\]

unimodality would follow from the weaker condition

\[
\tag{8}
\mu_k\le \mu_{k-1}+1.
\]

Indeed, once \(i_k\le i_{k-1}\), one has \(\mu_{k-1}\le k\);
(8) then gives \(\mu_k\le k+1\), hence \(i_{k+1}\le i_k\).
In coefficient form, (8) is

\[
\tag{9}
k i_k^2+i_{k-1}i_k\ge(k+1)i_{k-1}i_{k+1}.
\]

The variance calculation in Section 1 shows that (8) is equivalent to

\[
\tag{10}
\operatorname{Var}(e(S))
\le 2\mathbb E e(S)+2\mathbb E q(S)
\]

for a uniform independent set at the preceding rank.  This passed every
unlabeled tree through order 18, 20,000 random trees through order 300,
and all 43,595 distinct polynomials in the published 60-vertex
PatternBoost corpus.  Nevertheless it is false.

For Galvin's explicit family

\[
I(T_{m,t};x)
=\big((1+2x)^t+x(1+x)^t\big)^m+x(1+2x)^{tm},
\]

take \(m=14,t=8\).  This is a 239-vertex tree with independence number
126.  At rank 114, the three relevant coefficients are

\[
\begin{aligned}
i_{113}&=6282411066203582985425471095517396,\\
i_{114}&=18743615459989506619900279143140,\\
i_{115}&=231916420585545022500722023384.
\end{aligned}
\]

The exact unit-drift gap in (9) is

\[
-9748410094043726698071699331214291454134607525325658488163769520.
\]

Thus \(\mu_{114}-\mu_{113}\approx1.08278546>1\).  This is not a
counterexample to unimodality: the polynomial peaks at rank 75 and is
strictly decreasing through rank 114.  The drift can increase by more than
one only while remaining far below the birth/death threshold.

The exact executable and certificate are `galvin_unit_drift_scan.py` and
`galvin_unit_drift_t2-8_m150_20260726.json`.

## 7. The surviving adaptive barrier

Write

\[
r_k=\frac{i_{k+1}}{i_k}.
\]

A sufficient condition which retains all current evidence is

\[
\tag{11}
\boxed{\quad r_k\le\max\{r_{k-1},1\}\quad}.
\]

Equivalently, ordinary log-concavity is required only at ranks for which
the next coefficient rises:

\[
\tag{12}
i_{k+1}>i_k
\quad\Longrightarrow\quad
i_k^2\ge i_{k-1}i_{k+1}.
\]

Condition (11) immediately rules out a reascent after a descent, but it
allows the tail ratio recoveries responsible for every known
non-log-concave tree.  It is therefore strictly better aligned with the
actual Erdős problem than (8).

The earlier prefix/tail program is a non-adaptive sufficient route to
(11): prove log-concavity (or ordered log-concavity) through
\(\lceil(2\alpha-1)/3\rceil-2\), and use the known monotone decreasing tail
after that point.  The remaining proof obligation is still structural;
(11) is not asserted here as a theorem.
