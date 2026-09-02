# Gegenbauer derivatives prove the odd path-block signed pencil

This note proves the block lemma (79.5) in the exact odd-path range needed
by the selector reduction.  It does **not** by itself claim the diagonal
gamma root chain: the propagation through simultaneous changes of both
finite-convolution factors is audited separately.

## 1. Two characteristic polynomials and a common derivative order

Let

```text
C_N=tridiag(1,2,1),
chi_N(y)=det(yI-C_N)=U_N((y-2)/2).
```

Write `n=2N+1`, fix `2<=s<=N`, and put

```text
m=N-s,       lambda=m+1.
```

The codimension-two compression `C_(N-2) subset C_N`, padded back to
degree `N`, has characteristic polynomial `y^2 chi_(N-2)(y)`.  The standard
Gegenbauer derivative formula gives, with `t=(y-2)/2`,

```text
chi_N^(m)(y)
 =m! C_s^lambda(t),                                (1)

{y^2chi_(N-2)(y)}^(m)
 =m!{4(t+1)^2 C_(s-2)^lambda(t)
      +4(t+1) C_(s-1)^(lambda-1)(t)
      +C_s^(lambda-2)(t)}.                         (2)
```

The generating function `(1-2tw+w^2)^(-lambda)` yields the exact lowering
identity

```text
4(t+1)^2 C_(s-2)^lambda
 +4(t+1) C_(s-1)^(lambda-1)
 +C_s^(lambda-2)
 =sum_(j=0)^4 binom(4,j)C_(s-j)^lambda.            (3)
```

Terms with negative subscripts are interpreted as zero.

## 2. A positive Gegenbauer residue proves directed interlacing

Let `t` be a zero of `C_s^lambda`.  Put

```text
r_j=C_(s-j)^lambda(t)/C_(s-1)^lambda(t),
Phi=4+6r_2+4r_3+r_4.                               (4)
```

The three-term Gegenbauer recurrence gives

```text
r_2=2(s+lambda-1)t/(s+2lambda-2),
r_3={2(s+lambda-2)t r_2-(s-1)}/{s+2lambda-3},
r_4={2(s+lambda-3)t r_3-(s-2)r_2}/{s+2lambda-4}.   (5)
```

Moreover,

```text
H(t)/(C_s^lambda)'(t)
 ={1-t^2}/{s+2lambda-1} Phi,                       (6)
```

where `H` denotes the right side of (3).  The denominator of `Phi` is

```text
(2lambda+s-4)(2lambda+s-3)(2lambda+s-2).           (7)
```

Assume the forest reserve

```text
n>=4s+9,       equivalently lambda>=s+5.           (8)
```

Substitute

```text
s=p+2,       lambda=p+h+7,       t=u-1.
```

Here `p,h>=0` and every Gegenbauer zero has `0<u<2`.  After clearing (7),
the numerator of `Phi` is a polynomial in `p,h,u` with 38 terms; every
coefficient is a strictly positive integer.  Hence `Phi>0` at every zero
of `C_s^lambda`.

Gegenbauer zeros are simple and lie in `(-1,1)`.  Equation (6) therefore
says that `H` and `(C_s^lambda)'` have the same sign at every such zero.
The endpoint signs and equal positive leading coefficients then give the
strict directed alternation of the two degree-`s` derivatives in (1)--(2).

## 3. Reciprocal reversal and a strict multiplier sequence

Write

```text
B_(n,s)(x)
 =sum_(i=0)^s (-1)^i s!/(s-i)! binom(n-i,i)(x/4)^i. (9)
```

The elementary symmetric coefficients of `C_N` are

```text
e_i(C_N)=binom(2N+1-i,i).                          (10)
```

Normalize the common derivatives in (1)--(2), take their degree-`s`
reciprocals, and scale `x` by `1/4`.  Their `i`th coefficients are

```text
(-1)^i e_i(C) (s)_(falling i)
 /{(N)_(falling i)4^i}.                            (11)
```

Applying the diagonal multiplier

```text
gamma_i=(N)_(falling i)                            (12)
```

turns the large and padded-small members exactly into `B_(2N+1,s)` and
`B_(2N-3,s)`.  The finite multiplier symbol is a Laguerre polynomial:

```text
sum_(i=0)^s (-1)^i binom(s,i)(N)_(falling i)x^i
 =s!(-x)^s L_s^(N-s)(1/x).                         (13)
```

It has simple positive roots, so the sign-reversed symbol has simple
negative roots.  The finite Pólya--Schur theorem makes (12) a strict
proper-position preserver.  Reciprocal reversal only reverses the already
known direction.  Consequently

```text
B_(2N+1,s) strictly precedes B_(2N-3,s)
for N>=2s+4.                                       (14)
```

Equivalently, for odd `n>=4s+9`, every signed pencil

```text
B_(n,s)-cB_(n-4,s),       c in R,                  (15)
```

is real-rooted, with strict alternation for the endpoint pair.  This proves
the previously conditional block lemma (79.5), including its directed
signed-pencil strengthening.

## 4. Exact replay

`prove_odd_path_block_gegenbauer.py` checks the generic generating-function
identity, the 38 positive coefficients, 88 exact derivative identities, 88
exact block-transform identities, 44 Laguerre multiplier identities, and
44 strict directed block interlacings through `s=12`.  It reports

```text
PASS_EXACT_ODD_PATH_BLOCK_GEGENBAUER_REPLAY
```

in `odd_path_block_gegenbauer_exact_20260810.json`.  The finite cases are
transcription evidence; (1)--(15) are the all-order proof.  The source and
report SHA-256 hashes are respectively

```text
825FC685A666DD808FE760B32B5203143D6DB09A16BC8B122C41017AAC2F8529
CED04FE246CC5EC0A38CAC8DC8EF73349F92F5879136730876E650134D65047B
```
