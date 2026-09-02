# Rank-6 reserve at order-23 roots of degree at least five

Date: 2026-07-28

Status: **proved theorem**.

## Theorem

Every 23-vertex tree \(T\), rooted at a vertex \(p\) of degree at
least five, satisfies \(S_6(T,p)>0\).

## Degree at least six

The sharp whole-tree path ratio is

\[
\frac{i_5(T)}{i_4(T)}\ge\frac{12}{5}.
\]

The degree-sensitive deletion cone gives

\[
\frac{S_6(T,p)}{i_4(T)^2}
\ge
2x+1-24\frac{L-x}{1+L},
\qquad
x=\frac{12}{5},\quad
L=\frac{19-d_T(p)}4.
\]

This expression increases with the root degree. Its degree-six
endpoint equals \(1\).

## Degree five

Put \(F=T-N[p]\), so \(|F|=17\). Let \(e,W,R\) count its edges,
wedges, and connected three-edge subtrees. Then

\[
\begin{aligned}
a=i_3(F)&=\binom{17}{3}-15e+W,\\
b=i_4(F)&=\binom{17}{4}
-e\binom{15}{2}+13W+\binom e2-R.
\end{aligned}
\]

Using the line-graph bound

\[
R\ge\frac{2W^2/e-W}{3},
\]

the margin \(317a-91b\) is a convex quadratic in \(W\). For
\(1\le e\le15\) it decreases throughout \(W\le\binom e2\), and at
the upper endpoint it is

\[
\frac{91e^3-3144e^2+31853e-6120}{6}.
\]

At \(e=16\), its real quadratic minimum is
\(3\,245\,338/273>0\). The minimum over all edge counts is
\(3780>0\), attained at \(e=1\). Therefore every
nonempty \(F\) satisfies

\[
\frac{i_4(F)}{i_3(F)}<\frac{317}{91}.
\]

This is exactly the zero boundary of the rooted ratio cone:

\[
2\frac{12}{5}+1
-24\frac{
\frac{317}{91}-\frac{12}{5}
}{
1+\frac{317}{91}
}=0.
\]

If \(F\) is edgeless, the tree has depth two at \(p\). The verifier
checks all

\[
\binom{21}{4}=5985
\]

distributions of its 17 distance-two leaves among the five branches.
The exact minimum reserve is

\[
116\,712\,216>0,
\]

attained at the balanced distribution \((3,3,3,4,4)\). This completes
the proof.

## Replay

```powershell
python .\verify_rank6_order23_degree5plus.py
```
