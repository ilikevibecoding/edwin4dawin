# Rank-6 reserve at degree-two roots of order 25

Date: 2026-07-28

Status: **proved theorem**. Combined with the degree-three and
high-degree certificates, the only unresolved universal rooted case
at order 25 is a leaf root.

## Theorem

Every tree \(T\) of order \(25\), rooted at a degree-two vertex \(p\),
satisfies

\[
\boxed{
S_6(T,p)=
i_4(T)(2i_5(T)+i_4(T))
-24\!\left(i_5(T)i_4(T-p)-i_4(T)i_5(T-p)\right)
>0.
}
\]

Therefore its exact rank-6 rooted-cross reserve is nonnegative.

## Setup

Put \(H=T-p\) and \(F=T-N[p]\). Then \(|H|=24\),
\(|F|=22\). Writing

\[
a=i_3(F),\quad b=i_4(F),\qquad
h=i_4(H),\quad k=i_5(H),
\]

the order-24 forest bounds give

\[
\frac{i_3(H)}{i_2(H)}\ge\frac{140}{23},
\qquad
\frac{i_4(H)}{i_3(H)}\ge\frac{351}{92},
\qquad
\frac{k}{h}\ge\frac{282}{115}.
\]

## Sparse forests

For \(e(F)\le9\), every nontrivial component has at most ten
vertices. The verifier enumerates every distinct rooted component
polynomial state, every multiset of components, every assignment to
the two neighbors of \(p\), and every split of the isolated
components.

There are 3,771 nontrivial component multisets. The exact totals are:

\[
\begin{array}{c|r|r}
e(F)&\text{rooted states}&\min S_6\\ \hline
0&23&370\,162\,595\\
1&42&343\,497\,880\\
2&156&317\,981\,113\\
3&432&294\,459\,328\\
4&1\,296&272\,800\,355\\
5&3\,472&252\,814\,275\\
6&9\,696&235\,359\,813\\
7&25\,532&219\,314\,445\\
8&67\,792&206\,144\,421\\
9&174\,710&195\,187\,888
\end{array}
\]

Every minimum is strictly positive.

## The sharpened two-branch reserve

Suppose \(F\) has \(e\) edges and \(c=22-e\) components. Split the
components as \(c_1+c_2=c\) between the two neighbors of \(p\), and
let \(r_j\) be the number of nontrivial components on side \(j\),
with \(r=r_1+r_2\).

Including center \(j\) removes \(c_j\) attachment vertices and at
least \(r_j\) edges. The resulting forest has

\[
N_j=22-c_j,\qquad E_j\le e-r_j.
\]

If a forest with \(N\) vertices and \(E\) edges has at most \(r\)
edge-bearing components, its wedge count is at least

\[
\max(0,\,2E-N,\,E-r).
\]

Thus

\[
i_3\ge
\binom N3-E(N-2)+\max(0,2E-N,E-r).
\]

When both centers are included, the remaining forest has \(e\)
vertices and at most \(e-r\) edges, so its \(i_2\) is at least
\(\binom e2-(e-r)\).

Minimizing these three center-inclusion terms over the exact integer
parameters gives the following reserves for \(10\le e\le21\):

\[
907,999,1091,1197,1303,1424,1545,1682,1819,1973,2127,2299.
\]

## Dense coefficient cone

The proof also uses

\[
h\ge i_4(P_{24})=\binom{21}{4},
\]

the exact edge/wedge formulas for \(a,b\), and

\[
\max\!\left(0,\frac{2W^2/e-W}{3}\right)
\le R\le\binom e3
\]

for connected three-edge subtrees \(R\) of \(F\).

For each \(10\le e\le21\), the wedge interval is split only when one
of these formulas changes. The resulting 26 exact cells have positive
Bernstein coefficients for both the strong-margin lower bound and
its derivative in \(h\). Their two smallest coefficients are

\[
\frac{101\,907\,036}{115},
\qquad
\frac{13\,443\,668}{345}.
\]

This proves the dense case and completes the theorem.

## Replay

```powershell
python .\verify_rank6_order25_degree2.py
```
