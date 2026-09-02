# Sharp rank-\((3,4,5)\) defect ceiling for forests

Date: 2026-07-28

Status: **proved theorem**. This strictly strengthens the earlier
tree-only coefficient theorem.

## Theorem

For every forest \(F\) of order \(n\ge16\),

\[
\boxed{3575\,i_3(F)i_5(F)-2016\,i_4(F)^2\ge0.}
\tag{1}
\]

Equivalently,

\[
1-\frac{i_3(F)i_5(F)}{i_4(F)^2}
\le \frac{1559}{3575}.
\tag{2}
\]

The constant is sharp at \(P_{16}\).

## A sharp forest ratio lemma

Let \(m\) be the number of edges of an \(n\)-vertex forest and put

\[
W=\sum_v\binom{d(v)}2.
\]

Inclusion-exclusion gives

\[
i_2=\binom n2-m,\qquad
i_3=\binom n3-m(n-2)+W.
\]

Every forest satisfies

\[
W\ge\max(0,2m-n).
\tag{3}
\]

Indeed, \(\binom d2\ge d-1\) at every nonisolated vertex, and the
number of nonisolated vertices is at most \(n\).

Direct substitution shows

\[
\begin{aligned}
&3(n-1)i_3-(n-3)(n-4)i_2\\
&\quad =
3(n-1)W-2m n^2+2mn+6m+2n^3-7n^2+5n.
\end{aligned}
\tag{4}
\]

If \(m=n-1-t\) and \(m\ge n/2\), insert \(W\ge2m-n\)
in (4). The result is

\[
2nt(n-4)\ge0.
\]

If \(m\le n/2\), expression (4) decreases with \(m\) and increases
with \(W\); its value at \(m=n/2,W=0\) is
\(n(n-2)(n-4)\). Thus every forest of order \(n\ge4\) satisfies

\[
\boxed{
\frac{i_3(F)}{i_2(F)}
\ge\frac{(n-3)(n-4)}{3(n-1)}.
}
\tag{5}
\]

Equality is attained by the path.

## The defect bound

The forest two-extension inequality gives

\[
i_5\ge\frac{4i_4^2}{5i_3}-\frac{3i_4}{5}
\tag{6}
\]

and, one rank earlier,

\[
\frac{i_4}{i_3}\ge
\frac34\left(\frac{i_3}{i_2}-1\right).
\tag{7}
\]

Combining (5) and (7),

\[
\frac{i_4}{i_3}\ge
\frac{n^2-10n+15}{4(n-1)}.
\tag{8}
\]

Substitution of (6) into the left side of (1) gives

\[
3575i_3i_5-2016i_4^2
\ge i_4(844i_4-2145i_3).
\]

The right side is nonnegative for \(n\ge19\) by (8); after clearing
positive denominators the remaining quadratic is

\[
211n^2-4255n+5310,
\]

which equals \(636\) at \(n=19\) and increases thereafter.

For orders \(16,17,18\), the verifier enumerates every distinct
forest independence polynomial and checks (1) in integer arithmetic:

| order | distinct polynomials | minimum of (1) |
|---:|---:|---:|
| 16 | 37,524 | 0 |
| 17 | 90,965 | 73,432,359 |
| 18 | 224,562 | 251,742,400 |

The path attains every displayed minimum.

## Replay

```powershell
python .\verify_forest_rank345_defect_ceiling.py
```
