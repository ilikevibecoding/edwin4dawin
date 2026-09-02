# Prefix Isolated-Root Ratio Dominance

## Status

This note isolates a sufficient inequality for the terminal-isolate
burden in the current proof program for Erdős Problem 993.  The
inequality is supported by exhaustive and adversarial computation, but
it is **not yet proved** for every rooted forest.

It is deliberately a *prefix* statement.  The corresponding all-ranks
statement is false for trees.

## Setup

Let \(A\) be a forest with a distinguished vertex \(q\).  Write

\[
I(A;x)=E(x)+xJ(x),
\qquad
E(x)=I(A-q;x),
\qquad
J(x)=I(A-N[q];x).
\]

Add one isolated vertex \(z\) and put

\[
B(x)=(1+x)I(A;x),\qquad C(x)=E(x).
\]

Thus \(B_j\) counts all independent \(j\)-sets of
\(A\sqcup K_1\), while \(C_j\) counts the independent \(j\)-sets
avoiding both marked vertices \(q,z\).  Define the marked-set hit
density

\[
\rho_j=1-\frac{C_j}{B_j}
\]

whenever \(B_j>0\).

The relevant branch of the terminal comparison is the prefix

\[
B_r\ge B_{r-1}>0.
\tag{P}
\]

## Prefix ratio-dominance conjecture

The proposed rooted-forest inequality is

\[
\boxed{
B_r C_{r-1}\ \ge\ B_{r-1}C_r
\quad\text{whenever}\quad
B_r\ge B_{r-1}>0.
}
\tag{PIRD}
\]

Equivalently,

\[
\frac{C_r}{B_r}\le \frac{C_{r-1}}{B_{r-1}},
\qquad\text{or}\qquad
\rho_r\ge \rho_{r-1}.
\]

Only ranks \(r\ge6\) are needed after the already completed fixed-rank
part of the proof program.

## Exact implication for terminal burden

Set

\[
u=r\frac{B_r}{B_{r-1}}.
\]

Condition (P) gives \(u\ge r\).  The pointed terminal burden appearing
in the one-step drift reduction is

\[
\mathcal B_r
=r(u+1)\rho_{r-1}-(r+1)u\rho_r.
\]

If (PIRD) holds, then \(\rho_r\ge\rho_{r-1}\), and hence

\[
\begin{aligned}
\mathcal B_r
&\le r(u+1)\rho_{r-1}-(r+1)u\rho_{r-1}\\
&=(r-u)\rho_{r-1}\\
&\le0.
\end{aligned}
\]

Therefore (PIRD) supplies the entire pointed payment required in the
terminal-isolate case.

This implication is exact and uses no asymptotics or numerical
approximation.

## Coefficient decomposition

Put \(k=r-1\).  Since

\[
B=(1+x)E+x(1+x)J,
\]

the cleared minor in (PIRD) is

\[
\begin{aligned}
\Delta_k
&=B_{k+1}E_k-B_kE_{k+1}\\
&=\underbrace{E_k^2-E_{k-1}E_{k+1}}_{c_k(E)}
\\
&\quad+
\underbrace{
E_k(J_k+J_{k-1})
-E_{k+1}(J_{k-1}+J_{k-2})
}_{LR_k(E,J)}.
\end{aligned}
\tag{1}
\]

The first term is the ordinary log-concavity gap of \(E\).  The second
term can be negative, so log-concavity of \(E\) alone does not prove
(PIRD).  The unresolved issue is precisely whether forest recursion
forces enough compensation in the prefix.

## Exact computational evidence

### Exhaustive rooted trees through order 15

The verifier `scan_terminal_isolate_burden.py` checked every root of
every unlabeled tree through order \(15\), restricted to \(r\ge6\) and
the prefix \(B_r\ge B_{r-1}\).

- Prefix checks: \(44{,}056\).
- Negative ratio minors: \(0\).
- Positive terminal burdens: \(0\).
- Report:
  `terminal_isolate_ratio_n15_r6_20260729.json`.

### Adversarial PatternBoost corpus

The verifier `scan_patternboost_terminal_isolate_burden.py` checked
two roots in each of \(43{,}595\) adversarial trees: a maximum-degree
root and a sampled leaf root.

- Rooted instances: \(87{,}190\).
- Prefix checks at \(r\ge6\): \(1{,}128{,}724\).
- Negative ratio minors in the prefix: \(0\).
- Positive terminal burdens: \(0\).
- All-rank ratio checks: \(2{,}346{,}906\).
- Negative all-rank ratio minors: \(12{,}281\), all outside the prefix.
- Report:
  `patternboost_terminal_isolate_ratio_full_r6_20260729.json`.

The separation between the prefix and the tail is therefore observed
directly in the same data, rather than inferred from a scan that simply
omitted the tail.

## Why the prefix restriction is essential

Universal ratio dominance is false.  In the \(28\)-vertex broom
\(T_{3,4}\), rooted at one of its degree-two support vertices, the
all-ranks minor at \(k=14\) is

\[
\Delta_{14}=-2298.
\]

The exact coefficients and reconstruction are recorded in

`literature_sources/erdos-problem-993-current/notes/scc_false_n28_2026-03-01.md`.

That failure occurs in the coefficient tail, not on the branch
\(B_{k+1}\ge B_k\) needed here.  Consequently it refutes the universal
SCC statement but does not refute (PIRD).

## Why forest structure is essential

Several stronger-looking abstractions have exact counterexamples,
including at the first needed rank \(r=6\):

- compatibility of blocker faces alone;
- one-blocker incidence for every lower vertex;
- unit-loss behavior;
- the same inequalities on general graphs.

The corresponding independently checkable certificates are

- `verify_compatible_blocker_rank6_counterexample.py`;
- `verify_sparse_incidence_rank6_counterexample.py`;
- `verify_terminal_isolate_general_graph_counterexample.py`.

Thus a proof of (PIRD), if true, must use the recursive acyclic
structure of forests.  It cannot follow from the coarse blocker
properties that survive in the certified nonforest examples.

## Current proof target

The next exact base class is a root whose outward branches are stars.
If the star branch sizes are \(a_1,\dots,a_s\), put

\[
S_a=(1+x)^a+x,\qquad
K=\prod_{i=1}^s S_{a_i},\qquad
L=(1+x)^{a_1+\cdots+a_s}.
\]

Then

\[
E=K,\qquad J=L,\qquad
B=(1+x)(K+xL).
\]

Proving the prefix minors

\[
B_rK_{r-1}-B_{r-1}K_r\ge0
\]

for every list of nonnegative star sizes would establish the
depth-two base case.  The deepest-support reduction then leaves at
most one arbitrary inward branch, giving the next natural closure
step.

The subsequent note
`STAR_ROOT_INTERSECTION_REDUCTION_2026-07-29.md` proves that every
centre-subset term group with nonempty intersection is nonnegative.
It reduces the whole star-root base case to one explicit
disjoint-centre bivariate inequality and records an exhaustive
all-ranks check through rooted-tree order \(50\).

## Logical status

- The implication `(PIRD) => nonpositive terminal-isolate burden` is
  proved above.
- The coefficient identity (1) is proved by expansion.
- The exhaustive and stress-test counts are computational evidence,
  not a proof.
- (PIRD) for all rooted forests remains the principal open lemma in
  this route.
