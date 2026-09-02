# Protected-leaf phase induction reduction

Date: 2026-07-29

## Setup

Let \(B\) be a forest, let \(v\) and \(s\) be distinct vertices in
the same component, and let

\[
\mathcal T_q(B;v,s)=\mathcal A_q(B;v,s)+\mathcal B_q(B;v,s)
\]

be the combined doubled phase gap from (12vi) of
`SHARP_MIXED_LAMBDA_BRIDGE_CANDIDATE_2026-07-29.md`.  Thus
\(\mathcal T_q=2R_q\), where \(R_q\) is the first sibling
theta-core leaf-recursion margin.

## Four sufficient local recurrences

For \(q\ge5\), the following four inequalities are sufficient.
At \(q=4\), omit the rank-three term on the right and require only
plain nondecrease.

1. If \(z\) is a leaf supported by \(t\notin\{v,s\}\), then

   \[
   \mathcal T_q(B;v,s)-\mathcal T_q(B-z;v,s)
   \ge
   \mathcal T_{q-1}(B-\{z,t\};v,s).
   \tag{P1}
   \]

2. If \(z\) is a leaf supported by \(v\), put \(C=B-z\), and let
   \(a\) be the neighbor of \(v\) on the \(v\)-to-\(s\) path.  Then

   \[
   \mathcal T_q(B;v,s)-\mathcal T_q(C;v,s)
   \ge
   \mathcal T_{q-1}(C-v;a,s).
   \tag{P2}
   \]

3. If \(z\) is a leaf supported by \(s\), put \(C=B-z\), and let
   \(b\) be the neighbor of \(s\) on the \(s\)-to-\(v\) path.  Then

   \[
   \mathcal T_q(B;v,s)-\mathcal T_q(C;v,s)
   \ge
   \mathcal T_{q-1}(C-s;v,b).
   \tag{P3}
   \]

4. If \(z\) is an isolated vertex, then

   \[
   \mathcal T_q(B;v,s)-\mathcal T_q(B-z;v,s)
   \ge
   \mathcal T_{q-1}(B-z;v,s).
   \tag{P4}
   \]

When the shifted vertices in (P2) or (P3) would coincide, only the
plain nondecrease statement is needed.

## Conditional induction theorem

Assume (P1)--(P4), their rank-four plain versions, and the
distance-one collision versions.  Then

\[
\mathcal T_q(B;v,s)\ge0
\]

for every forest \(B\), every valid protected pair \(v,s\), and every
\(q\ge4\).

Proof.  Induct lexicographically on \((q,|V(B)|)\).  Every nontrivial
external component has an ordinary leaf, handled by (P1); every
external isolated component is handled by (P4).

In the protected component, retain the vertices \(v,s\).  If there
is a third leaf, it is either supported by neither protected vertex,
by \(v\), or by \(s\), and is handled by (P1), (P2), or (P3).
The same-rank term has fewer vertices.  For \(q\ge5\), the additional
term has lower rank and fewer vertices, so both are nonnegative by
induction.  At rank four the assumed plain version suffices.

After all such leaves are removed, the protected component has
exactly the two leaves \(v,s\), hence is their path; all external
components have disappeared.  The bare-path theorem in
`derive_bare_path_terminal_phase_gap.py` proves this terminal case.
\(\square\)

## Isolate-free variant through rank nine

There is a useful variant which does not apply (P4).  Prune every
nontrivial external component by (P1), but retain the isolated vertex
left when that component disappears.  The terminal object is then

\[
P_{L+1}\sqcup tK_1
\]

with protected path endpoints.  The exact binomial theorem in
`PATH_ISOLATE_TERMINAL_FIXED_RANK_THEOREM_2026-07-30.md` proves this
terminal family for every \(L,t\ge0\) at ranks \(4,\ldots,9\).
Consequently P1--P3 alone suffice for the protected induction through
rank nine.  P4 is needed only for the current all-rank formulation,
unless the path-plus-isolates theorem is extended to arbitrary rank.

## Current evidence

