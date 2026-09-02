# Three-comparison reduction for the C12 cascade

Date: 2026-07-28

Status: the scalar implications in this note are proved.  Both the
one-vertex curvature comparison (A) and the lower-likelihood comparison
(B) are false at an extreme rank strictly before the order-sensitive
tail of a Galvin instance.  Section 5 gives a proved compensation
repair, and Sections 6--8 give conditional scalar reductions.
The graph hypotheses (C) and (U) are now also known to be false for
finite trees at live rising ranks; see
`PIRD_AND_TERMINAL_BURDEN_COUNTEREXAMPLE_2026-07-29.md`.
Even the weaker downward sign-preservation consequence is false; see
`TERMINAL_DOWNWARD_SIGN_COUNTEREXAMPLE_2026-07-29.md`.
The compensated-linear inequality and full C12 remain positive on
those examples.  This is not yet a solution of Erdős Problem 993.

## 1. Setup

Let \(\ell p\) be a pendant edge of a forest \(G\), and put

\[
T=G-\ell,\qquad F=G-\{\ell,p\}.
\]

Fix \(k\ge3\), put \(r=k-1\), and use the normalized variables

\[
u=r\frac{i_r(F)}{i_{r-1}(F)},\qquad
w=k\frac{i_{r+1}(F)}{i_r(F)},
\]

\[
v=k\frac{i_{r+1}(T)}{i_r(T)},\qquad
s=\frac{i_r(F)}{i_r(T)}.
\]

Write

\[
q_T=\sigma_k(T),\qquad q_F=\sigma_r(F),
\qquad
\theta=\frac{rs}{u+rs}.
\]

The exact C12 scalar from the scaled-curvature reduction is

\[
J=
2kvq_T+
\{ks(r+4)-rv\}q_F+
\frac{2ks(u-r)}r
-2k\theta\left(v-\frac{k}{r}u\right)^2.
\tag{1}
\]

C12 is equivalent to \(J\ge0\).

## 2. The three rooted comparisons

Consider the following statements:

\[
\tag{A}
kq_T\ge rq_F,
\]

\[
\tag{B}
w\le v,
\]

\[
\tag{C}
v\le\frac{k}{r}u.
\]

Statement (A) is the one-vertex scaled-curvature comparison

\[
\tau_k(T)\ge\tau_r(F).
\]

Statements (B)--(C) say that the adjacent extension ratio of \(T\)
lies between the same-rank and preceding-rank extension ratios of
\(F\):

\[
k\frac{i_{r+1}(F)}{i_r(F)}
\le
k\frac{i_{r+1}(T)}{i_r(T)}
\le
\frac{k}{r}
\left(r\frac{i_r(F)}{i_{r-1}(F)}\right).
\]

For a terminal support, (B) is exactly a rooted likelihood-ratio
minor.  It survives the exhaustive small and PatternBoost tests below,
but is slightly false on an extreme Galvin instance.  Condition (C) is
the adjacent rank-shifting cross-ratio inequality.

## 3. Scalar implication

> **Three-comparison lemma.** Suppose \(F\) is a forest, \(q_F\ge0\),
> and (A)--(C) hold.  Then C12 holds.

The universal forest bound \(q_F\le4\) is used below.

Put

\[
x=\frac ur>0,\qquad q=q_F,\qquad
z=kx-v.
\]

Condition (C) gives \(z\ge0\).  Since

\[
w=u-q+1=rx-q+1,
\]

condition (B) gives

\[
z\le kx-w=x+q-1=:M.
\tag{2}
\]

In particular \(M\ge0\), while \(w\ge0\) gives

\[
q\le rx+1.
\tag{3}
\]

There is also a coefficientwise bound that needs no conjecture.
Writing

\[
T=F+xI(T-N[p]),
\]

the coefficient of degree \(r-1\) in \(I(T-N[p])\) is at most
\(i_{r-1}(F)\).  Hence

