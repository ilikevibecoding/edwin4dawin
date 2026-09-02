# Correlated endpoint deletion gives mixed half-plane stability

## Theorem

Let

```text
P_M(x)=det(I_(M-1)+x C_(M-1))
      =sum_i binom(2M-i-1,i)x^i,
```

where `C_m=tridiag(1,2,1)`.  For every `N>=3` and `u>=0`, put

```text
K_(N,u)(x,y)
 =P_N(x)P_N(y)+2u P_(N-1)(x)P_(N-1)(y)
                 +u^2 P_(N-2)(x)P_(N-2)(y).       (1)
```

Then

```text
K_(N,u)(x,y) != 0 whenever Im(x)>0 and Im(y)<0.    (2)
```

Thus the positive coefficient matrix of the complete correlated kernel is
the coefficient matrix of a polynomial stable in opposite half-planes.

## Proof

Put `m=N-1` and introduce independent diagonal variables
`a=(a_1,...,a_m)`:

```text
D(a;x)=det(diag(a)+x C_m).                           (3)
```

Because all coefficient matrices in (3) are positive semidefinite, `D` is
real stable jointly in `a_1,...,a_m,x`.  Hence

```text
F(a,b;x,z)=D(a;x)D(b;z)                              (4)
```

is real stable in all displayed variables.

For distinct variables `r,s` and a fixed `u>=0`, the operator

```text
T_(r,s)=1-u partial_r partial_s                      (5)
```

preserves real stability on polynomials multiaffine in `r,s`.  Its finite
symbol is, up to stable factors and translations,

```text
RS-u,                                                (6)
```

which cannot vanish when `R,S` are both in the upper half-plane: their
product cannot be a positive real number.  This is also the elementary
two-variable Lieb--Sokal contraction.

Apply the two commuting endpoint contractions

```text
T=(1-u partial_(a_1)partial_(b_1))
  (1-u partial_(a_m)partial_(b_m))                  (7)
```

to (4).  The result is real stable.  Now specialize every `a_i=1` and
every `b_i=-1`.  Real specialization preserves stability.  Principal-minor
differentiation and the fact that deleting either endpoint of `C_m` gives
`C_(m-1)` yield

```text
(-1)^m T F |_(a=1,b=-1)
 =P_N(x)P_N(-z)+2uP_(N-1)(x)P_(N-1)(-z)
             +u^2P_(N-2)(x)P_(N-2)(-z).            (8)
```

Indeed, a term with `q` synchronized endpoint deletions acquires the
operator sign `(-1)^q` and the second determinant sign `(-1)^(m-q)`;
relative to the common factor `(-1)^m` these cancel.  Substituting `z=-y`
in (8) proves (2).

## Fixed-grade consequence and exact remaining gap

Write

```text
K_(N,u)(x,y)=sum_s H_(N,s,u)(x,y),
```

where `H_(N,s,u)` is homogeneous of total degree `s`.  Its dehomogenization
is exactly

```text
A_(N,s)(z)+2uA_(N-1,s)(z)+u^2A_(N-2,s)(z),          (9)
```

whose gamma polynomial is the coherent pencil

```text
G_(N,s)(t)+2uG_(N-1,s)(t)+u^2G_(N-2,s)(t).          (10)
```

The target needed for the lower selector is that every (9) is real stable
in the *same* half-plane, equivalently that (10) is negative-rooted.
Equation (2) is not by itself a homogeneous-component closure theorem.
Such a closure is false for generic Hurwitz-stable polynomials, and no
generic opposite-half-plane theorem is asserted here.  The new reduction
shows that the remaining lemma is a fixed-antidiagonal theorem for this
specific synchronized endpoint-deletion kernel.

## Replay

`verify_correlated_endpoint_mixed_halfplane_stability.py` checks the two
endpoint derivative identity exactly, checks (8) coefficientwise, and
replays the finite symbols of (5) for `3<=N<=6`.  The determinant/stability
argument above is all-order; the finite replay is only a transcription
audit.
