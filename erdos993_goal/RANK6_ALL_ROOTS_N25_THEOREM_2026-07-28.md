# Rank-6 rooted reserve from order 25

Date: 2026-07-28

Status: **proved theorem**. The remaining universal rooted rank-6
band is \(18\le n\le24\).

## Theorem

Every rooted tree \((T,p)\) of order \(n\ge25\) satisfies

\[
\boxed{
S_6(T,p)=
i_4(T)(2i_5(T)+i_4(T))
-24\!\left(i_5(T)i_4(T-p)-i_4(T)i_5(T-p)\right)
\ge0.
}
\]

Consequently every such rooted tree satisfies the exact rank-6
cross inequality

\[
i_4(T)\!\left(i_5(T)^2-i_4(T)i_6(T)\right)
-2i_5(T)\!\left(
i_5(T)i_4(T-p)-i_4(T)i_5(T-p)
\right)\ge0.
\]

Orders \(n\ge26\) are covered by the preceding all-root theorem. At
order 25 the proof splits by the degree of \(p\).

## Order-25 cases

### Leaf roots

The complete integral excess-degree partition is retained in the
normalized motif formula. Exactly \(1002\) support-excess-one
partitions and \(3506\) branch-support states are checked. Their exact
minimum lower margins are

\[
64\,742\,359,\qquad22\,712\,391.
\]

### Degree two

For \(F=T-N[p]\), all states with \(e(F)\le9\) are enumerated through
3,771 nontrivial rooted-component multisets. The largest edge layer
has 174,710 states, and the minimum over every sparse layer is
positive.

For \(10\le e(F)\le21\), a sharpened two-branch coefficient reserve
and exact edge/wedge/connected-triple bounds produce 26 positive
Bernstein cells.

### Degree three

The cases \(e(F)=0,1\) have 253 and 630 exact structural states. For
\(2\le e(F)\le20\), all 44 Bernstein cells for the margin and its
derivative are positive.

### Degree four or more

Degree at least five follows from the degree-sensitive ratio cone.
At degree four, every \(F\) with an edge satisfies the exact forest
ratio

\[
\frac{i_4(F)}{i_3(F)}<\frac{4033}{959},
\]

and the edgeless case has 1,771 depth-two distributions, with minimum
margin \(281\,275\,424\).

These cases exhaust every root and complete the theorem.

## Replay

The consolidated replay is:

```powershell
python .\verify_rank6_all_roots_n25.py
```

The component certificates can also be replayed separately:

```powershell
python .\verify_rank6_all_leaf_roots_n25.py
python .\verify_rank6_order25_degree2.py
python .\verify_rank6_order25_degree3.py
python .\verify_rank6_order25_degree4plus.py
python .\verify_rank6_all_roots_n26.py
```