\[
i_r(T)\le i_r(F)+i_{r-1}(F),
\]

and therefore

\[
s\ge\frac{u}{u+r}=\frac{x}{x+1}.
\tag{4}
\]

Use (A) in (1), and substitute \(v=kx-z\).  This gives

\[
\frac Jk
\ge
s(r+4)q+\frac r k(kx-z)q
+2s(x-1)-2\theta z^2.
\tag{5}
\]

The right side is decreasing in \(z\ge0\).  By (2), it is at least its
value at \(z=M\).  At that endpoint \(kx-M=w\), so the middle term is
\((r/k)wq\ge0\) and may be discarded.  Thus it is enough to prove

\[
(r+4)q+2(x-1)
\ge
\frac{2M^2}{x+s}.
\tag{6}
\]

By (4), the right side is largest when
\(s=x/(x+1)\).  After multiplying by the positive denominator,
(6) is equivalent to

\[
\begin{aligned}
Z_{r,x}(q)
={}&-2(x+1)q^2\\
&+(rx^2+2rx+8x+4)q\\
&+4x^2-2x-2
\ge0.
\end{aligned}
\tag{7}
\]

The admissible interval is

\[
\max(0,1-x)\le q\le\min(4,rx+1),
\tag{8}
\]

using \(M\ge0\), (3), and the universal forest bound \(q\le4\).
The quadratic \(Z_{r,x}\) is concave in \(q\), so it suffices to check
the possible endpoints.  They factor as

\[
Z_{r,x}(0)=2(x-1)(2x+1)
\qquad(x\ge1),
\tag{9}
\]

\[
Z_{r,x}(1-x)
=x(r+2)(1-x)(x+2)
\qquad(0<x\le1),
\tag{10}
\]

\[
Z_{r,x}(4)
=2(2rx^2+4rx+2x^2-x-9)
\qquad\left(x\ge\frac3r\right),
\tag{11}
\]

and

\[
Z_{r,x}(rx+1)
=x(-r^2x^2+5rx+2r+4x+4)
\qquad\left(0<x\le\frac3r\right).
\tag{12}
\]

The first two are immediate.  The bracket in (11) is increasing in
\(x>0\), and at \(x=3/r\) equals

\[
3+\frac{15}{r}+\frac{18}{r^2}>0.
\]

For (12), put \(y=rx\in(0,3]\).  Its bracket becomes

\[
-y^2+5y+2r+\frac{4y}{r}+4.
\]

This is concave in \(y\), and its values at \(0\) and \(3\) are
\(2r+4\) and \(2r+10+12/r\), respectively.  It is therefore positive
throughout the interval.  This proves (7), hence (6), (5), and C12.

## 4. Why this is useful

The previous half-local target was one opaque six-coefficient
inequality with a sharp constant.  The lemma replaces direct control
of that expression by three interpretable rooted comparisons:

1. one-vertex scaled-curvature monotonicity;
2. a terminal rooted likelihood-ratio minor;
3. an adjacent rank-shifting cross-ratio minor.

The first comparison has exactly 18 failures through tree order 15,
all at ranks \(3,4,5\); there are no failures from rank \(6\) onward in
that census.  The lower sandwich has failures only through rank \(6\),
and the upper sandwich has no failure, in the same census.  Ranks
through \(6\) are already covered by independent theorems.

At the still-unsolved ranks \(k\ge7\), all three comparisons pass:

- every terminal-prefix check through tree order \(16\);
- 1,820,135 exact ranks from 130,784 sampled terminal supports in all
  43,595 PatternBoost 60-vertex trees.

The PatternBoost minima of the three margins are respectively

\[
0.4279345\ldots,\qquad
0.4683802\ldots,\qquad
1.0955524\ldots.
\]

However, (B) is not universal.  At the required-prefix outer-rooted
Galvin point

\[
(t,m,r)=(22,9200,141065),
\]

the relative lower-sandwich margin is

