# Moment and Reserve Form of the Live Negative-Cross Branch

## Status

All identities in this note are proved symbolically.  The final
live-branch inequality remains conjectural.  This is not yet a
solution of Erdős Problem 993.

The reduction is useful because it separates the hard NCL inequality
into two ISO-type reserves, an exact squared mean displacement, and a
small rank/mode correction.  The direct-descent argument shows that
this inequality is needed only when the terminal forest \(T\) is
still rising.

## 1. Notation

Use the terminal notation

\[
r=k-1,\qquad
u=r\frac {b}{b^-},\qquad
v=k\frac {a^+}{a},\qquad
s=\frac ba,
\]

and work on the negative-cross branch

\[
\zeta=v-\frac kr u>0.
\tag{1}
\]

The mixture weight is

\[
\theta=\frac{s}{u/r+s}
=\frac{rs}{u+rs}
=\frac{b^-}{a+b^-}.
\tag{2}
\]

For a uniform independent \((r-1)\)-set of \(F\), let
\(q_F^{\rm res}\) be the number of residual edges and let \(V_F\)
be the variance of its extension count.  Define
\(q_T^{\rm res},V_T\) analogously over uniform independent \(r\)-sets
of \(T\).  Then

\[
q_F=2+\frac{2\bar q_F^{\rm res}-V_F}{u},
\qquad
q_T=2+\frac{2\bar q_T^{\rm res}-V_T}{v}.
\tag{3}
\]

Put

\[
C=rv-ks(r+2).
\tag{4}
\]

## 2. Exact residual-moment form

The NCL margin is

\[
\mathcal N
=v(2kq_T-rq_F)+ks(r+2)q_F
-2k\{s\delta+\theta\zeta^2\}.
\tag{5}
\]

Substituting (3) and collecting gives

\[
\boxed{
\begin{aligned}
\mathcal N={}&
2(r+2)(v+ks)
+4k\bar q_T^{\rm res}-2kV_T\\
&+\frac C u\left(V_F-2\bar q_F^{\rm res}\right)
-2k\{s\delta+\theta\zeta^2\}.
\end{aligned}}
\tag{6}
\]

For a residual forest, edges equal vertices minus nonempty
components.  If \(\bar c_T,\bar c_F\) denote the corresponding
component means, (6) becomes

\[
\boxed{
\begin{aligned}
\mathcal N={}&
4(r+2)(v+ks)-4k\bar c_T-2kV_T\\
&+\frac C u(V_F+2\bar c_F)
-2k\{s\delta+\theta\zeta^2\}.
\end{aligned}}
\tag{7}
\]

Thus NCL is a coupled variance--component inequality.  The only
quadratic term is the squared displacement \(\zeta^2\) between the
two adjacent extension means.

The local log-concavity defect also has an exact moment form:

\[
\boxed{
\delta
=\left(
\frac{V_F-2\bar q_F^{\rm res}-u-u^2/r}{u}
\right)_+.
}
\tag{8}
\]

## 3. ISO-reserve form

Define

\[
R_T=k-v+vq_T,\qquad
R_F=r-u+uq_F.
\tag{9}
\]

These are the normalized elementary ISO reserves:

\[
R_T=k+v+2\bar q_T^{\rm res}-V_T,
\qquad
R_F=r+u+2\bar q_F^{\rm res}-V_F.
\]

Using \(v=ku/r+\zeta\), exact cancellation in (5) gives

\[
\boxed{
\begin{aligned}
\mathcal N={}&
2kR_T-\frac C uR_F\\
&+k(r+2)(u-r)
\left(\frac1r+\frac su\right)\\
&+\zeta\left(r+2+\frac{r^2}{u}\right)
-2k\{s\delta+\theta\zeta^2\}.
\end{aligned}}
\tag{10}
\]

The second line above is to be read as the product

\[
k(r+2)(u-r)\left(\frac1r+\frac su\right).
\]

Formula (10) exhibits the proof target as a rank-shifting reserve
cascade.  The exact square payment is discounted by the mixture
weight \(\theta\), while the linear \(\zeta\)-term records that the
negative-cross branch already supplies a favorable mean shift.

## 4. Coefficient form of the rank/mode correction

Let

\[
U=b^-a^+-ab>0,\qquad
L=(b^-b^+-b^2)_+.
\]

The last two lines of (10), excluding
\(-2k\theta\zeta^2\), equal

\[
\frac{k}{ab b^-}\,\mathcal B,
\]

where

\[
\boxed{
\begin{aligned}
\mathcal B={}&
U\{b(r+2)+b^-r\}\\
&+b(r+2)(a+b^-)(b-b^-)-2kbL.
\end{aligned}}
\tag{11}
\]

Deep in the common decreasing tail, \(\mathcal B\) can be negative
and the reserve cascade absorbs it almost sharply.  Those cases do
not require C12.  On the genuinely live negative-cross branch,
\(v>k\), the known star-fork certificate has a large positive total
margin.

## 5. Exact evidence and negative controls

The verifier
`verify_terminal_negative_cross_moment_form.py` proves (6)--(11)
symbolically and writes
`terminal_negative_cross_moment_certificate_20260729.json`.

The branchwise scanner now distinguishes direct descent from a live
C12 comparison.

* Every terminal pair through tree order \(16\): 270 negative-cross
  checks, all direct descents.
* 5,000 PatternBoost trees at all ranks: 2,001 negative-cross checks,
  all direct descents.
* The graph atlas plus 50,000 random graphs: 911 negative-cross
  checks, all direct descents.
* The rigorous \(m=60\) star-fork example: a live negative-cross
  check with \(v>k\) and positive NCL margin.

