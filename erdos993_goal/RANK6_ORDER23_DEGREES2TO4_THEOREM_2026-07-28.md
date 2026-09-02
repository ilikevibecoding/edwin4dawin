# Rank-6 reserve at order-23 roots of degrees two through four

Date: 2026-07-28

Status: **proved theorem**.

## Theorem

Every 23-vertex tree \(T\), rooted at a vertex \(p\) with

\[
2\le d_T(p)\le4,
\]

satisfies \(S_6(T,p)>0\).

## Degree two: a sharp two-component lemma

Here \(H=T-p\) has order \(22\) and exactly two components. Joining a
leaf from each component produces a tree \(G\) of order \(22\), while
the independent sets newly permitted after deleting the joining edge
are governed by a residual forest \(Q\) of order \(18\) or \(19\):

\[
i_4(H)=i_4(G)+i_2(Q),\qquad
i_5(H)=i_5(G)+i_3(Q).
\]

The strengthened tree path-ratio theorem at order 22 gives

\[
19i_5(G)-42i_4(G)\ge222B_2.
\]

The exact path-gap identity and the integral condition \(B_2\ge1\)
off the path give

\[
i_4(G)-i_4(P_{22})\le36B_2.
\]

For the residual forest, exact edge/wedge minimization gives

\[
1003i_3(Q)-2282i_2(Q)\ge
\begin{cases}
251328,&|Q|=18,\\
332894,&|Q|=19.
\end{cases}
\]

Since

\[
251328=\frac{1232}{19}\,i_4(P_{22}),
\]

these inequalities prove the sharp inputs

\[
\boxed{
i_4(H)\ge4012,\qquad
\frac{i_5(H)}{i_4(H)}\ge\frac{2282}{1003}.
}
\]

For \(F=T-N[p]\), all layers \(e(F)\le5\) are enumerated exactly:

\[
\begin{array}{c|r|r}
e(F)&\text{states}&\min S_6\\ \hline
0&21&141\,721\,515\\
1&38&128\,928\,852\\
2&140&116\,815\,689\\
3&384&105\,794\,511\\
4&1140&95\,896\,279\\
5&3016&86\,905\,899.
\end{array}
\]

The sharp inputs above and the full two-center contribution close
\(6\le e(F)\le19\) in 32 exact Bernstein cells. The minimum margin
coefficient is

\[
\frac{1\,357\,539\,327}{1003}>0.
\]

## Degree three

For the order-22 forest \(H=T-p\), the proved universal coefficient
chain is

\[
\frac{i_3(H)}{i_2(H)}\ge\frac{38}{7},\quad
\frac{i_4(H)}{i_3(H)}\ge\frac{93}{28},\quad
\frac{i_5(H)}{i_4(H)}\ge\frac{72}{35}.
\]

All one-, two-, and three-center contributions to \(i_4(H)\) are
retained. Exact enumeration handles \(e(F)\le4\):

\[
\begin{array}{c|r|r}
e(F)&\text{states}&\min S_6\\ \hline
0&210&109\,431\,360\\
1&513&101\,897\,811\\
2&2142&96\,284\,565\\
3&6627&90\,844\,039\\
4&21087&86\,710\,113.
\end{array}
\]

The remaining \(5\le e(F)\le18\) form 29 positive exact cells, with
minimum \(1\,982\,037\).

## Degree four

Retaining every subset of the four branch centers is already strong
enough without a sparse exception. The same order-22 coefficient
chain, the exact edge/wedge/connected-triple formulas for
\(F=T-N[p]\), and the center reserve reduce all

\[
0\le e(F)\le17
\]

to 30 exact Bernstein cells. Their minimum margin coefficient is

\[
\frac{61\,886\,448}{5}>0.
\]

The derivative in \(i_4(H)\) is also positive in every cell for all
three root degrees, validating the lower substitution for that
coefficient. This completes the theorem.

## Replay

```powershell
python .\verify_tree_rank45_path_ratio.py
python .\verify_rank6_order23_degrees2to4.py
```
