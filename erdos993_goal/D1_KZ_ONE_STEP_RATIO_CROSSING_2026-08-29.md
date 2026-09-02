# One-step K_Z ratio crossing theorem

Date: 2026-08-29

Put

```text
K_Z=(1+x)^(Y-Z)(1+2x)^(Z-1)P_L,  L=T-Y-Z+2.
```

The path recurrence gives the exact global one-step identity

```text
K_(Z+1)-K_Z=-x^3 D_Z,
D_Z=(1+x)^(Y-Z-1)(1+2x)^(Z-1)P_(L-4).             (1)
```

For `L>=5`, the local factor comparison

```text
(1+2x)P_(m-1) <=_LR (1+x)P_m,  m=L-4>=1          (2)
```

and TP2 convolution show that the adjacent coefficient ratio of `D_Z`
is nonincreasing as `Z` grows.  The exact coefficient cross for (2) factors
into positive factorial/binomial terms and a polynomial that becomes

```text
4k^3+10k^2r+4k^2+10kr^2+6kr+3r^3+r^2+2r
```

after the support substitution `m=2k-1+r`.  The only possible reversal is
the final short-path transition `L=4` to `L=3`, which is kept explicitly.

Therefore, for any affine row functional

```text
F_Z=A*K_Z[j]+B*K_Z[j-1], A>0,
```

the signs of `F_(Z+1)-F_Z` have at most one crossing before the final short
boundary.  Its minimum is among `Z=1`, `Z=Zmax`, the crossing-adjacent Z,
and the final short-boundary neighbours.  The same applies to
`K_Z[j]-rho*K_Z[j-1]`, enabling the corrected global-ceiling negative-common
branch.

The bounded replay checked 9500
literal identities and 185604 adjacent-Z
ratio pairs.  This theorem reduces the Z search only; the critical-candidate
terminal-m0 signs remain open.
