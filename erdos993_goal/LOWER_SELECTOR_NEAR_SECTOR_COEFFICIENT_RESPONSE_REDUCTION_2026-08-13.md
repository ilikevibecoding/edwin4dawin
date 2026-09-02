# Near-sector selector ceiling: coefficient-response reduction

Date: 2026-08-13

Status: exact all-order reduction, not a proof of the selector ceiling.

## 1. Target and notation

Retain the notation of Section 106.1 and of
`LOWER_SELECTOR_NEAR_SECTOR_QUASI_JACOBI_REDUCTION_2026-08-13.md`.  Thus

```text
G_1=G_(N-1,s),   G_2=G_(N-2,s),   K=N_D-1,
R=2(N-2)-s-1.
```

The target is

```text
G_1(K)<K G_2(K).                                  (1)
```

Write

```text
c_(R,s,h)=[t^h]G_(N-2,s),
d_(R,s,h)=K c_(R,s,h)-c_(R+2,s,h).                (2)
```

Then (1) is exactly

```text
sum_h d_(R,s,h) K^h>0.                            (3)
```

## 2. A positive closed form for every response coefficient

Put `j=s-2h`.  Formula (74.6) gives, with out-of-support terms interpreted
as zero,

```text
c_(R,s,h)
 =binom(R,j) sum_(k=0)^h binom(R-j,k)
                         binom(2R+h-k,h-k)         (4)
 =binom(R,j)[x^h](1+x)^(R-j)(1-x)^(-2R-1).        (5)
```

Euler's coefficient transformation gives the equivalent finite positive
form

```text
c_(R,s,h)
 =binom(R,j)[x^h]
      (1+x)^(R+s-h)(1+2x)^(R-s+2h).               (6)
```

The exponents in (6) are nonnegative on the support `0<=j<=R`.  Thus (4)
and (6) are positive binomial-convolution formulas with no cancellation.
They are often substantially more convenient than extracting (106.16)
directly.

In particular, if

```text
q_(R,s,h)=c_(R+2,s,h)/c_(R,s,h),                  (7)
```

then every nonzero coefficient in (2) has sign `sign(K-q_(R,s,h))`.
Consequently the following two explicit lemmas would prove (1).

**Ratio lemma.**  On each of the parameter families in Section 3,
`q_(R,s,h)` is strictly decreasing over its support.

**Response lemma.**  If `h_0` is the last index with
`q_(R,s,h)>K`, then

```text
sum_(h>h_0) d_(R,s,h)K^h
  > -sum_(h<=h_0) d_(R,s,h)K^h.                   (8)
```

The ratio lemma makes the observed coefficient signs a theorem (one block
of negative coefficients followed by one block of positive coefficients).
The response lemma then says that the positive tail pays the negative head.
No bounded scan is used in this implication.

The coefficient-ratio theorems of Sections 69 and 71 cannot simply be cited
for the ratio lemma.  Their proof is stated in the forest-reserve regime;
the present unforced boundary can have `N-2=s-1`, and on the forced chart
`N-2-s=-a-1`.  Thus an extension of the TP2/binomial-convolution argument to
(4) or (6) is still required.

## 3. Exact all-order chart ranges

Let `e=2m-d` and `sigma=s mod 2`.  The near strip has precisely the four
types

```text
(e,sigma)=(0,0),(1,0),(1,1),(2,1).                (9)
```

On the unforced chart put `g=N-s`.  Then

```text
s=2m-4+sigma,
K=4m+sigma-e-5,
R=s+2g-5,                                          (10)
```

and the exact ranges inherited from `0<=r<=d-5` and `g>=1` are

```text
(0,0): 4<=g<=2m-1,
(1,0): 3<=g<=2m-3,
(1,1): 2<=g<=2m-4,
(2,1): 1<=g<=2m-6.                                 (11)
```

On the forced chart only `(e,sigma)=(1,1),(2,1)` occur.  With
`a=s-N+1>=1`, one has

```text
s=2m+2a-3,
R=2m-6,
K=4m+a-e-4,
1<=a<=2m-2e-3.                                     (12)
```

Equations (9)--(12) are identities and inequalities in the original cell
coordinates, not an observed list.  They show that (4), (7), and (8) are a
complete two-chart formulation of the near-sector ceiling problem.

## 4. Exact finite evidence and the sharp boundary cell

The companion replay evaluates (4) by exact integer arithmetic in exactly
the same 3,131 chart cells with `m>=7` and `d<=50` as the earlier cell
audit.  It verifies:

1. (4) and (6) agree with the path-gamma coefficients;
2. `q_(R,s,h)` is strictly decreasing on every nonzero support;
3. `d_(R,s,h)` has at most one sign change, from negative to positive;
4. the leading positive coefficient exceeds the sum of the absolute
   negative coefficients.

The sharp unweighted cell is

```text
(chart,e,m,a,s,R,K)=(forced,1,7,9,29,8,32),
sum_{d_h<0}|d_h|/d_top
 =180043620/309540569
 =0.5816478937854508... .                           (13)
```

At the same cell the weighted leading term alone pays the entire weighted
negative head by the factor

```text
d_top K^top / sum_{d_h<0}|d_h|K^h
 =1298307246718976/626015709335
 =2073.921192965163... .                            (14)
```

These are unusually large reserves, but (13)--(14) are finite evidence
only.  An all-order proof still needs the ratio lemma and response lemma (or
a direct injection/determinant argument implying (3)).

## 5. Exact proof frontier

The selector ceiling in the first strip below the sector is now reduced to
the following explicit statement, containing no roots or rational power
series:

> For the six chart families (the four unforced types and two forced
> types) in (10)--(12), the positive binomial-convolution numbers (4)
> satisfy (3).

A proof of TP2 for the two-column array
`(c_(R,s,h),c_(R+2,s,h))_h`, followed by (8), would close (1).  The exact
scan establishes neither assertion in all orders and is not promoted as a
theorem.

