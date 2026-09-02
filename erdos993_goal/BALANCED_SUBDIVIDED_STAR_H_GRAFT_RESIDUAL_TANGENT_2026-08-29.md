# Balanced subdivided-star H graft-residual tangent

Date: 2026-08-29

## Scope

This note proves the all-order affine correlation between the magnitude of an
`H` row and its next-row ratio.  It repairs the independent `Hmax` / `Hconc`
relaxation first seen at `(N,j,d,R,T,Y)=(28,10,1,5,22,5)`.  It is a
structural input, not by itself a proof of terminal Newton `m=0`, the
terminal-payment theorem, or Erdős Problem #993.

## Statement

Let

```text
H=(1+x)^(R-Y) product_i P_(ell_i+1),
C=(1+x)^(R-Y) P_(T-Y+2)P_2^(Y-1),
ell_i>=1,  sum ell_i=T,  S=R+T.                      (1)
```

Write the rows as `h_k,c_k`.  For `j>=4`, set `t=j-4`, `n=max(0,S-8)`, and

```text
rho = [x^(t+1)]P_n/[x^t]P_n                         (2)
```

when the denominator is supported; set `rho=0` otherwise.  Then

```text
h_(j+1)-c_(j+1) >= rho (h_j-c_j).                   (3)
```

Equation (3) is always used after cross multiplication.

## A path is the minimum-ratio linear forest

Joining two path components at their endpoints gives

```text
P_aP_b=P_(a+b)+x^2P_(a-2)P_(b-2).                  (4)
```

At root-odds threshold `4cos^2(pi u)`, `0<u<1/2`, `P_(a+b)` has
`floor((a+b+2)u)` odds above threshold, while the residual product has
`floor(au)+floor(bu)`.  Their difference is

```text
floor(frac(au)+frac(bu)+2u) <=2.                    (5)
```

The factor `x^2` supplies two mandatory odds.  The exact linear-factor
replacement identity from the adjacent-ratio concentration theorem therefore
shows that `P_aP_b` likelihood-ratio dominates `P_(a+b)`.  Multiplication by
unchanged path factors preserves the direction.  Repeated joins prove:

```text
every n-vertex linear-forest row LR-dominates P_n.   (6)
```

The path ratio has the closed form

```text
[x^(t+1)]P_n/[x^t]P_n
=(n-2t)(n-2t+1)/((t+1)(n-t+1)).                     (7)
```

Its forward difference in `n` is

```text
(n+2)(n-2t+1)/((t+1)(n-t+1)(n-t+2)) >=0.            (8)
```

## Summing exact graft residuals

Each concentration graft is

```text
P_aP_b=P_(a+b-2)P_2+x^4P_(a-4)P_(b-4).             (9)
```

After multiplying by the unchanged factors, every nonzero residual is `x^4`
times a linear-forest row.  Its actual vertex count is at least `S-8`; the
only discrepancy is `P_-1=1` at a length-three boundary, which increases the
actual count relative to this floor.  Equations (6)-(8) imply that every
residual satisfies

```text
D_(j+1) >= rho D_j.                                 (10)
```

Telescope from `H` to the fully concentrated `C`.  Since `H-C` is the sum of
these nonnegative residuals, summing (10) proves (3).  This retains the
required magnitude/ratio correlation rather than pairing the ratio of `C`
with the magnitude of a different allocation.

## First former obstruction

At `S=27,j=10,T=22,Y=5`,

```text
(c_10,c_11)=(115281,44624),
(Hmax_10,Hmax_11)=(144953,70426),
rho=1716/3003=4/7.                                  (11)
```

The cross-multiplied slack in (3) at the `Hmax` allocation is

```text
26,566,254 >0.                                      (12)
```

The concentrated allocation is equality in (3).  Thus both canonical
allocation endpoints are replayed without interpolating their rows
independently.

## Replay

Run

```powershell
python .\prove_balanced_subdivided_star_h_graft_residual_tangent_adversary.py
```

The required marker is

```text
PASS_EXACT_ALL_ORDER_BALANCED_H_GRAFT_RESIDUAL_TANGENT
```

The bounded audit checks the join identity and adjacent crosses through path
length 60 and every positive allocation with `T<=22`, `Y<=6`, and at most six
isolates.  These checks audit the all-order proof; they are not its basis.
