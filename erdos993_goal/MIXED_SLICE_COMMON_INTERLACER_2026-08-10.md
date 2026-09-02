# Mixed-slice common interlacer for adjacent unsigned path rows

This note proves an all-order compatibility statement that is strictly
weaker than the oriented chain (62.4), but substantially stronger than the
finite evidence previously available.

Let

```text
P_M(v)=sum_i p_(M,i)v^i,  p_(M,i)=binom(2M-i-1,i),
F_(P,R;s)(z)=sum_i p_i r_(s-i)z^i.
```

Thus `A_(M,s)=F_(P_M,P_M;s)`.  Put

```text
K_(M,s)=F_(P_(M-1),P_M;s).
```

## 1. A finite stability preserver

Fix `R(v)=prod_j(1+mu_j v)`, with `mu_j>0`, and define on polynomials of
degree at most `m`

```text
T_(R,s)(z^i)=r_(s-i) z^i.
```

Choose `m>=s` and at least as large as the degrees of the input polynomials.
Its algebraic symbol is

```text
T_(R,s)((z+w)^m)
 =sum_i binom(m,i)e_(s-i)(mu)z^i w^(m-i)
 =w^(m-s)e_s(z,...,z,mu_1 w,...,mu_l w).            (1)
```

The elementary symmetric polynomial is real stable; diagonalization and
positive scaling preserve stability.  Hence (1) is stable.  The finite
Pólya--Schur symbol criterion therefore says that `T_(R,s)` preserves real
stability.  In particular it preserves proper position and interlacing.

## 2. One mixed slice interlaces both diagonal slices

The path determinant model gives

```text
P_M(v)=det(I+v C_(M-1)),
```

where `C_(M-2)` is the leading principal submatrix of the positive Jacobi
matrix `C_(M-1)`.  Cauchy interlacing is strict, so `P_(M-1)` and `P_M`
are in strict proper position.

Apply (1) with `R=P_M`.  It gives

```text
K_(M,s)=T_(P_M,s)P_(M-1)  interlaces
A_(M,s)=T_(P_M,s)P_M.                               (2)
```

Apply it instead with `R=P_(M-1)`.  It gives

```text
A_(M-1,s)=T_(P_(M-1),s)P_(M-1)  interlaces
K*_(M,s)=T_(P_(M-1),s)P_M.                          (3)
```

But

```text
K*_(M,s)(z)=z^s K_(M,s)(1/z),
```

and `A_(M-1,s)` is palindromic.  Reciprocal reflection preserves negative
root interlacing, so (3) says that `K_(M,s)` also interlaces
`A_(M-1,s)`.  Thus the two adjacent diagonal slices have the explicit
common interlacer `K_(M,s)`.

Consequently, for every `c>=0`,

```text
A_(M,s)+c A_(M-1,s)                                  (4)
```

is real-rooted.  Its coefficients are positive, so all its roots are
negative.  It is also palindromic.  The reciprocal-pair gamma substitution
therefore proves

```text
G_(M,s)(t)+c G_(M-1,s)(t) is negative-rooted
for every c>=0.                                      (5)
```

Equivalently, adjacent unsigned gamma rows have a common interlacer in all
orders.

## 3. Exact remaining gap

Statement (5) is positive compatibility, not full Obreschkoff proper
position.  Equal-degree positive compatibility does not force the two root
sets themselves to alternate.  For example,

```text
f=(t+5.0827)(t+0.02815),
g=(t+0.05248)(t+0.03637)
```

have a common interlacer and every positive combination is real-rooted, but
their roots do not alternate.  Therefore (2)--(5) must not be cited as a
proof of (62.4).

For one adjacent pair, the remaining oriented statement is componentwise
root monotonicity.  If the roots are increasingly ordered, proving

```text
root_i(G_(M,s)) < root_i(G_(M-1,s))                 (6)
```

for every `i`, the common-interlacer interval criterion from (5) then also
gives

```text
root_i(G_(M-1,s)) < root_(i+1)(G_(M,s)).
```

This closes the orientation of each adjacent pair.  It is not by itself the
full three-level chain (62.4): with `a,b,c` denoting sizes `M,M-1,M-2`, the
two adjacent conclusions still leave `c_i` and `a_(i+1)` unordered.  The
full target additionally needs two-step compatibility/interlacing between
sizes `M` and `M-2`, or a path-specific displacement bound proving
`c_i<a_(i+1)`.

The independent replay `prove_mixed_slice_common_interlacer.py` checks the
symbol identity (1), exact strict alternation in (2)--(3), gamma common
interlacer intervals, and representative positive pencils.  These finite
checks are transcription evidence; equations (1)--(5) are the all-order
argument.
