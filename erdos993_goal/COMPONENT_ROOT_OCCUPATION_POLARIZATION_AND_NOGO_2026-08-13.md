# Component root-occupation polarization and tensorization no-go for PGC

Date: 2026-08-13

Status: the polarization theorem, scalar PGC reduction, and two exact
forest no-gos below are proved.  This is not a proof of PGC and not a
counterexample to PGC or to forest unimodality.

## 1. Outcome

The component-separated normal form has a useful multivariate refinement.
For every touched component `F_i` with marked vertex `s_i`, put

\[
C_i=I(F_i-s_i),\qquad D_i=I(F_i-N[s_i]),\qquad
B_i=C_i+xD_i.
\]

If `U` is the product of the untouched component polynomials, define

\[
\Phi(x; y_1,\ldots,y_t)
=U(x)\prod_{i=1}^t\bigl(C_i(x)+y_i xD_i(x)\bigr).       \tag{1}
\]

Then the two rows in the component-separated pendant normal form are

\[
B=\Phi(x;1,\ldots,1),\qquad C=\Phi(x;0,\ldots,0),       \tag{2}
\]

and the pendant row is

\[
P=(1+x)B+xC.                                             \tag{3}
\]

Thus `C_r/B_r` is exactly a zero-occupation probability in a canonical
(fixed-cardinality) ensemble.  This isolates a more precise all-order
target than PF-infinity or proper position.

However, the natural tensorization and strong-log-concavity shortcuts for
this marked-root ensemble are false inside the literal component-separated
forest class.  Two disjoint copies of `K_{1,2}`, marked at their centers,
already give positive conditional covariance and a non-real-rooted,
non-ultra-log-concave marked-count row.  A second exact star-forest gives a
marked-count row which is not even ordinarily log-concave.

The surviving target is therefore a coupled inequality for the *zero atom*
at three adjacent ranks, not a global negative-dependence or log-concavity
theorem for the marked-count distribution.

## 2. Root-occupation polarization theorem

Let `F` be a forest and let `S={s_1,...,s_t}` meet each component of `F`
at most once.  For a touched component, deletion at its marked root gives

\[
I(F_i)=I(F_i-s_i)+xI(F_i-N[s_i])=C_i+xD_i.
\]

Choosing the root `s_i` contributes the factor `y_i xD_i`; not choosing it
contributes `C_i`.  Products over components prove (1).  Consequently,

\[
[x^r\prod_{i\in J}y_i]\Phi
\]

counts independent `r`-sets whose intersection with `S` is exactly
`{s_i:i in J}`.  On setting every `y_i=y`, write

\[
M_r(y)=[x^r]\Phi(x;y,\ldots,y)
       =\sum_{j=0}^t m_{r,j}y^j.                         \tag{4}
\]

Then

\[
b_r=M_r(1),\qquad c_r=M_r(0)=m_{r,0},\qquad
q_r:=\frac{c_r}{b_r}=\Pr(|I\cap S|=0\mid |I|=r).        \tag{5}
\]

The polarization also exposes exact coefficient constraints which the
one-variable PF no-gos discard.  In particular,

\[
b_1-c_1=t,
\qquad [x^jy^j]\Phi={t\choose j},
\qquad t\leq\alpha(F)=\deg B.                            \tag{6}
\]

The last two facts hold because every subset of `S` is independent.
Moreover `D_i` is an induced-subgraph row of `C_i`, so

\[
0\leq D_i\leq C_i
\]

coefficientwise.  These are genuine forest-source constraints, not
consequences of real-rootedness.

## 3. Exact six-scalar form of PGC

Fix `k>=2` and abbreviate the three adjacent ratios of `B` by

\[
s=\frac{b_{k-1}}{b_{k-2}},\qquad
u=\frac{b_k}{b_{k-1}},\qquad
v=\frac{b_{k+1}}{b_k},                                  \tag{7}
\]

and put `q_j=c_j/b_j`.  From (3),

\[
\begin{aligned}
p_{k-1}&=b_{k-2}(1+s+q_{k-2}),\\
p_k&=b_{k-1}(1+u+q_{k-1}),\\
p_{k+1}&=b_k(1+v+q_k).
\end{aligned}                                            \tag{8}
\]

Direct substitution into the definition of `H` proves

\[
H_k(P)-H_{k-1}(B)=b_{k-1}\,\mathcal E_k,                 \tag{9}
\]

where

\[
\boxed{
\begin{aligned}
\mathcal E_k={}&k(1+u+q_{k-1})
+\frac{k^2s(1+u+q_{k-1})^2}{1+s+q_{k-2}}\\
&-k(k+1)u(1+v+q_k)
-(k-1)\{1+(k-1)s-ku\}.
\end{aligned}}                                           \tag{10}
\]

