# Chordal drift and the ISO-reserve cascade

Date: 2026-07-28

Status: the identities and implication in Sections 2--3 are proved.
The proposed chordal extension of terminal drift is now disproved.
Forest drift and the strong reserve inequality remain conjectural.
This note is not a solution of Erdős Problem 993.

## 1. Terminal drift and a falsified chordal extension

The terminal one-step drift needed in the current reduction is

\[
v\le u+1.
\tag{U}
\]

It was initially tempting to regard this as a special case of the
following substantially more general statement.

> **Falsified chordal vertex-deletion statement.**  Let \(Q\) be chordal,
> let \(p\in V(Q)\), put
> \(A=I(Q;x)=\sum a_jx^j\) and
> \(B=I(Q-p;x)=\sum b_jx^j\).  Then, for every internal rank \(r\),
>
> \[
> \boxed{
> (r+1)\frac{a_{r+1}}{a_r}
> \le
> 1+r\frac{b_r}{b_{r-1}}.
> }
> \tag{CD}
> \]

Every terminal forest pair is of this form, with \(Q=T\) and
\(Q-p=F\).  Thus (CD), had it been true, would have proved (U)
immediately, at every rank and without using the order cutoff.

There was a precise structural reason to test chordality.  The
symmetric difference of two independent sets induces a bipartite
graph.  Every induced bipartite subgraph of a chordal graph is a
forest.  That condition, however, is not sufficient.

In factorial counting form, (CD) is

\[
(r+1)a_{r+1}b_{r-1}
\le
r a_rb_r+a_rb_{r-1}.
\tag{1}
\]

The left side counts a pair consisting of an independent
\((r+1)\)-set in \(Q\), an independent \((r-1)\)-set in \(Q-p\), and
a marked element of the larger set.  The two terms on the right count
respectively a marked balanced pair and an unmarked pair whose sizes
differ by one.  This remains the exact injection target when \(Q\)
itself is restricted to be a forest.

The chordal statement is false.  Let \(Q\) be the split graph with a
two-vertex clique \(C\), a six-vertex independent set \(S\), and every
edge between \(C\) and \(S\).  Delete any \(p\in S\).  Then

\[
I(Q;x)=(1+x)^6+2x=(1,8,15,20,15,6,1)
\]

and

\[
I(Q-p;x)=(1+x)^5+2x=(1,7,10,10,5,1).
\]

At \(r=2\), the left and right sides of (1) are respectively

\[
3\cdot20\cdot7=420,
\qquad
2\cdot15\cdot10+15\cdot7=405.
\]

Thus (CD) fails by \(15\), even though \(Q\) is chordal.  Direct
independent-set enumeration and an independent chordality test both
verify the example.  It is not a forest.

Earlier finite tests had found no failure in:

* all terminal forest tests already recorded in the main proof
  program, including all terminal supports of every tree through
  order \(15\), the full PatternBoost corpus at required ranks, and
  large two-level families.

Those forest tests remain valid.  The counterexample shows that the
proof must use global forest acyclicity, not merely acyclicity of each
symmetric-difference component.  The operative drift target is
therefore (U), equivalently (1) restricted to forests.

## 2. The elementary ISO reserve

For \(P(x)=\sum p_jx^j\), define

\[
\mathcal R_j(P)
=j p_j^2+p_{j-1}^2-(j+1)p_{j-1}p_{j+1}.
\tag{2}
\]

If

\[
\mu=j\frac{p_j}{p_{j-1}},
\qquad
q=1+\mu-(j+1)\frac{p_{j+1}}{p_j},
\]

put

\[
R_j(P)=j-\mu+\mu q.
\tag{3}
\]

Direct cancellation gives

\[
\boxed{
R_j(P)=
\frac{j\,\mathcal R_j(P)}{p_{j-1}^2}.
}
\tag{4}
\]

Equivalently, if \(e\) and \(q_{\rm res}\) are the extension-vertex
and residual-edge counts over a uniform independent
\((j-1)\)-set, then

\[
\mathcal R_j(P)\ge0
\quad\Longleftrightarrow\quad
\operatorname{Var}(e)
\le
\mathbb Ee+2\mathbb E q_{\rm res}+j.
\tag{5}
\]

This is much weaker than the false global one-unit-drift inequality.
It survives every rank of:

* all 43,595 PatternBoost tree polynomials;
* every unlabeled tree through order \(16\), comprising 277,096
  rank checks;
* 30,000 random graphs with \(m\le n-1\), as well as every such graph
  in the graph atlas.

Among the trees through order \(16\), the closest relative instance is
the 16-vertex star at rank two.  These tests suggest that (5) may hold
for every forest, or perhaps every graph with at most \(n-1\) edges.
That statement remains unproved.

