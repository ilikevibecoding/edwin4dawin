# TP2 cycle insertion proves the local-Poincare deficit bound

This note proves the remaining effective-degree estimate (78.8) without
editing the master notebook.  The proof is valid for every `h>=2`, `s>=0`,
and `y>=4s+12` (in fact, the last step only needs `y>=4s`, while `+12`
ensures a harmless boundary condition used below).

## 1. Normalize the cycle input

Put

```text
d_n=binom(2n,n)/4^n,
alpha_n=(2-d_n)/3,       beta_n=(1-2d_n)/3,
x_n=y alpha_n+s beta_n.
```

Then

```text
F_h(y,s)=[u^h] exp(sum_(n>=1) x_n u^n/n),
delta_h=h-y partial_y log F_h.
```

The central-binomial recurrence gives, for `n>=2`,

```text
x_n^2-x_(n-1)x_(n+1)
 =(y+2s)d_n{3(2y+s)-2(y+2s)d_n}
   /{18(n+1)(2n-1)} >0.                            (1)
```

Thus `(x_n)_(n>=1)` is strictly log-concave.  Define

```text
q=x_2/x_1=13/12+s/(6y),
C_n=x_n/{x_1 q^(n-1)},       a=x_1/q=y/(2q).        (2)
```

Geometric normalization preserves log-concavity, and (2) gives

```text
C_1=C_2=1,
r_n:=C_(n+1)/C_n nonincreasing,       0<r_n<=1.    (3)
```

After the change of variable `z=qu`,

```text
F_h=q^h P_h(a),
P_h(a)=[z^h] exp(a G(z)),
G(z)=sum_(n>=1) C_n z^n/n.                          (4)
```

## 2. A TP2 lemma for weighted permutations

We use the following general statement.

**Lemma.**  Let `C_1=C_2=1`, let `C_n>0` be log-concave, and put

```text
P_h(a)=[z^h]exp(a sum_(n>=1)C_nz^n/n),
R_h(a)=hP_h(a)/P_(h-1)(a).
```

For every `a>0` and `h>=2`,

```text
R_h-a partial_a R_h <=h-1.                          (5)
```

### 2.1 The partial-Bell array is TP2

Let

```text
e_(n,k)=[z^n]G(z)^k/k!,
e_(0,0)=1,
e_(n,k)=0 outside 0<=k<=n.                          (6)
```

Differentiating `G^k/k!` gives the exact recurrence

```text
n e_(n,k)=sum_(ell>=1) C_ell e_(n-ell,k-1).         (7)
```

Define the lower-triangular matrix

```text
A_(n,m)=C_(n-m)/n       (n>=1, 0<=m<n),
A_(n,m)=0               otherwise.                  (8)
```

Equation (7) says that the `k`th column vector `e_k` equals `A e_(k-1)`.
The Toeplitz matrix `(C_(n-m))` is TP2.  Indeed, for rows `i<j` and columns
`p<q`, an interior minor has the form

```text
C_(r+d)C_(r+e)-C_rC_(r+d+e)>=0,                    (9)
```

where `d=q-p>0`, `e=j-i>0`; (9) is the iterated ratio form of
log-concavity.  With the convention `C_t=0` for `t<=0`, a boundary minor is
either zero or a single nonnegative product.  The positive row factors
`1/n` in (8) do not change signs, so `A` is TP2, including its zero
boundary.

The two-column matrix `[e_0,e_1]` is TP2: `e_0` is the unit mass at row
zero, while `e_1(n)=C_n/n>0` for `n>=1`.  If `[e_(k-1),e_k]` is TP2, then

```text
[e_k,e_(k+1)]=A[e_(k-1),e_k]
```

is TP2 by Cauchy--Binet.  (Every minor is a finite sum because `A` is lower
triangular.)  Induction proves the orientation

```text
e_(m1,k-1)e_(m2,k)-e_(m1,k)e_(m2,k-1)>=0
                                        for m1<m2.  (10)
```

Equivalently, on the common support,

```text
e_(m,k)/e_(m,k-1) is nondecreasing in m.            (11)
```

### 2.2 Size-biased cycle lengths and the covariance sign

Give a permutation of `[n]` weight

```text
a^K product_(cycles gamma) C_|gamma|,
```

where `K` is its number of cycles.  Conditional on `K=k`, choose a uniform
label and let `L` be the length of its cycle.  Pointing that label and using
(7) gives the exact law

```text
Pr(L=ell | K=k)
 =C_ell e_(n-ell,k-1)/{n e_(n,k)}.                 (12)
```

For consecutive cycle counts, (12) gives

```text
Pr(L=ell | K=k+1)/Pr(L=ell | K=k)
 =constant * e_(n-ell,k)/e_(n-ell,k-1).            (13)
```

By (11), the right side is nonincreasing in `ell`.  The zero boundary in
(6) causes no problem: the support for `k+1` is contained at its large-`ell`
end in the support for `k`.  Thus `L | (K=k+1)` is smaller than `L | (K=k)`
in likelihood-ratio order.

Now define the insertion statistic

```text
H=sum_(cycles gamma) |gamma| r_|gamma|.             (14)
```