\[
-4.9609621\cdot10^{-7}.
\]

At the same point, (A) and (C) remain positive:

\[
\frac{\tau_k(T)}{\tau_r(F)}
=1.00000854966\ldots,
\]

and the relative upper-sandwich margin is

\[
2.3885187\cdot10^{-5}.
\]

Thus the unqualified three-comparison package is false, but it misses
only through a likelihood reversal that is accompanied by positive
curvature surplus.  The next subsection retains that compensation.

## 5. Curvature--likelihood compensation

Put

\[
\eta=kq_T-rq_F,
\qquad
\varepsilon=(w-v)_+.
\]

Continue to assume (C), and assume also

\[
M=x+q_F-1\ge0.
\tag{13}
\]

The latter is the ordinary adjacent ratio drop \(w\le kx\).  Whether
or not (B) holds, one has

\[
0\le z=kx-v\le M+\varepsilon.
\]

Repeating (5), now retaining the curvature surplus, gives

\[
\begin{aligned}
\frac Jk\ge{}&
s(r+4)q_F+\frac r k vq_F+2s(x-1)\\
&+\frac{2v}{k}\eta-2\theta(M+\varepsilon)^2.
\end{aligned}
\tag{14}
\]

The endpoint calculation (7)--(12) proves

\[
s(r+4)q_F+2s(x-1)-2\theta M^2\ge0.
\tag{15}
\]

Consequently the single compensation inequality

\[
\tag{CLC}
\boxed{\qquad
\frac r k vq_F+\frac{2v}{k}\eta
\ge
2\theta\varepsilon(2M+\varepsilon)
\qquad}
\]

implies C12.  When (B) holds and (A) is nonnegative,
\(\varepsilon=0\), so (CLC) is automatic and this reduces to the
three-comparison lemma.  More generally, (CLC) measures exactly how the
ordinary \(F\)-curvature and the signed surplus in (A) pay the
likelihood deficit.

There is a local integral form.  Put

\[
D=(ab^+-ba^+)_+,\qquad
E=b^2-b^-b^+,
\]

where

\[
a=i_r(T),\quad a^+=i_{r+1}(T),\quad
b^-=i_{r-1}(F),\quad b=i_r(F),\quad b^+=i_{r+1}(F).
\]

Under \(E\ge0\), condition (CLC) is equivalent to

\[
\boxed{
\begin{aligned}
&(a+b^-)b
\{2kG_k(T)b^-b-r aa^+G_r(F)\}\\
&\qquad\ge
2k^2b^-D(2aE+b^-D).
\end{aligned}}
\tag{16}
\]

Thus the remaining defect is a quadratic payment for the negative part
of one adjacent rooted determinant.  The factor on the left contains
the two-to-one one-vertex curvature reserve

\[
2\tau_k(T)-\tau_r(F),
\]

so (16) remains meaningful even when the stronger comparison (A)
slightly reverses.

At the Galvin point above, \(M=2.86913184\ldots>0\), and the right side
of (CLC) is only

\[
7.5500739\cdot10^{-7}
\]

of the left side.  Thus the structured counterexample to (B) is very
far from violating the repaired comparison.

The sharper order-sensitive cutoff does not remove every reversal.
For the terminal Galvin instance with

\[
(t,m)=(28,50000),
\]

the terminal tree has

\[
|Q|=2\,850\,002,\qquad
\alpha(Q)=1\,450\,001,\qquad
L_*(Q)=961\,047.
\]

At the last two-step interior rank

\[
r=961\,045,\qquad k=r+1=961\,046<L_*(Q),
\]

a rigorous 384-bit Arb calculation, with the omitted positive
rare-branch tail enclosed by

\[
4.32\cdot10^{-104},
\]

gives

\[
\eta=-0.3250094813\ldots,\qquad
v-w=-0.0578647200\ldots.
\]

Thus (A) and (B) both genuinely fail in the required range.  Meanwhile

