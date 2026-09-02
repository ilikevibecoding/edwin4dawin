# Rank-eight terminal `Delta^8` theorem and `Delta^7` capacity reduction

Date: 2026-08-17

Status: **`Delta^8` PROVED ALL-ORDER; `Delta^7` REDUCED WITH AN EXACT
CONCAVITY OBSTRUCTION.**  Together with the earlier package, every
coefficient `Delta^8` through `Delta^15` is now proved.  This note does not
prove `Delta^7`, the full terminal residual, or the all-tree `Q8` theorem.

## 1. Setup

For the rank-eight terminal-broom identity, write

```text
R_t=sum_(j=0)^15 binom(t-1,j) Delta^j R_1.
```

Let `A` be the rooted tree core of order `n`, let `H=A-q`, and write
`c_j=i_j(A)`, `h_j=i_j(H)`.  All coefficient identities below are exact
consequences of `verify_rank8_q8_terminal_reduction.py`.

## 2. All-order theorem for `Delta^8`

### Root endpoint reduction

Put

```text
h6=s c6, h7=d c7,       0<=s,d<=1.
```

For the *actual* coefficient `Delta^8`, not merely its normalized bracket,
exact differentiation gives

```text
d/dd Delta^8 =256 c0 c6 c7^2 s >=0,

d^2/ds^2 [Delta^8 at d=0]
 =-16c6^2c7(19c0+18c1) <=0.
```

Hence the minimum in the root variables occurs at `d=0` and then at
`s=0` or `s=1`.  The first endpoint is zero.  It remains to prove the
single endpoint `h6=c6,h7=0`.

### Successive coefficient endpoints

At this root endpoint, ordinary extension counting gives

```text
8c8 <= (n-7)c7.
```

After sending `c8` to that upper endpoint, exact differentiation gives

```text
d/dc7 =-280n-1041 <0.
```

The proved rank-six reserve therefore sends

```text
c7 -> (12c6^2-c5c6)/(14c5).
```

The resulting `c6` derivative is

```text
-(1792c5 n^2+21672c5 n+67643c5
  +6720c6 n+24984c6)/(14c5) <0,
```

so the proved rank-five reserve sends

```text
c6 -> (10c5^2-c4c5)/(12c4).
```

The remaining `c5` derivative is not coefficientwise negative because it
contains one positive `c3` term.  Put `r=c5/c4`.  The all-order selected
degree theorem and the trivial upper bound give

```text
5r=mu4 >= n-12+8/n,
c3<=binom(n,3).
```

The derivative is decreasing in `r`.  At these two rigorous endpoints its
cleared numerator is at most

```text
-(4872n^5+6750n^4+84762n^3+327123n^2
  -42736n+399744)/n^2 <0                    (n>=12).
```

Thus the proved rank-four reserve sends

```text
c5 -> (8c4^2-c3c4)/(10c3).
```

### Final exact cube certificate

The endpoint now depends only on `(n,c3,c4)`.  Use the standard sharp tree
ratio intervals

```text
3/(n-3) <= c2/c3 <= 3(n-1)/((n-3)(n-4)),

8w/(6-w) <= c3/c4 <= 4w/(3(1-w)),
```

and map `n>=12` by `T=12/n`.  The cleared numerator has tensor-Bernstein
degrees `(21,9,4)`, hence 1,100 coefficients.  Every coefficient is
nonnegative without subdivision.  The denominator has the exact positive
factorization

```text
280 T^8 (3TW-4T+12)^5
 [15AT^2W-20AT^2+60AT-18T^2W+48T^2-240T+288]^4.
```

On the actual cube with `0<T<=1`, its first nonmonomial factor is at least
8.  The coefficient of `A` in the second is at least `40T`, and its `A=0`
part is at least `30T^2-240T+288>=78`.  Thus no denominator zero is hidden
by the clearing step.

The finite complement exhausts every free tree and every root through
order 11: 4,394 rooted rows, including 2,210 with nonzero `c7h6`.  There is
no failure; the exact minimum nonzero coefficient is

```text
40,827,816
```

at order eight.  Combining the analytic and finite pieces proves

