# Rooted rank-5 cross-drop theorem

Date: 2026-07-27

Status: **proved theorem**.

## Theorem

Let \(T\) be a tree of order at least \(13\), root it at \(p\), and put
\(H=T-p\).  Write

\[
d=i_3(T),\quad e=i_4(T),\quad f=i_5(T),
\qquad h=i_3(H),\quad k=i_4(H).
\]

Then

\[
\boxed{
d(e^2-df)\ge 2e(eh-dk).
}
\tag{1}
\]

In normalized form, with

\[
x=\frac ed,\qquad y=\frac fe,\qquad
r=\frac hd,\qquad q=\frac ke,
\]

equation (1) is

\[
\boxed{r(x-k/h)\le\frac{x-y}{2}}
\]

when \(h>0\), or equivalently

\[
r-q\le\frac12\left(1-\frac{df}{e^2}\right).
\tag{2}
\]

This is the sharp structural inequality needed by the rank-5
single-stem leaf-payment lemma.

## Stronger large-order inequality

For order at least \(20\), the proof establishes

\[
\boxed{
d(2e+d)\ge20(eh-dk).
}
\tag{3}
\]

The already-proved rank-4 reserve

\[
8e^2-de-10df\ge0
\]

implies

\[
e^2-df\ge\frac{e(2e+d)}{10}.
\]

Multiplying (3) by \(e/10\) therefore proves (1).

## Grouped-moment certificate

Put \(u=1/n\) and

\[
x_v=\frac{d(v)-1}{n},\qquad
A_j=\sum_vx_v^j.
\]

Use the rooted coordinates

\[
t=x_p,\quad
q_1=\sum_{a\sim p}x_a,\quad
q_2=\sum_{a\sim p}x_a^2,
\]

together with the normalized edge correlation \(B\) and the
distance-two excess \(q_d\).  Inclusion-exclusion converts the left side
of (3) into an exact polynomial in

\[
(u,A_2,A_3,t,B,q_1,q_2,q_d).
\]

Exact differentiation shows that the margin decreases in \(A_3,B\)
and increases in \(q_d\).  For \(u\le1/20\), the common derivative
factor is at least \(33/400\), while the \(q_d\) derivative has the
required sign by a factor at most \(-2191/4000\).

Apply

\[
A_3\le(1-2u)A_2,\qquad
B\le\frac{(1-2u)^2-A_2}{2},\qquad q_d\ge0.
\]

The remaining rooted mass is divided into the root, its neighbors, and
all other vertices.  Cauchy retains the number of root neighbors through

\[
\frac{q_2}{q_1^2}\ge\frac{u}{t+u}.
\]

After setting \(u=v/20\), the resulting rational function has a
positive square denominator.  Its numerator has multidegree

\[
(9,7,4,2,2)
\]

on a five-dimensional unit box.  All 3,600 exact tensor-Bernstein
coefficients are nonnegative:

- 3,465 are positive;
- 135 are zero;
- the smallest positive coefficient is \(4,517,937\).

The omitted zero-neighbor-excess case is a star rooted at its center
and is immediate.

## Finite certificate

Every unlabeled tree and every root in orders \(13\) through \(19\)
was checked exactly:

\[
\begin{array}{c|r|r|r}
n&\#\text{ trees}&\#\text{ roots}&\min\text{ margin in (1)}\\ \hline
13&1,301&16,913&1,014,804\\
14&3,159&44,226&3,818,881\\
15&7,741&116,115&11,820,006\\
16&19,320&309,120&33,013,125\\
17&48,629&826,693&84,005,403\\
18&123,867&2,229,606&196,828,329\\
19&317,955&6,041,145&432,433,375
\end{array}
\]

The total is 521,972 trees and 9,583,818 rooted instances, with zero
failures.

## Verification

Run

```powershell
python .\verify_rank5_cross_drop_certificate.py
```

The finite enumeration can be regenerated independently with

```powershell
python .\scan_rank5_cross_drop_finite.py `
  --min-order 13 --max-order 19 `
  --out rank5_cross_drop_finite_n19_20260727.json
```

