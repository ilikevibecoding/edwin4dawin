# Support-vertex ratio dominance is false

Date: 2026-07-26

Status: exact counterexample to an intermediate proof invariant. This is
**not** a counterexample to Erdős Problem 993; the tree below has a
log-concave, hence unimodal, independent-set sequence.

## 1. The proposed invariant

Let \(r\) be a support vertex of a tree \(T\), and put

\[
E(x)=I(T-r;x),\qquad J(x)=I(T-N[r];x).
\]

The proposed all-rank ratio dominance was

\[
\tag{RD}E_{k+1}J_k\ge E_kJ_{k+1}.
\]

Equivalently, \(J_k/E_k\) was conjectured to be nonincreasing. Exhaustive
tests in the public March 2026 project found no failure through order 22,
but (RD) is false.

## 2. A 29-vertex counterexample

Take a vertex \(r\), join it to one pendant leaf, and also join it to the
centres of nine disjoint 2-leaf stars. The result is a tree on

\[
1+1+9(1+2)=29
\]

vertices, and \(r\) is a support vertex. Deleting \(r\) leaves one isolated
vertex and nine copies of \(K_{1,2}\), while deleting \(N[r]\) leaves the
eighteen outer leaves. Therefore

\[
E(x)=(1+x)(1+3x+x^2)^9,\qquad J(x)=(1+x)^{18}.
\]

At rank \(k=12\),

\[
(E_{12},E_{13},J_{12},J_{13})
=(355890,164136,18564,8568),
\]

and hence

\[
\begin{aligned}
E_{13}J_{12}-E_{12}J_{13}
&=164136\cdot18564-355890\cdot8568\\
&=-2244816<0.
\end{aligned}
\]

This is a direct exact disproof of (RD).

The tree's full independence polynomial is \(E+xJ\), with coefficient
sequence

\[
\begin{aligned}
(&1,29,378,2970,15810,60552,172704,374454,624843,808146,\\
 &813008,636777,387714,182700,66060,18054,3633,513,46,2).
\end{aligned}
\]

It is log-concave and has its unique mode at rank \(10\). Its prefix-GSB
reserves are also strictly positive through the cutoff
\(\lfloor(2\alpha+1)/3\rfloor=13\). Thus the failure removes a proposed
route but does not damage the current prefix-GSB target.

## 3. The mode-prefix version also fails

The weaker version proposed as a sufficient route to unimodality required
(RD) only for \(k<m\), where \(m\) is the first mode of \(I(T;x)\). This
too is false.

Take \(r\) adjacent to one leaf, seven centres of 3-leaf stars, and one
centre of a 4-leaf star. This tree has

\[
1+1+7(1+3)+(1+4)=35
\]

vertices. At \(r\),

\[
\begin{aligned}
E(x)&=(1+x)\big((1+x)^3+x\big)^7\big((1+x)^4+x\big),\\
J(x)&=(1+x)^{25}.
\end{aligned}
\]

The full polynomial \(I(T;x)=E+xJ\) has first and unique mode \(m=13\).
At \(k=12<m\),

\[
(E_{12},E_{13},J_{12},J_{13})
=(25606914,25517086,5200300,5200300),
\]

so

\[
E_{13}J_{12}-E_{12}J_{13}
=-467132548400<0.
\]

The equality \(J_{12}=J_{13}=\binom{25}{12}\) makes the mechanism
transparent: \(E\) has already turned down at rank \(12\), while adding
the shifted \(J\) term moves the mode of \(E+xJ\) to rank \(13\).

The full coefficient sequence is

\[
\begin{aligned}
(&1,35,561,5511,37375,186734,716198,2170333,5310206,\\
 &10670632,17852774,25143031,30064314,30717386,26933413,\\
 &20312040,13177314,7337798,3490472,1407111,475013,131965,\\
 &29414,5062,632,51,2).
\end{aligned}
\]

It remains strictly unimodal, and every prefix-GSB reserve is positive
through its cutoff \(17\). Thus this is not a counterexample to the Erdős
conjecture, but it decisively refutes the support-vertex \(P2/P^\star\)
proof reduction as stated.

## 4. Structured minimality and reproducibility

`find_min_support_ratio_star_branch_failure.py` exhausts the larger family
with \(\ell\ge1\) pendant neighbours of \(r\) and an arbitrary multiset of
star branches. In that family it checks every instance in increasing
order and finds no failure through order 28; the witness above is the first
at order 29. The search certificate is
`support_ratio_star_branch_min_failure_20260726.json`.

With the `--prefix` flag, the same program requires the negative minor to
occur strictly before the first mode of \(E+xJ\). It checks 45,390
star-branch instances through order 34 and finds the 35-vertex witness
above first. The certificate is
`support_ratio_star_branch_min_prefix_failure_20260726.json`.

`verify_support_ratio_star_branch_failure.py` independently builds the
29- and 35-vertex adjacency lists, recomputes their rooted polynomials by
tree DP, checks the structural formulas and negative minors, and verifies
the stated unimodality and prefix-GSB properties.

## 5. Consequence for the proof program

Neither universal nor first-mode-prefix \(E\succeq J\) can prove the tree
conjecture. Any successful support-vertex induction needs an additional
reserve that compensates the negative minor, or a different local
condition. The prefix-GSB leaf-induction target remains consistent: on
both witnesses every relevant reserve is positive.
