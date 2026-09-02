# Far-unforced near-sector selector ceiling

Date: 2026-08-13

Status: all-order theorem for an explicit subregion of the unforced
near-sector chart.  This proves the selector ceiling and the resulting
real-anchor orientation there.  It does **not** prove the separate rotating
half-angle continuation required for the complete first Duran margin.

## 1. Target and chart

Retain the notation of
`LOWER_SELECTOR_NEAR_SECTOR_COEFFIC_RESPONSE_REDUCTION_2026-08-13.md`:

```text
c_(R,s,h)=[t^h]G_(N-2,s),
d_h=K c_(R,s,h)-c_(R+2,s,h).
```

The selector ceiling follows from

```text
sum_h d_h K^h>0.                                      (1)
```

On the unforced near-sector chart,

```text
s=2m-4+sigma,
R=s+2g-5,
K=4m+sigma-e-5=2s+kappa,
kappa=3-sigma-e,
(e,sigma) in {(0,0),(1,0),(1,1),(2,1)}.             (2)
```

Thus `kappa` is respectively `3,2,1,0`.  Put

```text
y=2g-4.                                               (3)
```

The range `g>=3` is exactly the part used below; it gives `R>=s`.

## 2. A positive active-box expansion

Let `j=s-2h`.  The positive response formula can be rewritten as

```text
c_(R,s,h)
 =binom(R,j)[x^h] C(x)^(R-j)(1-x)^(-2j-1),
C(x)=(1+x)/(1-x)^2=1+D(x),
D(x)=x(3-x)/(1-x)^2=sum_(n>=1)(2n+1)x^n.            (4)
```

Expanding only the power of `1+D` gives the exact identity

```text
c_(R,s,h)=sum_(ell=0)^h w_(j,h,ell) binom(R,j+ell), (5)

w_(j,h,ell)
 =binom(j+ell,j)[x^h]D(x)^ell(1-x)^(-2j-1)>0.       (6)
```

The weights in (6) do not depend on `R`.  Consequently

```text
c_(R+2,s,h)/c_(R,s,h)
```

is a positive weighted average of

```text
b_n=binom(R+2,n)/binom(R,n)
   =(R+2)(R+1)/{(R+2-n)(R+1-n)},
n=j+ell.                                             (7)
```

For `0<=ell<=h`,

```text
n=j+ell<=j+h=s-h<=s.                                 (8)
```

Since `R>=s`, every binomial in (7) is nonzero and `b_n` is strictly
increasing in `n`.  Equations (5)--(8) therefore prove the all-order bound

```text
c_(R+2,s,h)/c_(R,s,h)
 <=b_s
 =(R+2)(R+1)/{(R+2-s)(R+1-s)}.                     (9)
```

The inequality is strict for `h>0`; at `h=0` it is equality.  This is a
TP2/positive-mixture proof, not a bounded check.  It avoids both the proposed
ratio lemma and the tail-response payment: once `K>b_s`, every `d_h` is
positive separately.

## 3. Exact chart criterion

Substitute `R=s+y-1` from (2)--(3) into (9).  Then

```text
b_s={(s+y)(s+y+1)}/{y(y+1)}.                       (10)
```

Since `K=2s+kappa`, clearing the positive denominator in `K>b_s` gives

```text
Phi(s,y,kappa)
 =(2s+kappa-1)y^2+(kappa-1)y-s(s+1)>0.             (11)
```

Combining (9)--(11) proves the following.

**Far-unforced ceiling theorem.**  In any of the four unforced near-sector
families (2), if `m>=7`, `g>=3`, and (11) holds, then

```text
K c_(R,s,h)-c_(R+2,s,h)>0
```

at every coefficient on the support.  Hence (1) holds and

```text
G_(N-1,s)(K)<K G_(N-2,s)(K).                       (12)
```

By the already-proved selector Turan identity, (12) puts both positive
selector roots below `K=N_D-1`.  The quasi-Jacobi reduction then proves that
the corrected Duran polynomial has the required positive-root orientation at
the real anchor `z=sqrt(A)` throughout this subregion.

There is a convenient parameter-only corollary.  For `m>=7`, one has
`s>=10`.  Among the four values of `kappa`, (11) is smallest at `kappa=0`.
The function

