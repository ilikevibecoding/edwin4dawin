# A two-step extension reduction for Erdős Problem #993

Date: 2026-07-24

Status: **conjectural reduction, not a solution.**  The inequality isolated
below has survived the finite tree tests recorded here, but it has not been
proved for every forest.

## 1. The candidate inequality

Let

\[
I(F;x)=\sum_{k=0}^{\alpha}a_kx^k
\]

be the independence polynomial of a forest \(F\), and define the average
one-vertex extension count

\[
\mu_k=(k+1)\frac{a_{k+1}}{a_k}.
\]

The proposed **two-step extension bound** is

\[
\tag{2SB}\mu_{k+2}\leq \mu_k+2.
\]

Equivalently,

\[
\tag{2SB-coeff}
(k+3)a_{k+3}a_k
\leq
\bigl((k+1)a_{k+1}+2a_k\bigr)a_{k+2}.
\]

Define

\[
\delta_k=\mu_k-(k+1)
       =(k+1)\frac{a_{k+1}-a_k}{a_k}.
\]

Then (2SB) is exactly

\[
\delta_{k+2}\leq\delta_k.
\]

Consequently it gives the parity sign-propagation law

\[
\tag{SP}
a_k\geq a_{k+1}
\quad\Longrightarrow\quad
a_{k+2}\geq a_{k+3}.
\]

There is also a useful boundary interpretation.  If \(S\) is a uniformly
chosen rank-\(k\) independent set and

\[
\beta_k=\mathbb E|N(S)|
\]

is its average open-neighborhood size, then the vertices outside \(S\)
partition into its boundary and its addable vertices.  Hence

\[
\mu_k=n-k-\beta_k.
\]

Thus (2SB) is exactly

\[
\tag{Boundary-2}\beta_{k+2}\geq\beta_k-4.
\]

Pointwise, adding two compatible vertices never shrinks the open boundary;
the difficulty is solely that deleting two vertices from a uniform
rank-\(k+2\) set does not produce the uniform rank-\(k\) distribution.
This formulation isolates the needed tree-specific size-bias control.

## 2. Exact reduction to two local inequalities

The adjacent generalized-smoothness bound is

\[
\tag{GSB}
\mu_{k+1}\leq\mu_k+1,
\]

or, equivalently,

\[
(k+2)a_ka_{k+2}
\leq
(k+1)a_{k+1}^2+a_ka_{k+1}.
\]

It is not necessary here to prove GSB at every rank.  It is enough to prove
it at the first nonincreasing step.

**Reduction theorem.**  Suppose every forest satisfies (2SB) at every
admissible rank, and suppose GSB holds at the least \(m\) for which
\(a_m\geq a_{m+1}\).  Then every forest has a unimodal independence
sequence.

**Proof.**  Before \(m\), the sequence is strictly increasing by the
minimality of \(m\).  At \(m\), \(\delta_m\leq0\).  GSB at \(m\) gives
\(\delta_{m+1}\leq\delta_m\leq0\).  Repeated application of (2SB) gives
\(\delta_{m+2j}\leq\delta_m\leq0\) and
\(\delta_{m+1+2j}\leq\delta_{m+1}\leq0\) for every admissible \(j\).
Thus every step after \(m\) is nonincreasing.  Therefore the coefficient
sequence is unimodal. \(\square\)

There is a weaker version using the known decreasing-tail theorem.  Put

\[
L=\left\lceil\frac{2\alpha-1}{3}\right\rceil.
\]

It is already known that \(a_L\geq a_{L+1}\geq\cdots\).  Therefore it is
enough to prove (2SB) only through \(k=L-3\): if the first nonincreasing
step \(m\) occurs before \(L\), GSB at \(m\) starts both parity chains and
(2SB) propagates them through \(L-1\), where the tail theorem takes over.
If no such \(m<L\) exists, the increasing prefix joins the decreasing tail
directly.

This cleanly separates the remaining problem:

1. prove prefix (2SB) for forests; and
2. prove GSB only at a forest's first nonincreasing step.

## 3. Rank-\(k\) residual-forest formulation

