# Uniform low/high tail pairwise theorem and one-payment reduction

## Theorem

Let `k>=3`, `h>=0`, and let positive rows `a,b` be given through index
`k+1`.  Put

```text
A_i=a_(i+1)/a_i,    B_i=b_(i+1)/b_i.
```

Assume the forest-high gap conditions

```text
A_0-A_1>=2h,  A_1-A_2=h,  A_i-A_(i+1)>=h  (2<=i<k),
B_0-B_1>=2h,                 B_i-B_(i+1)>=h  (1<=i<k).
```

Scale the left tail by

```text
a_i(lambda)=a_i             (i<=2),
a_i(lambda)=lambda*a_i      (i>=3),
```

and define

```text
M(lambda)=c_k(lambda)^2-c_(k-1)(lambda)c_(k+1)(lambda)
          -h*c_(k-1)(lambda)c_k(lambda),
```

where `c` is the binomial convolution.  Then:

1. the quadratic coefficient `[lambda^2]M(lambda)` is nonnegative for every
   rank `k`; and
2. the strong auxiliary

   ```text
   H=A_2*M(1)+h*M'(1)
   ```

   is a sum of structurally nonnegative conditional-MLR pair terms except for
   exactly one term,

   ```text
   -h*A_2*p_1*p_2*K_q(1,2).
   ```

Thus the complete all-rank strong-auxiliary problem is reduced to proving that
the remaining nonnegative pair reserve pays this one explicit term.

## Factorial pair identity

Set

```text
p_i=a_i/i!,    q_i=b_i/i!,
F_i=A_i+i*h,   G_i=B_i+i*h,
S_z(lambda)=sum_i p_i(lambda)q_(z-i).
```

After removing the positive factor `(k-1)!k!`, the margin is

```text
D(lambda)=k*S_k^2-(k+1)*S_(k-1)*S_(k+1)-h*S_(k-1)*S_k.
```

For `i<l`, put

```text
K_q(i,l)=q_(k-1-i)q_(k-l)-q_(k-i)q_(k-1-l),
```

with out-of-range entries zero, and define `K_p` symmetrically.  Exact
expansion gives the indexed identity

```text
D(lambda)
 = sum_(i<l) p_i(lambda)p_l(lambda)
       [F_i(lambda)-F_l(lambda)] K_q(i,l)
 + sum_(j<m) q_j q_m [G_j-G_m] K_p(lambda)(j,m).       (1)
```

The de-scaled rows are log-concave, so the kernels are nonnegative at
`lambda=1`.  The only adjusted ratio that moves is

```text
F_2(lambda)=lambda*A_2+2h.
```

## All-rank proof of the tail quadratic

In the first sum of (1), the `lambda^2` terms are

```text
sum_(3<=i<l<=k) p_i p_l (F_i-F_l)K_q(i,l)
+ A_2 sum_(l=3)^k p_2 p_l K_q(2,l),
```

which are nonnegative.

For a pair `j<m` in the second sum, put

```text
alpha=k-1-j,    beta=k-m,    alpha>=beta>=0.
```

The `lambda^2` coefficient of its left kernel is

```text
K_p(j,m)                 if beta>=4,
p_alpha*p_3              if beta=3,
0                         if beta<=2.
```

Every term is nonnegative, proving `[lambda^2]M(lambda)>=0` uniformly in
rank.

## Exact sign classification of the strong auxiliary

Let `e_i=1` for `i>=3` and `0` otherwise, and write `C=A_2`.  Applying
`C+h*d/dlambda` to a left pair in (1), at `lambda=1`, gives

```text
p_i p_l K_q(i,l)
*{[C+h(e_i+e_l)](F_i-F_l)
  +hC(1_(i=2)-1_(l=2))}.                           (2)
```

All terms in (2) are nonnegative except `(i,l)=(1,2)`.  Indeed:

- `(1,2)` has `F_1=F_2` and contributes
  `-hC p_1p_2K_q(1,2)`;
- `(0,2)` is nonnegative because the doubled first gap gives
  `F_0-F_2>=h`; and
- `(2,l)`, `l>=3`, receives the positive `+hC` correction.

All remaining left pairs use only the decreasing sequence `F`.

For the right pairs, write the positive and negative products of the left
kernel as `X` and `Y`.  Tail exponents can favor `Y` only for

```text
(alpha,beta)=(2,2) or (2,1).
```

The exact base relations `A_1=C+h` and `A_0>=C+3h` give

```text
alpha=beta=2:  C*X-(C+h)*Y=(C+h)Y/2>=0,
alpha=2,beta=1: C*X-(C+h)*Y
                =Y(3A_0-C-h)>=Y(2C+8h)>=0.
```

Every other right pair is nonnegative directly from its TP2 kernel and tail
exponents.  This proves the asserted one-negative-pair reduction for every
`k>=3`.

## Exact replay

The producer reconstructs the factorial margin, derivative, pair identity,
tail quadratic, and complete sign classification in 1,536 exact rational
cases across ranks 3 through 40.  It also exhausts the index classes through
rank 256.  These checks audit the formulas; the all-rank conclusion is the
indexed argument above.

```text
prove_uniform_low_high_tail_pairwise_reduction_root.py
113C5BF29AC3299D6235D37E85E3356687FB62604F1B4D6DAE440DF072612BEF

uniform_low_high_tail_pairwise_reduction_exact_root_20260827.json
FD3408D7FB011604F87C67EA03B082B86FFD955AA778887B673E0A863303977B
```

Producer status:

```text
PASS_EXACT_ANALYTIC_ALL_RANK_Q2_AND_SINGLE_NEGATIVE_PAIR_REDUCTION
```

## Scope

This theorem closes the all-rank tail quadratic and reduces the strong
auxiliary to one quantitative payment.  It does not prove that payment, the
low/high or low/low convolution cones, the forest theorem, or Erdős Problem
#993.
