# Rank-four component Schur payment and transport theorem

Date: 2026-08-13

Status: the normalized component Schur payment is proved at rank four for
every forest pendant edge whenever rank four is in the required prefix.  Its
surplus also pays every negative first-difference transport, with an explicit
nonnegative reserve.  This is a fixed-rank theorem, not an all-rank proof of
PGC or forest unimodality.  The master file was not edited.

## 1. The theorem

Let `G` be a forest, let `l` be a leaf with support `p`, and put

\[
 P=I(G)=\sum_jp_jx^j,
 \qquad
 B=I(G-\{l,p\})=\sum_jb_jx^j.
\]

If rank four lies in the required prefix, equivalently
`alpha(G)>=7`, then

\[
\boxed{
 16\frac{p_4^2-p_3p_5}{p_3}
 \;\ge\;
 9\frac{b_3^2-b_2b_4}{b_2}.}
\tag{1}
\]

Moreover the full rank-four pendant margin is nonnegative:

\[
\boxed{H_4(P)-H_3(B)\ge0.}
\tag{2}
\]

Thus the component Schur payment conjecture is now an all-order theorem at
`k=2,3,4`, and the transport question is completely answered at these three
ranks.  No generic PF, SLC, negative-association, or marked-count
log-concavity shortcut is used.

## 2. Two exact nonnegative decompositions

Deleting the support after first deleting the leaf gives the literal forest
recurrence

\[
 P=(1+x)B+xC,
 \qquad C=I(G-N[p]).
\tag{3}
\]

In particular

\[
 p_4=b_3+b_4+c_3,
 \qquad p_5=b_4+b_5+c_4.
\tag{4}
\]

Define the already proved rank-four three-halves reserve

\[
 Q_4(P)=8p_4^2-p_3p_4-10p_3p_5,
\tag{5}
\]

and the two single-forest expressions

\[
 U(B)=b_2b_3+6b_2b_4-3b_3^2,
\tag{6}
\]

\[
 L(B)=2b_2b_3+15b_2b_4+4b_2b_5-9b_3^2.
\tag{7}
\]

Direct substitution of (4) gives the exact Schur decomposition

\[
\boxed{
 16\frac{\Delta_4(P)}{p_3}
 -9\frac{\Delta_3(B)}{b_2}
 =\frac{2Q_4(P)}{p_3}+2c_3+4c_4+\frac{L(B)}{b_2}.}
\tag{8}
\]

It also gives the stronger full-margin decomposition

\[
\boxed{
 H_4(P)-H_3(B)
 =\frac{2Q_4(P)}{p_3}+6c_3+\frac{3U(B)}{b_2}.}
\tag{9}
\]

The theorem `RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md`
proves `Q_4(P)>=0` whenever `alpha(P)>=7`.  Also
`alpha(B)=alpha(G)-1>=6`.  It therefore remains to prove

\[
 U(F)\ge0\quad(\alpha(F)\ge6),
 \qquad
 L(F)\ge0\quad(\alpha(F)\ge7)
\tag{10}
\]

for every forest `F`.  The `U` statement settles (9) throughout the full
prefix.  The `L` statement settles (8) when `alpha(G)>=8`; the sole boundary
`alpha(G)=7` is finite because every forest is bipartite and hence has at
most 14 vertices.  Sections 3--5 prove the two new statements and complete
that boundary using literal forest counts.

## 3. Literal configuration reduction

For a forest `F`, write

\[
 n=|V(F)|,\qquad e=|E(F)|,
\]

and let

\[
 S=\sum_v{d(v)\choose2},
 \qquad
 R=\#\{\text{connected three-edge subsets}\},
\]

\[
 H=\sum_v{d(v)\choose3},
 \qquad
 W=\#\{\text{connected four-edge subsets}\}.
\]

Inclusion-exclusion gives

\[
\begin{aligned}
b_2={}&{n\choose2}-e,\\
b_3={}&{n\choose3}-e(n-2)+S,\\
b_4={}&{n\choose4}-e{n-2\choose2}+S(n-4)+{e\choose2}-R,
\end{aligned}
\tag{11}
\]

and

\[
\begin{aligned}
b_5={}&{n\choose5}-e{n-2\choose3}
 +S{n-3\choose2}+\left({e\choose2}-S\right)(n-4)\\
&-R(n-4)-\{S(e-2)-2R-H\}+W.
\end{aligned}
\tag{12}
\]

The bracket

\[
 S(e-2)-2R-H
\]

counts an adjacent edge-pair together with a disjoint edge.  Hence

\[
\boxed{2R+H\le S(e-2).}
\tag{13}
\]

After substituting (11)--(12), the exact configuration derivatives are

\[
 \frac{\partial U}{\partial R}=-6b_2,
 \qquad
 \frac{\partial L}{\partial R}=-(4n-9)b_2,
 \qquad
 \frac{\partial L}{\partial W}=4b_2.
\tag{14}
\]

Thus a lower bound is obtained by setting

\[
 R=\frac{S(e-2)-H}{2},\qquad W=0.
\tag{15}
\]

This is the only configuration relaxation in the proof.

## 4. Degree-moment payment for `H`

Let `h` be the number of nontrivial components.  On the nonisolated
vertices put

\[
 x_v=d(v)-1,\qquad E=\sum_vx_v=e-h,
 \qquad M_j=\sum_vx_v^j.
\]

