# Rooted-forest q3 reserve: all-order reduction to ranks 3, 4, and 5

Date: 2026-08-28

Status: **proved reduction.**  The full reserve remains conditional on three
fixed-rank inequalities for rooted forests with no isolated root component.

## 1. Candidate and notation

For a forest `F` with one distinguished root in each component, let
`H=F-roots`, and put

```text
f_j=i_j(F),  h_j=i_j(H),  z=s_2(F),  K=2f_2-z.
```

The reserve candidate at rank `j>=3` is

```text
E_j(F)=[2(j+1)h_2+(j-2)K]f_j-6h_j f_2 >=0.          (R_j)
```

## 2. Forests with no isolated root component

Suppose every component of `F` is nontrivial.  Let

```text
M=number of nonroots=number of edges of F,
c=number of components,  N=M+c.
```

Then `1<=c<=M` and

```text
f_2=C(N,2)-M.                                        (1)
```

If `D` is the total root degree, deleting the roots removes `D` edges, so

```text
h_2=C(M,2)-(M-D)=C(M-1,2)+D-1
    >=C(M-1,2)+c-1.                                  (2)
```

Also

```text
z=sum_(uv in E(F)) (N-deg(u)-deg(v)),
K=N(c-1)-2M+sum_v deg(v)^2.                         (3)
```

For a nontrivial tree component on `n_i` vertices,
`sum deg(v)^2>=4n_i-6`, with equality on a path.  Summing gives

```text
K>=M(c+1)+c^2-3c.                                   (4)
```

At `j=6`, (1)--(4) yield

```text
2(7)h_2+4K-6f_2
 >= 4M^2-2Mc-8M+c^2+5c.                            (5)
```

Put `c=1+u` and `M=c+v`, where `u,v` are nonnegative integers.  The
right side becomes

```text
3u(u+1)+6uv+2v(2v-1)>=0.
```

Since `2(j+1)h_2+(j-2)K` increases with `j`, for every `j>=6`

```text
2(j+1)h_2+(j-2)K >= 6f_2.
```

Finally `f_j>=h_j`, proving `(R_j)` for every `j>=6`.

## 3. Adding isolated distinguished-root components

Start from a rooted forest `F_0` with no isolated root component, and adjoin
`a` isolated vertices, each declared to be the root of its own component.
The root-deleted forest `H` is unchanged.  Write `f_j(a),K(a)` for the new
quantities.  Exact binomial convolution gives

```text
f_j(a)=sum_l C(a,l)f_(j-l)(0),
f_2(a)=f_2(0)+aN+C(a,2),
K(a)=K(0)+a(2N-M)+a(a-1).                           (6)
```

Set

```text
A(a)=2(j+1)h_2+(j-2)K(a),
deltaA=A(a+1)-A(a)=(j-2)(2N-M+2a).
```

Using `f_j(a+1)=f_j(a)+f_(j-1)(a)`, one obtains exactly

```text
E_j(a+1)-E_j(a)
 =A(a)f_(j-1)(a)+deltaA[f_j(a)+f_(j-1)(a)]
  -6h_j(N+a).                                        (7)
```

If `h_j=0`, this is nonnegative.  Otherwise `M>=j`, and the ordinary shadow
double count in `H` gives

```text
f_j(a)>=h_j,
f_(j-1)(a)>=h_(j-1)>=j h_j/(M-j+1).                 (8)
```

Substituting (2), (4), and (8) into (7), and multiplying by
`(M-j+1)/h_j`, leaves the exact polynomial `P(M,c,a,j)` reconstructed by
`verify_rooted_forest_q3_reserve_reduction_independent_agent.py`.

For `j=3`, `P` is a quadratic in `a` with leading coefficient `3` and
discriminant

```text
-83M^2+218M-216c+121.
```

After `M=3+r`, `c=1+u`, its negative is

```text
83r^2+280r+216u+188>0.
```

For `j>=4`, substitute `j=4+k`, `M=4+k+r`, `c=1+u`.  All 35 coefficients
of `P` in `(k,r,u,a)` are strictly positive.  Hence

```text
E_j(a+1)>=E_j(a)                                     (9)
```

for every `a>=0` and `j>=3`.

Thus isolated root components preserve the reserve.

## 4. Exact remaining obligation

Combining Sections 2 and 3 proves:

> To prove `(R_j)` for every rooted forest and every `j>=3`, it is enough to
> prove only `j=3,4,5` for rooted forests in which every component is
> nontrivial.

This is an all-order reduction, not finite evidence.  It does not prove the
three residual fixed-rank inequalities, the terminal two-block payment, the
all-tree higher-rank envelope, or Erdos Problem 993.

Correction: this version uses the sharp consequence
`h_2>=C(M-1,2)+c-1`.  The earlier draft's `+c` bound was off by one and is
superseded.
