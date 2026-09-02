# Balanced subdivided-star d=1, R=3 H/K quadratic and TP reduction

Date: 2026-08-29

## Scope

This proves an all-order finite-candidate reduction for the three-arm H/K
exchange.  It does not prove the remaining candidates positive.

## Quadratic residual

When the two transferred positive arms have lengths `u>=v`, the one remaining
arm has subdivision length `w>=0`.  For `w>=1`,

```text
H0=P_(w+1), K0=P_w, (H0-K0)/x=P_(w-1).
```

With `V=(A+xB)(H0-K0)/x+Ch H0`, every supported coefficient has the sign of

```text
G(r)=A(w+2-2r)(w+1-2r)
    +B r(w+1-r)
    +Ch(w+2-r)(w+1-r),                            (1)
```

because

```text
(w+2-r)(w+1-r)V_r=[x^r]P_(w+1) G(r).             (2)
```

The positive multiplier in (2) and the quadratic degree of `G` show that `V`
has at most two coefficient sign changes.  At `w=0`,

```text
V=(A+Ch)+x(B+Ch),                                 (3)
```

so the boundary has at most one.

## Constant-deficiency transfer kernel

On a fixed-sum two-step transfer, `L=u-v`, `r=j-v-1`, and

```text
delta=L+1-2r=u+v-2j+3                             (4)
```

is constant.  If `delta<0`, discard the forced unsupported prefix
`s<s0=ceil(-delta/2)` and put `delta'=delta+2s0>=0`.  The remaining transform
kernel is

```text
K_delta'(r',s)=C(r'+delta'+s,r'-s).               (5)
```

It counts north/east lattice paths from
`S_s=(s,-2s)` to `T_r'=(r',delta')`.  Ordered sources and sinks are
nonpermutable, so the Lindstrom-Gessel-Viennot lemma proves that every minor
of (5) is nonnegative.  The standard variation-diminishing property of a
totally nonnegative matrix implies that the two-step first-difference
sequence has at most two sign changes on each parity class.

Consequently a parity-class minimum lies at an endpoint or immediately beside
a negative-to-positive crossing.  There are at most two such crossings.  The
remaining obligation is to prove those exact critical margins nonnegative.

## Replay

```powershell
python .\prove_balanced_subdivided_star_d1_r3_hk_quadratic_tp_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_D1_R3_HK_QUADRATIC_TP_REDUCTION
```
