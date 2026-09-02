# Uniform low/low matched-pair convolution theorem

## Statement

Let `k>=8`, `h>=0`, and let two positive rows have adjacent ratios

```text
A_i=a_(i+1)/a_i,       B_i=b_(i+1)/b_i.
```

Assume that each row is in the full forest-low cone:

```text
delta_0>=2h,
0<=delta_1<=h,
delta_1+delta_2>=2h,
delta_i>=h                         (3<=i<k),
```

where `delta_i=A_i-A_(i+1)` for the first row and similarly for the
second.  If

```text
c_j=sum_i binom(j,i)a_i b_(j-i),
```

then

```text
c_k^2-c_(k-1)c_(k+1)-h*c_(k-1)c_k >= 0.             (1)
```

Thus the complete abstract low/low full-factor convolution cone is closed
uniformly for every rank `k>=8`.

## Factorial pair identity

Put

```text
p_i=a_i/i!,       q_i=b_i/i!,
F_i=A_i+i*h,      G_i=B_i+i*h,
S_z=sum_i p_i q_(z-i).
```

The left side of (1) is the positive factor `(k-1)!k!` times

```text
D=k*S_k^2-(k+1)*S_(k-1)*S_(k+1)-h*S_(k-1)*S_k.
```

For `i<l`, define

```text
K_q(i,l)=q_(k-1-i)q_(k-l)-q_(k-i)q_(k-1-l),
```

and define `K_p` symmetrically.  Direct expansion gives

```text
D = sum_(i<l) p_i p_l (F_i-F_l) K_q(i,l)
  + sum_(j<m) q_j q_m (G_j-G_m) K_p(j,m).             (2)
```

The raw ratio rows are nonincreasing, so `p_(i+1)/p_i=A_i/(i+1)` and
`q_(i+1)/q_i=B_i/(i+1)` are nonincreasing.  Hence every kernel in (2) is
nonnegative.

## Exactly two adverse natural pairs

For the left factor, write

```text
tau_A=h-delta_1^A,       0<=tau_A<=h.
```

Then

```text
F_1-F_2=-tau_A.
```

Every other adjusted-ratio difference is nonnegative.  Indeed,

```text
F_0-F_2=(delta_0-h)+(delta_1-h)>=h-tau_A>=0,
F_1-F_3=(delta_1-h)+(delta_2-h)>=0,
```

and all remaining adjacent adjusted gaps are nonnegative.  Thus `(1,2)`
is the only adverse left pair.  The right factor has the symmetric sole
adverse pair with size `tau_B`.

## Matched payment for one adverse pair

It is enough to treat `h>0`; divide all ratios by `h` and set `h=1`.
For the left adverse pair put

```text
tau=tau_A,
C=A_2-tau,
r=k-2.
```

The low-cone gaps imply

```text
A_1=C+1,       A_0>=C+3,
A_2=C+tau,     A_3<=C-1,
C>=r>=6.                                               (3)
```

The last bound follows by summing the gap from `A_2` to the positive
terminal ratio.  The opposite row is low only at indices `1,2`; its local
ratios around `r=k-2>=6` obey exactly the high-tail conditions used in the
audited matched-local lemma.

Choose the three same-side pairs

```text
(0,1), (0,3), (2,3)
```

and the opposite-side pair

```text
(k-3,k-2).
```

Normalize their sum and the adverse term by
`tau*p_1*p_2*q_(r-1)q_r`.  Write

```text
A_0=C+3+s_0,       A_3=C-1-s_2,
```

with `s_0,s_2>=0`.  After division by `tau`, the four actual payment
coefficients are

```text
pair (0,1):  2(1+s_0)/(tau(C+3+s_0)(C+1)),
pair (0,3):  (C+tau)(1+s_0+s_2)/(3tau(C+3+s_0)),
pair (2,3):  (C+1)(C+tau)(tau+s_2)/(6tau),
remote pair: (C+3-2tau)d/(6tau),
```

where `d>=0` is the opposite local adjusted gap.  These dominate,
respectively, the four coefficients in the independently audited
matched-local payment lemma:

```text
alpha=2/((C+1)(C+3)),
eta=(C+1)/(3(C+3)),
beta=C(C+1)/6,
gamma=(C+1)/6.
```

After clearing positive denominators, the four differences are exactly

```text
(1-tau)(C+3)+s_0(C+3-tau),

C(1-tau)(C+3)
 +s_0((C+tau)(C+3)-tau(C+1))
 +s_2(C+tau)(C+3),

tau^2+(C+tau)s_2,

d(1-tau)(C+3).
```

Every expression is nonnegative for `C>0`, `0<tau<=1`, and
`s_0,s_2,d>=0`.  The frozen matched-local theorem proves that its four
coefficients pay the normalized adverse kernel for every `r>=6`, every
`C>=r`, and every permitted opposite local tail.  Therefore the selected
four terms pay the left adverse pair.  When `tau=0`, that adverse term is
zero and no division is needed.

The symmetric four terms pay the right adverse pair.

## Disjoint partition

The left payment uses three left pairs near indices `0..3` and one right
pair `(k-3,k-2)`.  The right payment uses three right pairs near `0..3` and
one left pair `(k-3,k-2)`.  For `k>=8`, the remote pair starts at index at
least five.  Hence the two payment sets are disjoint.  All terms of (2) not
used in either payment are nonnegative, proving `D>=0` and therefore (1).

## Exact certificate

The producer hash-pins the pair-identity and matched-local producer/audit
chains, symbolically reconstructs all four dominance differences, and
replays 512 exact low/low products across ranks 8 through 32.  Every replay
checks the factorial pair identity, the two adverse-pair classification,
both disjoint payment surpluses, and the original binomial-convolution
margin.

```text
prove_uniform_low_low_matched_pair_convolution_root.py
0110010F6D9D974580C1BB9CAC18E6E4D8333335F534BA879D1A105944F0FBF1

uniform_low_low_matched_pair_convolution_exact_root_20260828.json
9075B3C765836F9EE991A7A57B21542D7B239404040F63009CBE1F1D4810AC55
```

Producer status:

```text
PASS_EXACT_ANALYTIC_ALL_RANK_LOW_LOW_CONVOLUTION_CONE
```

## Scope

This closes the abstract all-rank low/low full-factor convolution cone.  It
does not by itself prove connected `Q_k`, the exceptional-component part of
an all-rank forest lift, the pendant cascade, or Erdős Problem 993.
