# Q-sharp: the single coupled binomial kernel

Date: 2026-08-10

## Result

Although the two reciprocal-factorial pieces cannot be exposed
sequentially, the complete alpha-zero normalization is one strict finite
multiplier sequence.  Its total-degree lift is **not** a stability
preserver on arbitrary multiaffine polynomials.  It is, however, a
stability preserver on the symmetric shared-slot subspace.  This is exactly
the form available if the `P` derivative/identity slots are first built as
one exchangeable shared pool.

Thus the binomial normalization itself is not an obstruction, but symmetry
of the shared-slot parent is an essential hypothesis.  This does not yet
prove the Q-sharp theorem: the remaining obligation is to construct a
jointly stable, shared-slot-symmetric **all-grade** ordered-partition parent
before the fixed path grade `s` is projected out.

## 1. The finite symbol is Legendre-rooted

Define

```text
lambda_j=binom(P,j),             0<=j<=P.             (1)
```

Its degree-`P` finite symbol is

```text
J_P(z)=sum_(j=0)^P binom(P,j)^2 z^j.                 (2)
```

The classical Legendre identity is

```text
J_P(z)=(1-z)^P P_P((1+z)/(1-z)).                     (3)
```

Every zero `xi` of the Legendre polynomial `P_P` is simple and lies in
`(-1,1)`.  Under (3) it gives

```text
z_i=(xi-1)/(xi+1)<0.                                 (4)
```

Thus `J_P` has `P` simple negative roots.  By the finite Polya--Schur
criterion, (1) is a strict degree-`P` multiplier sequence.

## 2. The correct symmetric-slot contraction

Let `SymMA_P` be the symmetric multiaffine polynomials in shared choice-slot
variables `u_1,...,u_P`.  Such a polynomial has a unique expansion

```text
f(u)=sum_(j=0)^P c_j e_j(u).                          (5)
```

Define on this subspace

```text
B_P f=sum_(j=0)^P binom(P,j)c_j e_j(u).              (6)
```

This operator preserves real stability.  Indeed, diagonalization gives

```text
f(z,...,z)=sum_j binom(P,j)c_j z^j.                  (7)
```

The operator in (6) diagonalizes to the univariate coefficient multiplier
`lambda_j=binom(P,j)`, which preserves real-rootedness by Section 1.  The
polarization theorem then says that the polarization of the resulting
univariate polynomial is stable; that polarization is exactly `B_P f`.
This proves the claim in all orders.

If a monomial `u^S` records the slots allocated to the `X` path copy, the
coefficient of every `u^S` with `|S|=j` is multiplied by exactly
`binom(P,j)`.  Consequently, for an exchangeable shared-slot parent whose
diagonal pre-binomial coefficients are `C_j`, (6) has diagonal action

```text
sum_j C_j z^j  ->  sum_j binom(P,j)C_j z^j
                  =Qsharp_(N,d,s)(z).                (8)
```

No intermediate `1/j!` or `1/(P-j)!` row is formed.

## 3. Why symmetry cannot be omitted

The tempting extension

```text
B_P(u^S)=binom(P,|S|)u^S                             (9)
```

on **all** multiaffine polynomials is not a stability preserver.  The
Borcea--Branden multivariate multiplier-sequence theorem says that a
multiaffine diagonal multiplier must factor coordinatewise.  Here
`lambda(empty)=1` and `lambda({i})=P` would force every singleton factor to
be `P`, hence would predict `lambda({i,j})=P^2`; the actual value is
`binom(P,2)=P(P-1)/2`, unequal for every `P>=2`.

There is also a two-variable exact witness.  The stable polynomial

```text
f(x,y)=(x+1)(y-1)=xy-x+y-1
```

is sent by the `P=2` version of (9) to

```text
g(x,y)=xy-2x+2y-1.
```

Its multiaffine Rayleigh difference is

```text
Delta_(x,y)(g)=(-2)(2)-(-1)(1)=-3<0,                (10)
```

so `g` is not real stable.  Therefore a generic monomialwise insertion of
the Legendre kernel would be invalid.  Exchangeability/polarization is the
mechanism that makes the single contraction legitimate.

## 4. Exact coupled-contraction target

Let `P=d+s`.  The remaining positive determinant route is now precise:

1. build the rectangular ordered-partition lift with one **shared** pool of
   `P` labeled choice slots for the two path copies, symmetric under all
   slot permutations;
2. compose it with the all-grade raw two-pair selector before any fixed path
   grade is extracted, retaining joint stability and slot symmetry;
3. apply the single symmetric-slot operator `B_P` from (6);
4. only then take path grade `s`, diagonalize the two row blocks, and remove
   the forced monomial from the Q-sharp reduction.

If the all-grade parent in step 2 exists with these properties, step 3
preserves stability by Section 2, coefficient extraction in step 4
preserves stability, and (8) identifies the output with `Qsharp`.  This
would prove `W_(N,d,s)` negative-rooted and, through the mixed-derivative
identity, all lower rows.

The precise unresolved point is therefore not the factorial normalization:
it is the construction of the jointly stable, exchangeable all-grade parent
on which (6) acts **before** the otherwise non-stable fixed-grade
projection.  The separate-multiplier counterexample shows why splitting
the contraction is impossible, and (10) shows why forgetting shared-slot
symmetry is also impossible.

## 5. Exact replay

`prove_qsharp_coupled_binomial_kernel.py` checks the Legendre identity and
all negative roots through `P=40`, verifies (8) on every lower cell with
`5<=d<=12`, and checks the exact Rayleigh witness (10).  It writes
`qsharp_coupled_binomial_kernel_exact_20260810.json`.

The Legendre identity, finite multiplier-sequence criterion, symmetric
polarization argument, and coefficient action are all-order proofs.  The
finite range is only a transcription audit.
