# Rank-6 rooted reserve from order 23

Date: 2026-07-28

Status: **proved theorem**. The remaining universal rooted rank-6
band is \(18\le n\le22\).

## Theorem

Every rooted tree \((T,p)\) of order \(n\ge23\) satisfies

\[
\boxed{
S_6(T,p)=
i_4(T)(2i_5(T)+i_4(T))
-24\!\left(i_5(T)i_4(T-p)-i_4(T)i_5(T-p)\right)
\ge0.
}
\]

Orders \(n\ge24\) were previously certified. The new order-23 proof
splits by root degree as follows.

## Order-23 cases

### Leaves

The full integer degree-excess partition is retained. Rooting the
positive-excess core at a maximum weight gives exact parent-degree
capacities; the sorted parent-slot dot product sharply bounds the
weighted edge correlation.

The 627 support-excess-one partitions have minimum lower margin
\(42\,104\,715\). The 2087 remaining support/partition pairs have
minimum \(1\,327\,662\). Both are strictly positive.

### Degree two

Deleting the root produces a 22-vertex forest with exactly two
components. A leaf-joining reduction to the strengthened sharp tree
path theorem proves

\[
i_4(H)\ge4012,\qquad
\frac{i_5(H)}{i_4(H)}\ge\frac{2282}{1003}.
\]

Exact enumeration covers \(e(F)\le5\); 32 positive symbolic cells
cover every larger edge count.

### Degree three

There are 210, 513, 2142, 6627, and 21087 exact rooted states in the
five layers \(e(F)=0,\ldots,4\). The remaining edge counts are covered
by 29 positive cells which retain every nonzero center-selection term.

### Degree four

The full four-center reserve is strong enough for every edge count,
including the edgeless case. Thirty exact cells have minimum margin
coefficient \(61\,886\,448/5>0\).

### Degree five or more

Degree at least six follows from the degree-sensitive cone, whose
degree-six endpoint is \(1\).

At degree five, every nonempty 17-vertex forest \(F=T-N[p]\) satisfies

\[
\frac{i_4(F)}{i_3(F)}<\frac{317}{91},
\]

the exact rooted-cone threshold. The edgeless case has 5985 depth-two
states and minimum exact margin \(116\,712\,216\).

These cases exhaust every root and prove the theorem.

## Replay

```powershell
python .\verify_rank6_all_roots_n23.py
```

The order-23 components are:

```powershell
python .\verify_rank6_all_leaf_roots_n23.py
python .\verify_rank6_order23_degrees2to4.py
python .\verify_rank6_order23_degree5plus.py
```
