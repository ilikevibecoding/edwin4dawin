# Isolate Four-Minor Leaf Lemma at ranks two and three

Date: 2026-08-29

Status: **exact all-forest theorem for the isolate FML mode at `r=2,3`.**
It does not prove the isolate mode for `r>=4`, the other FML modes, all-forest
ISO, or Erdős Problem 993.

For a marked forest `(B;u,v)`, let `N` be the nested four-minor kernel and

```text
R=z^2E(w)W(z)+w^2E(z)W(w)+zw[U(w)V(z)+U(z)V(w)].
```

When an unmarked isolated vertex is adjoined, the FML gap is

```text
G_r=M_r+C_r,
M_r=2[z^(r-1)w^r]N,
C_r=R_(r-1,r-1)-R_(r-2,r).
```

## Rank two

The constant and linear coefficients of the four deletion minors are

```text
(E_0,U_0,V_0,W_0)=(1,1,1,1),
(E_1,U_1,V_1,W_1)=(n,n-1,n-1,n-2).
```

Direct exact extraction gives, for every marked graph and hence every marked
forest,

```text
M_2=6,        C_2=1,        G_2=7.
```

## Rank three

Write

```text
n=|V(B)|,                 m=|E(B)|,
du=deg_B(u),              dv=deg_B(v),
e=1_(uv is an edge),
P=sum_x binom(deg_B(x),2),
su=sum_(x~u)(deg_B(x)-1),
sv=sum_(x~v)(deg_B(x)-1).
```

The forest independent-triple identity and its two vertex-deletion versions
give the exact formulas

```text
M_3 = -6P
      +2du^2+(-6n+7)du+2dv^2+(-6n+7)dv
      +(4n+2)e+(4n-12)m
      +8n^2-12n+4su+4sv,

C_3 = n^2-du-dv.
```

For a forest,

```text
P<=binom(m,2),       m<=n-1,       du+dv<=n,
du^2+dv^2>=(du+dv)^2/2,            e,su,sv>=0.
```

Put `S=du+dv`.  The degree block is bounded below by

```text
S^2+(-6n+7)S >= -5n^2+7n,
```

because the left side decreases on `0<=S<=n` for `n>=2`.  The edge-pair
block satisfies

```text
-6P+(4n-12)m >= m(4n-9-3m).
```

This concave quadratic has its minimum at `m=0` or `m=n-1`.  Therefore

```text
M_3 >= 3n^2-5n                         (n>=6),
M_3 >= 4n^2-12n+6                      (3<=n<=5).
```

For `n=2`, the only forests are an edge and two isolated vertices; direct
substitution gives `M_3=8`.  Hence `M_3>=6` in every case.  Also

```text
C_3>=n^2-n>=2,
```

so `G_3>0` for every marked forest.

## Replay and pins

Run

```powershell
python .\prove_iso_isolate_r2_r3_root.py
```

It symbolically reconstructs both ranks, validates the exact formulas on
8,330 marked pairs from every atlas forest and every nonisomorphic tree
through order ten, and ends with

```text
PASS_EXACT_ALL_FOREST_ISOLATE_FML_R2_R3
```

SHA-256 pins:

```text
prove_iso_isolate_r2_r3_root.py
C23A73E9492B27BC8F9304EB2E3C6DAD1608F9EA56973DC4B024C90AD82A24BF

iso_isolate_r2_r3_exact_root_20260829.json
C6BC8C06DAAFDA01D79201F3230D5351EE60070FEF9F1553211DC636333878A7
```

The producer's LF-normalized report hash is
`5DEFC144D032232A8BFC761BD5E856C81AEBD241540D89E0D226D20E64577864`.