```text
Delta^8 R_1 >=0
```

for every rooted tree core.

## 3. Why the independent root box fails for `Delta^7`

The tempting box

```text
h6=S c6, h7=D c7,       0<=S,D<=1
```

contains the corner `(S,D)=(0,1)`.  Exact substitution gives

```text
Delta^7=-126c7^3<0.
```

This is not a tree counterexample: `h7>0` forces `h6>0`.  It is an exact
warning that the two root-retention ratios cannot be separated.

## 4. Exact capacity-edge repair for `Delta^7`

Since `H` has at most `n-1` vertices, extension counting gives

```text
7h7 <= (n-7)h6.
```

Parameterize the literal capacity edge by

```text
h6=S c6,
h7=E(n-7)S c6/7,       0<=S,E<=1.
```

The coefficient is separately concave in `S,E`.  Exact differentiation
gives

```text
d^2/dE^2 Delta^7
 =-36S^2c6^2c7(n-7)^2/7,

d^2/dS^2 Delta^7
 =-2c6^2c7 G_n(E)/7,
```

where

```text
G_n(E)=18E^2(n-7)^2+E(-256n^2+1535n+1799)
       +504n^2-448n+1064.
```

For `n>=8`, `G_n` is decreasing on `[0,1]` and

```text
G_n(1)=266n^2+835n+3745>0.
```

Thus the only nonzero root endpoints are `(S,E)=(1,0),(1,1)`.

At either endpoint, `Delta^7` is decreasing in `c8`; send

```text
c8 -> (n-7)c7/8.
```

The result is concave in `c7`, with exact curvature

```text
d^2/dc7^2=-32c6(49n^2+246n+561)<0.
```

The proved rank-six defect interval therefore reduces `c7` to

```text
(12c6^2/c5-c6)/14,
(12c6^2/c5-7c6)/14.
```

The second endpoint is nonnegative from `n>=18`, because the selected-degree
bound gives

```text
6c6/c5 >= n-15+10/n >= 7/2.
```

This leaves four exact branches: two capacity endpoints times two rank-six
defect endpoints.

## 5. Genuine obstruction to the old `D5` concavity step

At rank seven, the analogous branches were concave in the next coefficient
and could be sent to the two `D5` defect endpoints.  That shortcut is false
here even on a feasible tree jet.

Take the path `P18`, whose relevant jet is

```text
(c3,c4,c5,c6)=(560,1365,2002,1716).
```

On the capacity endpoint `E=0` and the rank-six endpoint `k=1`, exact
substitution gives

```text
-d^2/dc6^2 Delta^7 = -112776889827360/2401 <0.
```

Thus `Delta^7` is locally convex there.  This is not a negative
`Delta^7` value and not a counterexample to `Q8`; it is a genuine feasible
counterexample to the proposed `D5` concavity reduction.  Closing
`Delta^7` requires retaining the interior `D5` variable, most likely in a
four-branch Bernstein certificate.

## 6. Replays and hashes

Run

```powershell
python .\verify_rank8_q8_terminal_delta8.py
python .\verify_rank8_q8_terminal_delta7_capacity_reduction.py
```

Expected markers:

```text
PASS_EXACT_ALL_ORDER_RANK8_TERMINAL_DELTA8
PASS_EXACT_RANK8_TERMINAL_DELTA7_CAPACITY_REDUCTION_WITH_D5_OBSTRUCTION
```

Current SHA-256 values:

```text
verify_rank8_q8_terminal_delta8.py
E8383F0088D7E3129F42497F2454A72F87644C3FDE88AC58192A9CF2A89FD246

rank8_q8_terminal_delta8_exact_20260817.json
DCB204A50F869531A59BD20CDF5DB90F735CB8C2A864677D9F144C0C9BB44FB6

verify_rank8_q8_terminal_delta7_capacity_reduction.py
F5EE04630602B4B612305C4B3050E4F29D603629D1640A35376A3F9A22B37E96

rank8_q8_terminal_delta7_capacity_reduction_exact_20260817.json
008FB5FED4DF0C7009185F11A1F862D5E21C26E32556AB0EAC0D47DF127344FE
```
