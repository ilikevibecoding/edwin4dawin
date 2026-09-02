# Rank-6 reserve at high-degree roots of order 25

Date: 2026-07-28

Status: **proved theorem**. Together with the all-root theorem from
order 26, this leaves only roots of degrees one, two, and three at
order 25 in the current universal rooted descent.

## Theorem

Let \(T\) be a tree of order \(25\), rooted at a vertex \(p\) with
\(\deg(p)\ge4\). Then

\[
\boxed{
S_6(T,p)=
i_4(T)(2i_5(T)+i_4(T))
-24\!\left(i_5(T)i_4(T-p)-i_4(T)i_5(T-p)\right)
\ge0.
}
\]

Consequently the exact rooted-cross reserve \(C_6(T,p)\) is
nonnegative.

## Degree at least five

The degree-sensitive path-ratio cone is increasing in the root
degree. At \(n=25\) and degree five its normalized lower bound is

\[
\frac{197}{275}>0.
\]

Thus every root of degree at least five is immediate.

## The degree-four forest ratio

Put \(F=T-N[p]\), so \(|F|=20\), and write \(e,W,R\) for its numbers
of edges, wedges, and connected three-edge subtrees. Then

\[
\begin{aligned}
a=i_3(F)&=\binom{20}{3}-18e+W,\\
b=i_4(F)&=\binom{20}{4}
-e\binom{18}{2}+16W+\binom e2-R.
\end{aligned}
\]

For every forest,

\[
R\ge\frac{2W^2/e-W}{3}.
\]

After substituting this bound into
\(4033a-959b\), the derivative with respect to \(W\) is

\[
\frac{4(959W-8723e)}{3e},
\]

which is negative throughout
\(1\le e\le19,\ 0\le W\le\binom e2\). At the upper endpoint the
margin is

\[
\frac{
959e^3-39687e^2+483526e-292410
}{6}.
\]

Its minimum over the nineteen possible positive edge counts is
\(25\,398\). Hence

\[
\frac{i_4(F)}{i_3(F)}<\frac{4033}{959}
\qquad(e(F)\ge1).
\]

The whole-tree path ratio at order 25 is

\[
\frac{i_5(T)}{i_4(T)}\ge\frac{153}{55}.
\]

Substituting the two ratios in the normalized rooted cone gives the
exact boundary identity

\[
2\frac{153}{55}+1
-24\,
\frac{\frac{4033}{959}-\frac{153}{55}}
{1+\frac{4033}{959}}
=0.
\]

The strict forest margin therefore proves \(S_6(T,p)>0\) whenever
\(F\) has an edge.

## The edgeless case

If \(F=20K_1\), the tree has depth two at \(p\). Distribute the twenty
distance-two leaves among the four neighbors of \(p\). There are

\[
\binom{23}{3}=1771
\]

ordered compositions. Exact independence-polynomial evaluation gives

\[
\min S_6(T,p)=281\,275\,424,
\]

attained at the balanced distribution \((5,5,5,5)\). This completes
the degree-four case.

## Replay

```powershell
python .\verify_rank6_order25_degree4plus.py
```
