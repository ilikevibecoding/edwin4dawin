# Compact ordinary ISO split at prefix ranks two and three

Date: 2026-08-29

Status: **exact all-ordinary-cell theorem at ranks `r=2,3`.** This proves the
two surviving compact pieces separately positive at those ranks, including
the small orders outside the local-prefix shortcut. It does not
prove the pieces for `r>=4`, the entire strict prefix, forest ISO, or Erdős
Problem 993.

## Compact split

For an ordinary unmarked leaf `z--s` in a marked forest, put

```text
D=B-{z,s},       H=B-N[s].
```

Let `C` and `H` also denote their four-minor independence-polynomial tuples,
and let `B_N` denote polarization of the quadratic nested kernel. In doubled
diagonal units, the exact compact ordinary gap is

```text
A_r+B_r,

A_r = diag((z+w)N(C)+2zw B_N(H,C)),
B_r = diag(-(z-w)^2[R(C+H)-R(H)]/2).
```

The finite census through order 12 suggested this precise split: the
adjacent `N` term and nested `N` polarization cannot be separated, but their
sum `A_r` and the `R`-Schur term `B_r` each had zero strict-prefix negatives.

## Rank two

Exact coefficient extraction gives

```text
A_2=2cE_1+2cU_1+2cV_1-6cW_1+4.
```

If `D` has `n` vertices and the two distinct marks are present, its four
linear minor coefficients are

```text
(cE_1,cU_1,cV_1,cW_1)=(n,n-1,n-1,n-2).
```

Consequently, for every forest-realizable ordinary cell,

```text
A_2=12,       B_2=6,       A_2+B_2=18.
```

The value `B_2=6` follows directly from the constant coefficients: every
row of `C` and `H` has constant term one, while every row of `C+H` has
constant term two.

## Rank three invariant formulas

Write

```text
n  = |V(D)|,                 m  = |E(D)|,
du = deg_D(u),               dv = deg_D(v),
e  = 1_(uv is an edge),
P  = sum_x binom(deg_D(x),2),
su = sum_(x~u)(deg_D(x)-1),  sv = sum_(x~v)(deg_D(x)-1).
```

For `H`, write `h=|V(H)|`, `mh=|E(H)|`. Let `a,b` be the zero-one
indicators that `u,v` survive in `H`; when they survive, let their `H`
degrees be `hu,hv`.

The triangle-free independent-triple count is

```text
i_3(D)=binom(n,3)-m(n-2)+P.
```

Deleting a mark gives, for example,

```text
i_3(D-u)=binom(n-1,3)-(m-du)(n-3)
          +P-binom(du,2)-su.
```

Substitution into the exact bivariate kernels and reduction only by
`a^2=a`, `b^2=b` gives

```text
A_3 = -12P
      +a(2+6h-6hu-2n)+b(2+6h-6hv-2n)
      +4du^2+(-12n+8)du+4dv^2+(-12n+8)dv
      +(8n+4)e
      -2h^2+4hn+2h
      +8mn-20m+4mh
      +14n^2-6n+8su+8sv-4,

B_3 = a(2+2h-2hu-2n)+b(2+2h-2hv-2n)
      -4du-4dv+4hn-4h+2n^2+4n-4.
```

## Forest lower bounds

The following elementary forest facts suffice:

```text
P <= binom(m,2),   m <= n-1,
du+dv <= n,        du^2+dv^2 >= (du+dv)^2/2,
0 <= h <= n,       mh,su,sv,e >= 0.
```

If `a=1`, then `hu<=h-1`; hence its marked block in `A_3` is at least
`8-2n`. If `a=0`, the block vanishes and is still at least `8-2n` for
`n>=4`. The same holds for `b`; in `B_3`, the corresponding bound is
`4-2n` per mark.

For `n>=4`, the edge-pair block satisfies

```text
-12P+8mn-20m
 >= m(8n-14-6m)
 >= m(2n-8)
 >= 0                                                    (n>=4).
```

Putting `S=du+dv<=n`, the marked-degree block satisfies

```text
4(du^2+dv^2)+(-12n+8)S >= -10n^2+8n,
```

because the residual after using the square bound is exactly

```text
2(n-S)(5n-4-S) >= 0.
```

For `n=2,3`, direct evaluation of

```text
m(8n-14-6m),       0<=m<=n-1,
```

gives a minimum of `-4`. At these two orders each marked block in `A_3` is
nonnegative whether its mark survives in `H` or not. The same remaining
bounds therefore give

```text
A_3 >= 4n^2+2n-8,
```

which equals `12` at `n=2` and `34` at `n=3`.

For `n>=4`, all omitted displayed terms are nonnegative. Combining the
bounds gives

```text
A_3 >= 4n^2-2n+12 > 0,
B_3 >= 2n^2-4n+4 = 2[(n-1)^2+1] > 0.
```

Every ordinary cell has `n>=2`, because `D` contains the two distinct marks.
The `n=2,3` calculation and the `n>=4` bound therefore cover every
forest-realizable ordinary cell. No cutoff hypothesis is needed for the
rank-three theorem.

## Remaining boundary

The arbitrary-rank problem now begins at `r=4`. A per-induced-subtree
Bencs extraction cannot prove it: the existing exact d24 certificate has a
negative charged Bencs summand at order 11, rank 4, inside the strict prefix.
Any switching proof must therefore retain complete switching orbits rather
than require every induced-subtree term to be positive.

## Replay and pins

Run

```powershell
python .\prove_iso_compact_ordinary_prefix_r2_r3_root.py
```

It ends with

```text
PASS_EXACT_ALL_FOREST_COMPACT_ORDINARY_PREFIX_R2_R3_SPLIT
```

SHA-256 pins:

```text
prove_iso_compact_ordinary_prefix_r2_r3_root.py
4618B03E9E5FD1C87B17330EAFBE760A154079D0D37CEFBC75894656C82A1431

iso_compact_ordinary_prefix_r2_r3_exact_root_20260829.json
D6E57AF8F3F365F43586DE1E46696AC9DB7D3DD3341D582C3171190765FFF1FA
```
