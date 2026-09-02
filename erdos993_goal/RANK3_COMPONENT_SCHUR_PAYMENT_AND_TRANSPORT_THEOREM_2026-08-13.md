# Rank-three component Schur payment and transport theorem

Date: 2026-08-13

Status: the normalized component Schur payment is proved at rank three for
every forest pendant edge whenever rank three is in the PGC prefix.  At this
rank it also pays every negative first-difference transport, with a positive
reserve.  This is a fixed-rank theorem, not an all-rank proof of PGC or a
proof of forest unimodality.  The master file was not edited.

## 1. The theorem

Let `G` be a forest, let `l` be a leaf with support `p`, and put

\[
 P=I(G)=\sum_jp_jx^j,
 \qquad
 B=I(G-\{l,p\})=\sum_jb_jx^j.
\]

If rank three lies in the required PGC prefix, equivalently
`alpha(G)>=6`, then

\[
\boxed{
 9\frac{p_3^2-p_2p_4}{p_2}
 \;\ge\;
 4\frac{b_2^2-b_1b_3}{b_1}.}
\tag{1}
\]

Thus the all-rank component Schur payment conjecture from
`RANK2_COMPONENT_SCHUR_PAYMENT_AND_ALL_FOREST_AUDIT_2026-08-13.md` is now
an all-order theorem at both `k=2` and `k=3`.

Every forest pendant edge has the component-separated form used in
`COMPONENT_ROOT_OCCUPATION_POLARIZATION_AND_NOGO_2026-08-13.md`: after the
support is removed, its different neighbour branches are different
components.  Consequently (1) is also the `k=3` instance of the six-scalar
inequality there, with all marked-root zero atoms retained.  No generic
PF, SLC, negative-association, or marked-count log-concavity assumption is
used.

## 2. Literal forest counts and the cleared gap

Write

\[
 n=|V(G)|,\qquad e=|E(G)|,
\]

and let

\[
 Z=\sum_v{d(v)\choose2},
 \qquad
 T=\#\{\text{connected three-edge subtrees of }G\}.
\]

Inclusion-exclusion on the chosen edges gives the exact forest formulas

\[
\begin{aligned}
p_2&={n\choose2}-e,\\
p_3&={n\choose3}-e(n-2)+Z,\\
p_4&={n\choose4}-e{n-2\choose2}+Z(n-3)
      +{e\choose2}-Z-T.
\end{aligned}
\tag{2}
\]

Put `d=d_G(p)` and

\[
 S=\sum_{u\in N(p)}(d(u)-1).
\]

Deleting `l,p` removes `d` edges and exactly

\[
 {d\choose2}+S
\]

incident edge-pairs.  Hence

\[
\begin{aligned}
b_1&=n-2,\\
b_2&={n-2\choose2}-(e-d),\\
b_3&={n-2\choose3}-(e-d)(n-4)
       +Z-{d\choose2}-S.
\end{aligned}
\tag{3}
\]

After multiplication by the positive denominator `p_2(n-2)`, (1) is
exactly `Gamma>=0`, where

\[
\Gamma=
9(n-2)(p_3^2-p_2p_4)
-4p_2\{b_2^2-(n-2)b_3\}.
\tag{4}
\]

## 3. Degree-excess reduction

Let `c` be the number of components and `h` the number of nontrivial
components.  On the nonisolated vertices put

\[
x_v=d(v)-1,\qquad
E=\sum_vx_v=e-h,
\]

and define

\[
M_j=\sum_vx_v^j,
\qquad
J=\sum_{uv\in E(G)}x_ux_v,
\qquad
x=d(p)-1.
\]

The literal configuration counts in (2) become

\[
Z=\frac{M_2+E}{2},
\qquad
T=\frac{M_3-E}{6}+J.
\tag{5}
\]

Substitute `n=e+c`, (3), and (5) into (4), and put

\[
K=n^2-n-2e=2p_2>0.
\]

The coefficients of `J,S,M_3` in `Gamma` are exactly

\[
\frac92(n-2)K,
\qquad
-2(n-2)K,
\qquad
\frac34(n-2)K.
\tag{6}
\]

If `x>=1`, every term at an edge incident to `p` gives
`J>=xS`, and therefore

