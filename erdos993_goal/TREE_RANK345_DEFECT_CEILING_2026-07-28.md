# Sharp rank-\((3,4,5)\) defect ceiling for trees

Date: 2026-07-28

Status: **proved theorem**.

## Theorem

For every tree \(T\) of order at least \(16\),

\[
\boxed{
3575\,i_3(T)i_5(T)-2016\,i_4(T)^2\ge0.
}
\tag{1}
\]

Equivalently,

\[
1-\frac{i_3(T)i_5(T)}{i_4(T)^2}
\le\frac{1559}{3575}.
\tag{2}
\]

The constant is sharp: equality holds for \(P_{16}\).

## Forest two-extension inequality

Let \(G\) be a forest.  Fix an independent \(k\)-set \(S\), and let
\(e(S)\) be the number of vertices that can be added to \(S\).
The graph induced by those vertices is a forest.  A forest on \(e\)
vertices has at least

\[
\binom e2-(e-1)=\frac{(e-1)(e-2)}2
\ge\frac{e(e-3)}2
\]

independent pairs when \(e\ge1\); the displayed final bound also holds
when \(e=0\).

Double counting gives

\[
\sum_{S\in\mathcal I_k(G)}e(S)=(k+1)i_{k+1}(G)
\]

and

\[
\sum_{S\in\mathcal I_k(G)}
i_2\!\left(G-N[S]\right)
=\binom{k+2}{k}i_{k+2}(G).
\]

Cauchy's inequality therefore yields

\[
\binom{k+2}{2}i_{k+2}
\ge
\frac12\left(
\frac{(k+1)^2i_{k+1}^2}{i_k}
-3(k+1)i_{k+1}
\right).
\tag{3}
\]

At \(k=3\), this is

\[
i_5\ge
\frac{4i_4^2}{5i_3}-\frac{3i_4}{5}.
\tag{4}
\]

Substitution in the left side of (1) gives

\[
\begin{aligned}
3575i_3i_5-2016i_4^2
&\ge
i_4(844i_4-2145i_3).
\end{aligned}
\tag{5}
\]

Thus it is enough to prove \(i_4/i_3\ge2145/844\).

## Large orders

Applying (3) at \(k=2\) gives

\[
\frac{i_4}{i_3}
\ge\frac34\left(\frac{i_3}{i_2}-1\right).
\tag{6}
\]

For every \(n\)-vertex tree,

\[
i_2=\binom{n-1}{2}.
\]

Also,

\[
i_3
=\binom n3-(n-1)(n-2)+\sum_v\binom{d(v)}2.
\]

Since \(\binom d2\ge d-1\) for \(d\ge1\),

\[
\sum_v\binom{d(v)}2
\ge\sum_v(d(v)-1)=n-2,
\]

and hence

\[
i_3\ge\binom{n-2}{3}.
\tag{7}
\]

Equations (6)--(7) imply

\[
\frac{i_4}{i_3}
\ge
\frac{n^2-10n+15}{4(n-1)}.
\tag{8}
\]

The right side is at least \(2145/844\) for every \(n\ge19\), because
after clearing positive denominators the required inequality is

\[
4(211n^2-4255n+5310)\ge0.
\]

The quadratic in parentheses equals \(636\) at \(n=19\) and is
strictly increasing thereafter.

This proves (1) for every \(n\ge19\).

## Orders 16--18

`verify_tree_rank345_defect_ceiling.py` generates every unlabeled tree,
computes \(i_0,\ldots,i_5\) by an independent rooted-tree recurrence,
and checks (1) with integer arithmetic.

| order | unlabeled trees | minimum of (1) |
|---:|---:|---:|
| 16 | 19,320 | 0 |
| 17 | 48,629 | 73,432,359 |
| 18 | 123,867 | 251,742,400 |

In each row the path attains the recorded minimum.  Together with the
large-order proof, this completes the theorem.

## Replay

```powershell
python .\verify_tree_rank345_defect_ceiling.py
```
