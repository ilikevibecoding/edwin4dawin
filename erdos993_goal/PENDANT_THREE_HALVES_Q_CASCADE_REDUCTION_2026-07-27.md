# Pendant three-halves reserve cascade

Date: 2026-07-27

Status: **exact conditional reduction with extensive evidence; the
cascade inequality remains conjectural**.

## Reserve and cascade

For \(P(x)=\sum_jp_jx^j\), define

\[
Q_k(P)
=2kp_k^2-p_{k-1}p_k-2(k+1)p_{k-1}p_{k+1}
\]

and the scaled reserve

\[
\mathcal K_k(P)=\frac{kQ_k(P)}{p_{k-1}}.
\tag{1}
\]

Let \(\ell p\) be a pendant edge of a forest \(G\), and put

\[
F=G-\{\ell,p\}.
\]

The proposed pendant three-halves cascade is

\[
\tag{Q-Cascade}
\boxed{
\mathcal K_k(I(G))\ge\mathcal K_{k-1}(I(F))
\qquad(4\le k<L(G)).
}
\]

Clearing positive denominators gives the exact integer inequality

\[
\boxed{
k\,i_{k-2}(F)Q_k(I(G))
\ge
(k-1)i_{k-1}(G)Q_{k-1}(I(F)).
}
\tag{2}
\]

This is the inequality tested by all executable scans below.

The relation to the earlier GSB cascade is transparent.  If

\[
H_k(P)=\frac{kG_k(P)}{p_{k-1}},
\]

then

\[
\boxed{
\mathcal K_k(P)=2H_k(P)-3kp_k.
}
\tag{3}
\]

Thus Q-Cascade says that the ordinary pendant GSB cascade has enough
quantitative margin to pay the coefficient difference required by the
three-halves reserve.

In the residual-forest formulation, if

\[
\mathcal S_Q(r)
=2\mathbb E q+\frac12\mathbb E e-\operatorname{Var}(e)
\]

for a uniform independent \(r\)-set, then

\[
\mathcal S_Q(k-1)
=\frac{kQ_k(P)}{2p_{k-1}^2},
\qquad
\mathcal K_k(P)=2p_{k-1}\mathcal S_Q(k-1).
\tag{4}
\]

So the cascade is a pendant-mixture comparison of the exact
three-halves variance slack.

## Exact leaf-absent variance form

The cascade has a compact probabilistic meaning.  Put \(r=k-1\) and
split a uniform independent \(r\)-set of \(G\) according to whether
\(\ell\) is absent or present.

The leaf-absent class is a uniform independent \(r\)-set \(S\) of
\(T=G-\ell\).  Let \(e_T,q_T\) be the residual vertex and edge counts in
\(T-N[S]\), and define

\[
J=\mathbf1_{\{p\notin S\}},\qquad
I=\mathbf1_{\{p\notin N_T[S]\}}.
\]

In \(G\), the residual statistics of this class are exactly

\[
e_A=e_T+J,\qquad q_A=q_T+I.
\tag{5}
\]

The leaf-present class is a uniform independent \((r-1)\)-set of \(F\),
with unchanged residual statistics.

Write

\[
\mathcal S_Q(X)
=2\mathbb E q_X+\frac12\mathbb E e_X-\operatorname{Var}(e_X).
\]

For the absent class, put

\[
s=\mathbb EJ,\qquad
\pi=\mathbb EI,\qquad
C=\operatorname{Cov}(e_T,J).
\]

Equation (5) gives

\[
\boxed{
\mathcal S_Q(A)
=\mathcal S_Q(T)
+2\pi-\frac12s+s^2-2C.
}
\tag{6}
\]

Let

\[
\theta
=\frac{i_{r-1}(F)}{i_r(T)+i_{r-1}(F)}
\]

be the leaf-present class weight.  The two conditional residual means
are

\[
m_A
=k\frac{i_k(T)}{i_r(T)}+s,
\qquad
m_B
=r\frac{i_r(F)}{i_{r-1}(F)}.
\]

The law of total variance and (4) yield the exact equivalence

\[
\boxed{
\text{Q-Cascade}
\quad\Longleftrightarrow\quad
\mathcal S_Q(T)
+2\pi-\frac12s+s^2-2C
\ge
\theta(m_A-m_B)^2.
}
\tag{7}
\]

Thus the all-rank problem is a rooted Poincaré inequality: the
same-rank three-halves slack in \(T\), the probability that \(p\)
remains residual, and the covariance payment must dominate one
between-class mean square.  No approximation or unproved correlation
sign is used in (7).

