# Uniform low/high tail-boost convolution theorem

## Statement

Let `k>=8`, `h>=0`, and let two positive rows have ratios

```text
A_i=a_(i+1)/a_i,       B_i=b_(i+1)/b_i.
```

Assume

```text
A_0-A_1>=2h,  A_1-A_2=h,  A_i-A_(i+1)>=h  (2<=i<k),
B_0-B_1>=2h,                 B_i-B_(i+1)>=h  (1<=i<k).
```

Scale the left tail by

```text
a_i(lambda)=a_i                 (i<=2),
a_i(lambda)=lambda*a_i          (i>=3),
```

and let

```text
M(lambda)=c_k(lambda)^2-c_(k-1)(lambda)c_(k+1)(lambda)
          -h*c_(k-1)(lambda)c_k(lambda),
```

where `c` is the binomial convolution.  Then

```text
M(lambda)>=0       for every 1<=lambda<=1+h/A_2.            (1)
```

This is an exact all-rank theorem.

## Audited inputs

Three independently audited results enter the assembly.

1. The high/high MLR convolution theorem gives

   ```text
   M(1)>=0.                                                    (2)
   ```

2. The tail pairwise theorem gives

   ```text
   [lambda^2]M(lambda)>=0                                     (3)
   ```

   and reduces the strong auxiliary

   ```text
   A_2*M(1)+h*M'(1)                                           (4)
   ```

   to one adverse pair.

3. The matched local-pair theorem pays that pair exactly with left pairs
   `(0,1),(0,3),(2,3)` and right pair `(k-3,k-2)`.  Hence

   ```text
   A_2*M(1)+h*M'(1)>=0.                                      (5)
   ```

Every producer, report, theorem note, and independent auditor used for these
claims is hash-pinned in the assembly report.

## Convex-quadratic closure

Put

```text
t=lambda-1,       C=A_2,
m_0=M(1),         m_1=M'(1),
q_2=[lambda^2]M(lambda).
```

Since `M` is quadratic,

```text
M(1+t)=m_0+m_1*t+q_2*t^2.                                   (6)
```

Equations (2), (3), and (5) say

```text
m_0>=0,       q_2>=0,       C*m_0+h*m_1>=0.                 (7)
```

For (1), `0<=t<=h/C`.  If `m_1>=0`, every term in (6) is
nonnegative.  If `m_1<0`, then

```text
m_0+m_1*t >= m_0+m_1*h/C
            =(C*m_0+h*m_1)/C >=0,
```

and `q_2*t^2>=0`.  This proves (1).

## Exact assembly

The assembler fails closed on all 14 dependency hashes and statuses and
replays the convex-quadratic lemma in 2,100,384 exact rational cases.

```text
assemble_uniform_low_high_tail_boost_convolution_root_20260828.py
089B4908C20E562EC4D75BB208C0D975297BE2BE654F5D1BFDC56AC026D01370

uniform_low_high_tail_boost_convolution_assembler_root_20260828.json
BCFCFF07F62D0E8CB967C76276246DDCB7C6DF6D8128749EB2C26CAA44944E53
```

Assembler status:

```text
PASS_HASH_PINNED_EXACT_ALL_RANK_TAIL_BOOST_CONVOLUTION_THEOREM
```

## Scope

This closes the stated one-coordinate tail-boost cone uniformly for all
`k>=8`.  It does not by itself prove the complete low/low convolution cone,
the forest assembly, or Erdős Problem 993.