Thus component-separated PGC is exactly `E_k>=0` in the required prefix.
The final brace is the normalized same-rank GSB reserve of `B`.  The other
terms show why a one-rank or marginal argument is poorly aligned: the
zero-occupation probabilities at three consecutive ranks enter with mixed
signs.  A successful component proof must control their joint curvature
with the three adjacent coefficient ratios of `B`.

## 4. Exact tensorized-variance and ULC no-go inside forests

Let `F` be the disjoint union of two copies of `K_{1,2}` and mark the center
of each star.  The exact polarization is

\[
\Phi(x;y)=\bigl((1+x)^2+yx\bigr)^2.
\]

At total rank two,

\[
M_2(y)=6+4y+y^2.                                         \tag{11}
\]

This polynomial has discriminant `-8`.  It also violates the degree-two
ultra-log-concavity/Newton inequality:

\[
4^2=16<4\cdot6\cdot1=24.                                \tag{12}
\]

Let `X_i` indicate occupation of the marked center in component `i`, under
the uniform measure on independent two-sets.  There are eleven such sets,
and exact counting gives

\[
\Pr(X_i=1)=\frac3{11},\qquad
\Pr(X_1=X_2=1)=\frac1{11}.
\]

Hence

\[
\operatorname{Cov}(X_1,X_2)=\frac2{121}>0,               \tag{13}
\]

and, for `J=X_1+X_2`,

\[
\operatorname{Var}(J)=\frac{52}{121}
>\frac{48}{121}
=\operatorname{Var}(X_1)+\operatorname{Var}(X_2).        \tag{14}
\]

Therefore conditioning the product measure on total independent-set size
does not preserve component independence, negative association, or the
naive variance tensorization bound.  This is an exact forest example, not
an abstract polynomial construction.

For completeness, its component-separated pendant rows are

\[
\begin{aligned}
B&=(1+3x+x^2)^2,\\
C&=(1+x)^4,\\
P&=(1+x)B+xC.
\end{aligned}
\]

The only required PGC rank is `k=2`, and its margin is `209/2>0`.
Thus (11)--(14) refute only the proposed shortcut, not PGC.

## 5. Ordinary log-concavity of marked counts also fails

Let `F` be the disjoint union of four copies of `K_{1,1}` and one copy of
`K_{1,8}`, again marking every center.  Then

\[
\Phi(x;y)=((1+x)+yx)^4((1+x)^8+yx).
\]

At rank five,

\[
M_5(y)=792+1321y+724y^2+150y^3+12y^4+y^5.               \tag{15}
\]

Its final internal log-concavity inequality fails exactly:

\[
12^2=144<150\cdot1.                                     \tag{16}
\]

The associated pendant forest has independence number `13`; every required
PGC rank `2<=k<9` nevertheless has positive exact margin.  The smallest
displayed margin is not being promoted as a uniform bound: this example is
only a no-go for proving PGC from ordinary log-concavity of every marked
occupation row.

## 6. The nested PF no-go is retained, with a sharper separator

The earlier exact rows

\[
B=1+352x+2756x^2+1376x^3,\qquad
C=1+33x+67x^2
\]

with `P=(1+x)B+xC` are PF-infinity, satisfy the two-stage nested algebra and
strict interlacing, but have

\[
H_2(P)-H_1(B)=-\frac{1544450}{59}<0.
\]

That no-go remains valid.  Polarization gives an even shorter proof that it
is not component-separated forest data: (6) would require

\[
t=b_1-c_1=319\leq\deg B=3,
\]

which is impossible.  Therefore (10) may not be proved using only
PF-infinity, interlacing, monotonicity of `q_j`, or unconstrained
one-variable coefficient rows.  The binomial marked-root diagonal in (6),
or an equivalent forest observable, must remain visible.

## 7. Exact replay and finite-evidence boundary

Run

```text
python replay_component_root_occupation_polarization.py
```

It verifies (9)--(10) symbolically, reconstructs both forest
polarizations, checks (11)--(16), verifies all required PGC margins of the
two examples, replays the old nested-PF margin and its new marked-component
obstruction, and audits the durable order-16 component-separated census.
It writes

`component_root_occupation_polarization_exact_20260813.json`.

The existing census contains 332,799 pendant instances and 1,511,925
required-prefix ranks with no failure.  This is finite evidence only.  No
genuine component-separated forest counterexample was found here, and no
all-order PGC theorem is claimed.  No master file was edited.