## Conditional solution theorem

> If Q-Cascade holds for every pendant edge of every forest, then every
> forest has a unimodal independence polynomial.

### Proof

Let \(\beta=\alpha(F)\).  A maximum independent set of \(F\), together
with \(\ell\), is independent in \(G\).  Conversely, replacing \(p\) by
\(\ell\) if necessary shows that every independent set of \(G\) has
size at most \(\beta+1\).  Therefore

\[
\alpha(G)=\beta+1.
\tag{8}
\]

Consequently

\[
L(G)
=\left\lfloor\frac{2\beta+3}{3}\right\rfloor
=\left\lfloor\frac{2\beta}{3}\right\rfloor+1.
\tag{9}
\]

If \(4\le k<L(G)\), then

\[
k\le\left\lfloor\frac{2\beta}{3}\right\rfloor
\]

and direct checking of the three residue classes of \(\beta\) gives

\[
3\le k-1<L(F).
\tag{10}
\]

Induct on the number of vertices.  The global rank-three theorem
`RANK3_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md` supplies

\[
Q_3(I(G))\ge0
\]

for every forest.  At a rank \(k\ge4\), choose any pendant edge.
By (10) and induction,

\[
Q_{k-1}(I(F))\ge0.
\]

Equation (2) then gives \(Q_k(I(G))\ge0\).  Thus

\[
Q_k(I(G))\ge0\qquad(3\le k<L(G))
\]

for every forest.

This is prefix ordered log-concavity with an extra one-half unit of
factorial-ratio reserve.  Together with the proved ranks one and two and
the known decreasing-tail theorem for bipartite graphs, it implies
unimodality.  \(\square\)

The reduction covers disconnected forests directly: components not
meeting the pendant edge occur as a common polynomial factor on both
sides of (2).

## The rank-four base is now proved globally

The later certificate

`RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md`

proves

\[
Q_4(I(F))\ge0
\qquad
\left(
4<
\left\lfloor\frac{2\alpha(F)+1}{3}\right\rfloor
\right)
\tag{Rank-4}
\]

for every forest.  Therefore a proof of Q-Cascade is no longer needed
at \(k=4\).  It is enough to prove it for \(k\ge5\): the global
rank-three and rank-four theorems supply the two base ranks, and the
induction above starts at \(k=5\).

## Exact evidence

All arithmetic below used integer cross-products.

### Exhaustive forest products through order 17

`scan_q_cascade_all_forest_polynomials.py` enumerates every distinct
tree pendant pair and multiplies it by every admissible distinct common
forest factor.  Through total order 17 it checks:

- 866,379 distinct pendant/common polynomial pairs;
- 2,542,945 prefix ranks;
- no failure.

The closest right-to-left ratio is

\[
0.9335089678274827\ldots
\]

at order 10, rank 4, for

\[
\begin{aligned}
I(G)&=(1,10,36,60,53,28,8,1),\\
I(F)&=(1,8,23,31,21,7,1).
\end{aligned}
\]

The durable output is

`q_cascade_all_forest_polynomials_n17_20260727.json`.

### PatternBoost 60-vertex corpus

`scan_patternboost_three_halves_q_cascade.py` reconstructs every selected
tree from its Prüfer code and samples three attachment roots per tree.
On all 43,595 exact corpus records it checks:

- 130,785 attachments;
- 2,223,348 prefix ranks;
- no failure.

Its closest ratio is \(0.5856717424\ldots\).

The durable output is

`patternboost60_three_halves_q_cascade_r3_20260727.json`.

### Galvin non-log-concave family

For

\[
E_t=(1+2x)^t,\qquad
A_t=E_t+x(1+x)^t,
\]

the Galvin tree and its terminal pendant deletion have polynomials

\[
I(T_{m,t})=A_t^m+xE_t^m
\]

and

\[
B_{m,t}=A_t^{m-1}A_{t-1}
+xE_t^{m-1}E_{t-1}.
\]

`scan_galvin_three_halves_q_cascade.py` checks

\[
2\le t\le20,\qquad1\le m\le100
\]

at all 760,004 prefix ranks, with no failure.  Its closest ratio is
\(0.5415161315\ldots\).

The durable output is

`galvin_three_halves_q_cascade_t20_m100_20260727.json`.

## Current proof target

Q-Cascade from rank five onward is now a single all-rank inequality
which, together with the proved global rank-three and rank-four forest
bases, would resolve Erdős Problem 993 for both trees and forests.

There is an exact compensation decomposition.  Put

