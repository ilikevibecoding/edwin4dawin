# Marked-support collision FML at ranks two and three

Date: 2026-08-29

Status: **exact all-forest theorem for both collision orientations at
`r=2,3`.**  It does not prove the collision mode for `r>=4`, the whole FML,
all-forest ISO, or Erdős Problem 993.

Let `(B;u,v)` be a marked forest and attach a new leaf `z` to the marked
vertex `u`.  In doubled diagonal units, define

```text
Delta_r=2[N_r(B+z;u,v)-N_r(B;u,v)].
```

The `v`-support orientation follows by exchanging the marks.

## Exact low-rank formulas

Write

```text
n=|V(B)|,                 m=|E(B)|,
du=deg_B(u),              dv=deg_B(v),
e=1_(uv is an edge),
P=sum_x binom(deg_B(x),2),
su=sum_(x~u)(deg_B(x)-1),
sv=sum_(x~v)(deg_B(x)-1).
```

Exact coefficient extraction gives

```text
Delta_2=12,
Delta_3=2H_3,
```

where

```text
H_3 = -6P
      +4du^2+(-8n+4)du+2dv^2+(-6n+7)dv
      +(8n-1)e+(4n-12)m
      +8n^2-11n+8su+4sv.
```

## Forest lower bound

For a forest,

```text
P<=binom(m,2),       0<=m<=n-1,       du+dv<=n,
e,su,sv>=0.
```

The asymmetric marked-degree block has the exact completed-square identity

```text
4du^2+(-8n+4)du+2dv^2+(-6n+7)dv
= -(44n^2-44n+3)/8
  +4(du-n/2-1/4)^2
  +2(dv-n/2+1/4)^2
  +(4n-6)(n-du-dv).
```

The last three terms are nonnegative.  The edge-pair block satisfies

```text
-6P+(4n-12)m >= m(4n-9-3m).
```

For `n>=6` this is nonnegative.  For `n=4,5`, its minimum on
`0<=m<=n-1` is `(n-1)(n-6)`.  Therefore

```text
H_3 >= (20n^2-44n-3)/8       (n>=6),
H_3 >= (28n^2-100n+45)/8     (n=4,5),
```

and both bounds are positive.  Exhaustive exact classification of the simple
forests on two and three labelled vertices gives respectively

```text
min H_3=10,          min H_3=20.
```

Thus `Delta_2>0` and `Delta_3>0` for every marked forest in either collision
orientation.

## Replay and pins

Run

```powershell
python .\prove_iso_collision_r2_r3_root.py
```

The verifier derives the formulas symbolically, checks the small bases, and
validates them on 16,660 ordered marked pairs from every atlas forest and all
nonisomorphic trees through order ten.  It ends with

```text
PASS_EXACT_ALL_FOREST_COLLISION_FML_R2_R3
```

SHA-256 pins:

```text
prove_iso_collision_r2_r3_root.py
413F9BE9EF82D48DCE7EA80643FE3BE40930F9EDAC31AE59B64F244E7A583AFA

iso_collision_r2_r3_exact_root_20260829.json
2282C05E568E3D5517A94A22BDE41F03C545D5700E48B775C02B88AB316E5495
```

The producer's LF-normalized report hash is
`B4C0A84180857847E2240FEDDB5CAA8E421F2BE0B1698A1A5569EACC9BB839DE`.
