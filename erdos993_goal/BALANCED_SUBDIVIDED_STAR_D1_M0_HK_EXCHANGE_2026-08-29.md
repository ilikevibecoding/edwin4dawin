# Balanced subdivided-star d=1 coupled H/K exchange

Date: 2026-08-29

## Scope

This note freezes the exact arm-transfer identity needed after the independent
`H`/centre-sector relaxation fails.  It does not assert that the resulting
residual has one sign, so it is not an all-order terminal-`m=0` proof.

## Identity

For the one-centre subdivided star, write

```text
H=product_i P_(ell_i+1),   K=product_i P_(ell_i),
M=A H_(j+1)+D H_j+A K_j+B K_(j-1),   D=B+Ch.
```

Fix two positive arm lengths `u>=v>=2`, and let `H0,K0` be the products over
all other arms (including the `P1` factors of zero-subdivision arms in `H0`).
Set

```text
V=A(H0-K0)/x+D H0-B K0
 =(A+xB)(H0-K0)/x+Ch H0.                         (1)
```

The path recurrence gives

```text
P_(u+1)P_(v+1)-P_(u+2)P_v
 =(-1)^v x^(v+2)P_(u-v-1),
P_uP_v-P_(u+1)P_(v-1)
 =(-1)^(v+1)x^(v+1)P_(u-v-1).                    (2)
```

Therefore the exact objective change under `(u,v)->(u+1,v-1)` is

```text
Delta M=(-1)^v [x^(j-v-2)]P_(u-v-1)V.             (3)
```

The corresponding two-unit identity is

```text
Delta_2 M=(-1)^(v+1)[x^(j-v-1)]P_(u-v)V.          (4)
```

Equations (3)-(4) keep the shared `H/K` transfer variable exactly.  The open
sign problem is now a single coefficient of the common residual `V`, rather
than two independently optimized rows.

## First failed-relaxation cell

For `(N,j,d,R,T,Y,tau)=(29,9,1,5,23,5,26)`, all 7,315 positive subdivision
allocations were replayed.  The exact minimum is

```text
357,461,420,921,854,200
```

at sorted allocation `(1,3,3,3,13)`.  The consecutive transfer differences
are

```text
M(13,3)-M(14,2) = -7,720,457,836,767,480,
M(14,2)-M(15,1) =  5,199,568,801,680,960,
M(13,3)-M(15,1) = -2,520,889,035,086,520.
```

Thus the former negative certificate is a relaxation failure; the literal
cell is positive, and its interior `1/3/long` minimizer is reproduced exactly.

## Replay

```powershell
python .\prove_balanced_subdivided_star_d1_m0_hk_exchange_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_D1_M0_COUPLED_HK_EXCHANGE_IDENTITY
```
