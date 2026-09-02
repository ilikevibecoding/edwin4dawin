# Rank-6 reserve at order-24 degree-two roots

Date: 2026-07-28

Status: **proved theorem**.

## Theorem

Let \(T\) be a tree of order \(24\), rooted at a degree-two vertex
\(p\). Then

\[
S_6(T,p)=
i_4(T)(2i_5(T)+i_4(T))
-24\!\left(i_5(T)i_4(T-p)-i_4(T)i_5(T-p)\right)
>0.
\]

## A sharp two-component coefficient lemma

The deletion \(H=T-p\) is not an arbitrary forest: it has exactly two
components and order \(23\). This yields the sharp bounds

\[
\boxed{i_4(H)\ge4998,\qquad
\frac{i_5(H)}{i_4(H)}\ge\frac{362}{147}.}
\tag{1}
\]

To prove them, choose a leaf from each component (using the sole
vertex if a component is a singleton) and join the two selected
vertices by an edge. The result is a tree \(G\) of order \(23\).
Independent sets of \(H\) which are not independent in \(G\) contain
both selected vertices. Therefore

\[
i_4(H)=i_4(G)+i_2(Q),\qquad
i_5(H)=i_5(G)+i_3(Q),
\tag{2}
\]

where \(Q\) is a forest of order \(19\), or order \(20\) in the
singleton case.

For a forest of order \(q\), with \(e\le q-1\) edges and \(W\)
wedges,

\[
i_2=\binom q2-e,\qquad
i_3=\binom q3-e(q-2)+W,\qquad
W\ge\max(0,2e-q).
\]

Exact minimization over the one integer \(e\) gives

\[
147i_3(Q)-362i_2(Q)\ge
\begin{cases}
44574,&q=19,\\
58050,&q=20.
\end{cases}
\tag{3}
\]

The strengthened tree rank-\((4,5)\) path theorem, specialized at
order \(23\), states

\[
5i_5(G)-12i_4(G)\ge65B_2,
\tag{4}
\]

where \(B_2=\sum_v\binom{d_G(v)-1}{2}\). Its exact motif identity also
gives

\[
i_4(G)-i_4(P_{23})=18B_2-B_3-X,\qquad
X=E-20.
\tag{5}
\]

For a nonpath, \(B_2\ge1\); since \(B_3,E\ge0\), (5) is at most
\(38B_2\). Thus

\[
147(5i_5(G)-12i_4(G))
-46(i_4(G)-4845)
\ge7807B_2>0.
\tag{6}
\]

For the path both sides vanish. Finally,

\[
44574=\frac{46}{5}\,4845,
\]

and (2)--(6) prove the ratio in (1). Coefficientwise path minimality
also gives \(i_4(G)\ge4845\), while \(i_2(Q)\ge153\); hence
\(i_4(H)\ge4998\).

## Sparse exact states

Put \(F=T-N[p]\), so \(|F|=21\). For \(e(F)\le2\), exact
rooted-component enumeration gives

\[
\begin{array}{c|r|r}
e(F)&\text{rooted states}&\min S_6\\ \hline
0&22&232\,398\,880\\
1&40&213\,277\,068\\
2&148&195\,761\,988.
\end{array}
\tag{7}
\]

## Dense motif cone

Write \(a=i_3(F)\), \(b=i_4(F)\), and let \(W,R\) be the wedge and
connected-three-edge counts of \(F\). Then

\[
\begin{aligned}
a&=\binom{21}{3}-19e+W,\\
b&=\binom{21}{4}-e\binom{19}{2}
+17W+\binom e2-R.
\end{aligned}
\]

The exact line-graph bounds are

\[
\max\!\left(0,\frac{2W^2/e-W}{3}\right)
\le R\le\binom e3.
\tag{8}
\]

If the \(21-e\) components of \(F\) are split between the two
neighbors of \(p\), the verifier retains every term of \(i_4(H)\)
which selects one or both neighbor centers. For a residual forest of
order \(N\), with \(E\) edges and at most \(r\) nontrivial
components, it uses

\[
i_3\ge
\binom N3-E(N-2)+\max(0,2E-N,E-r).
\tag{9}
\]

The resulting exact center reserves for \(e=3,\ldots,20\) are

\[
\begin{array}{c|rrrrrrrrr}
e&3&4&5&6&7&8&9&10&11\\ \hline
E_2(e)&394&440&486&542&598&665&732&811&890
\end{array}
\]

\[
\begin{array}{c|rrrrrrrrr}
e&12&13&14&15&16&17&18&19&20\\ \hline
E_2(e)&982&1074&1180&1286&1407&1528&1665&1802&1956.
\end{array}
\]

Using (1), (8), (9), and

\[
i_4(H)\ge
\max\!\left(4998,b_{\rm lower}+E_2(e)\right),
\]

the exact reserve reduces to 39 univariate cells. Every Bernstein
coefficient of both the reserve and its derivative in \(i_4(H)\) is
positive. The two minima are

\[
\frac{124\,424\,539}{49}>0,\qquad
\frac{4\,827\,904}{147}>0.
\]

This covers every \(3\le e(F)\le20\); together with (7), it proves
the theorem.

## Replay

```powershell
python .\verify_tree_rank45_path_ratio.py
python .\verify_rank6_order24_degree2.py
```
