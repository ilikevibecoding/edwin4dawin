# Rooted-forest reserve theorem at rank j=4

Date: 2026-08-28

Status: **proved analytically for every finite rooted forest.**

For a forest `F` with one distinguished root in each component, put
`H=F-roots` and

```text
f_k=i_k(F),  h_k=i_k(H),  K_2=2f_2-s_2(F).
```

Then

```text
(10h_2+2K_2)f_4 >= 6h_4f_2.                         (1)
```

First suppose no rooted component is isolated.  Let `M` be the number of
nonroots (equivalently, edges), `c` the number of components, and `N=M+c`.
The corrected exact bounds are

```text
f_2=C(N,2)-M,
C(M-1,2)+c-1 <= h_2 <= C(M,2),
K_2>=N(c-1)+2(M-c).                                  (2)
```

## Direct coefficient domination

From (2),

```text
10h_2+2K_2-6f_2
 >=2M^2-4Mc-4M-c^2+7c.                              (3)
```

For `c=1,2,3`, the right side is respectively

```text
2(M-3)(M-1),
2(M-5)(M-1),
2(M^2-8M+6).
```

Thus (3) is nonnegative for `c=1,M>=3`, `c=2,M>=5`, and
`c=3,M>=8`.  In these ranges, since `f_4>=h_4`, the margin in (1) is

```text
[(10h_2+2K_2)-6f_2]f_4+6f_2(f_4-h_4)>=0.
```

When `M<4`, `h_4=0`, so (1) is immediate.

## Shadow/path payment

Leaf-deletion induction and Pascal's identity give the coefficientwise path
floor `i_k(F)>=C(N-k+1,k)` for every forest, hence

```text
f_4>=L:=C(N-3,4).
```

Downsampling independent 4-sets in the `M`-vertex forest `H` gives

```text
6h_4<=C(M-2,2)h_2.
```

It is therefore enough that

```text
B(h_2)=[10L-C(M-2,2)f_2]h_2+2LK_min >=0.            (4)
```

For `c=3` and `M=5,6,7`, the slope in (4) is negative, so its minimum is
at `h_2=C(M,2)`.  The exact endpoint values are `10,270,1330`.

For `c>=4`, put `c=4+u`, `M=c+r`.  The slope in (4) has 15 nonnegative
coefficients in `u,r`, and `B(C(M-1,2)+c-1)` has 28 nonnegative
coefficients.  Thus (4) holds throughout this range.

## The M=4 residue

Only `c=2,3` remains.  If `H` has an edge, then `h_4=0`.  If `H` is
edgeless, every component of `F` is a rooted star.  The positive leaf-count
compositions and exact margins in (1) are

```text
(1,3):   102,
(2,2):    14,
(1,1,2): 266.
```

These exhaust the residue.  The corrected isolated-root preservation
reduction restores any number of isolated distinguished-root components,
proving (1) for every rooted forest.

This theorem does not by itself prove the terminal two-block payment, the
all-tree higher-rank envelope, or Erdos Problem 993.