Then

\[
 S=\frac{M_2+E}{2},
 \qquad
 H=\frac{M_3-E}{6}.
\tag{16}
\]

The exact integer moment bounds

\[
 M_3\ge3M_2-2E\quad(E\le M_2\le2E),
 \qquad
 M_3\ge\frac{M_2^2}{E}\quad(M_2\ge2E)
\tag{17}
\]

give the three valid lower bounds

\[
H\ge
\begin{cases}
0,&0\le S\le e,\\
S-e,&e\le S\le3e/2,\\
\displaystyle\frac{2S(S-e)}{3e},&S\ge3e/2.
\end{cases}
\tag{18}
\]

After (15) and (18), both `U` and `L` are concave quadratics in `S` on
the first two regions.  Their minima are therefore among

\[
 S=0,\qquad S=e,\qquad S=3e/2.
\tag{19}
\]

On the third region both are convex quadratics, so their unrestricted
vertex values are valid lower bounds.

For `n>=20`, parameterize

\[
 n=20+y,
 \qquad e=1+t(n-1),
 \qquad y\ge0,\quad0\le t\le1.
\tag{20}
\]

The upper endpoint `t=1` is the connected-tree case `e=n-1`; retaining it
is necessary for the stated all-forest scope.

The exact Bernstein expansions in `t` of the three endpoint values, both
vertex numerators, and both positive quadratic coefficients have
nonnegative power coefficients in `y`.  The replay checks 299 such power
terms.  The largest Bernstein degree is five.  This proves both inequalities
for every nonempty forest of order at least 20.

For the edgeless forest, direct simplification gives

\[
 U=\frac{n^2(n-3)(n-2)(n-1)^2}{24},
\tag{21}
\]

\[
 L=\frac{n^2(n-2)(n-1)^2(n+1)(4n-17)}{240},
\tag{22}
\]

which are positive in the needed ranges.

## 5. Exact finite completion

Every distinct forest independence polynomial through order 19 was formed
as a product of distinct tree independence polynomials.  The counts by order
are

```text
1, 2, 3, 6, 10, 20, 36, 73, 142, 294,
618, 1348, 2974, 6777, 15739, 37524,
90965, 224562, 561475.
```

The exact checks are

```text
U checks with alpha >= 6: 942,394
L checks with alpha >= 7: 941,997
failures:                       0
```

The minimum `U` is `450`, attained by `(1+x)^6`.  The minimum `L` is
`1656`, attained at

```text
(1,11,45,86,80,36,9,1).
```

Polynomial merging is complete for this purpose because `U` and `L` depend
only on the displayed coefficient rows.

There are also 6,148 polynomial-complete pendant-pair checks with
`alpha(G)=7`.  They have no Schur failure, and their minimum is

```text
1735/18
```

at

```text
P=(1,9,29,45,40,22,7,1)
B=(1,7,18,23,16, 6,1)
C=(1,4, 4, 1).
```

This is the complete boundary, not bounded evidence: bipartiteness gives
`|V(G)|<=2 alpha(G)=14`.  Together with Sections 3--4, the finite checks
prove (10) at every order and close the one boundary not covered by `L`.
Equations (8)--(9) now prove (1)--(2) in the full required prefix.

## 6. The transport is genuinely negative and is paid

For the connected star `K_{1,e}` with the displayed leaf-support pair,

\[
\mathcal S_4
=\frac{e(e-1)(e-2)(e-3)(4e-11)}{120},
\tag{23}
\]

while the first-difference transport is

\[
\tau_4
=-\frac{(e-1)(e-2)(e-3)(4e^2-51e+120)}{120}.
\tag{24}
\]

It is already negative at `K_{1,10}`:

\[
 \mathcal S_4=1218,
 \qquad \tau_4=-42,
 \qquad H_4(P)-H_3(B)=1176.
\tag{25}
\]

So zero Schur payment would not suffice.  Identity (9) proves uniformly
that the actual payment covers the negative transport.

## 7. Independent bounded audit and replay

The replay also performs a polynomial-complete audit of every pendant pair
in every forest through order 16:

```text
rank-four pendant-pair checks:       331,153
negative first-difference transports: 287,459
Schur-payment failures:                    0
PGC-margin failures:                       0
minimum exact Schur payment:         1735/18
minimum exact PGC margin:             1300/9
```

The minimum Schur pair is

```text
P=(1,9,29,45,40,22,7,1)
B=(1,7,18,23,16, 6,1)
C=(1,4, 4, 1).
```

Run

```text
python replay_rank4_component_schur_payment.py --audit-max-order 16
```

It writes `rank4_component_schur_payment_exact_20260813.json` and prints

```text
PASS_ALL_FOREST_RANK4_SCHUR_PAYMENT_AND_TRANSPORT_THEOREM
```

The all-order symbolic certificate takes about one second on the replay
machine.  The polynomial-complete finite census dominates the roughly
96-second total runtime.

SHA-256:

```text
replay_rank4_component_schur_payment.py
4710BE9256B814871561FDD385FEC2D0EA0B6632D4A4289A54DB5B8FB2A8C196

rank4_component_schur_payment_exact_20260813.json
044C5B3955A49C4D987BE296E9FD60CA1E59A8B65672B048CF3BA7A7C12CF4CB
```
