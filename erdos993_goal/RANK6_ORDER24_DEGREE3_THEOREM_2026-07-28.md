# Rank-6 reserve at order-24 degree-three roots

Date: 2026-07-28

Status: **proved theorem**.

## Theorem

Let \(T\) be a tree of order \(24\), rooted at a vertex \(p\) of
degree three. Then

\[
S_6(T,p)=
i_4(T)(2i_5(T)+i_4(T))
-24\!\left(i_5(T)i_4(T-p)-i_4(T)i_5(T-p)\right)
>0.
\]

## Setup

Put \(H=T-p\) and \(F=T-N[p]\). Then \(|H|=23\) and \(|F|=20\).
Write

\[
a=i_3(F),\quad b=i_4(F),\quad
h=i_4(H),\quad k=i_5(H).
\]

The sharp forest coefficient bound followed by two successive
two-extension inequalities gives

\[
\frac{i_3(H)}{i_2(H)}\ge\frac{190}{33},\qquad
\frac{i_4(H)}{i_3(H)}\ge\frac{157}{44},\qquad
\frac{k}{h}\ge\frac{124}{55}.
\]

Also \(h\ge i_4(P_{23})=\binom{20}{4}=4845\).

## All center-inclusion terms

Let \(e=e(F)\), let \(c=20-e\) be the number of components, and
distribute these components among the three neighbors of \(p\).
If side \(j\) receives \(c_j\) components, of which \(r_j\) are
nontrivial, put \(r=r_1+r_2+r_3\).

For a forest of order \(N\), with at most \(E\) edges and at most
\(r\) nontrivial components, the exact \(i_3\) motif formula gives

\[
i_3\ge
\binom N3-E(N-2)+
\max(0,\,2E-N,\,E-r).
\]

The verifier uses this for every term selecting one branch center. It
also retains every term selecting two centers,

\[
i_2\ge\binom N2-E,
\]

and the term selecting all three centers. Exhausting the finite
integer allocations \((c_j,r_j)\) yields exact lower bounds
\(E_3(e)\) for the total center contribution to \(h\). For
\(e=3,\ldots,19\), these are

\[
\begin{array}{c|rrrrrrrrr}
e&3&4&5&6&7&8&9&10&11\\ \hline
E_3(e)&1185&1253&1321&1402&1482&1562&1656&1749&1842
\end{array}
\]

\[
\begin{array}{c|rrrrrrrr}
e&12&13&14&15&16&17&18&19\\ \hline
E_3(e)&1950&2057&2164&2287&2409&2531&2670&2808.
\end{array}
\]

Thus \(h\ge\max(4845,b_{\rm lower}+E_3(e))\).

## Dense exact cone

Let \(W\) count wedges of \(F\), and \(R\) its connected three-edge
subtrees. Then

\[
\begin{aligned}
a&=\binom{20}{3}-18e+W,\\
b&=\binom{20}{4}-e\binom{18}{2}
+16W+\binom e2-R.
\end{aligned}
\]

The line-graph bound

\[
R\ge\max\!\left(0,\frac{2W^2/e-W}{3}\right)
\]

gives \(b_{\rm upper}\), while \(R\le\binom e3\) gives
\(b_{\rm lower}\). Substituting \(k\ge(124/55)h\) into the exact
reserve produces

\[
a^2+26\alpha ah+2ab+2ah+
2\alpha h^2-22bh+h^2,
\qquad \alpha=\frac{124}{55}.
\]

It decreases in \(b\) and increases in \(h\) on the relevant cells.
Splitting only at the two displayed piecewise boundaries yields 35
univariate cells. Exact Bernstein coefficients certify:

\[
\min S_6^{\rm lower}=\frac{37\,031\,764}{5}>0,
\qquad
\min \frac{\partial S_6^{\rm lower}}{\partial h}
=\frac{151\,772}{5}>0.
\]

This covers every \(3\le e(F)\le19\).

## Sparse exact states

For \(e(F)\le2\), every nontrivial component has at most three
vertices. Exact rooted-component enumeration gives

\[
\begin{array}{c|r|r}
e(F)&\text{rooted states}&\min S_6\\ \hline
0&231&182\,187\,564\\
1&570&171\,513\,944\\
2&2403&161\,835\,864.
\end{array}
\]

All margins are positive, completing the theorem.

## Replay

```powershell
python .\verify_rank6_order24_degree3.py
```
