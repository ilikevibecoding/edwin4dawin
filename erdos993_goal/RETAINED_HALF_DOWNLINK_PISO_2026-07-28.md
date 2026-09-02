# Retained-half down-link target for pointed ISO

Date: 2026-07-28

Status: the identities and conditional implication below are proved.
The retained-half inequality is conjectural.  This is not a solution
of Erdős Problem 993.

## 1. Setup

Let \(F\) be a forest rooted at \(q\), let

\[
B=I(F;x)=\sum_j b_jx^j,
\qquad
u=r\frac{b_r}{b_{r-1}},
\]

and let \(\mathcal B_{r,q}\) be the pointed occupancy burden from
`POINTED_ISO_HALF_RESERVE_2026-07-28.md`.  Write

\[
M_r=R_r(B)-2\mathcal B_{r,q}.
\]

Thus \(M_r\ge0\) is the pointed ISO inequality (PISO).  PISO implies
the terminal one-step drift inequality needed by the current
unimodality reduction.

Choose a uniform independent \((r-1)\)-set \(S\), delete a uniformly
random member, and call the remaining \((r-2)\)-set \(K\).  Conditional
on \(K\), the deleted member is uniform on the residual forest
\(F-N[K]\).  Put

\[
A_K=\mathbb E(e\mid K),
\qquad
p_K=\mathbb E(Y\mid K),
\]

where \(e\) is the number of extensions of \(S\) and \(Y\) indicates
that \(q\in S\).

Let \(C_K=\operatorname{Cov}(Y,e\mid K)\) and let
\(Z_K=\mathbb E((1-Y)L\mid K)\), where \(L\) is the local pointed
extension count.  Write \(p=\mathbb Ep_K\).

## 2. Exact down-link identity

Let \(M_2^{\rm raw}(K)\) be the formal rank-two pointed ISO margin on
the fiber over \(K\).  The laws of total variance and covariance give

\[
\boxed{
M_r=\mathbb E M_2^{\rm raw}(K)+C_r,
}
\tag{1}
\]

where

\[
\boxed{
C_r=
(r-2)\left\{1-2p+2\mathbb E(C_K+Z_K)\right\}
-\operatorname{Var}(A_K)
+2r\operatorname{Cov}(A_K,p_K).
}
\tag{2}
\]

Some formal fibers do not carry the operative pointed rank-two
problem.  If \(K\) already contains \(q\), the hit event is inherited
and certain.  If the residual forest has fewer than two vertices, the
fiber is a boundary case.  On those fibers use the ordinary rank-two
ISO margin; on all other fibers use the pointed rank-two margin.
Denote the resulting quantity by

\[
\widetilde M_2(K).
\]

The rank-two forest theorem already proves

\[
\widetilde M_2(K)\ge0
\tag{3}
\]

on every fiber.

## 3. Retained-half target

The new candidate is

\[
\boxed{
2M_r\ge\mathbb E\widetilde M_2(K)
\qquad (u\ge r).
}
\tag{RH-PISO}
\]

This is stronger than PISO but weaker than requiring the down-link
correction to be nonnegative.  By (3), RH-PISO immediately gives
\(M_r\ge0\), hence PISO and terminal drift.

If

\[
J_r=
\mathbb E\{\widetilde M_2(K)-M_2^{\rm raw}(K)\},
\]

then (1) gives the two equivalent forms

\[
\boxed{
2M_r-\mathbb E\widetilde M_2
=\mathbb E M_2^{\rm raw}+2C_r-J_r
=M_r+C_r-J_r.
}
\tag{4}
\]

The executable `verify_retained_half_downlink_piso.py` verifies
(1), (2), and (4) symbolically from the moment formulas.

## 4. Why the retained half matters

Discarding \(C_r\) is invalid.  Through tree order \(13\), there are
4,042 rooted-rank instances in the branch \(u\ge r\) where the
applicable correction

\[
M_r-\mathbb E\widetilde M_2
\]

is negative.  Nevertheless, RH-PISO has no failure in any of the
85,052 instances.

The same obstruction persists at every conditioning depth.  For the
60-vertex rooted broom whose root has 20 leaf neighbors and one path
branch of order 39, at global rank \(r=6\), the pointed-reserve
corrections obtained by conditioning down to local ranks
\(s=2,3,4,5\) are respectively approximately