\[
\frac{\mathrm{CLC}_{\rm right}}
     {\mathrm{CLC}_{\rm left}}
=1.0361174762\cdot10^{-7},
\]

while (C) and \(M\ge0\) have margins

\[
2.9713114021\ldots,\qquad 2.9134466821\ldots.
\]

So the compensation repair is not merely protecting an irrelevant
tail rank: it is necessary at a live rank and retains more than seven
orders of magnitude of reserve there.

`verify_three_comparison_c12_reduction.py` checks every algebraic
identity and endpoint factorization in Sections 3 and 5.
`verify_galvin_three_comparison_arb.py` independently certifies the
last Galvin instance and all displayed signs using interval arithmetic.

## 6. A simpler sufficient package for the repaired comparison

There is a sharper route which removes the assumption \(M\ge0\)
entirely.  Put

\[
H=2kq_T-rq_F.
\]

> **Linear-package scalar lemma.** Let \(r\ge6\).  Suppose
> \(0\le q_F\le4\), condition (C) holds, and

\[
\tag{D}
r\varepsilon\le v,
\]

\[
\tag{E}
H\ge7.
\]

> Then \(J\ge0\), so C12 holds.

Here is the reduction to a compact scalar inequality.  Put

\[
z=kx-v,\qquad M=x+q_F-1.
\]

Condition (C) gives \(z\ge0\), while

\[
\varepsilon=(z-M)_+.
\]

If \(z\le M\), then

\[
z\le M\le x+\frac r kM,
\]

because \(x-M/k=w/k\ge0\).  If \(z>M\), condition (D) gives

\[
r(z-M)\le kx-z,
\]

and hence the same upper bound.  Therefore

\[
0\le z\le Z:=x+\frac r k(x+q_F-1).
\tag{17}
\]

The exact C12 scalar (1) can be regrouped, without an estimate, as

\[
\boxed{
\frac Jk
=s\{(r+4)q_F+2(x-1)\}
+\frac vkH-2\theta z^2.
}
\tag{18}
\]

Since \(H\ge7\), it remains only to prove

\[
2\theta z^2
-s\{(r+4)q_F+2(x-1)\}
\le\frac7k(kx-z).
\tag{19}
\]

The left side minus the right side is increasing in \(z\ge0\), so
(17) reduces it to \(z=Z\).  After multiplication by
\((x+s)>0\), the resulting expression is a convex quadratic in
\(q_F\).  The constraints

\[
0\le q_F\le4,\qquad
w=rx-q_F+1\ge0,\qquad Z\ge0
\]

reduce its maximum to four endpoint types:

\[
q_F=0,\quad q_F=4,\quad Z=0,\quad w=0.
\]

Write \(R=6/r\in(0,1]\), and parameterize

\[
s=\frac{x+Y}{x+1},\qquad 0\le Y\le1.
\]

The two unbounded \(x\)-ranges use \(x=1/X\).  The bounded ranges use

\[
\begin{aligned}
q_F=0:\quad&
x=\frac6{12+R}
+\left(1-\frac6{12+R}\right)X,\\
q_F=4:\quad&
x=\frac R2+\left(1-\frac R2\right)X,\\
Z=0:\quad&
x=\frac{6X}{12+R},\\
w=0:\quad&
x=\frac{RX}{2},
\end{aligned}
\qquad 0\le X\le1.
\]

After clearing positive denominators, the six resulting polynomials
have respectively

\[
90,\ 45,\ 105,\ 60,\ 90,\ 75
\]

tensor Bernstein coefficients on \([0,1]^3\).  All 465 coefficients
are nonnegative.  This proves (19), then (18), and hence C12.
The exact executable certificate is
`verify_linear_compensation_c12_scalar.py`.

The coefficient forms of the remaining graph-theoretic hypotheses are
short.  Condition (C) is

\[
\boxed{\quad b^-a^+\le ab.\quad}
\tag{20}
\]

