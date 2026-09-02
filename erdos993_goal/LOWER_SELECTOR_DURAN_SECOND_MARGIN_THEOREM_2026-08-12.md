# Corrected lower-selector Duran second margin in all orders

Date: 2026-08-12

## Theorem

Let

```text
p_(M,i)=binom(2M-i-1,i),
A_(M,s)(z)=sum_i p_(M,i)p_(M,s-i)z^i,
Gamma_(N,s)(t)=G_(N,s)(t)-2tG_(N-1,s)(t)+t^2G_(N-2,s)(t).
```

Assume the lower-selector parameters

```text
d>=5,  0<=r<=d-5,  N=d+r,  r<s<=N+r,
P=d+s,  a=max(0,s-N+1).
```

Write `Gamma=t^a Gamma_hat`, `m=deg Gamma_hat`,

```text
p'=P-2a,  alpha'=a,  N_D=P-a,
n'=floor(p'/2),  beta=(P mod 2)-1/2,
L=n'-m+beta+1.
```

For the actual corrected Duran coefficient polynomial

```text
Q_D(z)=sum_h gammahat_h (N_D)_h^fall 4^(-h)
                         (z)_(m-h)^rise,
```

one has

```text
                         Q_D(L)>0.                 (1)
```

Consequently, whenever the `m-2` negative roots supplied by the
Pochhammer zero-count theorem are removed and

```text
Q_D(z)=B(z){(z)_2^rise-G_1 z+G_2},
```

the corrected lower-selector second residual margin is strictly positive:

```text
M_2=L(L+1-G_1)+G_2=Q_D(L)/B(L)>0.                 (2)
```

This is an all-order proof.  It replaces the corresponding finite part of
the 770-cell audit.

## 1. Duran evaluation is the central artificial coefficient

Put `n=floor(P/2)`, `epsilon=P-2n`, `beta=epsilon-1/2`, and let
`M=deg Gamma=m+a`.  The forced-zero normalization preserves the evaluation
point:

```text
n'-m+beta+1=n-M+beta+1=:L.                         (3)
```

For an ambient integer `K`, write

```text
D_K[H](z)=sum_h H_h (K)_h^fall 4^(-h)(z)_(deg H-h)^rise.
```

Direct index shifting gives the exact forced-zero identity

```text
D_P[t^a Gamma_hat](z)=(P)_a^fall/4^a D_(P-a)[Gamma_hat](z). (4)
```

Thus it is enough to prove `D_P[Gamma](L)>0`.

Let

```text
C(z)=(1+z)^P Gamma(z/(1+z)^2)
```

and let `S_(P,0)[Gamma]` be its alpha-zero binomial window.  Formula (717)
at its top index says

```text
[t^n]S_(P,0)[Gamma]
 =P!/n! sum_h gamma_h (P-2h)!/((P-h)!(n-h)!).       (5)
```

The duplication identity

```text
(P-2h)!/(4^(n-h)(n-h)!)=(beta+1)_(n-h)^rise       (6)
```

and

```text
(L)_(M-h)^rise=(beta+1)_(n-h)^rise/
                (beta+1)_(n-M)^rise               (7)
```

give, term by term,

```text
D_P[Gamma](L)
 ={n! over 4^n (beta+1)_(n-M)^rise}
   [t^n]S_(P,0)[Gamma].                            (8)
```

The prefactor is strictly positive.  The top window coefficient is a
positive scalar times the central coefficient `[z^n]C(z)`.  Therefore (1)
reduces to positivity of that single binary coefficient.

## 2. Every allocation in the binary coefficient is positive

The gamma definition gives the exact binary identity

```text
C(z)=(1+z)^d A_(N,s)(z)
     -2z(1+z)^(d-2)A_(N-1,s)(z)
     +z^2(1+z)^(d-4)A_(N-2,s)(z).                 (9)
```

Fix a path allocation `i` and put `ell=j-i`, where `j` is the final binary
exponent.  Its three contributions to `[z^j]C` are

```text
X_q=p_(N-q,i)p_(N-q,s-i) binom(d-2q,ell-q),
q=0,1,2.                                            (10)
```

Out-of-support binomial coefficients are zero.  Support is nested: if
`X_1` or `X_2` is nonzero, then `X_0` is nonzero.  When `X_0>0`, monotonicity
of `p_(M,i)` in `M` and the elementary binomial quotient give

```text
X_1/X_0
 <=binom(d-2,ell-1)/binom(d,ell)
  =ell(d-ell)/(d(d-1))
 <=d/(4(d-1))
 <=5/16.                                            (11)
```

Hence every allocation satisfies

```text
X_0-2X_1+X_2 >=(3/8)X_0+X_2>=0,                   (12)
```

and it is strict whenever `X_0>0`.

The support of `A_(N,s)` is the full interval

```text
[a,s-a],  a=max(0,s-N+1).
```

Therefore the support of the first term of (9) is `[a,P-a]`.  The central
index `n=floor(P/2)` lies in that interval throughout the stated range, so
at least one allocation in `[z^n]C` has `X_0>0`.  Summing (12) proves

```text
                         [z^n]C(z)>0.               (13)
```

Equations (4), (8), and (13) prove (1).

## 3. Residual margin

The Pochhammer zero-count theorem supplies `m-2` negative roots for the
corrected `Q_D`.  Let `B` contain precisely those roots.  Since `L>0`,
`B(L)>0`.  Evaluation of the residual rising-factorial quadratic gives

```text
Q_D(L)/B(L)=L(L+1-G_1)+G_2=M_2.
```

Together with (1), this proves (2).

## Replay

`prove_lower_selector_duran_second_margin.py` checks (3)--(12)
symbolically, reconstructs the coefficient allocation exactly, checks the
forced-zero Duran identity, and replays the complete lower diamond through
`d=16`.  It writes
`lower_selector_duran_second_margin_theorem_exact_20260812.json`.

The finite range is only a transcription audit.  The inequalities
(10)--(13) and identities (3)--(8) are the all-order proof.
