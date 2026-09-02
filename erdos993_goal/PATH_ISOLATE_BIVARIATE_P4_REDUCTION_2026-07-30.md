# Bivariate isolate kernel for the path terminal

Date: 2026-07-30

## Status correction after the extended stable-range audit

The fixed-intersection groups are not all nonnegative, and the
proposed two-layer lift is false outside the earlier finite sweep.
For example,

\[
G(0,9,6,45,0)-G(0,8,6,45,0)
=-370\,223\,319\,778\,868\,094\,596.
\]

At the related full-coefficient point \(q=j=18,\ x=45\), the
\(h=0\) group is negative but the complete coefficient is positive:

\[
H(18,0)=-1\,303\,623\,733\,527\,059\,498\,727\,308,
\]

\[
\sum_{h=0}^{18}H(18,h)
=1\,238\,258\,765\,570\,770\,608\,763\,428\,328.
\]

Thus all groupwise-positivity and monotone-lift statements below
must be read as the historical route that motivated the exact
computations, not as surviving conjectures.  The current replacement
target is compensation across neighboring intersection levels,
starting with \(H(j,0)+H(j,1)\ge0\).  The exact obstruction is
documented in
`PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_COUNTEREXAMPLE_2026-07-30.md`.

## Exact rank-variable mechanism

Use two rank variables \(z,w\), one for each member of an ordered
pair of independent sets.  For a single external isolated vertex,
the four selection states have rank weight

\[
(1+z)(1+w)=1+z+w+zw.
\]

For \(t\) isolates, every pure count-pair enumerator is therefore
multiplied by

\[
A(z,w)^t,\qquad A(z,w)=(1+z)(1+w).
\]

Writing

\[
W(z,w)=A(z,w)-1=z+w+zw,
\]

the coefficient of \(\binom tj\) is obtained by multiplication by
\(W^j\).  Its coefficient expansion is precisely

\[
\binom ta\binom tb
=
\sum_{j=\max(a,b)}^{a+b}
\frac{j!}{(a+b-j)!(j-a)!(j-b)!}\binom tj,
\]

the subset-union rule used in
`derive_path_isolate_layer_direct.py`.

Now take the strong isolated-vertex difference.  The old graph
removes the constant state \(1\), while the lower-rank term removes
the state \(zw\), in which the new isolate is selected in both
members of the ordered pair.  Hence

\[
\boxed{A-1-zw=z+w.}
\]

Consequently the \(j\)-th binomial coefficient of the strong
isolate defect has the pure-count rank factor

\[
\boxed{(z+w)W^j.}
\]

This explains why the path-specific P4 coefficient is

\[
c_{q,j+1}(L)-c_{q-1,j}(L)
\]

and why its direct certificates are simpler than the corresponding
\(c_{q,j+1}\) certificates.

## Residual-moment lift

Let

\[
N_t(y),\quad S_t(y),\quad H_t(y),\quad C_t(y)
\]

be the rank generating functions for the count, total residual
order, squared residual order, and total residual-component count
after adjoining \(t\) isolates.  With \(a=1+y\), direct selection of
the isolate subset gives

\[
\begin{aligned}
N_t&=a^tN,\\
S_t&=a^tS+t\,a^{t-1}N,\\
C_t&=a^tC+t\,a^{t-1}N,\\
H_t&=a^tH+2t\,a^{t-1}S+
\{t\,a^{t-1}+t(t-1)a^{t-2}\}N.
\end{aligned}
\]

Equivalently, introduce markers for residual order and residual
components.  An unselected isolate contributes one unit to both
markers, while a selected isolate contributes the rank variable.
All moment formulas are obtained by differentiating the resulting
local factor and then setting the markers to one.

For the pure-count terms this is the complete cancellation.  The
residual-order and component markers also differentiate the
unselected state, and the two terms with an explicit \(q\) leave a
selected/selected scalar correction.  These are exactly the
derivative-kernel terms mentioned below; they must not be discarded.

