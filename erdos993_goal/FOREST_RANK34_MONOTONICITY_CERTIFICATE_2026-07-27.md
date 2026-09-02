# Forest rank-3-to-4 coefficient monotonicity

Date: 2026-07-27

Status: **proved theorem**.

## Theorem

Every forest \(F\) of order at least \(12\) satisfies

\[
\boxed{i_4(F)\ge i_3(F).}
\]

## Large-order proof

For a forest of order \(n\), let \(e\) be its number of edges,

\[
S=\sum_v\binom{d(v)}2,
\]

and let \(R\) count connected three-edge subsets.  Inclusion-exclusion
gives

\[
\begin{aligned}
i_3&=\binom n3-e(n-2)+S,\\
i_4&=\binom n4-e\binom{n-2}2+S(n-4)+\binom e2-R.
\end{aligned}
\]

The difference \(i_4-i_3\) is increasing in \(S\) for \(n\ge18\) and
decreasing in \(R\).  Cauchy and the trivial edge-triple bound give

\[
S\ge\frac{2e^2}{n}-e,\qquad R\le\binom e3.
\]

Substitute these bounds, put

\[
n=\frac{18}{v},\qquad e=(n-1)s,
\qquad 0\le v,s\le1,
\]

and multiply by \(v^4\).  The resulting polynomial has bidegree
\((5,3)\).  All 24 exact tensor-Bernstein coefficients are positive;
the smallest is

\[
\frac{1156}{9}.
\]

This proves the theorem for \(n\ge18\).

## Finite proof

Every distinct forest independence polynomial of orders \(12\) through
\(17\) was generated exactly.  The counts and minimum differences are

\[
\begin{array}{c|rrrrrr}
n&12&13&14&15&16&17\\ \hline
\#\text{ polynomials}
&1348&2974&6777&15739&37524&90965\\
\min(i_4-i_3)&6&45&110&209&351&546.
\end{array}
\]

Thus 155,327 finite polynomials were checked, with no failure.

## Verification

Run

```powershell
python .\verify_forest_rank34_monotonicity.py
```

The verifier reconstructs the inclusion-exclusion lower bound, checks
all exact Bernstein coefficients, regenerates all finite forest
polynomials, and audits every count and minimum.

