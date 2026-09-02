# Rank-6 terminal-broom base cone

Date: 2026-07-28

Status: **exact algebraic lemma proved**.  The remaining graph-theoretic
input is the coefficient-defect ceiling stated below.

## Lemma

Let \(X>0\), \(1/2\le r\le1\), and suppose

\[
q\ge\frac12,\qquad q\ge r-\frac D2,\qquad
D\le d_0:=\frac{1559}{3575}.
\]

Define

\[
\begin{aligned}
\Phi(X,D,r,q)
={}&-2Dr-26D-\frac{2D}{X}
+X^2r^2+2X^2r+X^2\\
&+2Xqr+26Xq-20Xr+4X+2q+2r+5+\frac2X .
\end{aligned}
\]

Then

\[
\boxed{\Phi(X,D,r,q)>0.}
\]

`verify_rank6_terminal_base_cone.py` proves this using exact rational
arithmetic and symbolic identities.

## Application

For a rooted tree \(A\), write

\[
x=i_3(A),\quad y=i_4(A),\quad z=i_5(A),
\]

and for the root-deleted forest \(A-r\), write

\[
u=i_3(A-r),\quad v=i_4(A-r).
\]

Set

\[
X=\frac{x}{y},\qquad
D=1-\frac{xz}{y^2},\qquad
r=\frac ux,\qquad q=\frac vy.
\]

The previously proved retention and rooted cross inequalities give

\[
r,q\ge\frac12,\qquad q\ge r-\frac D2.
\]

For the no-sibling terminal broom, its normalized strong rank-6 margin
is exactly \(\Phi\).  Consequently, the single unproved input needed
to make the margin positive for every core of order at least sixteen
is

\[
\boxed{
3575\,i_3(A)i_5(A)-2016\,i_4(A)^2\ge0.
}
\tag{1}
\]

Equivalently,

\[
1-\frac{i_3(A)i_5(A)}{i_4(A)^2}
\le \frac{1559}{3575}.
\]

The constant is sharp: equality holds for \(P_{16}\).

## Exact proof split

The expression decreases with \(D\) and increases with \(q\), so the
worst case has \(D=d_0\) and

\[
q=\max\left(\frac12,r-\frac{d_0}{2}\right).
\]

On the cross branch, the derivative in \(r\) is already positive at
the branch switch and then increases.  The minimum is therefore the
switch.

On the half branch, the expression is a convex quadratic in \(r\).
The verifier divides \(X>0\) into

\[
(0,1/20],\quad[1/20,1/12],\quad[1/12,3],\quad[3,\infty).
\]

The first and third cells are settled by endpoint derivative signs.
The second and fourth are settled by positivity of the unconstrained
quadratic minimum.  The only nontrivial cubic numerator has strictly
positive exact Bernstein coefficients on both compactified cells.
At the switch the remaining quadratic has discriminant

\[
-7153528373879<0
\]

and positive leading coefficient.

## Replay

```powershell
python .\verify_rank6_terminal_base_cone.py
```