\[
\frac92J-2S
=\left(\frac92-\frac2x\right)J
 +\frac2x(J-xS)\ge0.
\tag{7}
\]

If `x=0`, the pendant component is `K_2` and `S=0`, so the same deletion
of the nonnegative `J,S` contribution is valid.  The remaining expression
is a convex quadratic in `M_2`.  The two exact integer moment bounds are

\[
M_3\ge3M_2-2E\quad(E\le M_2\le2E),
\qquad
M_3\ge\frac{M_2^2}{E}\quad(M_2\ge2E).
\tag{8}
\]

The first is the sum of
`x_v(x_v-1)(x_v-2)>=0`; the second is Cauchy--Schwarz.

## 4. Exact disconnected-forest certificate

Suppose first that `x>=1` and `h>=2`.  Write

\[
x=1+X,\quad E=x+a,\quad h=2+H,\quad c=h+v.
\]

Rank three in the prefix implies `n>=7`, or

\[
X+a+2H+v\ge2.
\]

Its nonnegative integer lattice is the union of the seven orthants rooted
at

\[
\begin{gathered}
(2,0,0,0),(0,2,0,0),(0,0,1,0),(0,0,0,2),\\
(1,1,0,0),(1,0,0,1),(0,1,0,1).
\end{gathered}
\tag{9}
\]

When `h=1` and the forest is disconnected, put

\[
c=2+v,\qquad x=1+X,\qquad E=x+a.
\]

Now `n>=7` is `X+a+v>=3`, whose lattice is the union of the ten
orthants rooted at the weak compositions of three.

In the first region of (8), write `M_2=E(1+t)`, `0<=t<=1`, and replace
`M_3` by `E(1+3t)`.  The result is quadratic in `t`.  All three exact
Bernstein coefficients have nonnegative power coefficients after every
shift in (9) and after nine of the ten one-component shifts.  In the
remaining orthant `(X,a,v)=(3,0,0)`, all non-origin lattice points are
covered by

\[
(4,0,0),\qquad(3,1,0),\qquad(3,0,1).
\tag{10}
\]

In the second region of (8), substitute `M_3=M_2^2/E` and minimize the
convex quadratic over the whole real line.  Its vertex denominator is

\[
48\{c^2+2ce-c+e^2-3h\}>0.
\tag{11}
\]

The vertex numerator has the same nonnegative shifted-power certificate,
with the same sole uncovered origin.  That origin forces

\[
G=K_{1,5}\sqcup K_1,\qquad M_2=16,
\]

and direct exact substitution gives

\[
\Gamma=4000>0.
\tag{12}
\]

For `x=0,E>0`, write `E=1+a`, `h=2+H`, and `c=h+v`.  Every region-one
Bernstein coefficient and the region-two vertex numerator has nonnegative
power coefficients in `a,H,v`.  If `E=0`, the forest is a matching plus
isolates.  Here `alpha=c>=6`; writing

\[
c=6+y,\qquad h=1+u(c-1),\qquad0\le u\le1,
\]

gives a degree-seven polynomial in `u` whose eight Bernstein coefficients
have nonnegative power coefficients in `y`.  This completes every
disconnected forest.

## 5. Connected-tree certificate

For a connected tree, `n=e+1` and `E=e-1`.  Exact simplification gives

\[
\Gamma=\frac{e-1}{4}\,\mathcal B,
\tag{13}
\]

where

\[
\begin{aligned}
\mathcal B={}&18e(e-1)J-8e(e-1)S+9M_2^2+LM_2
 +3e(e-1)M_3+C,\\
L={}&-3e^3+4e^2+17e-18,\\
C={}&\frac{e^6}{4}-\frac{17e^5}{12}-\frac{e^4}{12}
 +\frac{17e^3}{12}-4e^2x^2+4e^2x+\frac{65e^2}{6}\\
&\quad-4ex^2-4ex-20e+9.
\end{aligned}
\tag{14}
\]

For a nonstar tree, in addition to `J>=xS` one has `J>=e-2`.
Thus the first two terms of (14) are at least

\[
(18-8/x)e(e-1)(e-2).
\tag{15}
\]

In the second moment region, the unconstrained vertex lower bound has
denominator `12x(e+3)`.  Put

