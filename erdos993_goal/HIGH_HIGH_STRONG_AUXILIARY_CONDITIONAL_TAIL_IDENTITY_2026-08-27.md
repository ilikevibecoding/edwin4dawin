# Conditional-tail identity for the high/high strong auxiliary

## Setup

Let `k>=3`, `h>=0`, and let positive rows `a,b` be given through index
`k+1`.  Write

```text
A_i=a_(i+1)/a_i,    B_i=b_(i+1)/b_i,
c_z=sum_i C(z,i)a_i b_(z-i),
R_z=c_(z+1)/c_z.
```

Assume the high/high ratio-drop inequalities

```text
A_i-A_(i+1)>=h,    B_i-B_(i+1)>=h,
```

and put `C=A_2`.  The special boundary condition relevant to the tail boost is

```text
A_1-A_2=h.
```

Scale the left coefficients at indices at least three by `lambda`:

```text
a_i(lambda)=a_i                    (i<=2),
a_i(lambda)=lambda a_i             (i>=3).
```

Let

```text
M(lambda)=c_k(lambda)^2-c_(k-1)(lambda)c_(k+1)(lambda)
          -h c_(k-1)(lambda)c_k(lambda),
H=C M(1)+h M'(1).
```

## Exact conditional-tail representation

Under the conditional-sum law

```text
pi_z(i)=C(z,i)a_i b_(z-i)/c_z,
```

let

```text
p_z=P_z(X>=3),
D=R_(k-1)-R_k-h.
```

The high/high MLR theorem gives

```text
D>=0,
p_(k-1)<=p_k<=p_(k+1).
```

Since `c_z'(1)=p_z c_z`, differentiating

```text
M(1)=c_(k-1)c_k D
```

gives the exact all-rank identity

```text
H/(c_(k-1)c_k)
 = [C+h(p_(k-1)+p_k)]D
   +h R_(k-1)[p_k-p_(k-1)]
   -h R_k[p_(k+1)-p_k].                         (1)
```

Thus first-order MLR leaves exactly one adverse term.  For `h>0`, positivity
of the strong auxiliary is equivalent to the second-order tail inequality

```text
h{R_k[p_(k+1)-p_k]-R_(k-1)[p_k-p_(k-1)]}
 <= [C+h(p_(k-1)+p_k)]D.                        (2)
```

The transition term also has the exact covariance form

```text
R_z[p_(z+1)-p_z]
 = C P_z(X=2)+Cov_z(A_X+B_Y, 1_{X>=3}).          (3)
```

Indeed, in the binomial-convolution projection from sum `z` to `z+1`, the
left increment crosses the threshold precisely from `X=2`, with weight
`A_2=C`; all other changes are the likelihood reweighting recorded by the
covariance.  Equation (3) is nonnegative by MLR, but MLR does not order it as
`z` increases.

## Slack/CDF form and its obstruction

Put

```text
F_i=A_i+i h,  G_i=B_i+i h,
alpha_i=F_i-F_(i+1),  beta_i=G_i-G_(i+1).
```

For the two conditional sums `k-1,k`, define

```text
Delta_i^X=P_(k-1)(X<=i)-P_k(X<=i),
Delta_i^Y=P_(k-1)(Y<=i)-P_k(Y<=i).
```

Summation by parts and conditional MLR give the exact nonnegative expansion

```text
D=sum_i alpha_i Delta_i^X + sum_i beta_i Delta_i^Y. (4)
```

Let `Q_i^X=c_(k-1)c_k Delta_i^X` and similarly for `Y`, with all quantities
viewed as functions of `lambda`.  At `lambda=1`, the boundary condition gives

```text
alpha_1=0,  alpha_1'=-C,  alpha_2'=C.
```

Differentiating (4) before specializing to `lambda=1` yields

```text
H = hC(Q_2^X-Q_1^X)
    +sum_i alpha_i [C Q_i^X+h (Q_i^X)']
    +sum_i beta_i  [C Q_i^Y+h (Q_i^Y)'].         (5)
```

All `Q_i` are nonnegative at the base point.  For `i=2`, the partial left
sum is unscaled and its complement is exactly the scaled tail, so
`(Q_2^X)'=Q_2^X`.  For `i=0,1`, the derivative is only the tail-cross part of
`Q_i^X`, not the whole minor.  In particular, neither `Q_2^X-Q_1^X` nor the
raw derivatives of all remaining CDF minors have a fixed sign.  Therefore
(5) is not a termwise nonnegative slack decomposition without further
pairwise regrouping; it pinpoints the same missing second-order control as
(2).

## Exact obstruction under the relaxed high/high hypotheses

If "high" means only the relaxed assumptions used in the uniform high/high
theorem (every adjacent ratio drop is at least `h`), then the strong auxiliary
is false.

Take

```text
k=8, h=1,
A_i=20-i,    B_i=100-i       (0<=i<=8),
a_i=(20)_i falling,  b_i=(100)_i falling.
```

Both rows are positive through index nine, every ratio drop is exactly one,
and `A_1-A_2=1`.  Falling-factorial Vandermonde gives

```text
c_z=(120)_z falling,
R_(k-1)-R_k=1,
D=0,
M(1)=0.
```

The conditional law is hypergeometric with population size 120 and 20 marked
objects.  Under the standard one-draw coupling,

```text
R_z[p_(z+1)-p_z]=(20-2)P_z(X=2).
```

Here

```text
P_7(X=2)=2091320/8697013,
P_8(X=2)=794701600/2948287407,
```

so the right side of (1) is

```text
18[P_7(X=2)-P_8(X=2)]
 = -514464720/982762469 < 0.
```

Direct integer replay gives

```text
c_7=299817347356800,
c_8=33879360251318400,
c_9=3794488348147660800,

M(1)=0,
M'(1)=H=-5317395864419331243616665600000.
```

This example does **not** satisfy the stronger forest-high first-gap condition
`A_0-A_1>=2h` (nor its right-row analogue): its first drops equal `h`.
Consequently it does not refute a strong auxiliary stated with that extra
condition.  It proves that the extra first-gap slack cannot be discarded when
trying to derive the strong auxiliary solely from the relaxed all-rank
high/high theorem.  Under the stronger first-gap assumptions, identity (1)
remains exact and inequality (2) is the precise unresolved obligation.

## Scope

The identities above are all-rank algebra.  The counterexample concerns only
the relaxed high/high hypotheses.  No claim is made here about the forest-high
cone with doubled first gaps, the low/high or low/low cones, the pendant
cascade, or Erdős Problem 993.