The sequence `r_ell` is nonincreasing by (3).  A uniform label in a fixed
permutation sees `r_L`, so (12)--(14) imply

```text
E(H | K=k)=n E(r_L | K=k)
```

is nondecreasing in `k`.  Therefore

```text
Cov(H,K)=Cov(E(H|K),K)>=0.                          (15)
```

For example, the last sign follows immediately by taking an independent
copy `K'` and writing the covariance as one half the expectation of
`(E(H|K)-E(H|K'))(K-K')`.

### 2.3 Insertion proves the lemma

Take `n=h-1`.  To pass from a weighted permutation on `[n]` to one on
`[n+1]`, either make the new label a singleton, with weight ratio `a`, or
insert it in one of the `ell` positions of a cycle of length `ell`, with
weight ratio `r_ell`.  Hence

```text
R_h=a+E H.                                          (16)
```

Differentiating the `a^K` measure gives

```text
partial_a R_h=1+Cov(H,K)/a.                         (17)
```

Equations (15)--(17), together with `H<=n` from `r_ell<=1`, yield

```text
R_h-a partial_aR_h=E H-Cov(H,K)<=E H<=n=h-1,
```

which is (5).  Equivalently, with `D=n-K`, the key sign is
`Cov(H,D)<=0`.

## 3. The moving normalized shape is favorable

The normalization (2) depends on `y` when `s>0`; it is essential not to
differentiate as if `C_n` were fixed.  Put `tau=s/y`.  Then

```text
C_n=2(alpha_n+tau beta_n)
       /(13/12+tau/6)^(n-1).                       (18)
```

For `n>=3`, the sign of `partial_tau C_n` is the sign of

```text
(13/2)beta_n-(n-1)alpha_n-(n-2)tau beta_n.          (19)
```

It is negative.  Since `beta_n>=0`, it suffices to check `tau=0`, where

```text
(n-1)alpha_n-(13/2)beta_n
 ={4n-17+(28-2n)d_n}/6 >0.                         (20)
```

For `n=3,4`, (20) is a direct substitution (`d_3=5/16`, `d_4=35/128`).
For `5<=n<=14`, both displayed contributions are nonnegative and the first
is positive.  For `n>14`, use `d_n<=1/2` to bound the numerator below by
`3n-3`.  Consequently

```text
partial_y C_n>=0 at fixed s,                        (21)
```

with equality for `n=1,2` and also for every `n` when `s=0`.

We also need the sign of the response to this shape motion.  In the present
range, `tau<=1/4`, `q<=9/8`, and `y>=12`, so `a=y/(2q)>=16/3>1`.  The input
sequence

```text
(1,aC_1,aC_2,...)
```

is log-concave: its first minor is `a^2>=a`, and the remaining minors are
those of `C`.  The Bender--Canfield exponential lemma therefore makes
`(P_h)_h` log-concave.  For `1<=j<=h`, differentiation of (4) gives

```text
(1/R_h) partial_(C_j)R_h
 ={a/j}{P_(h-j)/P_h-P_(h-1-j)/P_(h-1)}>=0,         (22)
```

where `P_t=0` for `t<0`.  The last sign is exactly the monotonicity of
`P_(k-j)/P_k` supplied by log-concavity.  Thus (21)--(22) show that the
moving-shape term has the favorable sign.

## 4. Return to the deficit

Let

```text
X_h=hF_h/F_(h-1)=q R_h(a,C(y)),
Q=q-y partial_yq=13/12+s/(3y).                     (23)
```

Since `a=y/(2q)`, direct differentiation gives

```text
yq partial_ya=aQ.
```

Using (5), (21), and (22) in the full derivative of (23),

```text
X_h-y partial_yX_h
 =Q(R_h-a partial_aR_h)
   -yq sum_(j>=3)(partial_(C_j)R_h)(partial_yC_j)
 <=Q(h-1).                                         (24)
```

Insertion (16) also gives

```text
X_h=qR_h>=qa=x_1=y/2.                               (25)
```

Finally,

```text
delta_h-delta_(h-1)
 =1-y partial_y log X_h
 ={X_h-y partial_yX_h}/X_h.
```

Equations (24)--(25) imply

```text
{delta_h-delta_(h-1)}/{h-1}
 <=2Q/y
 =13/(6y)+2s/(3y^2)
 <=7/(3y),                                         (26)
```

because `s/y<=1/4`.  This is precisely (78.8), for every `h>=2`.  The
actual forest hypothesis `y>=4s+12` is strictly inside the required final
half-space.

## 5. Exact replay

`prove_local_poincare_deficit_bound.py` independently checks the input and
shape identities, normalized log-concavity, the partial-Bell recurrence,
all adjacent-column TP2 minors through order 12 on 18 rational parameter
cases, the conditional `H` monotonicity, covariance and insertion formulas,
the nonnegative shape derivatives (22), the complete moving-shape derivative
decomposition (24), and the original deficit inequality (26).  It writes
`local_poincare_deficit_bound_exact_20260810.json` and reports

```text
PASS_EXACT_LOCAL_POINCARE_DEFICIT_BOUND_REPLAY.
```

The finite replay is transcription evidence; Sections 1--4 are the
all-order proof.