Thus the all-layer path P4 theorem reduces to carrying the
root/support phase differential operator through the positive
rank factor \((z+w)W^j\).  The remaining obstruction is not the
isolate convolution: it is the sign of the residual-order/component
derivative kernel after the protected support-leaf recursion.

## Exact evidence

The stable P4 coefficients are proved coefficientwise for
\(j=0,1,2,3,4,5\) by
`prove_path_isolate_stable_p4_layer.py`.  Their shifted positive
remainders have 70, 125, 195, 280, 380, and 495 nonzero monomials,
respectively, with smallest coefficient \(4\).

The finite all-layer stress test is
`stress_path_isolate_stable_p4_all_layers.py`.  It checks 5,421 exact
coefficients over \(5\le q\le30\), \(0\le j\le16\), and
\(0\le x\le12\), with no failure and minimum margin \(1740\).
It is evidence only.

The short-path stress test
`stress_path_isolate_p4_short_lengths.py` independently checks 7,660
exact coefficients over \(5\le q\le24\), all
\(2\le L<2q-4\), and input layers through 16, with no failure.
The excluded adjacent-endpoint case \(L=1\) is now proved for all
ranks in `ADJACENT_ENDPOINT_ISOLATE_P4_THEOREM_2026-07-30.md`.

There is also a stronger surviving grouping in the stable range.
Distinguish the newly added isolate and group the remaining
subset-union terms by

\[
h=|A\cap B|,
\]

the number of ordinary isolates selected in both copies.  Individual
ordered cross-polarizations can be negative, but every complete
fixed-\(h\) group in the current exact sweep is nonnegative, and the
groups sum exactly to
\(c_{q,j+1}-c_{q-1,j}\).  This is now the main candidate for a
uniform-in-\(j\) proof; the finite test is computational evidence,
not yet a theorem.  The durable sweep
`stress_path_isolate_p4_intersection_groups.py` contains 35,165
nonnegative group checks and 4,095 exact coefficient
reconstructions over \(5\le q\le24\), \(0\le x\le12\), and
\(0\le j\le16\), with no failure.  At \(j=1,2\), all five individual
groups have also been proved coefficientwise positive after the
stable shifts by
`prove_path_isolate_p4_intersection_groups.py`.

The extreme edge \(h=j\) is now a theorem for all layers.  For
\(j\ge4\), its support begins at \(q=j+1\).  The substitution
\(j=4+k,\ q=j+1+s,\ L=2q-4+x\) reduces the normalized group to a
positive factorial ratio times a 607-term polynomial in \(k,s,x\);
all coefficients are positive.  See
`PATH_ISOLATE_P4_FULL_INTERSECTION_THEOREM_2026-07-30.md`.

The neighboring edge \(h=j-1\) is also proved uniformly.  Under the
same support substitution, its normalized positive polynomial has
1,199 monomials, degree \((16,13,13)\), and smallest coefficient
\(8\).  See
`PATH_ISOLATE_P4_NEAR_FULL_INTERSECTION_THEOREM_2026-07-30.md`.

The opposite edge \(h=0\) is now proved at its first supported rank.
Writing \(j=2m+\epsilon\), its first nonzero rank is \(q=m+2\).
At \(L=2m+x\), the complete binomial group collapses by path support
to eight terms for even \(j\) and seven terms for odd \(j\).  Exact
simplification gives

\[
\frac{H_{m+2}^{2m+x}(2m,0)}{\binom{2m}{m}}
=\frac{4(12m^3+4m^2x-6m^2+6mx+33m+2x+9)}
{(m+1)(m+2)}
\]

and

\[
\frac{H_{m+2}^{2m+x}(2m+1,0)}{\binom{2m+1}{m}}
=\frac{8(m+1)}{m+2}.
\]

See `PATH_ISOLATE_P4_BOTTOM_EDGE_BASE_THEOREM_2026-07-30.md`.
Extending this boundary to every rank is precisely the candidate
rank-lift inequality

