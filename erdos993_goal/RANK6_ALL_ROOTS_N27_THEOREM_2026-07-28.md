# Rank-6 rooted reserve from order 27

Date: 2026-07-28

Status: **proved theorem**. This lowers the universal rooted threshold
from \(30\) to \(27\). It leaves only orders \(18\) through \(26\) in
the rank-6 induction input.

## Theorem

Let \(T\) be any tree of order \(n\ge27\), rooted at any vertex \(p\).
Write

\[
d=i_4(T),\quad e=i_5(T),\qquad
h=i_4(T-p),\quad k=i_5(T-p).
\]

Then

\[
\boxed{
S_6(T,p):=d(2e+d)-24(eh-dk)\ge0.
}
\tag{1}
\]

Consequently,

\[
\boxed{
C_6(T,p):=
d(e^2-di_6(T))-2e(eh-dk)\ge0.
}
\tag{2}
\]

## Degree-sensitive bound

Let \(t=d_T(p)\), \(F=T-N[p]\), \(a=i_3(F)\), \(b=i_4(F)\), and
\(x=e/d\). Put

\[
L=\frac{n-t-4}{4}.
\]

Extension counting gives \(b/a\le L\). The independent \(4\)-sets in
\(F\) and those obtained by adjoining \(p\) to independent \(3\)-sets
in \(F\) are disjoint, so \(d\ge a+b\).

Combining these facts with the sharp path bound

\[
x\ge\frac{(n-7)(n-8)}{5(n-3)}
\]

gives

\[
\frac{S_6(T,p)}{d^2}
\ge
2x+1-24\frac{L-x}{1+L}
\tag{3}
\]

whenever \(L>x\); if \(L\le x\), the deletion term is already
nonpositive.

The exact boundary values of (3) are

\[
\begin{array}{c|c|c}
n&t&\text{lower bound}\\ \hline
27&3&0\\
28&3&289/625\\
29&2&35/117\\
30&1&839/3915.
\end{array}
\]

The bound increases with \(t\). Together with the all-leaf theorem
from order \(26\), this settles every case except degree-two roots at
orders \(27\) and \(28\).

## A forest ratio lemma

For a forest \(F\) of order \(m\), let \(e\) be its number of edges,

\[
W=\sum_v\binom{d(v)}2,
\]

and let \(R\) count connected three-edge subtrees. Then

\[
\begin{aligned}
i_3(F)&=\binom m3-e(m-2)+W,\\
i_4(F)&=\binom m4-e\binom{m-2}2+W(m-4)
       +\binom e2-R.
\end{aligned}
\]

The line graph of \(F\) gives

\[
R\ge\frac{2W^2/e-W}{3}.
\tag{4}
\]

Using \(W\le\binom e2\), exact one-variable minimization proves:

\[
\frac{i_4(F)}{i_3(F)}\le5
\quad(m=24,\ e\ge6),
\tag{5}
\]

and

\[
\frac{i_4(F)}{i_3(F)}
\le\frac{2209}{407}
\quad(m=25,\ e\ge2).
\tag{6}
\]

For (5), the final margin factors as

\[
\frac{(e-23)(e-22)(e-6)}6\ge0
\qquad(6\le e\le23).
\]

For (6), the final cubic is positive for every integer
\(2\le e\le24\); its minimum is \(29\,733\).

The constants in (5)--(6) are exactly the values needed to make
(3) nonnegative at the two missing orders.

## Sparse exact classification

It remains to consider:

- \(n=28,t=2\), where \(F\) has at most one edge;
- \(n=27,t=2\), where \(F\) has at most five edges.

Deleting a degree-two root and its two neighbors leaves a forest
whose every component attaches to exactly one of those two neighbors.
When \(F\) has at most five edges, every nontrivial component has at
most six vertices.

The verifier generates every distinct rooted component state through
five edges. Their counts by edge number are

\[
1,\ 2,\ 4,\ 9,\ 20.
\]

It then enumerates every multiset of these components, every choice
of attachment side, and every split of the isolated components. The
minimum exact margins are:

\[
\begin{array}{c|r|r|r}
n&e(F)&\text{states}&\min S_6\\ \hline
28&0&26&1\,315\,089\,216\\
28&1&48&1\,243\,086\,603\\ \hline
27&0&25&878\,878\,660\\
27&1&46&827\,121\,152\\
27&2&172&777\,207\,504\\
27&3&480&730\,737\,645\\
27&4&1\,452&687\,215\,124\\
27&5&3\,928&646\,609\,959
\end{array}
\]

Every value is strictly positive. This exhausts the two residual
degree-two cases and proves (1).

## Replay

```powershell
python .\verify_rank6_all_roots_n27.py
```

Prerequisite certificates:

```powershell
python .\verify_tree_rank45_path_ratio.py
python .\verify_rank6_all_leaf_roots_n26.py
python .\verify_rank6_spider_bernstein_cells.py
python .\verify_rank5_terminal_payment_assembly.py
```
