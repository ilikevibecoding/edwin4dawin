# Global rank-3 three-halves reserve for forests

Date: 2026-07-27

Status: **proved theorem**.

## Theorem

For every forest \(F\),

\[
\boxed{
Q_3(I(F))
=6i_3(F)^2-i_2(F)i_3(F)-8i_2(F)i_4(F)\ge0.
}
\]

Equivalently, every forest satisfies the three-halves reserve at rank
three whenever the three relevant coefficients occur.

## Inclusion-exclusion coordinates

Let \(n=|V(F)|\), \(e=|E(F)|\), and

\[
S=\sum_v\binom{d(v)}2.
\]

Let \(R\) be the number of connected three-edge subsets.  Then

\[
\begin{aligned}
i_2&=\binom n2-e,\\
i_3&=\binom n3-e(n-2)+S,\\
i_4&=\binom n4-e\binom{n-2}2+S(n-4)+\binom e2-R.
\end{aligned}
\tag{1}
\]

The derivative of \(Q_3\) with respect to \(R\) is

\[
\frac{\partial Q_3}{\partial R}=8i_2\ge0.
\tag{2}
\]

## Line-graph lower bound

The line graph \(L(F)\) has \(e\) vertices and \(S\) edges.  If its
degrees are \(d_1,\ldots,d_e\), its number of wedges is

\[
W_L=\sum_{j=1}^e\binom{d_j}{2}.
\]

Every connected three-vertex subset of \(L(F)\) contributes either one
or three wedges.  Such subsets are exactly connected three-edge subsets
of \(F\).  Hence

\[
3R\ge W_L.
\]

Cauchy gives

\[
W_L
=\frac12\sum_jd_j^2-S
\ge\frac{2S^2}{e}-S.
\]

Therefore, for \(e>0\),

\[
\boxed{
R\ge\frac{2S^2/e-S}{3}.
}
\tag{3}
\]

Substitution of (3) into (1) lowers \(Q_3\) by (2).

## Large-order Bernstein certificate

For a nonempty forest, \(1\le e\le n-1\), and two forest edges meet at
most once, so

\[
0\le S\le\binom e2.
\]

For \(n\ge16\), put

\[
u=\frac1n,\qquad
e=1+(n-2)s,\qquad
S=\binom e2z,
\qquad 0\le s,z\le1.
\tag{4}
\]

After (3)--(4), multiply the lower bound by \(u^6\), and put
\(u=v/16\).  The result is an exact polynomial on
\((v,s,z)\in[0,1]^3\) of degrees

\[
(6,4,2).
\]

Its coarse tensor Bernstein expansion contains the negative coefficient

\[
-\frac{202125}{33554432};
\]

this is only a loose enclosure.  Exact cyclic midpoint subdivision
produces 22 terminal boxes, of maximum depth 12, and every terminal
Bernstein coefficient is nonnegative.  Thus the lower bound, and hence
\(Q_3\), is nonnegative for every forest of order at least 16.

The edgeless case has \(I(F)=(1+x)^n\) and is immediate.

## Finite certificate

Every distinct nonempty forest independence polynomial through order 15
was generated exactly:

- 28,043 distinct polynomials;
- no negative \(Q_3\);
- no prefix failure.

The durable output is

`rank3_three_halves_forest_finite_n15_20260727.json`.

The single verifier

```powershell
python .\verify_rank3_three_halves_forest_certificate.py
```

reconstructs (1)--(4), recomputes all 22 exact Bernstein boxes, audits
the known distinct-polynomial counts at every finite order, and replays
every stored minimum witness.  It prints `PASS`.
