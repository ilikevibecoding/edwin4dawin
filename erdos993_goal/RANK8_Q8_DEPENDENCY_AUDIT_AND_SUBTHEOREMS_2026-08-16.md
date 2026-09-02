# Rank-eight `Q8` dependency audit and first all-order subtheorems

Date: 2026-08-16

Status: **EXACT REDUCTIONS AND ALL-ORDER FAMILY/PARTIAL NEWTON THEOREMS;
NOT AN ALL-TREE OR ALL-FOREST `Q8` THEOREM.**

## 1. Exact target and the two different alpha thresholds

The general reserve specializes to

```text
Q8(F)=16 i8(F)^2-i7(F)i8(F)-18i7(F)i9(F).          (1)
```

With `q_j=2^j j! i_j`, its sign is equivalently the sign of

```text
q8^2-q7 q9-q7 q8,                                  (2)
```

or, when the ratios exist, `rho7-rho8-1` for `rho_j=q_(j+1)/q_j`.

There are two thresholds which must not be conflated.  The Problem-993
prefix cutoff is

```text
L(alpha)=floor((2alpha+1)/3).
```

Rank eight is required when `8<L(alpha)`, first occurring at
`alpha(G)=13`.  On the other hand, the presently proved standalone residual
theorem is `V8(B)>=0` only for `alpha(B)>=14`.  In the component-separated
pendant setup `alpha(B)=alpha(G)-1`.  Therefore the separated identity

```text
H8(P)-H7(B)=4Q8(P)/p7+12c7+V8(B)/(2b6)             (3)
```

can use the standalone `V8` theorem directly only when `alpha(G)>=15`.
The cases `alpha(G)=13,14` remain coupled boundary problems.  After clearing
positive denominators their literal target is

```text
8b6 Q8(P)+24c7 p7 b6+V8(B)p7 >= 0.                 (4)
```

They are finite in order but not yet checked: bipartiteness gives
`|B|<=24` at `alpha(B)=12`, `|B|<=26` at `alpha(B)=13`, and respectively
`|G|<=26,28` for the two original-forest boundaries.

The natural standalone high-band candidate pursued here is

```text
Q8(F)>=0 whenever alpha(F)>=14.                     (5)
```

It would combine with `V8(B)>=0` for the `alpha(G)>=15` part of (3), but it
would not by itself settle the two boundary values above.

## 2. Exact terminal-broom reduction

Let `A` be a tree rooted at `q`, let `H=A-q`, and form `G_t` by adjoining a
new support at `q` with `t>=1` new leaves.  Then

```text
I(G_t;x)=(1+x)^t I(A;x)+xI(H;x).
```

Write `c_j=i_j(A)`, `h_j=i_j(H)`, and

```text
p_j(t)=sum_(l=0)^j binom(t,l)c_(j-l)+h_(j-1).
```

If `p9o(t)=sum_(l=1)^9 binom(t,l)c_(9-l)`, exact expansion gives

```text
8c7h6 Q8(G_t)
 =R_t+8h6p7(t)Q8(A)+9c7p7(t)Q7(H),                 (6)
```

where

```text
R_t=8c7h6[16p8(t)^2-p7(t)p8(t)-18p7(t)p9o(t)]
    -8h6p7(t)[16c8^2-c7c8]
    -9c7p7(t)[14h7^2-h6h7].
```

The residual has degree exactly fifteen and the exact Newton expansion

```text
R_t=sum_(j=0)^15 binom(t-1,j) Delta^j R_1.         (7)
```

The replay reconstructs (6)--(7) symbolically and at five integer values of
`t`.

### Seven all-order Newton coefficients

For a tree core of order `n`, use

```text
c0=1, c1=n, c2=binom(n-1,2),
c3<=binom(n,3), c4<=binom(n,4).
```

The last two bounds are inserted only where their coefficients are
negative.  Exact simplification gives the following lower bounds:

```text
Delta^12/(c7h6) >= 132(33n^3+492n^2+3901n+3078),
Delta^13/(c7h6) >= 1716(11n^2+165n+246),
Delta^14/(c7h6) >= 3432(19n+67),
Delta^15/(c7h6)  = 51480.
```

