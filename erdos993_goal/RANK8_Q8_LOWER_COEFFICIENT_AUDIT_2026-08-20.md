# Rank-eight `Q8` lower-coefficient audit and `Delta^4` reduction

Date: 2026-08-20

Status: **exact finite closure through core order 22 for `Delta^1` through
`Delta^4`, with precisely classified `Delta^0` controls; exact analytic
reduction of `Delta^4` from order 23 to eight live boxes.  This is not yet a
`Delta^4` theorem or an all-tree `Q8` theorem.**

## 1. Exact finite audit through order 22

The low-memory WROM checker streams every free tree of orders 1 through 22,
computes the independence polynomials of the core and every root deletion by
exact integer tree DP, evaluates the literal terminal residual at `t=1,...,5`,
and takes the first four forward differences.

The complete census covers

```text
free trees:       9,114,285
rooted cores:   194,813,361
active roots:   194,810,589.
```

It proves

```text
Delta^j R_1 >= 0 for every rooted core of order at most 22,  1<=j<=4.
```

For `Delta^0`, universal residual positivity is false.  The exact negative
counts are

```text
order 11:  31
order 12: 327
order 13: 531
order 14:  61
total:    950.
```

There are no other negative `Delta^0` rows through order 22.  In particular,
all five coefficients are strictly positive at every root for every order
`15<=n<=22`.  The orderwise negative minima are

```text
n=11:       -448
n=12:     -7,168
n=13:   -204,800
n=14: -10,537,632.
```

An independent bit-mask implementation reconstructs the four minimum
witnesses, their core and root-deleted independence polynomials, and all five
forward differences.  Every witness lies outside the proposed `Q8` range:
a connected tree of order at most 14 has independence number at most 13.
The same replay expands the literal full terminal-family `Q8` polynomial at
the first sibling count for which the resulting tree has `alpha>=14`; all its
shifted Newton coefficients are positive for each of the four controls.
Thus the negative residual values are genuine shortcut controls, not `Q8`
counterexamples.

A separate literal-family verifier strengthens this control check: for every
rooted core through order 20, all sixteen shifted Newton coefficients of the
full `Q8(G_t)` polynomial are strictly positive from
`t0=max(1,14-alpha(A))`.  Thus the exceptional terminal-family guard is now
complete through core order 20; orders 21 through 26 remain.

## 2. Exact `Delta^4` reduction from order 23

Write `c_j=i_j(A)` and `h_j=i_j(A-q)`.  After the tree identities
`c0=1`, `c1=n`, `c2=C(n-1,2)`, exact differentiation gives

```text
d^2 Delta4/dh7^2
 =-126c7(2c3+(n-1)(n-2)) <= 0.
```

Hence the minimum in the root jet lies on the boundary of the exact
two-sided capacity polygon

```text
7h7 <= (n-7)h6,
6(c7-h7) <= (n-7)(c6-h6).
```

The `c8` derivative is

```text
-8h6[130c3c7+32c3c8+40c4c7
     +45(n-1)(n-2)c7+16(n-1)(n-2)c8] <= 0.
```

For `n>=23`, bipartiteness gives `alpha(A)>=12`, so conditional on the
rank-seven target reserve the valid endpoint is

```text
c8=c7(14c7-c6)/(16c6).
```

Put `h6=Sc6`, `h7=E(n-7)Sc6/7`.  At this endpoint, the exact second
`c7` derivative is `-S B/(2c6)`.  Every term of `B` is nonnegative except
`-64c5c6^2`.  The extension ceiling, selected-degree floor, and lower
rank-six defect endpoint give

```text
5c5 <= (n-4)c4,
mu5=6c6/c5 >= n-15+10/n,
c7/c6 >= (2mu5-7)/14.
```

They leave the strictly positive payment

```text
32(73n^2-737n+750)/(5n) > 0,   n>=23.
```

Therefore the reduced coefficient is concave across the rank-six defect
interval and it is sufficient to use

```text
c7=(12c6^2/c5-kc6)/14,   k in {1,7}.
```

The complete interior `D5` interval remains linked to
`q=6c7/((n-7)c6)` with exact width

```text
q_high-q_low=15/(7(n-7)).
```