\[
e=7+y,\qquad x=1+u(e-3),\qquad y\ge0,\quad0\le u\le1.
\]

The exact vertex numerator is cubic in `u`; all four Bernstein
coefficients have strictly positive power coefficients in `y`.  They are
printed in full by the replay.  In the first moment region, the quadratic
derivative at `M_2=2(e-1)` is

\[
-(e-1)(3e^2-10e-36)<0\qquad(e\ge7).
\tag{16}
\]

The quadratic is therefore decreasing through that interval, and its
minimum is the common boundary value already certified in the second
region.

If `e=6` and `alpha(G)>=6`, the connected seven-vertex tree has independence
number six and is necessarily `K_{1,6}`.  More generally, every connected
star `K_{1,e}` has the explicit normalized Schur payment

\[
\boxed{
\mathcal S_3(K_{1,e})
=\frac{e(e-1)(e-2)(3e-5)}{24}>0.}
\tag{17}
\]

This completes the proof of (1).

## 6. The first-difference transport is paid

The exact PGC decomposition at rank three is

\[
H_3(P)-H_2(B)
=\mathcal S_3
 +\tau_3,
\tag{18}
\]

where `mathcal S_3` is the left side minus the right side of (1), and

\[
\tau_3=3(p_3-p_4)-2(b_2-b_3).
\tag{19}
\]

The transport is genuinely negative inside forests.  For the connected
star `K_{1,e}` with the displayed leaf-support pair,

\[
\tau_3
=-\frac{(e-1)(e-2)(3e^2-29e+48)}{24},
\tag{20}
\]

so it is negative for every `e>=8`.  At the first example `K_{1,8}`,

\[
\mathcal S_3=266,
\qquad
\tau_3=-14,
\qquad
H_3(P)-H_2(B)=252.
\tag{21}
\]

Thus zero Schur payment would not suffice, but the actual forest surplus
does pay the negative transport.

There is also a uniform rigorous reserve.  The already proved all-forest
rank-three three-quarters cascade in
`RANK3_THREE_QUARTERS_FOREST_CERTIFICATE_2026-07-26.md` gives

\[
3H_3(P)\ge4H_2(B).
\tag{22}
\]

Moreover `alpha(B)=alpha(G)-1>=5`, and the proved rank-two forest theorem
in `PENDANT_GSB_CASCADE_REDUCTION_2026-07-26.md` gives `H_2(B)>=0`
(the edgeless case is directly
`H_2((1+x)^q)=2q(q-1)`).  Therefore

\[
\boxed{
\mathcal S_3+\tau_3
=H_3(P)-H_2(B)
\ge\frac13H_2(B)\ge0.}
\tag{23}
\]

In particular, whenever `tau_3<0`,

\[
\mathcal S_3\ge-\tau_3+\frac13H_2(B).
\tag{24}
\]

This answers the transport question completely at `k=3`.  It does not
extend (23) to `k>=4`.

## 7. Replay and independent bounded audit

Run

```text
python replay_rank3_component_schur_payment.py --max-order 16
```

The replay reconstructs (2)--(20) symbolically, checks 19,574 exact
nonnegative power terms in the orthant/Bernstein certificates, evaluates
the sole exceptional disconnected point, and performs a polynomial-complete
audit of every pendant pair in every forest through order 16.

The bounded audit is independent consistency evidence for the theorem:

```text
rank-three pendant-pair checks:       332,432
negative first-difference transports: 330,598
Schur-payment failures:                     0
PGC failures:                               0
minimum exact Schur payment:               50
minimum exact PGC margin:                  65
```

The negative-transport count is large because common isolated components
can make (19) negative; this does not weaken the all-order proof above.

The replay writes
`rank3_component_schur_payment_exact_20260813.json` and prints
`PASS_ALL_FOREST_RANK3_SCHUR_PAYMENT_AND_TRANSPORT_AUDIT`.

SHA-256:

```text
replay_rank3_component_schur_payment.py
9016E72070698CDBF58BAA9474E0B3523E9D233A083351B6F74CB00C58361412

rank3_component_schur_payment_exact_20260813.json
A57F9550C731D70073DD52DB4B80BE20BB32AA29ED57757EA0D0B6BF629B366E
```
