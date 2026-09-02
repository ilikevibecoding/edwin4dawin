# Terminal q3 Newton m=0: hub-distance-four double brooms, all targets

Date: 2026-08-31

Let `T_(a,b,4)` be the tree whose two hubs are joined by a path of four
edges, with sorted pendant-leaf counts `a>=b>=1`.  This certificate proves
the isolated-marked-root terminal-q3 Newton `m=0` payment nonnegative at
every supported target `j>=3`.

Put `n=a+b`.  With `P1=1+x`, `P2=1+2x`, and `P3=1+3x+x^2`, the independence
row is

```text
F(x)=(1+x)^n P3
    +x(1+x)^a P2+x(1+x)^b P2+x^2 P1.
```

Unique-induced-edge decomposition gives

```text
Z(x)=x^2[
 (a+1)(1+2x)(1+x)^b
 +(b+1)(1+2x)(1+x)^a
 +2(1+x)^n+(n+2)x+n x^2
].
```

The verifier independently reconstructs both rows by literal subset
enumeration on small family members.

For `j>=4`, normalize by `B=C(n,j-2)` and put

```text
rho=C(a,j-2)/B,
tau=C(b,j-2)/B,
u_a=a(a-1)/(n(n-1)),
u_b=b(b-1)/(n(n-1)).
```

The exact lower margin is affine in `(rho,tau)`.  At `j=4`, the weights are
exactly `(u_a,u_b)`; after omitting one positive predecessor row, the
resulting numerator has 90 positive monomials.

For `j>=5`, cancellation of the first two selected vertices gives

```text
rho/u_a=C(a-2,j-4)/C(n-2,j-4),
tau/u_b=C(b-2,j-4)/C(n-2,j-4).
```

The two numerator families are disjoint nonempty-subset events in an
`(n-2)`-element universe, hence

```text
rho/u_a+tau/u_b<=1.
```

For middle targets `5<=j<=b+2`, the three triangle vertices have
coefficientwise-positive numerators with 440, 795, and 780 monomials.  For
the tail `j>=b+3`, `tau=0`; the lower and upper `rho` endpoints have 427 and
779 positive monomials.  The anchor determinant has 21 positive monomials.

The exhaustive target partition is

```text
j=3                         universal pinned boundary;
b=1, j>=4                  tail;
b>=2, j=4                  exact seam lower;
b>=3, 5<=j<=b+2            middle triangle;
b>=2, j>=b+3               tail.
```

This closes one complete connected remainder family, not arbitrary trees or
forests, nonisolated marked roots, the complete terminal payment, or Erdős
Problem #993.

Replay:

```powershell
python .\prove_terminal_q3_m0_marked_isolate_hub_distance4_double_broom_all_j_root.py
```

Required marker:

```text
PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE4_DOUBLE_BROOM_ROOT
```