\[
T=G-\ell
\]

and, at \(r=k-1\), abbreviate

\[
a=i_r(T),\quad a^+=i_{r+1}(T),\quad
b^-=i_{r-1}(F),\quad b=i_r(F),\quad b^+=i_{r+1}(F).
\]

Define

\[
\begin{aligned}
\Lambda&=ab+b^2+2k(a^+b-ab^+),\\
M&=b^-(ka^++b)-(k-1)ba,\\
\Pi&=b^-(a+b^-)\Lambda-M^2.
\end{aligned}
\]

If \(\mathcal C_k^Q\) is the left side minus the right side of
(2), direct expansion gives

\[
\boxed{
a\mathcal C_k^Q
=\Pi_Q+k\,b^-(a+b^-)Q_k(I(T)),
}
\tag{11}
\]

where

\[
\boxed{
\Pi_Q=2\Pi-3ab^-(a+b^-)b.
}
\tag{12}
\]

This identity explains why the candidate survives even though a purely
local payment does not.  In normalized variables

\[
s=\frac ba,\quad
u=(k-1)\frac b{b^-},\quad
v=k\frac{a^+}{a},\quad
w=k\frac{b^+}{b},
\]

the sign of \(\Pi_Q\) is the sign of

\[
\begin{aligned}
\Theta_Q={}&
2\Bigl[
(u+(k-1)s)(1+s+2(v-w))\\
&\qquad -(k-1)(v+s-u)^2
\Bigr]
-3(u+(k-1)s).
\end{aligned}
\tag{13}
\]

The standalone assertion \(\Pi_Q\ge0\) is false even in the required
terminal prefix.  A 9-vertex rank-4 witness has

\[
\begin{aligned}
I(G)&=(1,9,28,41,37,21,7,1),\\
I(F)&=(1,7,17,21,15,6,1),
\end{aligned}
\]

and

\[
\Pi_Q=-13160,
\]

while the full cascade margin is positive:

\[
56100-30627=25473.
\]

Thus any proof of Q-Cascade must retain the same-rank reserve term in
(11); discarding it loses the compensation already visible at nine
vertices.  The exact witness is stored in
`three_halves_q_cascade_n15_local_20260727.json`.

## A four-fifths compensation package

Write

\[
\mathcal R_k
=k\,b^-(a+b^-)Q_k(I(T)).
\]

The exact scans support the quantitative inequality

\[
\tag{4/5-Pay}
\boxed{
5\Pi_Q+4\mathcal R_k\ge0
\qquad(4\le k<L(G)).
}
\]

If \(Q_k(I(T))\ge0\), then \(\mathcal R_k\ge0\), and (11) becomes

\[
a\mathcal C_k^Q
=\frac15(5\Pi_Q+4\mathcal R_k)+\frac15\mathcal R_k
\ge0.
\tag{14}
\]

The needed same-rank assertion is either the induction hypothesis or,
in the one rank where deleting \(\ell\) lowers the independence number,
the separate boundary statement

\[
\tag{Cutoff-Q}
\boxed{
Q_{L(T)}(I(T))\ge0.
}
\]

Therefore **(4/5-Pay) plus Cutoff-Q implies Q-Cascade**, and hence
resolves Erdős Problem 993 by the conditional theorem above.

In the normalized variables of (13), put

\[
y=(k+1)\frac{i_{k+1}(T)}{i_k(T)}.
\]

Then

\[
\frac{Q_k(I(T))}{a^2}
=\frac vk(2v-1-2y),
\]

so (4/5-Pay) is exactly

\[
\boxed{
5s\Theta_Q
+4v(u+(k-1)s)(2v-1-2y)\ge0.
}
\tag{15}
\]

The order-10 closest witness has

\[
-\frac{\Pi_Q}{\mathcal R_k}
=\frac{504833}{645840}
=0.7816688343862257\ldots .
\]

Thus the tempting three-quarters replacement of (4/5-Pay) is false,
while four-fifths retains the exact positive gap

\[
\frac45-\frac{504833}{645840}
=\frac{11839}{645840}.
\]

The exhaustive forest-product scan through order 17 finds:

- no failure of (4/5-Pay);
- no negative same-rank \(\mathcal R_k\);
- no failure of Cutoff-Q in 156,512 applicable forest polynomials.

The closest Cutoff-Q witness has

\[
\frac{Q_L}{i_{L-1}i_L}=\frac3{10}.
\]