Thus `Delta^j R_1>=0` for `12<=j<=15` for every rooted tree core.

Three more coefficients admit exact extension-counting certificates.  For
`Delta^11`, successive bounds on `c5,c4,c3` give

```text
Delta^11/(264c7h6)
 >=(131n^4+714n^3+9037n^2+45222n+19824)/24 >0.
```

For `Delta^10`, bound `c6,c5,c4` successively.  The remaining convex
quadratic in `c3` is increasing from the coefficientwise path minimum
`c3=binom(n-2,3)` for `n>=16`, where it is at least

```text
(85n^5+4313n^4+37717n^3+65059n^2-98006n+588792)/24 >0.
```

Every one of the 12,909 free-tree instances with `c7>0` through order
15 is then checked exactly; the minimum normalized bracket is `1,795,808`.

For `Delta^9`, first use `h6<=c6`, then bound `c7,c6,c5,c4`.  The remaining
convex quadratic is increasing from `c3=binom(n-2,3)` for `n>=9`, with lower
bound

```text
(25n^6+849n^5+67281n^4+73019n^3+331034n^2
 -1163720n+3077088)/240 >0.
```

The only lower-order rooted complement with `c7h6>0` consists of eight
order-eight rootings; their minimum actual coefficient is `47,569,728`.
Consequently

```text
Delta^j R_1>=0 for every 9<=j<=15
```

for every rooted tree core.  The remaining nine coefficients `Delta^0`
through `Delta^8` are open.

### Induction guard which must be retained

If `alpha(A)>=14`, an induction hypothesis pays `Q8(A)` and
`alpha(H)>=alpha(A)-1>=13`, so the rank-seven theorem would pay `Q7(H)`.
If `alpha(A)<=13`, however, `|A|<=26` but `t` remains unbounded.  One must
certify the *full* right side of (6) for these exceptional rooted cores; it
is invalid to discard the two reserve terms and check only `R_t`.

That warning is real.  Direct bit-mask enumeration independently verifies
the connected tree

```text
graph6: Op_I?C@?_?g??@??_?_?@
I(T)=(1,16,105,368,748,891,591,187,18,1),
alpha(T)=9,
Q8(T)=-1548.                                        (8)
```

This does not refute (5); it proves that reduced cores outside the asserted
alpha range can carry a negative `Q8` term.

## 3. Convolution-lift dependency audit

For products, factorial scaling gives the exact binomial convolution

```text
q_k(AB)=sum_(j=0)^k binom(k,j)q_j(A)q_(k-j)(B).     (9)
```

A complete all-forest lift needs all of the following; the rank-seven cone
certificates alone do not establish any of these rank-eight statements.

1. A connected-tree theorem proving (5).
2. Full/full rank-eight convolution cones for (2), using the proved
   lower-rank gaps through rank seven.  Every high/low boundary introduced
   by the new `rho7-rho8` gap must be covered.
3. A finite exceptional-tree classification.  Conditional on item 1, an
   exceptional tree has `alpha<=13` or negative `Q8`, hence order at most 26.
   Its stored jet must run through rank nine.
4. Fixed-exceptional/full preservation certificates for every exceptional
   jet and every full cone.
5. An exact first-crossing certificate for products made only of exceptional
   components when total alpha first reaches 14.

This is the rank-eight analogue of the completed rank-seven conditional
lift.  Omitting items 3--5 would repeat the small-component gap that the
rank-seven first-crossing database was built to remove.

## 4. Two all-order connected-tree families

### Paths

For `P_n`, `i_j=binom(n-j+1,j)`, and exact factorization gives

```text
Q8(P_n)=
 (n-14)(n-13)(n-12)^2(n-11)^2(n-10)^2(n-9)^2
 (n-8)^2(n-7)(5n^2-97n+290)/203212800.             (10)
```

Since `alpha(P_n)=ceil(n/2)>=14` implies `n>=27`, every factor in (10) is
positive.  Hence (5) holds for every required path.

### Stars and double stars

For a double star `S_(a,b)` with `a,b>=1` leaves at its two adjacent
centers,

```text
I(S_(a,b);x)=(1+x)^(a+b)+x(1+x)^a+x(1+x)^b.
```

