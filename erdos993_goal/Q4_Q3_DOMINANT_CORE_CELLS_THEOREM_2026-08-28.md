# All-order q4 <= q3 theorem for dominant-core cells

Date: 2026-08-28

Status: **proved for the stated region by an exact finite family of
all-order polynomial certificates; producer pass, independent audit pending**.

## Statement

Let `T` be an `n`-vertex tree, and put

```text
x_v=d(v)-1,      N=sum_v x_v=n-2,      m=max_v x_v.
```

If

```text
0 <= N-m <= 8,
```

then

```text
4 i4(T) s3(T) - 3 i3(T) s4(T) >= 0,
```

and hence `q4(T)<=q3(T)` whenever the ratios are defined.  The case
`N-m=0` is the star and is immediate.  The certificate covers every positive
complement mass `1<=N-m<=8` at every order.

## Why the region has finitely many all-order cells

Delete the leaves of `T`.  Its nonleaf core is a tree whose vertices carry
the positive integer weights `x_v`.  Choose a maximum-weight vertex.  For
fixed

```text
L=N-m,
```

the weights on all other core vertices form an integer partition of `L`.
Consequently there are only finitely many weighted core trees for each fixed
`L`; the chosen maximum has the sole unbounded weight `N-L`.

The enumeration is complete because it runs through every partition of `L`,
every unlabeled tree on one more vertex than the partition length, every
choice of dominant vertex, and every assignment of the partition to the
other vertices.  A cell is retained exactly when

```text
deg_core(v) <= x_v+1
```

at each fixed vertex.  The lower bound on `N` also enforces this condition at
the dominant vertex and enforces `N-L` to be a maximum weight.  These are
precisely the conditions for restoring nonnegative numbers of leaves at all
core vertices.

## Exact margin polynomial

For each retained weighted core the producer reconstructs the exact tree
coordinates

```text
B_k=sum_v C(x_v,k),
X=sum_(uv in E(T)) x_u x_v-(N-1),
V5=B4+B3+Y+Z,
Omega=V5-(n-4),
```

and then the exact formulas

```text
i3=C(n-2,3)+B2,
i4=C(n-3,4)+(n-5)B2-B3-X,
s3=3C(n-3,3)+(-2n+11)B2+3B3+3X,
s4=(-24Omega+18Xn-108X+18B3n-126B3
    -6B2n^2+90B2n-300B2+n^4-22n^3
    +179n^2-638n+840)/6.
```

Thus the margin is an exact integer polynomial `P(N)`.  Each cell is proved
for all admissible `N` by finding a shift `a` for which every coefficient of
`P(N+a)` is nonnegative, and checking the finite exact prefix below `a`.
This is an all-order proof for every enumerated cell, not extrapolation from
bounded tree orders.

## Certificate census

Run

```powershell
python .\certify_q4_q3_dominant_core_cells_root.py --max-complement-mass 8
```

The exact producer certifies:

```text
66 integer partitions,
271 underlying core trees,
7,665 weighted labeled cells,
2,842 admissible cells,
2,842 certified cells,
0 negative finite-prefix values,
maximum coefficient shift N=16.
```

The ordered certificate stream is

```text
B66B9A800CC1B5BDDCD43D1F1D730BF74377328583DF5A06AD5105F962C9135D.
```

## Scope boundary

This proves `q4<=q3` only when a maximum excess degree carries all but at
most eight units of the total excess degree.  It does **not** prove the
inequality for arbitrary trees, any later-rank envelope, independence-
sequence unimodality, or Erdos Problem 993.
