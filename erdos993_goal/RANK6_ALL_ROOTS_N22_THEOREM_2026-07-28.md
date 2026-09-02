# Rank-6 rooted reserve from order 22

Date: 2026-07-28

Status: **proved theorem**. The remaining universal rooted rank-6
band is \(18\le n\le21\).

## Theorem

Every rooted tree \((T,p)\) of order \(n\ge22\) satisfies

\[
S_6(T,p)=
i_4(T)(2i_5(T)+i_4(T))
-24\!\left(i_5(T)i_4(T-p)-i_4(T)i_5(T-p)\right)
\ge0.
\]

## New order-22 work

- Leaf roots: 490 support-excess-one partitions and 1458 of the 1597
  remaining partitions close under the support-aware moment cone. The
  139 inconclusive partitions are realized through every compatible
  weighted positive-excess core, totaling 1,698,339 exact states.
  Their minimum is \(21\,307\,524>0\).

- Degree two: a sharp two-component lemma gives
  \(i_4(H)\ge3180\) and \(i_5(H)/i_4(H)\ge6643/3180\). Sparse
  enumeration through ten edges and 18 dense cells close all cases.

- Degree three: 539,662 sparse states through seven edges and 20
  dense cells all have positive margin.

- Degree four: every edge count closes directly in 28 positive cells.

- Degree five: a sharp forest ratio closes \(e(F)\ge2\); 20,145 exact
  states cover \(e(F)=0,1\).

- Degree at least six: the degree-sensitive endpoint is \(13/19>0\).

These cases exhaust all roots and prove the theorem.

## Replay

```powershell
python .\verify_rank6_all_roots_n22.py
```

The order-22 component certificates are:

```powershell
python .\verify_rank6_all_leaf_roots_n22.py
python .\verify_rank6_order22_degrees2to4.py
python .\verify_rank6_order22_degree5plus.py
```