The ordinary recurrence (P1) has passed 125,253 exact block margins:
122,067 exhaustive margins through tree order nine and 3,186 random
forest margins through order 100.

`probe_shifted_endpoint_phase_recursion.py` tests (P2)--(P4) on every
ordered protected pair in every tree through order eight and on 80
random forests through order 90.  The combined block has no failure
among 39,534 case/rank margins.  The shadow-only strengthening of
(P2) is false on larger trees and forests, but the component-square
block compensates every observed loss; only the combined statement
is used above.

These computations do not prove (P1)--(P4).  They reduce the complete
\(q\ge4\) sibling theta-core pruning problem to four explicit local
inequalities whose terminal case is already proved.

The later path-plus-isolates theorem removes P4 from the fixed-rank
range \(4\le q\le9\), but does not yet remove it uniformly in \(q\).

## P4 shadow reduction

For \(q\ge5\), the shadow half of P4 now has a smaller exact form.
For one rooted core, write

\[
\begin{array}{c|ccc}
J&i_{q-2}=m&i_{q-1}=M&i_q=X\\
R&i_{q-2}=\rho&i_{q-1}=r&i_q=t .
\end{array}
\]

Its strong isolate defect is

\[
\begin{aligned}
D_q={}&2M^2+4Mm-2Mr-2M\rho+2Xm\\
&-(2q+1)X\rho+(2q-1)mt+2mr.
\end{aligned}
\]

The P4 shadow margin is the ordinary support-leaf recursion of
\(D_q\).  Resolving that leaf and then writing the two smaller
families as induced restrictions reduces the margin to a 28-term
expression which is affine-linear in the two relative face vectors.
When the relative vectors vanish, the remaining base is manifestly

\[
4(a_0^2+a_0u_{-1}+a_1a_{-1}+a_{-1}u_0)\ge0.
\]

The exact identity is derived in
`derive_isolate_shadow_relative_reduction.py` and recorded in
`isolate_shadow_relative_reduction_identity_20260730.json`.
Positivity of the relative linear part is still open, but this removes
all residual moments and component counts from the P4 shadow target:
it is now a pure adjacent face-number inequality for an induced
relative complex.

The full one-core isolate defect has also been reduced exactly.  Its
shadow half replays the displayed \(D_q\).  After the standard forest
moment identities, the component-square half has the form

\[
2\{\mathcal R_q^{\rm count}-3\mathcal E_q^{\rm edge}\},
\]

where, writing \(J=B-v\), \(R=B-N[v]\), and

\[
X=i_q(J),\quad M=i_{q-1}(J),\quad
m=i_{q-2}(J),\quad p=i_{q-3}(J),
\]

the complete surviving-edge burden is

\[
\begin{aligned}
\mathcal E_q^{\rm edge}={}&
p\,e_q(B)+m\,e_{q-1}(B)+p\,e_{q-1}(J)\\
&+\{M+2m+i_{q-2}(R)\}e_{q-2}(J)\\
&+\{X+M+i_{q-1}(R)\}e_{q-3}(J).
\end{aligned}
\]

The remaining \(\mathcal R_q^{\rm count}\) is an explicit edge-free
count polynomial.  The derivation is
`derive_isolate_total_core_defect.py`, with durable output
`isolate_total_core_defect_identity_20260730.json`.  Thus the full P4
target is now a support-leaf recursion of a compact shadow term plus
one five-term residual-edge payment, rather than an unspecified
moment inequality.

## Adjacent-endpoint P4 theorem

The distance-one terminal collision for P4 is now proved at every
rank.  If the protected component is \(K_2\) and the remaining
components are \(tK_1\), the strong isolate defect has an exact
factorization.  After setting \(q=r+4\) and \(t=q-3+x\), its numerator
is a polynomial in \(r,x\) with 24 strictly positive coefficients.
Below the support threshold \(t=q-3\), the defect is zero.

The proof and independent graph replay are in
`ADJACENT_ENDPOINT_ISOLATE_P4_THEOREM_2026-07-30.md`,
`derive_adjacent_endpoint_isolate_p4.py`, and
`verify_adjacent_endpoint_isolate_p4.py`.
