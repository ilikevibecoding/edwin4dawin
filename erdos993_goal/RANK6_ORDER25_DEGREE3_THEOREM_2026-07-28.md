# Rank-6 reserve at degree-three roots of order 25

Date: 2026-07-28

Status: **proved theorem**. Combined with the high-degree theorem,
only leaf roots and degree-two roots remain at order 25.

## Theorem

Every tree \(T\) of order \(25\), rooted at a degree-three vertex
\(p\), satisfies

\[
\boxed{
S_6(T,p)=
i_4(T)(2i_5(T)+i_4(T))
-24\!\left(i_5(T)i_4(T-p)-i_4(T)i_5(T-p)\right)
>0.
}
\]

Thus its exact rank-6 rooted-cross reserve is nonnegative.

## Coefficient setup

Put

\[
H=T-p,\qquad F=T-N[p].
\]

Then \(|H|=24\) and \(|F|=21\). Write

\[
a=i_3(F),\quad b=i_4(F),\qquad
h=i_4(H),\quad k=i_5(H).
\]

The sharp forest \(i_3/i_2\) ratio followed by two two-extension
inequalities gives

\[
\frac{i_3(H)}{i_2(H)}\ge\frac{140}{23},
\qquad
\frac{i_4(H)}{i_3(H)}\ge\frac{351}{92},
\qquad
\frac{k}{h}\ge\frac{282}{115}.
\]

For \(F\), let \(e,W,R\) count edges, wedges, and connected
three-edge subtrees. Then

\[
\begin{aligned}
a&=\binom{21}{3}-19e+W,\\
b&=\binom{21}{4}
-e\binom{19}{2}+17W+\binom e2-R.
\end{aligned}
\]

The exact forest bounds used are

\[
\max\!\left(0,\frac{2W^2/e-W}{3}\right)
\le R\le\binom e3,
\]

\[
\max(0,2e-21)\le W\le\binom e2.
\]

## The three-branch reserve

The \(21-e\) components of \(F\) split among the three neighbors of
\(p\). If the component counts are \(c_1,c_2,c_3\), including one
neighbor center removes one attachment vertex from each component
on that side. Coefficientwise path minimization therefore gives

\[
h\ge b+
\sum_{j=1}^3\binom{19-c_j}{3}.
\]

The proof minimizes this exact integer expression over all
\(c_1+c_2+c_3=21-e\). It also uses

\[
h\ge i_4(P_{24})=\binom{21}{4}.
\]

## Exact dense certificate

For every integer \(2\le e\le20\), the wedge interval is split only
where the connected-triple lower bound or the lower bound on \(h\)
changes formula. This gives 44 intervals.

After substituting \(k\ge(282/115)h\), the strong margin is decreasing
in \(b\) and increasing in \(h\). Every Bernstein coefficient of both
the resulting margin and its \(h\)-derivative is positive. The two
smallest are respectively

\[
\frac{823\,451\,544}{115},
\qquad
\frac{843\,702}{23}.
\]

## Sparse cases

The only cases outside that cone are \(e(F)=0,1\). They have complete
depth-two structural enumerations:

\[
\begin{array}{c|r|r|c}
e(F)&\text{states}&\min S_6&\text{minimizing split}\\ \hline
0&253&293\,646\,220&(7,7,7)\\
1&630&306\,392\,192&(5,7,7)
\end{array}
\]

Both minima are strictly positive, completing the theorem.

## Replay

```powershell
python .\verify_rank6_order25_degree3.py
```