## 3. One endpoint shortcut fails and must stay quarantined

The upper-`c7` root-boundary piece remains concave in its boundary parameter:

```text
-16c7(c3+19c4+18c5)((n-7)c6-7c7)^2/(n-7)^2 <= 0.
```

It may therefore be replaced by its upper-capacity and full-root endpoints.
The lower-cross piece cannot.  On the exact path `P23` coefficient jet, its
normalized curvature bracket equals

```text
-4,793,536,
```

so the reduced branch is locally convex.  This is a counterexample to the
endpoint-collapse method, not a negative `Delta^4` value.

The honest analytic remainder is therefore four boxes for each
`k in {1,7}`:

```text
lower-zero,
lower-cross with its parameter retained,
upper-capacity,
full-root.
```

No sign has yet been asserted for these eight boxes.

## 4. Dependency integration

The exact dependency chain is now:

1. The `Delta^4` reduction and the completed `Delta^5` endpoint both use the
   rank-seven `Q7` reserve in its `alpha>=12` range.  Until the current
   rank-seven middle-band work is finished, this is a live dependency and
   must not be described as unconditional rank-eight closure.
2. The standalone residual theorem `V8(F)>=0` is already complete for every
   forest with `alpha(F)>=14`.
3. The literal coupled pendant boundary is already complete for all forests
   at `alpha(G)=13,14`; it does not require splitting `Q8` from `V8` there.
4. Once `Q8(F)>=0` is proved for every forest with `alpha(F)>=14`, the
   separated pendant identity handles `alpha(G)>=15` using `V8`, while the
   matching-quotient theorem supplies the two lower boundary rows.
5. A connected-tree `Q8` theorem is still not an all-forest theorem.  The
   rank-eight convolution lift and exceptional-component first-crossing
   certificates from the dependency audit remain required.
6. Residual coefficient positivity alone is insufficient for reduced cores
   with `alpha(A)<=13`.  Such cores have `|A|<=26`; the literal full terminal
   family must be checked from its first required sibling count.  The four
   negative `Delta^0` controls show exactly why that guard cannot be dropped.

## 5. Replay and hashes

Run

```powershell
python .\verify_rank8_q8_terminal_delta4_reduction.py
python .\verify_rank8_terminal_delta0_negative_witnesses.py
python .\assemble_rank8_terminal_delta04_finite.py
```

Expected markers are

```text
PASS_EXACT_RANK8_TERMINAL_DELTA4_REDUCTION_WITH_LIVE_LOWER_CROSS
PASS_INDEPENDENT_RANK8_TERMINAL_DELTA0_NEGATIVE_WITNESSES
PASS_EXACT_RANK8_TERMINAL_DELTA0_4_FINITE_CENSUS_N1_N22.
```

Current SHA-256 values are

```text
verify_rank8_q8_terminal_delta4_reduction.py
455412D2F914A4BC8F56AC57CA11EEDB113E70403B58DF6FCB11EB76F1051D87

rank8_q8_terminal_delta4_reduction_exact_20260820.json
09ED95463A9B6F0A839E4DD2FFD8E1C285B11395814D2219CC2949D03CEDE852

verify_rank8_terminal_delta04_finite.rs
C7A9A4E943ED8EBB1916BB7297A995FDF1AE0619EFE9FA6AA3E03DCD6F405393

verify_rank8_terminal_delta04_finite.exe
EC7F2402020486AE5BF06A0703F171109E60F43682FC1F48733F5918A0AC9F89

assemble_rank8_terminal_delta04_finite.py
1631222B11165B1ED5A72F08E41A0320DEFD16AB43C36928117FEA6B1C51C851

rank8_terminal_delta04_finite_n1_n22_exact_20260820.json
4C8FD019F03D42208F56751BFB896021B1F4A02C699D5F26CE2636C80B59C4AB

verify_rank8_terminal_delta0_negative_witnesses.py
3642C602FD3B7E121E92985A5E9E66FD8AF5D062F4F3E1AAECB40E510877030B

rank8_terminal_delta0_negative_witnesses_exact_20260820.json
E21B3430DBDC951705AF94E86838171BAB847E4B87824804B7C0473F7E08B768
```
