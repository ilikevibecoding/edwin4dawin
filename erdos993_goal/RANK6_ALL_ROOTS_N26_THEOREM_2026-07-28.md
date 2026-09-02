# Rank-6 rooted reserve from order 26

Date: 2026-07-28

Status: **proved theorem**. This closes another full order and lowers
the universal rooted threshold from \(27\) to \(26\). The remaining
rank-6 rooted band is \(18\le n\le25\).

## Theorem

Every rooted tree \((T,p)\) of order \(n\ge26\) satisfies

\[
\boxed{
S_6(T,p)=
i_4(T)(2i_5(T)+i_4(T))
-24\!\left(i_5(T)i_4(T-p)-i_4(T)i_5(T-p)\right)
\ge0.
}
\]

Therefore every such rooted tree also satisfies the exact rank-6
cross inequality \(C_6(T,p)\ge0\).

Orders at least \(27\) were certified previously. At order \(26\):

- degree-one roots follow from the all-leaf theorem;
- roots of degree at least four follow from the degree-sensitive
  path-ratio bound;
- only degrees two and three require new work.

## Degree three

For \(F=T-N[p]\), \(|F|=22\). If \(F\) has at least three edges, the
line-graph moment bound proves

\[
\frac{i_4(F)}{i_3(F)}\le\frac{9007}{1961}.
\]

This constant makes the normalized strong-margin lower bound exactly
zero at \(n=26\). The final exact edge polynomial is positive for all
integers \(3\le e(F)\le21\), with minimum \(20\,620\).

For \(e(F)\le2\), every rooted component state and every attachment to
the three neighbors of \(p\) is enumerated exactly:

\[
\begin{array}{c|r|r}
e(F)&\text{states}&\min S_6\\ \hline
0&276&464\,752\,309\\
1&693&441\,691\,344\\
2&2\,970&423\,183\,104
\end{array}
\]

## Degree two

Now \(|F|=23\). The cases \(e(F)\le5\) reduce to rooted components of
at most six vertices:

\[
\begin{array}{c|r|r}
e(F)&\text{states}&\min S_6\\ \hline
0&24&577\,031\,455\\
1&44&538\,717\,475\\
2&164&503\,244\,720\\
3&456&469\,719\,896\\
4&1\,374&438\,585\,712\\
5&3\,700&410\,263\,621
\end{array}
\]

For \(e(F)\ge6\), write \(a=i_3(F)\), \(b=i_4(F)\), and let
\(h=i_4(T-p)\), \(z=i_5(T-p)\). The proof retains the edge, wedge, and
connected-three-edge counts of \(F\).

The sharp forest \(i_3/i_2\) bound followed by two applications of the
two-extension inequality gives

\[
\frac{z}{h}\ge\frac{53}{20}.
\]

If the \(23-e\) components of \(F\) split \(s\) versus \(23-e-s\)
between the two neighbors of \(p\), coefficientwise path
minimization gives

\[
h\ge b+
\binom{21-s}{3}
+\binom{e+s-2}{3}.
\]

The proof also uses \(h\ge\binom{22}{4}\), the line-graph lower bound
on connected triples, and the trivial upper bound that every
connected triple is a three-edge subset.

For each integer \(6\le e\le22\), the possible wedge interval is
split only where one of those bounds changes formula. There are 38
exact intervals. Every Bernstein coefficient of both the resulting
strong-margin polynomial and its derivative in \(h\) is positive.
The two smallest coefficients are respectively

\[
\frac{58\,050\,783}{10},
\qquad
\frac{250\,223}{5}.
\]

This proves the dense case and completes the theorem.

## Replay

```powershell
python .\verify_rank6_all_roots_n26.py
```