By symmetry assume `a<=b`.  The exact replay partitions the whole domain
`a+b>=14` into the six rays

```text
a=r, b=14-r+v       (r=1,...,6; v>=0)
```

and the quadrant

```text
a=7+u, b=7+u+v      (u,v>=0).
```

The seven ordinary monomial expansions of `Q8` have respectively 16 terms
on each ray and 136 terms on the quadrant, zero negative coefficients, and
minimum positive coefficient `1/203212800`.  This is an exact all-order
certificate for every double star in (5).

The endpoint family is a star with `m` leaves.  For ranks at least two its
coefficients are `binom(m,j)`, and

```text
Q8(K_(1,m))=
 m^2(m-7)(m-6)^2(m-5)^2(m-4)^2(m-3)^2
 (m-2)^2(m-1)^2/203212800 > 0                     (m>=14).  (11)
```

## 5. Exact finite evidence and unrestricted failures

An independent forest-polynomial census generates every free tree and every
distinct forest independence polynomial through order 20.  In the candidate
range `alpha>=14` it checks exactly 413,145 distinct polynomial rows, finds
no failure, and has exact minimum

```text
Q8=8,726,265
```

at order 17.  This is finite evidence only.

Across all alphas for which `Q8` is defined, the same census finds exactly
18 negative rows: two at `(order,alpha)=(15,9)` and sixteen at `(16,9)`.
There are no further negative rows at orders 17--20.  The most negative row
is the connected-tree counterexample (8).  These failures sharpen the
exceptional-core audit without touching the proposed `alpha>=14` theorem.

## 6. Replays and hashes

Run

```powershell
python .\verify_rank8_q8_dependency_audit.py
python .\verify_rank8_q8_terminal_reduction.py
python .\verify_rank8_q8_terminal_delta9_11.py
python .\verify_rank8_q8_double_stars_paths.py
python .\scan_rank8_q8_forest_polynomials.py --maximum 20
```

Expected terminal markers are

```text
PASS_EXACT_RANK8_Q8_DEPENDENCY_AUDIT
PASS_EXACT_RANK8_Q8_TERMINAL_REDUCTION
PASS_EXACT_ALL_ORDER_RANK8_TERMINAL_DELTA9_11
PASS_EXACT_ALL_ORDER_RANK8_Q8_PATHS_DOUBLE_STARS
PASS_EXACT_Q8_FOREST_POLYNOMIAL_CENSUS_THROUGH_ORDER_20
```

Current SHA-256 values are

```text
verify_rank8_q8_dependency_audit.py
E5BC7B0B3F151FA572B8AA5D5D840A81D1124FB18AE36677BE6FE0072CDB64AF

rank8_q8_dependency_audit_exact_20260816.json
6B49673A28F0482B1F293DB44CA780E9BD47B9869BD3DBE9A1D2A3D8D4378643

verify_rank8_q8_terminal_reduction.py
389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7

rank8_q8_terminal_reduction_exact_20260816.json
8B4EA1324E235415E0EF8FF753ED85B10A5BABA2F48A08A55ED4CB24978FC16F

verify_rank8_q8_terminal_delta9_11.py
96EE2EA90EBB4D7A0F6CD67EE199984D9F9136131766C44109082A77C7285006

rank8_q8_terminal_delta9_11_exact_20260816.json
8A20547DF9E018E524F9C55DDC3946A967AED4F0AB2F2D140C2573BB4305B34C

verify_rank8_q8_double_stars_paths.py
6EE795D8B03964751B110EF06A98DB8E4C9C3426DD28CD11718AAE62D341C2E5

rank8_q8_double_stars_paths_exact_20260816.json
700B65CF1E12C562F529A451CB578529F5D24456A0DC11929B65C8CE72A00027

scan_rank8_q8_forest_polynomials.py
FA53CCCF9E691741CF4A6EAFE562B0E1C1C1DDBF695F4791E291D5700A410518

rank8_q8_forest_polynomials_through_n20_exact_20260816.json
B5AF2DAF154DE687FDA92C966AFB533A13C0056EEAB7A134A237761E9681AF9D
```
