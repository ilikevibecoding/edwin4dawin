# Terminal q3 Newton m=0: subdivided double stars, all targets

Date: 2026-08-31

Let the no-isolate remainder be a tree with two distinguished hubs separated
by one middle vertex.  Put `a` leaves at the first hub and `b` leaves at the
second, sorted so that `a>=b>=0`.  This certificate closes every supported
target `j>=3` for this family when the marked root is isolated.

With `n=a+b+1`, its independence and exactly-one-edge rows are

```text
F(x)=(1+x)^n+x(1+x)^a+x(1+x)^b+x^2,
Z(x)=x^2((a+1)(1+x)^b+(b+1)(1+x)^a+(a+b)x).
```

The universal `j=3` boundary is pinned separately.  When `b=0`, the tree is
the already-certified subdivided star `D_(a,1)`.  For `b>=1`, the remaining
targets split without gaps into three exact regimes.

For `4<=j<=b+1`, divide by `B=C(n,j)` and put

```text
rho=C(a,j-1)/B,
tau=C(b,j-1)/B,
u_a=j*a/n^2,
u_b=j*b/n^2.
```

The exact margin is affine in `(rho,tau)`, and the actual pair lies in the
triangle `rho/u_a+tau/u_b<=1`.  After cancelling binomial factors, the left
side is `n/(n-1)` times a pure-side sampling probability in a universe that
also contains the middle vertex.  If the two side blocks have sizes
`A=a-1`, `B=b-1` and the universe has size `N=A+B+1`, the pure-side event
forces the first two samples into the same block.  The required comparison is
equivalent to

```text
(N+1)N(N-1) >= (N+2)(A(A-1)+B(B-1)).
```

After `A=2+A0`, `B=2+B0`, its difference has eight strictly positive
monomials.  The three triangle vertices give coefficientwise-positive
numerators with 273, 427, and 410 monomials.

At `j=b+2`, the small-side target row vanishes and its omitted predecessor
row is positive.  The remaining expression is affine in one exact
hypergeometric weight.  The two endpoint numerators have 63 and 86 strictly
positive monomials.  For `j>=b+3`, the same affine enclosure gives endpoint
numerators with 262 and 423 strictly positive monomials.

Thus the exhaustive partition is:

```text
j=3                         universal pinned boundary;
b=0, j>=4                  pinned subdivided-star theorem;
b=1, j>=4                  tail;
b=2, j=4                   seam;
b=2, j>=5                  tail;
b>=3, 4<=j<=b+1            middle triangle;
b>=3, j=b+2                seam;
b>=3, j>=b+3               tail.
```

This is an exact theorem for one connected diameter-at-most-four remainder
family.  Disconnected remainders, other diameter-four trees, larger-diameter
trees, nonisolated marked roots, the full terminal payment, and Erdős Problem
#993 remain separate.

Replay:

```powershell
python .\prove_terminal_q3_m0_marked_isolate_subdivided_double_star_all_j_root.py
```

Required marker:

```text
PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_SUBDIVIDED_DOUBLE_STAR_ROOT
```