The exact output is
`q_cascade_all_forest_polynomials_n17_four_fifths_20260727.json`.
The PatternBoost sampled-root corpus likewise has no failure of either
payment statement; its largest negative-payment ratio is only
\(0.0259808674\ldots\).

This two-lemma package is stronger than Q-Cascade and remains
conjectural.  Its advantage is structural: (4/5-Pay) is a homogeneous
five-coefficient rooted inequality, while Cutoff-Q is a single-rank
global reserve.

## A sharper mixed-rank package

The exact data reveal that rank four is exceptional.  From rank five
onward, the substantially stronger inequality

\[
\tag{1/3-Pay}
\boxed{
3\Pi_Q+\mathcal R_k\ge0
\qquad(5\le k<L(G))
}
\]

survives every test.  Provided \(Q_k(I(T))\ge0\), it gives the more
generous decomposition

\[
a\mathcal C_k^Q
=\Pi_Q+\mathcal R_k
=\frac13(3\Pi_Q+\mathcal R_k)+\frac23\mathcal R_k
\ge0.
\tag{16}
\]

Consequently the following smaller package is sufficient:

\[
\boxed{
\begin{array}{ll}
5\Pi_Q+4\mathcal R_4\ge0,&k=4,\\[2mm]
3\Pi_Q+\mathcal R_k\ge0,&k\ge5,\\[2mm]
Q_{L(T)}(I(T))\ge0.&
\end{array}}
\tag{17}
\]

Indeed, the same-rank reserve is supplied by induction when
\(k<L(T)\), and by Cutoff-Q when \(k=L(T)\).  Equation (14) handles
rank four and (16) handles every later rank.  Thus the mixed package
(17) implies Q-Cascade and, with the proved rank-three base, resolves
Erdős Problem 993.

In the normalized variables of (15), (1/3-Pay) is exactly

\[
\boxed{
3s\Theta_Q
+v(u+(k-1)s)(2v-1-2y)\ge0.
}
\tag{18}
\]

The exhaustive forest-product scan through total order 17 checks
2,542,945 required prefix ranks.  It finds no failure of (1/3-Pay) at
any \(k\ge5\).  The largest negative-local compensation ratios by rank
are

\[
\begin{array}{c|ccccc}
k&4&5&6&7&8\\ \hline
-\Pi_Q/\mathcal R_k&
0.7816688&
0.3114459&
0.3326440&
0.1688270&
0.0673633.
\end{array}
\]

At rank six the exact extremal ratio in this range is

\[
\frac{1670647}{5022327}
=0.3326440114\ldots
=\frac13-\frac{3462}{5022327}.
\]

Thus the constant \(1/3\) is already nearly sharp in a 15-vertex tree,
which makes the rank split mathematically meaningful rather than a
loose numerical convenience.  The exact witnesses are stored in
`q_cascade_all_forest_polynomials_n17_one_third_exact_20260727.json`.

The independent 60-vertex PatternBoost corpus contributes another
2,223,348 exact prefix checks, again with no failure of (1/3-Pay).
Its negative-local ratios occur only at ranks 11 through 21 and stay
below \(0.026\).  The output is
`patternboost60_three_halves_q_cascade_one_third_r3_20260727.json`.

The new global rank-four forest theorem makes the special
four-fifths inequality unnecessary for the main induction.  The
remaining sufficient package is simply

\[
\boxed{
\begin{array}{ll}
3\Pi_Q+\mathcal R_k\ge0,&5\le k<L(G),\\[2mm]
Q_{L(T)}(I(T))\ge0.&
\end{array}}
\tag{19}
\]

Indeed, rank four is already known.  At \(k\ge5\), the same-rank
reserve in \(T\) is supplied by induction when \(k<L(T)\), and by
Cutoff-Q when \(k=L(T)\).  Equation (16) then proves Q-Cascade.
The right side of the \(k=5\) cascade is a rank-four reserve in \(F\),
which is supplied by the new theorem.  Thus (19), together with the
proved rank-three and rank-four bases, resolves Erdős Problem 993.

Package (19) remains conjectural.  It narrows the analytic job to two
statements: the clean coefficient inequality (18) at every rank
\(k\ge5\), and one global reserve at the cutoff.

The next algebraic task is to control either Q-Cascade directly from
rank five onward, or the one-third summand in (16) together with
Cutoff-Q, under

\[
I(G)=I(G-\ell)+xI(F)
\]

by a rooted variance or determinant inequality.  Proving ordinary PGC
alone is insufficient: Q-Cascade asks that its positive margin pay the
explicit \(3kp_k\)-difference, and (12) shows that the local part can be
negative.
