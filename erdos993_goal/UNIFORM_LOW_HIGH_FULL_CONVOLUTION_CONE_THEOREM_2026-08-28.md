# Uniform all-rank low/high full-convolution cone theorem

## Statement

Let `k>=8`, `h>=0`, and let two positive rows have ratios

```text
A_i=a_(i+1)/a_i,       B_i=b_(i+1)/b_i.
```

Assume the left row is in the low chart:

```text
delta0=A0-A1>=2h,
0<=delta1=A1-A2<=h,
delta2=A2-A3>=2h-delta1,
delta_i=A_i-A_(i+1)>=h       (3<=i<k),
```

and the right row is high:

```text
epsilon0=B0-B1>=2h,
epsilon_i=B_i-B_(i+1)>=h     (1<=i<k).
```

For their binomial convolution

```text
c_j=sum_i binom(j,i) a_i b_(j-i),
```

one has

```text
c_k^2-c_(k-1)c_(k+1)-h*c_(k-1)c_k >= 0.             (1)
```

By commutativity, either row may be the low row.  This is an exact abstract
convolution-cone theorem uniformly for every rank `k>=8`.

## Exhaustive full-factor coordinates

The ambient full-factor gap conditions are

```text
delta0>=2h,
delta1>=0,
delta2>=h,
delta1+delta2>=2h,
delta_i>=h                 (i>=3).
```

If `delta1>=h`, the row is high.  Otherwise put `r=delta1` and write

```text
(delta0,delta1,delta2,delta3,...)
  =(2h+d0,r,2h-r+d2,h+d3,...),
```

where `0<=r<=h` and every displayed `d_i` is nonnegative.  Thus the
high/low split is exhaustive.

## Canonical tail rebase

For a low row set

```text
tau=h-r,       C=A2-tau.
```

Lower only the index-two ratio from `A2` to `C`.  The resulting base row has

```text
(tilde_delta0,tilde_delta1,tilde_delta2,tilde_delta3,...)
  =(2h+d0,h,h+d2,h+d3,...).
```

Every gap slack except the low coordinate is retained simultaneously.  Since
the rows are positive, `C>0`.  Scaling every base coefficient of index at
least three by

```text
lambda=1+tau/C
```

recovers the original low row exactly, and

```text
1<=lambda<=1+h/C.
```

This coordinate map is bijective: a base with gap one equal to `h` and a
parameter `0<=tau<=h` maps back to

```text
delta1=h-tau,       delta2=tilde_delta2+tau.
```

Consequently the complete low chart, including arbitrary simultaneous left
and right gap slacks, is exactly the domain of the independently audited
all-rank tail-boost theorem.  Applying that theorem proves (1).

## Role of the four-gap boundary theorem

The independently audited four-gap theorem varies the two first left gaps and
the two first right gaps on the translated tail-tight boundary.  Its
left-gap-one-slack-zero face overlaps the canonical base hyperplane above;
its positive left gap-one slack is an additional certified boundary direction.

It is not necessary to add separate coordinate certificates.  Such an
addition would not prove a mixed cone.  The closure here instead uses the
integrated tail theorem, whose hypotheses already allow `d0,d2,d3,...` and
all right-row slacks simultaneously.  Therefore there is no uncovered mixed
direction in the low/high cone, and the four-gap result serves as an audited
overlap rather than a missing composition step.

## Exact assembly

The assembler pins the tail theorem and its independent audit, plus the
four-gap theorem and its independent composite/cache audit.  It also replays
the coordinate bijection and direct exact binomial convolutions on simultaneous
head, middle, and terminal slack families.

```text
assemble_uniform_low_high_full_convolution_cone_root_20260828.py
999181C60EAFB0AF34D2F3987997DFBEB6C2FC94BF6A323383657EA2E377A92D

uniform_low_high_full_convolution_cone_assembler_root_20260828.json
FBC292328F6E3AB67181F1D394873030BAA30388B8E8621496823CFA1BCFE3AA
```

Assembler status:

```text
PASS_HASH_PINNED_EXACT_ALL_RANK_LOW_HIGH_FULL_CONVOLUTION_CONE_ASSEMBLY
```

## Scope

This proves only the abstract low/high full-convolution cone under the stated
positive-row gap hypotheses.  It does not prove the low/low cone, prove that
forest rows satisfy these hypotheses, establish any forest `Q_k` statement,
assemble the forest problem, or prove Erdős Problem 993.