\[
-4.7400,\quad -3.8478,\quad -2.7784,\quad -1.5010.
\]

All are negative, while the corresponding averaged local pointed
reserves are approximately \(101\)–\(104\).  Thus no fixed
conditioning depth makes every correction nonnegative; retained
local reserve is essential.

## 5. Exact evidence

There is no failure of RH-PISO in the following exact audits.

* Every rooted unlabeled tree through order \(13\) in the branch
  \(u\ge r\): 85,052 checks.  There are 4,042 negative applicable
  corrections, but zero retained-half failures.
* The unresolved slice \(r\ge6\) of that census: 64 checks.  Its
  minimum retained-half margin is
  \[
  \frac{521}{35}=14.885714\ldots.
  \]
* Twelve adversarial rooted brooms of order \(60\): 398 rank checks,
  zero failures.  The smallest retained-half PISO margin among these
  is approximately \(53.3345\).
* Fifteen rooted random trees of order \(60\): 495 exact rank checks,
  zero failures.
* Ten disjoint two-star parameter choices, with roots at both centers,
  both leaf types, and an isolate when present: 49 rooted forests and
  2,336 exact rank checks, zero failures.
* Ten random five-component forests of order \(60\), with three roots
  per forest: 999 exact rank checks, zero failures.
* The disconnected family
  \[
  K_{1,m}\sqcup tK_1,
  \qquad
  1\le m\le50,\quad0\le t\le50,
  \]
  with the root separately at the center, a leaf, and an isolate:
  154,629 prefix checks at \(r\ge6\), zero failures.  The minimum is
  \[
  \frac{6375674}{557283}
  =11.44063967\ldots
  \]
  at \(m=4,t=8,r=6\), rooted at the center.

The principal replay files are

* `scan_downlink_pointed_correction.py`,
* `audit_residual_dp_component_b_cauchy.py`, and
* `scan_star_isolates_piso_halflift.py`.

## 6. Exact scope

The hypothesis \(u\ge r\) is essential.  When all ranks are included,
the tree census through order \(10\) contains 586 retained-half
failures and 234 failures of PISO itself.  Those occur in the
post-mode branch that the unimodality reduction does not use.

The remaining proof target is therefore sharply scoped:

> Prove RH-PISO for forest independence complexes in the prefix branch
> \(u\ge r\), or only for \(r\ge7\) under the exact room condition
> required by the terminal reduction.

This would settle the terminal-drift obligation.  The separate strong
reserve cascade needed for compensated curvature would still remain.

## 7. Square completion and the half-blocked split

There is a more local form of RH-PISO.  For each down-link fiber put

\[
D_K=1-2p_K+2(C_K+Z_K),
\]

and let

\[
J_K=\widetilde M_2(K)-M_2^{\rm raw}(K)
\]

be its applicable-fiber adjustment.  Define

\[
\begin{aligned}
\Phi_K={}&M_2^{\rm raw}(K)-J_K+2(r-2)D_K\\
&+2r^2(p_K-p)^2
-2\{A_K-u-r(p_K-p)\}^2.
\end{aligned}
\tag{5}
\]

Since \(\mathbb EA_K=u\) and \(\mathbb Ep_K=p\), completing the square
gives

\[
\boxed{
\mathbb E\Phi_K
=2M_r-\mathbb E\widetilde M_2(K).
}
\tag{6}
\]

Partition the fibers according to the state of the root after fixing
\(K\):

* selected: \(q\in K\);
* blocked: \(q\notin K\) but \(q\notin F-N[K]\);
* open: \(q\in F-N[K]\).

Write \(\Phi_{\rm sel},\Phi_{\rm blk},\Phi_{\rm open}\) for the three
expectations with the corresponding indicators.  The strongest
surviving local target is

\[
\boxed{
\Phi_{\rm sel}+\frac12\Phi_{\rm blk}\ge0,
\qquad
\Phi_{\rm open}+\frac12\Phi_{\rm blk}\ge0.
}
\tag{HB-split}
\]

The two inequalities add to (6), so HB-split implies RH-PISO.

Neither pointwise positivity nor positivity of the open subtotal is
true.  In the 60-vertex broom audit, 26 open subtotals are negative.
The blocked reserve is genuinely needed.  Nevertheless HB-split has
no failure in:

* every \(r\ge6\) rooted-tree check through order \(13\);
* 162 required-rank checks on 12 rooted 60-vertex brooms;
* 940 checks on 49 rooted two-star forests;
* a 170-root grid of star-plus-isolates forests, comprising 2,056
  rank checks; and
* the initial connected and five-component random 50-vertex audit.

The lower-rank hypothesis matters: selected fibers require more than
half the blocked subtotal in 44 prefix instances through order \(10\).
Those are below the \(r\ge6\) range left by the proved fixed-rank
theorems.

The executable `verify_retained_half_square_completion.py` verifies
(5)--(6).  The degree-square residual-state audit is
`audit_retained_half_state_partition.py`.

## 8. Proved infinite family at the first unresolved rank

The HB-split target is now proved, rather than merely checked, for the
center-rooted star-plus-isolates family at \(r=6\).

**Proposition.**  Let

\[
F=K_{1,m}\sqcup tK_1
\]

and root \(F\) at the center of the star.  At \(r=6\), if
\(b_5>0\) and \(b_6\ge b_5\), then both HB-split inequalities are
strictly positive.  The two neighbor-multiplicity half inequalities
(NMH-sel)--(NMH-open) from Section 9 are also strictly positive.

Here

\[
b_j=\binom{m+t}{j}+\binom{t}{j-1}
\]

and hence the prefix condition has the transparent form

\[
b_6-b_5
=
\binom{m+t}{5}\frac{m+t-11}{6}
+
\binom t4\frac{t-9}{5}.
\tag{7}
\]

There are only six down-link symmetry types: a selected fiber
consists of the center and three isolates, while a root-avoiding
fiber contains \(a\) star leaves and \(4-a\) isolates for
\(0\le a\le4\).  Substituting the exact residual orders, edge counts,
degree-square sums, and root degrees into (5) gives rational
expressions

\[
H_{\rm sel}
=\Phi_{\rm sel}+\tfrac12\Phi_{\rm blk},
\qquad
H_{\rm open}
=\Phi_{\rm open}+\tfrac12\Phi_{\rm blk}.
\]

Their denominators are respectively

\[
2(120b_5)^3,\qquad
2(m+t-3)(120b_5)^3,
\]

which are positive on the stated domain.  Positivity of the two
numerators, and of the two NMH numerators obtained by transferring
half of the unique-hit subtotal, has the following exact coefficient
certificate.

* For \(t\ge9,m\ge1\), substitute \(t=9+y,m=1+x\).
* For \(m=0\), (7) forces \(t\ge10\); substitute \(t=10+x\).
* For \(0\le t\le3\), (7) forces \(m\ge11-t\); fix \(t\) and
  substitute \(m=11-t+x\).
* For \(4\le t\le8\), (7) forces \(m\ge12-t\); fix \(t\) and
  substitute \(m=12-t+x\).

In all 44 resulting numerator polynomials (four margins across eleven
parameter cells), every coefficient is a strictly positive integer.
Since \(x,y\ge0\), all four numerators are positive.  This proves the
proposition.

The derivation and independently replayable coefficient check are

* `derive_star_isolates_r6_blocked_split.py`,
* `certify_star_isolates_r6_blocked_split.py`,
* `star_isolates_r6_blocked_split_symbolic_20260728.json`, and
* `star_isolates_r6_blocked_split_certificate_20260728.json`.

Running the derivation followed by the verifier yields
`PASS: 44 positive-coefficient certificates`.  Direct residual-state
enumeration also agrees on the small fibers where the residual order
is zero or one.

This proposition establishes HB-split on a sharp disconnected
infinite family at the first unresolved rank.  It does not yet prove
HB-split for arbitrary forests, and it does not discharge the
separate strong-reserve/curvature obligation in the full reduction of
Problem 993.

## 9. Neighbor-multiplicity refinement

The blocked class has a useful further partition.  If
\(K\) is blocked, let

\[
\nu(K)=|K\cap N(q)|.
\]

Write \(\Phi_{B_1}\) for the subtotal over \(\nu(K)=1\), and
\(\Phi_{B_{\ge2}}\) for the subtotal over \(\nu(K)\ge2\).

There is an exact structural map on the one-hit class.  If