\[
H_q^L(j,0)\ge H_{q-1}^{L-2}(j,0).
\]

A second candidate lift propagates the bottom edge through all
intersection levels:

\[
(h+1)H_q^L(j+1,h+1)
\ge (j+1)H_{q-1}^L(j,h).
\]

Both lifts have extensive exact finite support, recorded by
`stress_path_isolate_p4_bottom_rank_lift.py` and
`stress_path_isolate_p4_intersection_lift.py`, but still require
uniform proofs.

The bottom rank lift is now proved for its first two steps, uniformly
in the layer and stable excess.  If
\(j=2m+\epsilon\), then the groups at
\(q=m+2,m+3,m+4\) are positive and consecutive nondecreasing.  The
proof evaluates the fixed support windows for rank distances
\(s=0,1,2\) and obtains coefficientwise-positive rational
certificates after \(m=3+k\).  See
`PATH_ISOLATE_P4_BOTTOM_EDGE_FIRST_RANK_LIFTS_THEOREM_2026-07-30.md`.

There is also a stronger exact finite pattern.  In both the bottom
group and the intersection-lift residual, order the convolution by
the left-only count \(u\).  Every tested summand list has at most one
sign change, from negative to positive, and every suffix sum is
nonnegative.  This is the natural shape of a Gosper/telescoping or
total-positivity certificate.  The durable audit is
`stress_path_isolate_p4_suffix_positivity.py`; it is evidence, not a
uniform proof.

A dual candidate reduces the unbounded input layer rather than the
rank distance.  With

\[
R_\epsilon(m,s,x)=
\frac{H_{m+s+2}^{\,2m+2s+x}(2m+\epsilon,0)}
{\binom{2m+\epsilon}{m}},
\]

the exact data satisfy

\[
R_\epsilon(m+1,s,x)\ge R_\epsilon(m,s,x).
\]

If proved, this reduces every bottom group to the fixed bases
\(j=6\) and \(j=7\).  The \(j=6,h=0\) base is already certified for
all ranks by `prove_path_isolate_p4_intersection_groups.py`; the
\(j=7\) certificate is the companion computation.  The finite audit
of the layer lift is
`stress_path_isolate_p4_bottom_layer_lift.py`.

The stronger formulation uses the internal group
\(G_q^L(j,h)=H_q^L(j,h)/\binom{j}{h}\), with no central-binomial
normalization.  Exact evidence supports

\[
G_{q+1}^{L+2}(j+2,h)\ge G_q^L(j,h).
\]

This version continues to hold at large fixed intersection sizes
where the central-normalized strengthening fails.  Iterating it
would reduce every group directly to \(h=j\) or \(h=j-1\), the two
edges already proved.  The lift itself is now proved on its first
five support diagonals \(s=-1,0,1,2,3\); see
`PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_BOUNDARY_THEOREM_2026-07-30.md`.

A tempting strengthening at the summand level is false.  In general,
neither
\[
Q_q^L(a,b)\ge 0
\quad\hbox{nor}\quad
Q_{q+1}^{L+2}(a+1,b+1)\ge Q_q^L(a,b)
\]
holds, and symmetrizing \(a,b\) does not repair either inequality.
The exact stress artifact
`path_isolate_p4_kernel_diagonal_lift_stress_20260730.json`
records small counterexamples already at \(q=5,x=0\).  Thus the
positive binomial convolution in \(G\), rather than its individual
summands, is essential.

The Newton expansion of the lift residual has now also been proved
positive through orders \(0,1,2,3,4\), uniformly in all parameters.
See
`PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_INITIAL_NEWTON_THEOREM_2026-07-30.md`.
The exact degree patterns are
\((2r+2,3r+4,2r)\) in the even case and
\((2r+1,3r+2,2r-1)\) in the odd case for \(r\ge1\).
The large-intersection audit and explicit counterexamples to the
central-normalized strengthening are recorded by
`stress_path_isolate_p4_general_layer_lift.py`.

