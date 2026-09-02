# Balanced subdivided-star H adjacent-ratio concentration

Date: 2026-08-29

## Scope

This note proves an exact all-order adjacent-row correlation for the linear
forest `H` on the balanced subdivided-star endpoint.  It strengthens the
coefficientwise row bounds in the earlier `m=0` correlation lemma.  It does
**not** prove the terminal Newton `m=0` sign, the full terminal-payment
theorem, or Erdős Problem #993.

## The theorem

Let `ell_1,...,ell_Y >= 1`, with sum `T`, and let `L=R-Y`.  For the path
independence polynomials `P_n=I(P_n;x)`, put

```text
H     = (1+x)^L product_i P_(ell_i+1),
Hconc = (1+x)^L P_(T-Y+2) P_2^(Y-1).                 (1)
```

Writing their coefficients as `h_k` and `c_k`, respectively, then for every
integer `k`,

```text
h_(k+1)c_k-h_k c_(k+1) >= 0.                         (2)
```

Thus, at every jointly supported rank,

```text
h_(k+1)/h_k >= c_(k+1)/c_k.                          (3)
```

The divisions in (3) are only notation.  The cross-multiplied statement (2)
also covers every support boundary.

## One local graft

The path recurrence gives the exact identity

```text
P_a P_b = P_(a+b-2)P_2+x^4 P_(a-4)P_(b-4),  a,b>=2, (4)
```

with `P_-2=0` and `P_-1=P_0=1`.  Set

```text
B=P_(a+b-2)P_2,       D=x^4 P_(a-4)P_(b-4).          (5)
```

We prove that `D` dominates `B` in adjacent likelihood-ratio order.  Equation
(4) then gives the same conclusion for `P_aP_b=B+D` over `B`.

## The exact four-odds count

The path polynomial has the real factorization

```text
P_n(x)=product_(1<=r<=(n+1)/2)
       (1+4 cos^2(r pi/(n+2)) x).                    (6)
```

This follows either from the path matching polynomial or directly from
`P_n=P_(n-1)+xP_(n-2)`.  Call the positive numbers in (6) the root odds.

Fix a finite threshold `4 cos^2(pi u)`, where `0<u<1/2`.  Put `M=a+b`.
The number of root odds of `B` at least this threshold is

```text
floor(Mu)+1_[u>=1/4].                                (7)
```

The number belonging to the residual product in `D` is

```text
floor((a-2)u)+floor((b-2)u).                         (8)
```

Write `alpha=frac((a-2)u)` and `beta=frac((b-2)u)`.  Subtracting (8) from
(7) gives exactly

```text
floor(alpha+beta+4u)+1_[u>=1/4] <= 3+1=4,            (9)
```

because `alpha<1`, `beta<1`, and `4u<2`.  The factor `x^4` supplies four
mandatory-success odds, conventionally `+infinity`.  Therefore the sorted
odds of `D` dominate the sorted odds of `B` coordinate by coordinate.  Zero
odds may be appended to the shorter list without changing either polynomial.

This is the only endpoint count in the proof; it is uniform in `a,b` and in
the coefficient rank.

## Linear-factor replacement

Let `Q=sum q_k x^k` have a log-concave coefficient row with no internal
zeros.  For `mu>=lambda>=0`, a direct expansion gives

```text
[(1+mu x)Q]_(k+1)[(1+lambda x)Q]_k
-[(1+mu x)Q]_k[(1+lambda x)Q]_(k+1)

=(mu-lambda)(q_k^2-q_(k-1)q_(k+1)) >=0.             (10)
```

For a mandatory factor `x`, the corresponding cross against
`(1+lambda x)` is simply `q_k^2-q_(k-1)q_(k+1)`.  Products of nonnegative
linear factors have Pólya-frequency, hence log-concave, coefficient rows.
Consequently one may replace the sorted root odds of `B` one at a time by the
larger sorted odds of `D`; (10) proves

```text
D_(k+1)B_k-D_kB_(k+1) >=0.                           (11)
```

Since `P_aP_b=B+D`, the local graft from the left side of (4) to `B` can only
decrease every adjacent coefficient ratio.  Formula (10) also proves that
this direction survives multiplication by every unchanged common path or
isolate factor.

## Iteration

If two positive subdivision lengths are `s,t`, their two arm factors are
`P_(s+1)P_(t+1)`.  The local graft replaces them by

```text
P_(s+t)P_2.                                          (12)
```

Iterating (12) concentrates all excess subdivision vertices on one arm and
leaves `Y-1` arms of subdivision length one.  The terminal product is exactly
`Hconc` in (1), and chaining the local adjacent-ratio comparisons proves
(2) in all orders and all ranks.

## Replay

Run

```powershell
python .\prove_balanced_subdivided_star_h_adjacent_ratio_concentration_adversary.py
```

The required marker is

```text
PASS_EXACT_ALL_ORDER_BALANCED_SUBDIVIDED_STAR_H_ADJACENT_RATIO_CONCENTRATION
```

The script replays the graft identity and every adjacent cross for path pairs
through length 60, checks several nontrivial common factors, checks the exact
linear-factor replacement identity, and exhausts all positive allocations
with `T<=18`, `Y<=6`, and `0<=L<=6`.  These bounded checks are adversarial
audits of the all-order proof above, not a substitute for it.
