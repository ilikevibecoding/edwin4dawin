# The all-forest `q3 <= q2` theorem

Date: 2026-08-29

Status: **proved for every finite forest, with an independent exact audit**.

## Statement

For a finite forest `F`, let `i_r(F)` count independent `r`-sets and let
`s_r(F)` count `(r+1)`-sets inducing exactly one edge.  Then

\[
\boxed{3i_3(F)s_2(F)-2i_2(F)s_3(F)\ge0.}
\]

Consequently, whenever the two ranks are supported,

\[
\boxed{q_3(F)=\frac{s_3(F)}{3i_3(F)}
       \le \frac{s_2(F)}{2i_2(F)}=q_2(F).}
\]

This lifts the pinned all-tree theorem to disconnected forests; it is not a
new assumption.

## Component reduction

Write the nontrivial tree components as `T_i`, with

\[
a_i=|T_i|,\qquad b_i=\binom{a_i-1}{2},\qquad
c_i^0=\binom{a_i-1}{3},\qquad u_i=m_2(T_i).
\]

For a tree component,

\[
i_2(T_i)=b_i,\qquad i_3(T_i)=c_i^0-u_i,\qquad s_2(T_i)=2u_i.
\]

The all-tree theorem gives

\[
s_3(T_i)\le \frac{3u_i(c_i^0-u_i)}{b_i}
\tag{1}
\]

when `b_i>0`; the smaller components have `u_i=s_3(T_i)=0`.  Also

\[
0\le u_i\le u_i^*:=\binom{a_i-2}{2}.
\tag{2}
\]

Let `N=sum a_i`, including isolated vertices as one-vertex components, and
put

\[
\begin{aligned}
D&=\sum_i b_i+\sum_{i<j}a_i a_j,\\
C_0&=\sum_i c_i^0+\sum_{i\ne j}b_i a_j
       +\sum_{i<j<k}a_i a_j a_k,\\
L_0&=\sum_i(a_i-1)(N-a_i),\\
K_0&=\sum_i(a_i-1)i_2(F-T_i),\qquad U=\sum_i u_i.
\end{aligned}
\]

Literal multiplication of the independent-set and one-edge-set generating
polynomials gives

\[
i_2=D,\quad i_3=C_0-U,\quad s_2=L_0+2U,
\]

and

\[
s_3=\sum_i s_3(T_i)+2\sum_i u_i(N-a_i)+K_0.
\tag{3}
\]

Substituting (1) into (3), the target margin is bounded below by

\[
R=M_0+\sum_i\ell_i u_i
6D\sum_i\frac{u_i^2}{b_i}-6U^2,
\tag{4}
\]

where

\[
M_0=3C_0L_0-2DK_0,qquad
\ell_i=6C_0-3L_0-2D(2N-a_i-3).
\]

The quadratic part is convex because, with `B=sum b_i`,

\[
D\sum_i\frac{u_i^2}{b_i}-U^2
=(D-B)\sum_i\frac{u_i^2}{b_i}
+\sum_{i<j}\frac{(b_j u_i-b_i u_j)^2}{b_i b_j}\ge0.
\tag{5}
\]

## Reduction to the component caps

The independent audit proves a stronger coordinatewise fact.  The maximum
of `partial R/partial u_i` on the box (2) occurs at `u_i=u_i^*` and all other
`u_j=0`.  As a set function of the other component sizes, its Mobius
expansion has only one-, two-, and three-component kernels.  After writing
the active size as `X+3` and every other size as `Y+1`, the three numerator
polynomials have respectively 11, 20, and 8 strictly negative coefficients;
the four-component kernel vanishes.  Hence every partial derivative is
nonpositive throughout the box, and

\[
R(u_1,\ldots,u_t)\ge R(u_1^*,\ldots,u_t^*).
\tag{6}
\]

The producer supplies a separate exact cap-gradient certificate leading to
the same endpoint.