Condition (D), including the branch \(\varepsilon=0\), is simply

\[
\boxed{\quad r\,a b^+\le k\,b a^+.\quad}
\tag{21}
\]

Finally, the constant curvature floor (E) is

\[
\boxed{
2kG_k(T)b^-b-rG_r(F)aa^+
\ge7aa^+b^-b.
}
\tag{22}
\]

Thus, after the already-proved ranks through six, the nonlinear C12
payment is reduced to the three coefficient inequalities
(20)--(22).  No prefix log-concavity assumption is present in this
package.

## 7. A compensated-linear package with only two graph inequalities

The separate hypotheses (D) and (E) can be replaced by one inequality.
Continue to put

\[
H=2kq_T-rq_F,\qquad
\varepsilon=(w-v)_+.
\]

> **Compensated-linear scalar lemma.** Let \(r\ge6\).  Suppose
> \(0\le q_F\le4\), condition (C) holds, and

\[
\tag{CL}
\boxed{\qquad vH\ge2kr\varepsilon.\qquad}
\]

> Then \(J\ge0\), so C12 holds.

Here is the proof.  As in Section 6, put

\[
x=\frac ur,\qquad
z=kx-v,\qquad
M=x+q_F-1.
\]

Condition (C) gives \(z\ge0\), and

\[
\varepsilon=(z-M)_+.
\]

The exact regrouping (18) and (CL) give

\[
\frac Jk
\ge
s\{(r+4)q_F+2(x-1)\}
+2r\varepsilon-2\theta z^2.
\tag{23}
\]

If \(\varepsilon=0\), then \(0\le z\le M\), so \(M\ge0\), and the
already-proved endpoint inequality (15) makes (23) nonnegative.

Suppose \(\varepsilon>0\).  Every forest satisfies

\[
q_T\le4.
\]

Since \(q_F\ge0\),

\[
H=2kq_T-rq_F\le8k.
\]

Combining this with (CL), and using
\(v=w-\varepsilon\), gives

\[
r\varepsilon\le4v=4(w-\varepsilon),
\]

or

\[
0<\varepsilon\le
\varepsilon_{\max}:=\frac{4w}{r+4}.
\tag{24}
\]

For fixed \(r,x,q_F,s\), the right side of (23), with
\(z=M+\varepsilon\), is a concave quadratic in \(\varepsilon\).
Its minimum on the feasible interval therefore occurs at an endpoint.

At the lower endpoint, either \(\varepsilon=0\), already handled, or
\(M<0\) and \(\varepsilon=-M\).  In the latter case \(z=0\).  Put
\(t=1-x\); then \(0\le q_F<t\), and (23) becomes

\[
(2r-2s)t+\{s(r+4)-2r\}q_F.
\]

The coefficient of \(q_F\) is nonpositive for \(r\ge6\), so this is at
least its value at \(q_F=t\), namely

\[
s(r+2)t\ge0.
\tag{25}
\]

It remains to use the upper endpoint in (24).  Put

\[
\varepsilon=\frac{4w}{r+4},\qquad
z=M+\frac{4w}{r+4}.
\]

After multiplication by \(x+s>0\), the right side of (23) is a
concave quadratic in \(q_F\).  Its feasible interval is determined by

\[
0\le q_F\le4,\qquad w\ge0,\qquad z\ge0.
\]

Hence it is enough to check

\[
q_F=0,\quad q_F=4,\quad z=0,\quad w=0.
\]

Put \(R=6/r\in(0,1]\) and

\[
s=\frac{x+Y}{x+1},\qquad 0\le Y\le1.
\]

The six compact parameterizations are

\[
\begin{aligned}
q_F=0:\quad&
x=\frac6{30+4R}
+\left(1-\frac6{30+4R}\right)X,\\
q_F=4:\quad&
x=\frac R2+\left(1-\frac R2\right)X,\\
z=0:\quad&
x=\frac{6X}{30+4R},\\
w=0:\quad&
x=\frac{RX}{2},
\end{aligned}
\qquad 0\le X\le1,
\]