Choose a rank-\(k\) independent set \(S\), and let \(R_S\) be the forest
induced by the vertices that can be added to \(S\).  Write

\[
e(S)=|V(R_S)|,\qquad q_j(S)=j!\,i_j(R_S).
\]

Double counting extensions gives

\[
\begin{aligned}
A_0&=a_k,\\
A_1&=(k+1)a_{k+1}=\sum_S e(S),\\
A_2&=(k+1)(k+2)a_{k+2}=\sum_S q_2(S),\\
A_3&=(k+1)(k+2)(k+3)a_{k+3}=\sum_S q_3(S).
\end{aligned}
\]

In these terms (2SB) is the compact correlation inequality

\[
\tag{R2SB}
A_0A_3\leq(A_1+2A_0)A_2.
\]

For each individual residual forest,

\[
q_3(S)\leq(e(S)-2)q_2(S),
\]

because an ordered independent pair has at most \(e(S)-2\) choices for a
third vertex.  Averaging this pointwise fact would prove (R2SB) if one could
establish

\[
\tag{Cov}
\operatorname{Cov}\bigl(e(S),q_2(S)\bigr)
\leq4\,\mathbb E[q_2(S)]
\]

under the uniform measure on rank-\(k\) independent sets.  This covariance
bound is therefore one concrete sufficient lemma.  It is not yet known
whether (Cov) itself is true for all forests.

## 4. A positive differential-operator formulation

For a graph \(G\) of order \(n\), define

\[
\mathcal K_n I=(1-x)I'(x)+nI(x).
\]

If \(I(x)=\sum a_kx^k\) and
\(\mathcal K_nI(x)=\sum c_kx^k\), then

\[
c_k=(k+1)a_{k+1}+(n-k)a_k
\]

and therefore

\[
\frac{c_k}{a_k}=n-k+\mu_k.
\]

All \(c_k\) are positive.  Consequently (2SB) is exactly the statement that
the coefficient ratios \(c_k/a_k\) are nonincreasing separately on the even
and odd indices:

\[
\frac{c_{k+2}}{a_{k+2}}\leq\frac{c_k}{a_k}.
\]

