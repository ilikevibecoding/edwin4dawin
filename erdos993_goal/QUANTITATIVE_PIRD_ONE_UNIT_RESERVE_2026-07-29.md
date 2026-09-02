# Quantitative PIRD and the One-Unit Reserve

## Status

**Refuted.**  The quantitative strengthening below passed all of the
small and previously adversarial tests recorded in this note, but an
exact two-level star-fork construction fails it at order \(11829\).
The same construction also refutes the half-payment inequality.
See `QPIRD_AND_HALF_PAYMENT_COUNTEREXAMPLE_2026-07-29.md` and
`verify_qpird_star_fork_counterexample.py`.

The identities and probabilistic reformulations in this note remain
correct.  Only the asserted nonnegativity is false.  At the
counterexample rank, ordinary PIRD remains strictly positive.

## 1. Rooted setup

Let \(R\) be a forest with distinguished root \(q\), and write

\[
C(x)=I(R-q;x),\qquad D(x)=I(R-N[q];x).
\tag{1}
\]

Put

\[
H(x)=C(x)+(1+x)D(x),
\qquad
B(x)=(1+x)\{C(x)+xD(x)\}.
\tag{2}
\]

The consecutive coefficients satisfy

\[
B_k=C_k+H_{k-1},
\qquad
B_{k+1}=C_{k+1}+H_k.
\tag{3}
\]

At an operative rank

\[
B_{k+1}\ge B_k>0,
\tag{4}
\]

the PIRD minor is

\[
\begin{aligned}
\Delta_k
&=B_{k+1}C_k-B_kC_{k+1}\\
&=C_kH_k-C_{k+1}H_{k-1}.
\end{aligned}
\tag{5}
\]

## 2. Three extension means

Define

\[
u=k\frac{C_k}{C_{k-1}},
\qquad
w=(k+1)\frac{C_{k+1}}{C_k},
\qquad
v=(k+1)\frac{H_k}{H_{k-1}}.
\tag{6}
\]

The half-payment target from
`ONE_DEEP_GSB_DELETION_RESERVE_2026-07-29.md` is

\[
2v\ge1+u+w.
\tag{7}
\]

Exact data suggest the two separate inequalities

\[
\boxed{v\ge u}
\tag{M1}
\]

and

\[
\boxed{v\ge w+1.}
\tag{M2}
\]

Their sum proves (7).  More importantly, (M2) alone is already a
quantitative PIRD theorem.

## 3. One-unit quantitative PIRD

Clearing denominators in (M2) and using (5) gives the exact
equivalence

\[
\begin{aligned}
v-w-1\ge0
&\iff
(k+1)C_kH_k
-\{(k+1)C_{k+1}+C_k\}H_{k-1}\ge0\\
&\iff
\boxed{
(k+1)\Delta_k\ge C_kH_{k-1}.
}
\tag{QPIRD}
\end{aligned}
\]

Since the right side is positive on the live support, QPIRD implies
strict PIRD:

\[
\Delta_k>0.
\tag{8}
\]

Thus QPIRD is not merely another sufficient condition for
half-payment.  It directly completes the rooted ratio lemma needed by
the terminal reduction.

The first inequality has the coefficient form

\[
\boxed{
(k+1)C_{k-1}H_k
\ge
kC_kH_{k-1}.
}
\tag{9}
\]

Although (9) is not needed once QPIRD is proved, it is useful
structurally: (9) and QPIRD split the three-term half-payment comparison
into two adjacent ratio comparisons.

## 4. Why the unit is natural

For a symmetric binomially central sequence of order \(2k\), the
central comparison is

\[
a_{k-1}\le\frac{k}{k+1}a_k,
\]

or

\[
a_k-a_{k-1}\ge\frac{a_k}{k+1}.
\tag{10}
\]

QPIRD asks for precisely a \(1/(k+1)\)-scale reserve.  Therefore the
central surplus proved in
`BINOMIAL_CENTRAL_CONVOLUTION_THEOREM_2026-07-29.md` has the correct
normalization to prove QPIRD after the rooted intersection terms are
assembled.  This explains why ordinary nonnegative central
unimodality was insufficient: it discarded exactly the unit of
reserve appearing in (QPIRD).

## 5. Exact evidence

### Exhaustive small trees

`verify_rooted_forest_two_ratio_exhaustive.py` checks every root of
every unlabeled tree through order \(15\), at every operative rank
\(k\ge1\).  It covers