together with \(x=1/X\) for the two unbounded ranges.  After clearing
positive denominators, the six polynomials have respectively

\[
120,\ 60,\ 105,\ 60,\ 90,\ 75
\]

tensor Bernstein coefficients on \([0,1]^3\).  All 510 coefficients
are nonnegative.  This proves the upper endpoint, then (23), and hence
C12.  The exact certificate is
`verify_compensated_linear_c12_scalar.py`.

The coefficient form of (CL) is also short.  Put

\[
D=(ab^+-ba^+)_+.
\]

Then (CL) is equivalent to

\[
\boxed{
2k\,b^-b\,G_k(T)
-r\,aa^+G_r(F)
\ge
2kr\,a b^-D.
}
\tag{26}
\]

Consequently the unresolved ranks now require only

\[
b^-a^+\le ab
\]

and the compensated curvature--likelihood inequality (26).  Neither
statement assumes prefix log-concavity.

## 8. Replacing the cross-ratio by a one-step drift inequality

There is a more natural condition which suffices in the sign induction.
Define

\[
\tag{U}
\boxed{\qquad v\le u+1.\qquad}
\]

In coefficients this is

\[
\boxed{
(r b+b^-)(a)\ge k b^-a^+.
}
\tag{27}
\]

For the terminal normal form \(T=F+xC\), (27) is

\[
G_r(F)
+c_{r-1}(rb+b^-)
-k b^-c_r
\ge0.
\tag{28}
\]

Condition (U) replaces (C) as follows.

If \(u\ge r\), then

\[
u+1\le\frac{k}{r}u,
\]

so (U) implies (C), and Sections 7 and 3 give C12.

If \(u<r\), then

\[
b<b^-.
\]

Condition (U) also gives \(v<k\), hence

\[
a^+<a.
\]

By induction, both \(I(F)\) and \(I(T)\) are unimodal.  Therefore both
sequences continue decreasing from these positions onward.  Since

\[
I(G)=I(T)+xI(F),
\]

their shifted sum also continues decreasing:

\[
i_j(G)=i_j(T)+i_{j-1}(F)
\]

has no later rise.  In this case no curvature inequality at the current
or any later rank is needed.

Consequently:

> **Two-obligation conditional solution theorem.**  After the proved
> ranks through six, it is enough to establish, for every required
> terminal pair, the one-step drift inequality (U) and the
> compensated curvature--likelihood inequality (26) whenever \(u\ge r\).
> These two statements imply unimodality of every tree and forest.

The downward use of (U) cannot be salvaged by retaining only its sign.
The exact \(m=60\) star-fork construction in
`TERMINAL_DOWNWARD_SIGN_COUNTEREXAMPLE_2026-07-29.md` has \(u<r\)
but \(v>k\).  The all-branch and sharper branchwise lemmas in
`TWO_SIDED_CURVATURE_LIKELIHOOD_COMPENSATION_2026-07-29.md` replace
this obsolete two-obligation theorem.

The drift statement is genuinely acyclic rather than a generic
simplicial-complex fact.  Let \(F=K_{2,10}\), choose \(q\) in the
two-vertex bipartition class, and add a new leaf at \(q\).  At \(r=2\),

\[
I(F)=(1+x)^2+(1+x)^{10}-1,
\]

and

\[
u=\frac{23}{3},\qquad
v=\frac{165}{19}.
\]

Thus

\[
u+1-v=-\frac1{57}.
\]

In contrast, (U) has no failure in 373,814 all-rank terminal checks
from every unlabeled tree through order \(15\), or in the all-rank
two-level scan through \(t=8,m=50\).  A further all-rank audit of
10,000 PatternBoost 60-vertex trees checks 720,000 ranks without a
failure; its minimum margin is

\[
0.6196276693\ldots.
\]

These computations are evidence, not a proof.