## The cap residual

Let there be `r` nontrivial components and `z` isolates.  Put

\[
p_i=a_i-1\ge1,\quad P=\sum p_i,\quad
S_2=\sum p_i^2,\quad S_3=\sum p_i^3,\quad
H=\sum\frac1{p_i}.
\]

At the caps, exact substitution in (4) makes the residual a cubic in `z`.
For `z=0`, it depends on `S_2,H` only through `T=S_2+12H`, with coefficient

\[
-\frac K2,\qquad
K=P^2+2Pr-3P+r^2-r\ge0.
\]

Write `p_i=1+x_i`, `X=sum x_i`, and

\[
f(x)=(1+x)^2+\frac{12}{1+x}.
\]

The exact merge identity

\[
f(x+y)+f(0)-f(x)-f(y)
=\frac{2xy\left(x^2y+x^2+xy^2+3xy+8x+y^2+8y+13\right)}
{(x+1)(y+1)(x+y+1)}\ge0
\]

gives

\[
T\le f(X)+13(r-1).
\]

After this substitution,

\[
2(X+1)R\ge X(r-1)\bigl[
3X^3+(12r-16)X^2+(12r^2-24r+29)X+12r^2+12r
\bigr]\ge0.
\tag{7}
\]

For `r>=2`, all three positive-`z` coefficients are nonnegative after the
elementary bounds `H<=r` and
`sum x_i^2<=X^2`.  The only small case with a negative individual
coefficient is one edge plus isolates; there the complete residual is

\[
R=\frac{z^2(z-1)}2\ge0
\]

for integer `z`.  One component with `p=2` is positive directly, and the
shift `p>=3` has a coefficient-positive numerator.  The edgeless forest has
zero margin.  This proves the theorem.

## Replayable evidence

Producer:

- `prove_all_forest_q3_q2_component_lift_root.py`
- SHA-256 `6C9F956D8F37AFC462193E780284C24F995D90A644F6C6C2B129A0B9BE259B00`
- `all_forest_q3_q2_component_lift_exact_root_20260829.json`
- SHA-256 `71BA8A861714902FECC613150B2BA936A19100F0AB43DF5766CF8614C5E50442`
- status `PASS_EXACT_SYMBOLIC_ALL_FOREST_Q3_Q2_LIFT_FROM_ALL_TREE_THEOREM`

Independent audit:

- `audit_all_forest_q3_q2_component_lift_independent_agent.py`
- SHA-256 `63C2FFE7432FE54BF197B2F6F89DFF737B280D7B2571D6B30692FF09227E9815`
- `all_forest_q3_q2_component_lift_independent_audit_20260829.json`
- SHA-256 `7465DCB4C62ACF76614003D42285B72CD559A27AB6F449804F3CC881B405695D`
- status
  `PASS_INDEPENDENT_EXACT_ALL_FOREST_Q3_AT_MOST_Q2_COMPONENT_LIFT_AUDIT`

Pinned tree input:

- `verify_all_tree_q3_q2_theorem_root.py`, SHA-256
  `9DCD97C0BEB373CB5B2EBDA7A9A2E7F30D730FA45EEF219FAB4EF3FE03C8E1F7`
- `all_tree_q3_q2_theorem_exact_root_20260828.json`, SHA-256
  `6013B83860C4A5B9FC58CEA07762CA51A5CE908AC2F6849FB7EE7383F26F4A74`

Replay:

```powershell
python .\prove_all_forest_q3_q2_component_lift_root.py
python .\audit_all_forest_q3_q2_component_lift_independent_agent.py
```

## Scope boundary

This closes the `FQ32` forest-scope obligation in the terminal `q3` program.
It does **not** prove the forest-base terminal anchor (`FA`), the forest-base
positive-part payment (`FP`), the all-rank `q_r<=q_3` envelope, the pendant
PGC inequality, unimodality, or Erdos Problem 993.