\[
K=J\mathbin{\dot\cup}\{w\},
\qquad
w\in N(q),
\qquad
J\cap N(q)=\varnothing,
\]

then replacing \(w\) by \(q\) produces the selected fiber

\[
K' = J\mathbin{\dot\cup}\{q\}.
\]

Because \(F\) is a forest, the branches at distinct neighbors of
\(q\) are disjoint after \(q\) is removed.  This makes the swap a
plausible basis for a fiberwise charging proof.

The most literal partition,

\[
\Phi_{\rm sel}+\Phi_{B_1}\ge0,
\qquad
\Phi_{\rm open}+\Phi_{B_{\ge2}}\ge0,
\tag{8}
\]

is false.  An exact two-star counterexample is

\[
K_{1,8}\sqcup K_{1,96}\sqcup63K_1,
\qquad r=83,
\]

rooted at the first center.  Its first margin in (8) is

\[
-\frac{
144480217869357369858
}{
2644611438966906959369
}
=-0.0546319\ldots.
\]

The failure is tiny compared with the unused multi-hit reserve.  A
first attempted repair was the rank-weighted split

\[
\boxed{
\Phi_{\rm sel}
+\Phi_{B_1}
+\frac1{r-2}\Phi_{B_{\ge2}}
\ge0,
}
\tag{9}
\]

\[
\boxed{
\Phi_{\rm open}
+\frac{r-3}{r-2}\Phi_{B_{\ge2}}
\ge0.
}
\tag{10}
\]

The factor \(1/(r-2)\) is the uniform averaging weight over the
vertices of a down-link \((r-2)\)-set.  This repair passes all
moderate-size tests below, but it is false asymptotically.  An exact
finite counterexample is

\[
K_{1,9}\sqcup K_{1,2}\sqcup1639K_1,
\qquad r=825,
\]

rooted at the center of \(K_{1,9}\).  The selected-side margin in
(9) is

\[
-\frac{
26269886146089781012106568192864302590212785526604
}{
135424810626027450667259848430087864091270937288667643
}
=-0.000193981339\ldots.
\]

At the same rank, both original HB-split margins are strongly
positive; the selected one is approximately \(1185.59\).  Thus the
counterexample falsifies only the attempted rank-sensitive
refinement, not RH-PISO or HB-split.

The neighbor-aware split that still survives is

\[
\boxed{
\Phi_{\rm sel}
+\Phi_{B_1}
+\frac12\Phi_{B_{\ge2}}
\ge0,
}
\tag{NMH-sel}
\]

\[
\boxed{
\Phi_{\rm open}
+\frac12\Phi_{B_{\ge2}}
\ge0.
}
\tag{NMH-open}
\]

These coefficients again add to one, so the two inequalities imply
RH-PISO.  Compared with HB-split, all of the unique-hit subtotal is
assigned to the selected side, where the explicit swap is available;
only the collision class is divided in half.

There is no failure of the surviving neighbor-multiplicity half split
in:

* all 64 prefix rooted-tree instances with \(r\ge6\) through order
  \(13\);
* 162 prefix ranks on the twelve adversarial order-60 brooms;
* 36,242 exact prefix ranks from 528 two-star-plus-isolates parameter
  choices with each parameter at most \(100\); and
* 180 prefix ranks from 24 random connected and five-component
  forests of order \(40\); and
* 62 prefix ranks at maximum-degree roots of five evenly spaced
  60-vertex trees from the published PatternBoost adversarial corpus.

The two-star scan includes very imbalanced and symmetric boundary
families.  Its smallest selected-side NMH margin is approximately
\(5.89666\), at

\[
(m,s,t,r)=(5,5,5,6).
\]

The exact residual-state implementations are

* `audit_hb_neighbor_multiplicity.py`, and
* `scan_two_stars_hb_split_fast.py`.

Both contain independent small-forest self-tests against literal
independent-set enumeration.  The exact falsification certificate for
(9) is
`two_stars_rankshare_counterexample_9_2_1639_20260728.json`.

NMH remains conjectural, but it identifies a concrete proof
mechanism: prove the unique-hit swap payment, then use half of the
multi-hit collision reserve on each side.  The failed
\(1/(r-2)\) version shows that the collision payment cannot in
general decay to zero with rank.
