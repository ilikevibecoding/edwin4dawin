# Exact contiguous/Stieltjes reduction for the path block

This note is an independent supplement to Section 79.  It does **not** prove
the block lemma (79.5).  It gives a finite-free exact differential reduction
and records precisely which additional root inequality would prove it.  In
particular, positive compatibility and the oriented alternating order are not
identified with one another below.

Put

```text
P(x)=B_(n,s)(x),       Q(x)=B_(n-4,s)(x),
D=(n-s)(n-s-1)(n-s-2)(n-s-3),
E=(n-2s-2)(n-2s-3).
```

For `s>=2` and `n>=4s+9`, all of `D,E` are positive.  There is the exact
all-parameter identity

```text
x^3 Q(x)=U_0(x)P(x)+U_1(x)P'(x)+U_2(x)P''(x),       (1)
```

where `U_0=a_0+a_1x+a_2x^2+a_3x^3`,
`U_1=b_0+b_1x+...+b_4x^4`, and
`U_2=x^2(c_2+c_3x+c_4x^2+c_5x^3)`, with

```text
a_0=64s(n-1)/(D(n+1)),
a_1=16s(6n^2-3ns-7n+s+3)/(D(n+1)),
a_2=12ns(n-1)/D,
a_3=n(n-1)E/D;

b_0=256/(D(n+1)),
b_1=64(5n-6s+3)/(D(n+1)),
b_2=16(-3n^2-14ns+27n+8s^2+6s-18)/(D(n+1)),
b_3=-4(3n^2+8ns-5n-18s-6)/D,
b_4=-2(2n-3)E/D;

c_2=256/(D(n+1)),
c_3=64(5n-2s-3)/(D(n+1)),
c_4=16(n+2s)/D,
c_5=4E/D.                                             (2)
```

All coefficients of `U_0` and `U_2` are strictly positive in the forest
reserve.  The coefficients of `U_1` have the pattern `+,+,-,-,-` (the
quadratic coefficient is already negative at `n=4s+9`, and decreases farther
inside the cone after the standard nonnegative substitutions).

## Exact derivation

If `p_k=[x^k]P`, then

```text
p_(k+1)/p_k
 =-(s-k)(n-2k)(n-2k-1)/(4(k+1)(n-k)),                (3)
```

and the coefficient multiplier for the four-step shift is

```text
[x^k]Q/[x^k]P
 =prod_(r=0)^3(n-2k-r)/prod_(r=0)^3(n-k-r).          (4)
```

Substitute an ansatz of degrees `3,4,5` for `U_0,U_1,U_2`, with the forced
factor `x^2` in `U_2`, into (1).  Divide the coefficient of `x^k` by
`p_(k-3)` and use (3)--(4).  Clearing

```text
4^4(k-2)(k-1)k(k+1)
   (n-k+3)(n-k+2)(n-k+1)(n-k)
```

leaves a degree-13 polynomial in `k`.  Its fourteen coefficients vanish
identically after (2).  This is the exact symbolic replay used by
`derive_block_contiguous_relation.py`; no numerical fitting is part of the
identity.

## The exact Stieltjes inequality

Let the simple positive roots of `P` be

```text
0<r_1<...<r_s.
```

At `r_i`, equation (1) becomes

```text
Q(r_i)/P'(r_i)
 = {U_1(r_i)+U_2(r_i) P''(r_i)/P'(r_i)}/r_i^3.       (5)
```

Since `U_2(r)>0` for `r>0`, the oriented order seen in every exact block
check is therefore equivalent to

```text
P''(r_i)/P'(r_i)
 =2 sum_(j!=i) 1/(r_i-r_j)
 <-U_1(r_i)/U_2(r_i),       i=1,...,s.               (6)
```

Thus (6), together with strict positive-rootedness of `P,Q`, is an exact
all-order target for (79.5).  Merely proving that a positive pencil exists
would give positive compatibility; the uniform sign in (5) is the extra
orientation information.

The third-order hypergeometric equation for `P` gives a useful but currently
insufficient generic estimate.  With

```text
A=s+n-1/2,
K=(n^2+4ns-5n-6s+6)/4,
```

evaluation at a root `r` gives

```text
r^3 P'''(r)/P'(r)
 +r{1+r(3-A)} P''(r)/P'(r)+rK-n=0.                  (7)
```

Writing `H=P''(r)/P'(r)` and applying Cauchy--Schwarz to the `s-1`
Stieltjes summands yields

```text
3(s-2)/(4(s-1)) r^3 H^2
 +r{1+r(3-A)}H+rK-n >=0.                            (8)
```

Exact/numerical evaluation shows that (8) is too weak at some interior
roots: the desired threshold `-U_1/U_2` can lie on the same exterior branch
of this quadratic as `H`.  Consequently (8) alone is not a proof disguised
as a root bound; a sharper mesh or signed two-sided Stieltjes estimate is
still required.

## A second exact bridge and its obstruction

Deletion--contraction gives

```text
P(x)-Q(x)
 =-(s x/4) sum_(j=2)^5 B_(n-j,s-1)(x).              (9)
```

It would suffice to prove that the sum on the right is in the required
proper position with `P`.  The stronger termwise proposal is false.  Exact
rational isolation on the Section-79 grid (`2<=s<=12`, forest excess
`0,1,5,17`) shows that the `j=2,3` lower blocks interlace `P` in all 88
respective cases, but `j=4` and especially `j=5` fail in part of the grid.
The four-term sum still has the right order, equivalently by the already
certified finite instances of (79.5).  Any proof through (9) must therefore
use compensation in the sum and cannot silently assert four individual
common interlacers.

## What the Gaussian model supplies, and what it does not

For `C_N=tridiag(1,2,1)`, its ordered eigenvalues are

```text
lambda_k(C_N)=4 cos^2(k pi/(2(N+1))).                (10)
```

After padding `C_(N-2)` with two zeros, (10) gives strict coordinatewise
spectral domination by `C_N`.  Coupling the corresponding Gaussian rank-one
sums therefore gives samplewise Loewner domination.  Equivalently, changing
one covariance eigenvalue at a time gives an MSS-style chain of stable
one-coordinate pencils.

This proves useful one-step monotonicity/proper-position statements, but a
chain of same-direction interlacings does not imply the cross-gap inequality
for the two-endpoint pair.  The Gaussian representation by itself therefore
does not close (79.5); the missing content is exactly the displacement/mesh
control in (6), or an interlacing-family argument that keeps the two deleted
coordinates coupled rather than composing one-coordinate conclusions.

