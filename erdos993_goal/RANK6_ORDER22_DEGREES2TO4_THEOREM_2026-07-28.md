# Rank-6 reserve at order-22 roots of degrees two through four

Date: 2026-07-28

Status: **proved theorem**.

## Degree two

Deleting the root leaves a 21-vertex two-component forest \(H\).
Joining one leaf from each component and specializing the strengthened
tree path theorem at order 21 gives

\[
\boxed{
i_4(H)\ge3180,\qquad
\frac{i_5(H)}{i_4(H)}\ge\frac{6643}{3180}.
}
\]

The residual forests of orders 17 and 18 satisfy the exact linear
margins

\[
3180i_3-6643i_2\ge649740,\qquad877352,
\]

respectively. These are exactly the payments needed by the
leaf-joining decomposition.

Every \(F=T-N[p]\) with at most ten edges is enumerated through 10,099
rooted-component multisets. The largest layer has 297,056 states; the
minimum over all sparse layers is \(33\,778\,140>0\).

For \(11\le e(F)\le18\), the sharp two-component inputs and full
two-center reserve produce 18 positive exact cells, with minimum
\(753\,675\,083/795\).

## Degree three

For the order-21 forest \(H=T-p\),

\[
\frac{i_3(H)}{i_2(H)}\ge\frac{51}{10},\quad
\frac{i_4(H)}{i_3(H)}\ge\frac{123}{40},\quad
\frac{i_5(H)}{i_4(H)}\ge\frac{93}{50}.
\]

The layers \(e(F)=0,\ldots,7\) contain 539,662 exact rooted states in
total; every margin is positive. The remaining edge counts form 20
positive symbolic cells with minimum \(7\,962\,144/25\).

## Degree four

Retaining all center-subset terms closes every edge count directly.
The 28 exact cells have minimum

\[
\frac{18\,914\,592}{25}>0.
\]

Together these certificates prove \(S_6(T,p)>0\) for every
22-vertex tree rooted at degree two, three, or four.

## Replay

```powershell
python .\verify_tree_rank45_path_ratio.py
python .\verify_rank6_order22_degrees2to4.py
```
