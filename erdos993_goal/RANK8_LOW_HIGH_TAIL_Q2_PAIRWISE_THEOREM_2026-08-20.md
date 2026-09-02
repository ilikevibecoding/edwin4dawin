# Rank-eight low/high tail quadratic theorem and one-pair reduction

Date: 2026-08-20

Status: **exact all-cone theorem for the tail quadratic `q2`, plus an exact
one-negative-pair reduction for the remaining auxiliaries.  This is not yet
the low/high theorem.**

## Setting

Factorially de-scale the high base and high partner as

```text
p_i=a_i/i!,   q_j=b_j/j!.
```

The base has `A1-A2=h`; put `C=A2`.  Its low-cone tail boost is

```text
p_i(lambda)=p_i                  (i<=2),
p_i(lambda)=lambda*p_i           (i>=3).
```

Only the adjusted next-ratio `F2=A2+2h` moves, by `(lambda-1)C`.
For the factorial convolution margin write

```text
M(lambda)=q0+lambda*q1+lambda^2*q2.
```

## Exact pairwise identity

For `i<k`, set

```text
K_q(i,k)=q_(7-i)q_(8-k)-q_(8-i)q_(7-k),
```

with out-of-range entries zero, and define `K_p` symmetrically.  Ordinary
log-concavity of the de-scaled rows gives `K_p,K_q>=0`.  The exact
conditional-MLR numerator is

```text
M(lambda)/(7!8!)
 = sum_(i<k) p_i(lambda)p_k(lambda)
       (F_i(lambda)-F_k(lambda)) K_q(i,k)
 + sum_(j<l) q_jq_l (G_j-G_l) K_p(lambda)(j,l).
```

The replay verifies this identity directly against

```text
8*S8^2-9*S7*S9-h*S7*S8,
```

where `S_r=sum_i p_i(lambda)q_(r-i)`.

## Structural proof that `q2>=0`

The `lambda^2` coefficient of the first sum is exactly

```text
sum_(3<=i<k<=8) p_i p_k (F_i-F_k) K_q(i,k)
+ C sum_(k=3)^8 p_2 p_k K_q(2,k).
```

Every term is nonnegative: the base `F` is decreasing, the kernels are
TP2, and the motion of `F2` contributes `+C` against every later index.

For a partner pair `j<l`, put

```text
alpha=7-j,   beta=8-l,   alpha>=beta.
```

The `lambda^2` coefficient of its first-factor kernel is

```text
K_p(j,l)       if beta>=4,
p_alpha*p_3    if beta=3,
0              if beta<=2.
```

These are again nonnegative.  The 36 partner pairs split without gaps into
10, 5, and 21 pairs in these three classes.  Therefore

```text
q2>=0
```

for the complete high-base/high-partner cone, including boundary cases by
continuity.

## Exact reduction of both remaining auxiliaries

Let

```text
M0=M(1),   d=M'(1),
H_str=C*M0+h*d,
H_mid=2*C*M0+h*d.
```

Differentiating the same pairwise identity gives a finite sign
classification.  In either auxiliary every pair summand is structurally
nonnegative except exactly

```text
-h*C*p_1*p_2*K_q(1,2).
```

On the low-coordinate side, the only other apparently adverse pair is
`(0,2)`; it is nonnegative because `F0-F2>=h`.  Pairs `(2,k)`, `k>=3`,
receive the positive derivative correction `+hC`.

On the high-coordinate side, the tail exponents of the positive and
negative products can reverse only for `(alpha,beta)=(2,2)` or `(2,1)`.
The exact base relations

```text
A1=C+h,   A0>=C+3h
```

give, for the strong auxiliary,

```text
beta=2: C*X-(C+h)*Y = (C+h)Y/2,
beta=1: C*X-(C+h)*Y >= (2C+8h)Y,
```

and the middle auxiliary has still larger positive forms.  Thus those are
not hidden negative cases.

Consequently each auxiliary is reduced exactly to paying the displayed
single `(1,2)` term from the remaining nonnegative pair reserve.  This is a
strict narrowing, not an assertion that the payment has been proved.

As a boundary check only, `H_mid` on the exact zero-slack face has 149
monomials in `h` and the two terminal ratios; all 149 coefficients are
strictly positive, with minimum coefficient 2.

## Scope

This note proves `q2>=0`.  It does not prove `H_str`, `H_mid`, the full
low/high cone, low/low, forest `Q8`, rank-eight PGC, or Problem 993.  A
negative coefficient in another enclosure would likewise not be a cone
counterexample.

## Replay and hashes

```powershell
python .\verify_rank8_low_high_tail_q2_pairwise.py
```

```text
verify_rank8_low_high_tail_q2_pairwise.py
  90D1FB6853833769355F7CF9A97663AC89FCD8FF8BB071904218738E477684A9
rank8_low_high_tail_q2_pairwise_exact_20260820.json
  AD3EDC7B5BEC5434833B9A86385AE98F33C1B837493501C32973D91F08F91517
```