- \(188{,}260\) rooted instances;
- \(786{,}377\) operative coefficient comparisons;
- zero failures of (M1);
- zero failures of (M2).

The smallest observed margins were

\[
\min(v-u)=0.4937379\ldots,
\qquad
\min(v-w-1)=0.5077133\ldots.
\]

The machine-readable report is
`rooted_forest_two_ratio_exhaustive_n15_20260729.json`.

### Adversarial 60-vertex trees

`verify_rooted_forest_two_ratio_dominance.py` samples arbitrary roots
from the deterministic PatternBoost corpus.  In \(100{,}000\) rooted
samples it checks \(1{,}194{,}371\) operative ranks \(k\ge6\), with no
failure.  The minimum observed QPIRD ratio margin was

\[
\min(v-w-1)=1.4765698\ldots.
\]

The report is
`rooted_forest_two_ratio_dominance_100k_20260729.json`.

Multiplying both \(C\) and \(D\) by zero, one, or two additional
random tree components gives another \(584{,}838\) operative
rooted-forest checks with no failure.  The report is
`rooted_forest_two_ratio_extra_components_20k_20260729.json`.

The prefix condition is substantive.  Running the same verifier on
all ranks of only \(1{,}000\) adversarial roots finds failures of both
(M1) and (M2) in the coefficient tail.  The first QPIRD failure in
that run occurs at rank \(29\), after the corresponding polynomial
has left its operative branch.  The negative-control report is
`rooted_forest_two_ratio_all_rank_negative_control_20260729.json`.

### Weighted-caterpillar adversarial stress

A targeted exact search over \(20{,}000\) heavily weighted caterpillars
(spine lengths \(2\) through \(12\), \(0\) through \(60\) leaves per spine
vertex, and three root positions) checks \(4{,}381{,}885\) operative
rank instances without a QPIRD failure.  The smallest observed
\(v-w-1\) margin is
\[
  \frac{80}{153}=0.522875817\ldots,
\]
attained by the leaf profile \([4,0,2]\), rooted at the two-leaf
endpoint, at rank \(3\).  The script and report are
`stress_qpird_weighted_caterpillars.py` and
`qpird_weighted_caterpillars_20260729.json`.

### One-deep and Galvin stress families

The mixed one-deep verifier checks \(1{,}737{,}332\) operative ranks
from \(50{,}000\) arbitrary inward roots with random side-star blocks.
It finds no failure of either ratio inequality.  Its smallest
\(v-w-1\) margin is \(0.7832235\ldots\).

For the exact Galvin family \((t,m)=(16,820)\) with two direct side
leaves, all \(8{,}741\) operative ranks pass.  At its hardest
half-payment rank,

\[
v-u=0.0053925\ldots,
\qquad
v-w-1=0.9998580\ldots.
\]

Thus (M1) can be asymptotically close to equality while QPIRD retains
about one further unit in this family.

## 6. Forest structure is essential

The general-graph half-payment control also refutes QPIRD.  Let

\[
C=(1,9,10,10,5,1),\qquad D=1,
\]

coming from the complete multipartite graph with parts
\((5,1,1,1,1)\) and a universal distinguished root.  At \(k=2\),

\[
u=\frac{20}{9},\qquad w=3,\qquad v=3.
\]

Hence (M1) holds, but

\[
v-w-1=-1,
\qquad
\Delta_2=0,
\]

so QPIRD fails by exactly one unit.  Any proof must use acyclicity,
not only coefficient nonnegativity, GSB, or ordinary PIRD.

## 7. Current proof target

The preferred endpoint is now:

> **Quantitative rooted-forest lemma.**  For every rooted forest
> \((R,q)\), if \(B_{k+1}\ge B_k>0\), then
> \[
> (k+1)\{B_{k+1}C_k-B_kC_{k+1}\}
> \ge C_k(B_k-C_k).
> \]

A switching proof should interpret the left side as \(k+1\) choices
of a central transfer and the right side as a pair consisting of a
rank-\(k\) root-avoiding set and a rank-\((k-1)\) state counted by
\(H\).  The symmetric-difference components must be switched as whole
orbits; previous componentwise Bencs extractions are known to be
false.

The alternative algebraic route is to use the exact intersection
decomposition from
`ONE_DEEP_BIVARIATE_BINOMIAL_CLOSURE_REDUCTION_2026-07-29.md` and
retain the \(1/(k+1)\) central surplus from every binomially central
degree allocation instead of keeping only its sign.