```text
(2s-1)y^2-y-s(s+1)
```

is increasing for `y>=1`; at `y=sqrt(s)` it is
`s^2-2s-sqrt(s)>0`.  Therefore the simpler condition

```text
(2g-4)^2>=s                                          (13)
```

implies (11) uniformly in all four parity types.

## 4. Scope and exact replay

In the previous exact `d<=50` near-sector audit there are 2,098 unforced
cells.  Criterion (11) covers 1,947 of them (92.8 percent); the simpler
condition (13) covers 1,895.  These counts are bounded transcription
evidence only.  The proof of (12) is the all-order positive-mixture argument
(4)--(11).

The replay
`prove_lower_selector_near_sector_far_unforced_ceiling.py` independently
checks the active-box coefficient identity, the response-ratio bound, the
four chart substitutions, and every covered `d<=50` coefficient by exact
integer arithmetic.  It writes
`lower_selector_near_sector_far_unforced_ceiling_exact_20260813.json` and
reports

```text
PASS_EXACT_FAR_UNFORCED_NEAR_SECTOR_CEILING_THEOREM_REPLAY.
```

Two parts of the complete first-margin problem remain outside this theorem:

1. the forced near-sector chart and the `O(sqrt(m))` small-`g` unforced
   boundary left by (11);
2. the rotating half-angle continuation after the real-anchor orientation.

Thus this is a strict all-order reduction of the Section 106.1 ceiling gap,
not a claim that the lower Duran M1 proof or Erdos Problem 993 is complete.

## 5. Sharpened bounds on the residual small-`g` head

The same active-box expansion gives more than (9).  Since the largest active
index in (5) is `j+h=s-h`, the identical weighted-average argument proves

```text
q_h=c_(R+2,s,h)/c_(R,s,h)
 <=b_(s-h)
 ={(R+2)(R+1)}/
   {(R+2-s+h)(R+1-s+h)}.                           (14)
```

On the unforced chart this is

```text
q_h<={(s+y)(s+y+1)}/{(y+h)(y+h+1)}.                (15)
```

The right side decreases strictly in `h`, so (15) gives the observed
one-sign-change response pattern all-order whenever `g>=3`.  This closes the
ratio lemma from the earlier coefficient-response reduction; only the scalar
payment of its negative head remains.

There is also an exact lower growth estimate.  In the positive coefficient
formula

```text
c_(R,s,h)
 =binom(R,j) sum_(k=0)^h binom(R-j,k)
                         binom(2R+h-k,h-k),
j=s-2h,
```

map the `k`th summand at height `h` to the `(k+2)`nd summand at height `h+1`.
The ratio is

```text
{j(j-1)(2R+h-k+1)}/
{(R-j+2)(R-j+1)(h+1-k)}
 >={j(j-1)(2R+1)}/
    {(R-j+2)(R-j+1)(h+1)}.                         (16)
```

Every target summand is positive, so summing this injection gives

```text
c_(R,s,h+1)/c_(R,s,h)
 >={j(j-1)(2R+1)}/
    {(R-j+2)(R-j+1)(h+1)}.                         (17)
```

Equations (15) and (17) reduce the remaining `g>=3` payment problem to a
single elementary scalar statement.  If `H` is the last integer satisfying

```text
{(s+y)(s+y+1)}/{(y+H)(y+H+1)}>K,                  (18)
```

then it suffices to prove

```text
{K-b_(H+1)} K L_H
 >(H+1){b_0-K},                                    (19)

L_H={(s-2H)(s-2H-1)(2s+2y-1)}/
    {(y+2H+1)(y+2H)(H+1)}.
```

Indeed, (17) makes `c_hK^h` increase across the entire negative head; the
left side of (19) is a lower bound for the first positive term after that
head in units of its largest preceding term, while the right side bounds
the sum of all `H+1` negative coefficients using (15).

This last implication and (14)--(17) are all-order.  Inequality (19) itself
has passed exact rational diagnostics for every four-chart cell with
`7<=m<=500` and `3<=g<=60`; its smallest observed left/right ratio is still
above `25` in a wider scalar diagnostic.  Those diagnostics are finite
evidence only, so (19) is recorded as the exact residual scalar lemma, not as
a theorem.  The replay independently checks (14) and (17) on small exact
parameter boxes.
