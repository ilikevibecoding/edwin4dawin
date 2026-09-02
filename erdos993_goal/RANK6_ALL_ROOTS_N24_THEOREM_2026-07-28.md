# Rank-6 rooted reserve from order 24

Date: 2026-07-28

Status: **proved theorem**. The remaining universal rooted rank-6
band is \(18\le n\le23\).

## Theorem

Every rooted tree \((T,p)\) of order \(n\ge24\) satisfies

\[
\boxed{
S_6(T,p)=
i_4(T)(2i_5(T)+i_4(T))
-24\!\left(i_5(T)i_4(T-p)-i_4(T)i_5(T-p)\right)
\ge0.
}
\]

Consequently every such rooted tree satisfies the exact rank-6 cross
inequality used by the induction program.

Orders \(n\ge25\) were already certified. At order \(24\), the proof
splits by root degree.

## Order-24 cases

### Leaf roots

The complete integral partition of the degree-excess total \(22\) is
retained. A sharp weighted-tree lemma bounds its edge correlation:
for positive vertex weights of total \(W\) and maximum \(M\), every
weighted tree has edge sum at most \(M(W-M)\).

Exactly 792 support-excess-one partitions and 2714 remaining
support/partition pairs are evaluated. Their exact lower-margin
minima are

\[
65\,472\,928,\qquad8\,404\,050.
\]

### Degree two

Deleting the root leaves a 23-vertex forest with exactly two
components. Joining one leaf from each component and applying the
strengthened sharp tree rank-\((4,5)\) theorem proves the new sharp
input

\[
i_4(H)\ge4998,\qquad
\frac{i_5(H)}{i_4(H)}\ge\frac{362}{147}.
\]

This reduces the sparse calculation to only 22, 40, and 148 states
for \(e(F)=0,1,2\). All \(3\le e(F)\le20\) are covered by 39 exact
positive Bernstein cells.

### Degree three

The layers \(e(F)=0,1,2\) contain 231, 570, and 2403 exact rooted
states. Retaining all one-, two-, and three-center terms gives 35
positive dense cells for every \(3\le e(F)\le19\).

### Degree four or more

Degree at least five follows from the degree-sensitive ratio cone,
whose degree-five endpoint is \(643/1995>0\).

At degree four, every 19-vertex forest \(F\) with at least three edges
satisfies

\[
\frac{i_4(F)}{i_3(F)}
<\frac{7177}{1871},
\]

the exact rooted-cone threshold. The remaining edge layers have 1540,
4560, and 20808 states, all with positive exact margins.

These cases exhaust every root and prove the theorem.

## Replay

The consolidated replay is:

```powershell
python .\verify_rank6_all_roots_n24.py
```

The order-24 components can also be checked separately:

```powershell
python .\verify_rank6_all_leaf_roots_n24.py
python .\verify_rank6_order24_degree2.py
python .\verify_rank6_order24_degree3.py
python .\verify_rank6_order24_degree4plus.py
```