## 3. Exact reformulation of compensated curvature

Return to the terminal notation \(k=r+1\), and write

\[
q_T=1+v-y,\qquad q_F=1+u-w,
\]

\[
H=2kq_T-rq_F,\qquad
\varepsilon=(w-v)_+.
\]

Define the two normalized ISO reserves

\[
R_T=k-v+vq_T,\qquad
R_F=r-u+uq_F.
\tag{6}
\]

Exact algebra gives

\[
\boxed{
vH
=
(r+2)v-2k^2+\frac{r^2v}{u}
+2kR_T-r\frac vu R_F.
}
\tag{7}
\]

Put \(d=u+1-v\), the drift reserve in (U).  The first three terms in
(7) factor as

\[
(r+2)v-2k^2+\frac{r^2v}{u}
=
\frac{(u-r)(ru-r+2u)}{u}
-\left(r+2+\frac{r^2}{u}\right)d.
\tag{8}
\]

Consequently, in the only branch where curvature is needed,
\(u\ge r\), conditions (U) and

\[
\boxed{
2kR_T-r\frac vuR_F
\ge
\left(r+2+\frac{r^2}{u}\right)(u+1-v)
+2kr(w-v)_+
}
\tag{SR}
\]

imply the compensated-linear inequality

\[
vH\ge2kr(w-v)_+.
\tag{CL}
\]

The discarded remainder is explicitly

\[
\frac{(u-r)(ru-r+2u)}{u}\ge0.
\]

Thus the remaining curvature target can be viewed as a rank-shifting
cascade of the elementary ISO reserves, with exact payments for the
one-step drift deficit and likelihood reversal.

The executable
`verify_terminal_iso_reserve_cascade_reduction.py` checks
(4), (7), (8), and the implication (SR) \(\Rightarrow\) (CL)
symbolically.

The stronger inequality (SR) has no failure in:

* the full PatternBoost corpus: 43,595 trees, all 474,249 terminal
  supports, and 6,620,956 required-prefix rank checks;
* 94,557 required-prefix ranks in the two-level family
  \(t\le8,m\le100\).

The minimum exact PatternBoost margin is
\(846.9960137697\ldots\),
and the minimum exact two-level margin is
\(85.9585057830\ldots\).  A larger two-level audit is running.  These
computations are evidence, not a proof.

## 4. Exact isolated-pendant recurrence

The disconnected terminal pair is a useful closure test.  Let \(B\)
be the independence polynomial of a forest \(H\), take
\(G=H\sqcup K_2\), and choose the \(K_2\) as the pendant pair.  Then

\[
I(F;x)=B,\qquad I(T;x)=(1+x)B.
\]

Write the three consecutive extension means of \(B\) as

\[
u=r\frac{b_r}{b_{r-1}},\qquad
w=(r+1)\frac{b_{r+1}}{b_r},\qquad
h=(r+2)\frac{b_{r+2}}{b_{r+1}},
\]

and put

\[
R=r+u^2-uw=R_r(B),\qquad
R^+=(r+1)+w^2-wh=R_{r+1}(B).
\]

For \(I(T)=(1+x)B\), direct binomial convolution gives

\[
v=\frac{u(r+1+w)}{u+r},
\qquad
y=\frac{w(r+2+h)}{r+1+w}.
\tag{9}
\]

The terminal drift reserve is exactly

\[
\boxed{
u+1-v=\frac{R}{u+r}.
}
\tag{10}
\]

Thus isolated-pendant drift is neither a new inequality nor ordinary
ordered log-concavity: it is exactly the elementary ISO reserve.

There is also an exact one-rank recurrence for the upper reserve:

\[
\boxed{
R_{r+1}((1+x)B)
=
\frac{u}{u+r}R^+
+\frac{u-r}{u}
+\frac{r(u+2)}{u(u+r)}R
-\frac{r}{u(u+r)^2}R^2.
}
\tag{11}
\]

Moreover,

\[
w-v=-\frac{u-r+r(1+u-w)}{u+r}.
\tag{12}
\]

Hence in the relevant branch \(u\ge r\), \(q_F=1+u-w\ge0\),
the likelihood-reversal payment vanishes automatically.

After substituting (10)--(12), the strong reserve-cascade margin,
multiplied by \(u(u+r)^2\), is exactly

\[
\begin{aligned}
\mathcal N={}&
r(u-r-2)R^2\\
&+(u+r)(r^2u+2r^2-ru^2+4r-2u)R\\
&+2u^2(r+1)(u+r)R^+\\
&+2(r+1)(u-r)(u+r)^2.
\end{aligned}
\tag{13}
\]