An exact abstract coefficient search found a failure after only two
fully checked negative-cross draws, even while enforcing
coefficientwise link containment and

\[
0\le q_F,q_T\le4.
\]

The certificate is
`ncl_abstract_sequence_scan_20260729.json`.  Its coefficient arrays
need not be independence polynomials, so it is not a graph
counterexample.  It proves that (10) cannot follow from the scalar
curvature box and coefficient containment alone; a proof must use
realizability of forest independent sets.

## 6. Common terminal-mixture moments

There is a common probability space for the two reserves.  Choose
\(S\) uniformly from the independent \((r-1)\)-sets of \(F\).  Let

\[
u=\mathbb E e,\qquad \pi=\mathbb E X,
\]

and let

\[
\begin{aligned}
W_2&=\mathbb E[\hbox{ordered independent two-extensions in }F],\\
W_3&=\mathbb E[\hbox{ordered independent three-extensions in }F],\\
Z&=\mathbb E[X(e-L)],\\
Z_2&=\mathbb E[
X\{\hbox{ordered independent two-extensions after deleting }N_p\}].
\end{aligned}
\]

Put

\[
D=u+r\pi,\qquad
N=W_2+kZ,\qquad
Q=W_3+(k+1)Z_2.
\tag{12}
\]

Coefficient double counts give the exact identities

\[
D=r\frac a{b^-},\qquad
N=rk\frac{a^+}{b^-},\qquad
Q=rk(k+1)\frac{a^{++}}{b^-}.
\tag{13}
\]

Consequently

\[
\boxed{
\begin{gathered}
v=\frac ND,\qquad
s=\frac uD,\qquad
\theta=\frac r{D+r},\\
\zeta=\frac ND-\frac kr u,\\
R_T=k+\frac{N^2}{D^2}-\frac QD,\qquad
R_F=r+u^2-W_2.
\end{gathered}}
\tag{14}
\]

Thus both sides of the live NCL comparison are functions of moments
on one uniform level of \(F\), rather than unrelated statistics on
two polynomials.  The executable
`verify_terminal_common_mixture_ncl.py` proves (12)--(14) and the
resulting substitution into (10), writing
`terminal_common_mixture_ncl_certificate_20260729.json`.

## 7. Common down-link decomposition

Condition once more by deleting a uniformly random member of \(S\).
Let \(K\) be the resulting independent \((r-2)\)-set and put

\[
H_K=F-N[K].
\]

When \(K\) avoids the terminal neighbor set, let \(J_K\) be the
corresponding residual graph after that neighbor set is deleted; if
it does not avoid the set, use the empty link contribution.  Under
the natural down-link law \(\mu\), define

\[
A_K=\frac{2i_2(H_K)}{i_1(H_K)},
\qquad
B_K=\frac{6i_3(H_K)}{i_1(H_K)},
\tag{15}
\]

\[
d_K=
\frac{2i_2(H_K)+r i_1(J_K)}{i_1(H_K)},
\qquad
n_K=
\frac{6i_3(H_K)+2k i_2(J_K)}{i_1(H_K)}.
\tag{16}
\]

Let \(\nu\) be the \(d_K\)-size-biased version of \(\mu\), and put

\[
V_K=\frac{n_K}{d_K}.
\]

Then the two global ISO reserves have exact down-link decompositions

\[
\boxed{
R_F=
\mathbb E_\mu[r+A_K^2-B_K]
-\operatorname{Var}_\mu(A_K),
}
\tag{17}
\]

and

\[
\boxed{
R_T=
\mathbb E_\nu\left[
k+V_K^2-\frac{Q_K}{d_K}
\right]
-\operatorname{Var}_\nu(V_K),
}
\tag{18}
\]

where \(Q_K\) is the local ordered-three/link-two expression whose
\(\mu\)-mean is \(Q\).

Substitution into (10) splits NCL into an averaged local term and the
single quadratic correction

\[
\boxed{
\frac C u\operatorname{Var}_\mu(A_K)
-2k\Xi,
}
\tag{19}
\]

where

\[
\boxed{
\begin{aligned}
\Xi
&=\operatorname{Var}_\nu(V_K)
+\theta\left(\mathbb E_\nu V_K-\frac kr u\right)^2\\
&=
\frac1D\mathbb E_\mu\frac{H_K^2}{d_K}
-\frac{(\mathbb E_\mu H_K)^2}{D(D+r)},
\end{aligned}}
\tag{20}
\]

\[
H_K=n_K-\frac kr u\,d_K.
\]

In particular, \(\Xi\ge0\) by Cauchy--Schwarz.  More precisely,
\(\Xi\) is \((D+r)/D\) times the variance of the probability mixture
having mass \(D\) from \(V_K\) under \(\nu\) and an additional atom
of mass \(r\) at \(ku/r\).  Thus the two variances and the squared
mean displacement really are one positive-semidefinite quadratic
form, rather than three unrelated losses.

The executable `verify_terminal_common_downlink_ncl.py` proves
(17)--(20) symbolically and writes
`terminal_common_downlink_ncl_certificate_20260729.json`.

## 8. Remaining target

The operative negative-cross statement is now:

> For every terminal forest pair in the inductive range, if
> \[
> v>\max\left\{k,\frac kr u\right\},
> \]
> then the reserve expression (10) is nonnegative.

Equations (12)--(20) accomplish the down-link expansion.  The remaining
task is to combine the averaged local reserve with (19).  Estimating
its terms independently is likely too wasteful.  Equation (20) shows
that the correct target is a two-measure Poincaré inequality bounding
the single augmented variance \(\Xi\) by the averaged residual-forest
reserve, with the favorable
\((C/u)\operatorname{Var}_\mu(A_K)\) term retained.