This removes the signed coefficients that occur if one instead applies
\((1-x)I'-I\).

The operator is also an exact derivation for disjoint unions.  If \(A\) and
\(B\) are graph polynomials of orders \(n_A,n_B\), then

\[
\mathcal K_{n_A+n_B}(AB)
=(\mathcal K_{n_A}A)B+A(\mathcal K_{n_B}B).
\]

Thus the forest problem becomes a positive parity-ratio-dominance problem
for the pair \((\mathcal K_nI,I)\).  Parity ratio dominance is not preserved
by arbitrary products from the two within-parity inequalities alone; an
additional cross-parity relation is still required.  The identity is a
useful exact starting point, not yet a closure proof.

## 5. A proved initial segment: ranks 0, 1, and 2

The candidate (2SB) is a theorem for every forest at \(k=0,1,2\).

For any graph on \(n\) vertices, double counting extensions of independent
\(s\)-sets gives

\[
(s+1)a_{s+1}\leq(n-s)a_s.
\]

At \(k=0\), this gives

\[
3a_3\leq(n-2)a_2\leq(n+2)a_2,
\]

which is (2SB-coeff).

At \(k=1\), use \(a_1=n\), \(m\leq n-1\), and
\(a_2=\binom n2-m\).  Then

\[
4a_4a_1\leq n(n-3)a_3
\leq(2a_2+2n)a_3,
\]

again giving (2SB-coeff).

The rank-two case contains a nontrivial forest estimate.  For a uniformly
chosen independent pair \(\{u,v\}\), the extension count is

\[
e(\{u,v\})=n-|N[u]\cup N[v]|.
\]

Put \(d_w=\deg(w)\), \(m=|E(F)|\), and \(S_2=\sum_wd_w^2\).  Because a
forest has at most one common neighbor for any nonadjacent pair,

\[
\begin{aligned}
C
&:=\sum_{\{u,v\}\text{ independent}}|N[u]\cup N[v]|\\
&=\sum_wd_w(n-1-d_w)+2a_2-\sum_w\binom{d_w}{2}.
\end{aligned}
\]

Direct simplification gives

\[
2(6a_2-C)
=4n(n-1)-2(2n+3)m+3S_2.
\]

By Cauchy--Schwarz, \(S_2\geq4m^2/n\), while \(m\leq n-1\).  For
\(n\geq5\), the resulting quadratic lower bound is decreasing on
\(0\leq m\leq n-1\), so its minimum is

\[
4n(n-1)-2(2n+3)(n-1)+\frac{12(n-1)^2}{n}
=\frac{6(n-1)(n-2)}n\geq0.
\]

The cases \(n\leq4\) follow by direct substitution into the same quadratic.
Thus \(C\leq6a_2\), and hence

\[
\mu_2=\frac{3a_3}{a_2}
=n-\frac C{a_2}\geq n-6.
\]

Finally,

\[
5a_5a_2\leq(n-4)a_4a_2
\leq(\mu_2+2)a_4a_2
=(3a_3+2a_2)a_4.
\]

This proves (2SB) at \(k=2\).  Therefore a minimal rank failure must have
\(k\geq3\).

## 6. Symmetric-difference route

The left side of (R2SB) counts a rank-\(k\) independent set paired with a
rank-\(k+3\) independent set, with the larger set's three added vertices
ordered.  For two independent sets \(A,B\) in a forest, the graph induced
by \(A\triangle B\) is a bipartite forest.  Switching bipartite components
is the natural way to turn a \((k,k+3)\) pair into a \((k+1,k+2)\) pair.

The uncorrected switching inequality fails on a single star component of
bipartition imbalance \(3\).  The extra \(2A_0A_2\) term in (R2SB) is a
plausible exact correction for these exceptional imbalance-three
components.  A rigorous injection or weighted component-switching proof
has not yet been completed.

## 7. Exact finite evidence

The verifier

`C:\Users\chris\erdos993_goal\two_step_extension_stress.py`

uses exact integer arithmetic.  Completed tests include:

- all 32,508 unlabeled trees through order 16: no failure;
- 1,000 Prüfer-random trees through order 500: no failure;
- all 1,252 graphs in the NetworkX graph atlas through order 7: no
  failure;
- 196 Galvin-family parameter pairs with order at most 500: no failure;
- 192,925 deterministic and evolutionary structured-bouquet trees with
  order at most 500: no failure.  The exact champion has ratio
  \(0.9901660937332608\), where a counterexample would require a ratio
  greater than \(1\).
- 49,892 free-form evolutionary trees of order 200, using arbitrary
  leaf moves and prune-and-regraft mutations and scoring only the required
  prefix: no failure.  The strongest candidate has exact additive gap
  \(\mu_{k+2}-\mu_k-2=-3.732171541529667\) at \(k=95\).
- 134,181 prefix-scored structured-bouquet trees of order at most 500:
  no failure.  The strongest additive gap in that run is
  \(-4.206642895155958\).
- the 219 distinct order-28 trees in the retained near-miss and
  log-concavity-failure corpora: no prefix failure; their strongest
  additive gap is \(-3.761231606743043\).

The complete structured-search certificate is

`C:\Users\chris\erdos993_goal\bouquet_two_step_search_500_20260724.json`.

The multiplicative ratio approaches \(1\) even for binomial sequences as
the order grows, so it is not by itself a good measure of danger.  The
subsequent adversarial runs rank by the exact additive gap
\(\mu_{k+2}-\mu_k-2\).  Their certificates are

`C:\Users\chris\erdos993_goal\two_step_freeform_prefix_gap_n200_20260724.json`

and

`C:\Users\chris\erdos993_goal\bouquet_two_step_prefix_gap_fixed_500_20260724.json`.

The compact independent replay driver

`C:\Users\chris\erdos993_goal\verify_prefix_two_step_certificates.py`

reconstructs both retained champions, recomputes their independence
polynomials, checks every exact numerator and denominator, and also replays
the order-28 hard corpus and a 766-pair Galvin grid.

The earlier universal three-step coefficient inequality is **false** even
for trees: the exact 45-vertex tree \(T(4,5)\) falsifies it.  In contrast,
\(T(4,5)\) satisfies (2SB).  See

`C:\Users\chris\erdos993_goal\verify_galvin_ts_failure.py`

for the independent exact check.

## 8. Negative controls

The inequality is not a generic property of independence polynomials.

### Split graph

The join of an independent 10-set and a 100-clique has polynomial

\[
(1+x)^{10}+100x
=
[1,110,45,120,210,252,210,120,45,10,1].
\]

At \(k=1\), the two sides of (2SB-coeff) are respectively

\[
92{,}400>37{,}200.
\]

It also violates sign propagation:
\(110\geq45\), but \(120<210\).

### Bipartite graph

For the Bhattacharyya--Kahn construction with \(a=95,b=151\),

\[
p_t=(2^t-1)\binom{95}{t}+\binom{151}{t}.
\]

It violates (2SB) at \(k=67\), by exact ratio
\(1.0115281126997866\), and violates sign propagation at \(k=69\).
Thus bipartiteness alone is insufficient; a successful proof must use the
acyclic structure of forests.

## 9. Current proof obligation

The live target is no longer the falsified universal three-step inequality.
Using the known tail theorem, the needed two-step target is only:

\[
\boxed{\mu_{k+2}\leq\mu_k+2
\quad\text{for every forest and }0\leq k\leq L-3}
\]

together with GSB at the first nonincreasing coefficient step.  Either a
proof in that prefix window or one exact prefix tree counterexample to
(2SB) is decisive progress.  Until one of those is obtained, this document
records a reduction and strong falsification evidence, not a resolution of
Erdős Problem #993.

## 10. June-2026 consecutive-break family

Bautista-Ramos, Guillén-Galván, and Gómez-Salgado, *Linear Recurrences
for Non-Log-Concave Independence Polynomials of Trees*, Graphs and
Combinatorics **42** (2026), article 59, give the pattern-tree family

\[
 U_{k,n,\ell,m}
 =S_\ell T_{k,n}^{\,m}
  +x(1+2x)^\ell S_n^{\,km},
\]

where

\[
 S_t=(1+2x)^t+x(1+x)^t,\qquad
 T_{k,n}=S_n^k+x(1+2x)^{kn}.
\]

This is presently the strongest published adversarial family: some of its
members have five consecutive log-concavity failures.  The exact
python-FLINT checker

`C:\Users\chris\erdos993_goal\pattern_family_valley_search.py`

tests the defining closed form directly.  A corrected search (the score
starts *after* the first downward coefficient step, so an almost-tied mode
cannot masquerade as a rebound) checked 14,400 parameter tuples

\[
k=3,\quad 4\leq n\leq12,\quad0\leq\ell\leq15,\quad1\leq m\leq100
\]

of degree at most 5,000.  Every polynomial was unimodal.  The strongest
post-descent adjacent ratio was

\[
0.998760008389879<1
\]

for \((k,n,\ell,m)=(3,12,2,99)\), at the step following its first
descent.  The partitioned exact certificates are

- `pattern_family_valley_k3_n4-8_l15_m100_20260724.json`;
- `pattern_family_valley_k3_n9-10_l15_m100_20260724.json`;
- `pattern_family_valley_k3_n11-12_l15_m100_20260724.json`.

The published five-break example
\((k,n,\ell,m)=(3,10,7,214)\), of independence degree \(7070\), is
unimodal and satisfies (2SB).  Its largest exact additive (2SB) gap is
\(-5.883440150674653\) in the required prefix and
\(-1.9858972035757592\) over all ranks.  Thus even five consecutive
ordinary log-concavity failures do not approach a violation of the
two-step extension inequality.  The compact independent replay is

`C:\Users\chris\erdos993_goal\verify_pattern_family_five_break.py`.

As a separate counterexample-mechanism check, normalized FFT recurrences
for complete \(d\)-ary trees (\(2\leq d\leq10\), all tested heights with
order below \(100{,}000\)) found no coefficient valley and no numerical
(2SB) failure in the trustworthy probability bulk.  This latter test is
floating-point evidence only; the pattern-family certificates above are
exact.

## 11. Maximum-matching block normal form

A separate exact reduction is recorded in

`C:\Users\chris\erdos993_goal\MATCHING_BLOCK_REDUCTION_2026-07-24.md`.

Every forest admits a maximum matching whose unmatched nonisolated
vertices are leaves.  Contracting its matched edges turns independent
sets, rank for rank, into partial colorings of an
\(\alpha(F)\)-vertex forest: a contracted matching edge has two colors,
an unmatched vertex has one, and each remaining edge forbids exactly one
color pair.  There are precisely \(2\alpha(F)-|V(F)|\) one-color blocks,
and all nonisolated ones can be made pendant.

After removing those pendant blocks, the independence polynomial has the
exact form

\[
I(F;x)=
\sum_{\sigma\ {\rm valid}}
x^{|\sigma|}(1+x)^{u-R_C(\sigma)},
\qquad u=2\alpha(F)-|V(F)|.
\]

This proves the tail extension bound directly and reduces the unresolved
middle to a structured binomial mixture on only
\(|V(F)|-\alpha(F)\) two-color core blocks.  The independent verifier

`C:\Users\chris\erdos993_goal\verify_matching_block_reduction.py`

reconstructed the polynomial coefficient-by-coefficient for all 987
nonisomorphic trees through order 12.

The complementary bipartition-oriented version is recorded in

`C:\Users\chris\erdos993_goal\BIPARTITION_ORIENTED_BLOCK_REDUCTION_2026-07-24.md`.

It shows that, after orienting every contracted nonmatching edge from its
global \(X\)-endpoint to its global \(Y\)-endpoint, every core constraint
forbids the same state pair \((X,Y)\).  Thus the core is not an arbitrary
two-color CSP but an oriented-forest implication system.

A compact negative control in
`verify_perfect_matching_lc_failure.py` constructs an exact 102-vertex
perfect-matching tree whose polynomial fails log-concavity at its
penultimate index.  It remains unimodal and satisfies prefix (2SB).
Consequently, even the zero-defect matching-block regime cannot be closed
by reviving the false log-concavity conjecture.

## 12. Exact strong-unimodality witness and forest-factor audit

The 102-vertex tree's final log-concavity defect yields an exact abstract
convolution valley.  If

\[
D=a_{49}a_{51}-a_{50}^2>0,\quad
A=a_{49}+a_{50},\quad B=a_{50}+a_{51},
\]

then a unimodal integer kernel whose only nearby first differences are
\(+A,-B\) produces two consecutive convolution slopes \(-D,+D\).
`verify_strong_unimodality_witness.py` constructs such a kernel with constant
coefficient \(1\) and checks the strict valley exactly.

This does not yet give a graph counterexample.  The explicit kernel has
\(b_1=1\) and degree \(106\), so it cannot be any graph independence
polynomial: the linear coefficient of an independence polynomial is the
number of vertices.

Exact attempts to realize the amplification with genuine tree factors found
no valley:

- powers of the 102-vertex polynomial through exponent \(20\);
- 129 standard path, star, subdivided-star, broom, and Galvin bouquet
  factors;
- the Galvin grid
  \[
  G_{m,t}(x)=\bigl((1+2x)^t+x(1+x)^t\bigr)^m
             +x(1+2x)^{mt};
  \]
- a local exact scan around the strongest grid point
  \((m,t)=(408,12)\), including every \(401\le m\le450\);
- 2,427 exact evolutionary bouquet factors of order at most \(500\).

The strongest correctly post-descent-scored product in these runs is still
unimodal.  For \((m,t)=(408,12)\), its largest ratio *after* the first
downward step is

\[
0.99909286444832<1.
\]

A separate near-tie score of \(0.999546\) was diagnosed as the two sides of
the central mode, not a rebound, and the evolutionary scorer was corrected
to exclude the first downward step.  The main exact search drivers are

- `forest_factor_galvin_search.py`;
- `forest_factor_bouquet_evolution.py`;
- `forest_factor_local_perturbation_search.py`.

Thus non-log-concavity is provably sufficient for an abstract unimodal
convolution counterexample, but the independence-polynomial realizability
constraint remains a genuine barrier rather than a cosmetic one.