Therefore the isolated-pendant case of (SR) is the consecutive-rank
reserve inequality \(\mathcal N\ge0\).  This is a sharper target than
treating \(T\) and \(F\) as unrelated polynomials.

The symbolic verifier
`verify_isolated_pendant_iso_reserve_recurrence.py` checks
(9)--(13).  Exact isolated-pendant audits found no failure in all
43,595 PatternBoost tree polynomials, comprising 610,332 relevant
rank checks.  The smallest strong-cascade margin was
\(885.5047455499\ldots\).  A large two-level audit is running.

## 5. Exact hit-reserve decomposition of terminal drift

There is a second exact decomposition of (U) that exposes the local
event for which the ISO reserve pays.  Write

\[
B=I(F;x)=\sum_jb_jx^j,\qquad
C=I(F-N_F(p);x)=\sum_jc_jx^j.
\]

Since \(I(T;x)=B+xC\), put

\[
H=B-C=\sum_jh_jx^j.
\]

Thus \(h_j\) counts the independent \(j\)-sets of \(F\) that hit the
neighbor set \(N_F(p)\).  Let

\[
\rho_j=\frac{h_j}{b_j}
\]

be the corresponding probability under the uniform independent
\(j\)-set.

The coefficient-cleared terminal drift is

\[
\begin{aligned}
D_U
&=(rb_r+b_{r-1})a_r-(r+1)b_{r-1}a_{r+1}\\
&=\boxed{
\mathcal R_r(B)
+(r+1)b_{r-1}h_r
-(rb_r+b_{r-1})h_{r-1}.
}
\tag{14}
\end{aligned}
\]

Because \(u=rb_r/b_{r-1}\) and
\(R_F=r\mathcal R_r(B)/b_{r-1}^2\), multiplying (14) by
\(u/(b_{r-1}b_r)\) gives the normalized identity

\[
\boxed{
\frac{uD_U}{b_{r-1}b_r}
=
R_F+(r+1)u\rho_r-r(u+1)\rho_{r-1}.
}
\tag{15}
\]

In particular, (U) is equivalent to nonnegativity of the right-hand
side.  Rewriting it as

\[
R_F+(u-r)\rho_{r-1}
+(r+1)u(\rho_r-\rho_{r-1})\ge0
\tag{16}
\]

shows the exact division of labor in the branch \(u\ge r\):
the ISO reserve and the mode-side reserve \(u-r\) pay for any decrease
of the neighbor-hit probability between two consecutive ranks.

Plain monotonicity of \(\rho_j\) is false, even for terminal tree
pairs in the required prefix.  In a 10,000-record PatternBoost audit,
there were 2,234 decreases among 570,000 checked ranks, including 322
with \(u\ge r\).  The most negative observed decrement in the latter
branch was approximately \(-0.00324134\).  Nevertheless, (15) was
nonnegative in every case.  On the full PatternBoost corpus,
comprising 43,595 trees, 130,784 terminal supports, and 2,474,055
checked prefix ranks starting at \(r=2\), there were 5,795 decreases
but no terminal-drift failure.  The smallest normalized drift margin
was approximately \(36.7842820\).

The symbolic executable
`verify_terminal_hit_reserve_decomposition.py` checks (14)--(16).
The audit is
`scan_patternboost_terminal_hit_likelihood.py`.

For a terminal support with \(d\) remaining leaf neighbors and at most
one inward neighbor \(q\), the rooted normal form is especially
explicit.  If

\[
I(F;x)=(1+x)^dR(x),\qquad R=E+xJ
\]

at \(q\), then

\[
C=E,\qquad
H=((1+x)^d-1)E+x(1+x)^dJ.
\tag{17}
\]

For the hard degree-two case \(d=0\), \(H=xJ\); hence \(\rho_j\) is
simply the probability that a uniform independent \(j\)-set of \(F\)
contains \(q\).  Formula (16) therefore reduces forest drift to a
quantified one-vertex occupancy-drop bound.

## 6. Revised proof targets

The present proof program can now be split cleanly.

1. Prove terminal drift (U) for forests, preferably by a pointed
   symmetric-difference injection that uses global forest acyclicity,
   or prove the exact occupancy-drop bound (16).  The chordal
   extension (CD) and plain monotonicity of \(\rho_j\) are false.
2. Prove the forest ISO reserve inequality (5), which is a plausible
   base invariant for the same injection.
3. Prove the terminal reserve cascade (SR) in the branch \(u\ge r\).
   Its terms are normalized coefficient reserves rather than opaque
   residual variances, and (8) retains the exact nonnegative payment
   supplied by \(u-r\).

This does not reduce the number of unproved statements below two:
forest drift (U) and (SR) are the operative obligations.  It does, however,
replace the previous coupled variance expression for (CL) with a
sharper rank-shifting reserve identity.
