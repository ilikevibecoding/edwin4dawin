# Forest terminal `m=1`, target `j=3`: root-neighbor class caps

Date: 2026-08-29

Status: **exact all-order auxiliary lemma.**  These inequalities strengthen
the `j=3` forest reduction; they do not by themselves prove the terminal
payment or Erdos Problem 993.

## Setup

Let `G` be a forest, mark a vertex `w`, and put

```text
F=G-w,  H=G-N_G[w],  U=N_G(w),  d=|U|,
S=|H|,  r_i=|N_F(u_i)|,  R=sum_i r_i.
```

The sets `X_i=N_F(u_i)` are pairwise disjoint subsets of `H`; otherwise a
cycle passes through `w`.  Write `f_k=i_k(F)`, `h_k=i_k(H)`, `b=f_3`, and
`y=h_3/b` on supported cells.  Put

```text
P_k(n)=C(n-k+1,k) for n>=2k-1, and P_k(n)=0 otherwise.
```

Every `n`-vertex forest has at least `P_k(n)` independent `k`-sets, by the
standard leaf induction.  For fixed `S`, each sequence
`r -> P_k(S-r)` used below is discretely convex.

## The complete root-neighbor contribution to `f_3`

Partition independent triples of `F` by how many vertices they use from
`U`.  The classes using respectively one, two, and three root-neighbors
give

```text
B1 = sum_i i_2(H-X_i) >= sum_i P_2(S-r_i),
B2 = sum_(i<k) (S-r_i-r_k)
   = C(d,2)S-(d-1)R,
B3 = C(d,3).
```

Thus

```text
b >= h_3+B1+B2+B3.                                 (1)
```

If `R=dq+s`, `0<=s<d`, convex balancing gives the parameter-only floor

```text
B1bar=(d-s)P_2(S-q)+sP_2(S-q-1).                   (2)
```

For `e_H=|E(H)|`, the fixed-edge rank-three upper bound is

```text
U3=C(S,3)-e_H(S-2)+C(e_H,2) >= h_3.                (3)
```

Combining (1)--(3),

```text
y <= U3/[U3+B1bar+C(d,2)S-(d-1)R+C(d,3)],          (4)
```

with value zero when `U3=0`.  Compared with an exactly-one-neighbor cap,
(4) retains every two- and three-root-neighbor class.

## Root-neighbor contribution to `f_4`

Partition independent four-sets of `F` in the same way.  The zero-, one-,
three-, and four-root-neighbor classes give the lower bounds

```text
P_4(S),
sum_i P_3(S-r_i),
C(d,3)S-C(d-1,2)R,
C(d,4).
```

For the two-root-neighbor classes, put `L=C(d,2)` and
`T=(d-1)R=sum_(i<k)(r_i+r_k)`.  If `L>0`, write `T=Lq2+s2`,
`0<=s2<L`.  Discrete convexity gives

```text
sum_(i<k) i_2(H-X_i-X_k)
 >= (L-s2)P_2(S-q2)+s2P_2(S-q2-1).                 (5)
```

Similarly, (2) with `P_3` in place of `P_2` bounds the one-root class.
Consequently

```text
F4bar = P_4(S)
      +(d-s)P_3(S-q)+sP_3(S-q-1)
      +(L-s2)P_2(S-q2)+s2P_2(S-q2-1)
      +C(d,3)S-C(d-1,2)R+C(d,4)
 <= f_4,                                           (6)
```

where the `L=0` two-root term is zero.

At target three,

```text
U0/b = [i_4(G)+i_3(G)]/f_3
     = 1+y+(h_2+f_4)/b.
```

Therefore (6) yields the exact structural lower

```text
U0/b >= 1+y+(h_2+F4bar)/b.                         (7)
```

## Independent component-count lower

If `G` has `h+1` components, then `F` has `d+h` components.  An independent
triple occupies at most three of them, and every unoccupied component
supplies an extension vertex.  Hence

```text
4f_4 >= (d+h-3)f_3.                                (8)
```

Also `3h_3 <= (|H|-2)h_2 <= (N-3)h_2` when `|G|=N+1` and `d>=1`.
Together with the exact display preceding (7),

```text
U0/b >= (d+h+1)/4+y+3y/(N-3).                     (9)
```

The terminal reduction may take the maximum of (7), (9), and the existing
coupled-shadow lower.  Each is valid separately because its coefficient is
the already-positive row `A1`.

## Scope

The formulas are exact for every forest and every supported target-three
cell.  A finite structural scan through `N=30` found zero negative reduced
payments after combining these caps, but that scan is evidence only; an
all-order positivity certificate is still required.