For fixed \(c,m,x,\epsilon\), the unnormalized lift residual is a
polynomial in the support distance \(s\), of degree at most

\[
4c+4m+2x+9+2\epsilon.
\]

The numerical Newton expansion about \(s=-1\) has only nonnegative
coefficients in every tested case.  This follows the elementary
diagonal path identity

\[
\Delta^r\binom{A+s}{B+s}
=\binom{A+s}{B+s+r},
\]

and suggests that a positive Newton-basis expansion is the right
uniform proof.  The exact audit is
`stress_path_isolate_p4_general_layer_lift_newton.py`.

There is now a sharper Newton pattern.  If
\[
F_\epsilon(c,m,x;z)=
\sum_{r\ge0}
\left.\Delta_s^r
\{G(c,m+1,s,x,\epsilon)-G(c,m,s,x,\epsilon)\}
\right|_{s=-1}z^r,
\]
then every exact sample has
\[
F_\epsilon(c,m,x;z)=
(1+z)^{2c+2m+x-1}P_\epsilon(c,m,x;z),
\]
where \(P_\epsilon\) has nonnegative coefficients.  The factor and
quotient claim has passed 150 complete exact polynomials, 1,860 exact
divisions, and 3,726 quotient-coefficient checks.  See
`stress_path_isolate_p4_general_layer_lift_newton_factor.py`.

The quotient appears to satisfy the still stronger coordinate lifts
\[
P(c+1,m,x;z)\succeq P(c,m,x;z),\quad
P(c,m+1,x;z)\succeq P(c,m,x;z),\quad
P(c,m,x+1;z)\succeq P(c,m,x;z),
\]
coefficientwise.  The current durable audit covers 200 complete
polynomials and 12,208 coefficient comparisons without failure.
If these three recurrences are proved, every admissible \(c+m\ge4\)
reduces to one of the ten finite bases
\[
c+m=4,\qquad x=0,\qquad\epsilon\in\{0,1\}.
\]
All ten base polynomials have now been computed exactly and proved
coefficientwise nonnegative by
`prove_path_isolate_p4_general_layer_lift_newton_quotient_bases.py`.
Thus the unrestricted layer lift has a new, finite-base conditional
reduction; the missing part is a uniform proof of the three quotient
recurrences (and of the common factor), not another unstructured
all-parameter inequality.

A separate coefficient-extraction lemma is already unconditional.
For
\[
S_d(A,B,C,D)=
\sum_u\binom du
\binom{u+A}{C-u}
\binom{d-u+B}{D-(d-u)},
\]
one has
\[
S_{d+2}(A+1,B+1,C+1,D+1)\ge S_d(A,B,C,D).
\]
After setting \(Z=z(1+z)\) and \(W=w(1+w)\), the difference is
controlled by
\[
(1+z)(1+w)(Z+W)^2-zw,
\]
a 21-term polynomial with strictly positive coefficients.  See
`PATH_BINOMIAL_CONVOLUTION_TWO_LAYER_LIFT_2026-07-30.md`.
This proves the general lift for every unsigned raw path-count
convolution.  The remaining stable-P4 issue is now localized to the
signed residual-moment combination, for which the same
coefficient-extraction transform has been derived and independently
matched against the direct group computation.

That signed residual now has a much smaller exact normal form.  After
the stable substitution and removal of the common power of
\(T=z(1+z)+w(1+w)\), it is affine in the support distance:

\[
P_\epsilon=T^3K_\epsilon+(s+1)J.
\]

The slope \(J\) is the same in both parities, is independent of every
external parameter, and has a 276-term strictly positive expansion
and an explicit positive factorization containing \(T^5\).  The
remaining kernel \(K_\epsilon\) has parameter degree only
\((2,2,2)\) in \((c,m,x)\).  See
`PATH_ISOLATE_P4_RESIDUAL_AFFINE_SLOPE_THEOREM_2026-08-01.md`.
