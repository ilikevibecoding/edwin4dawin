# Terminal-bundle rank-three anchor ordering

Date: 2026-08-28

Status: **proved for every tree, every marked vertex, and every positive
terminal bundle size, with an independent exact audit.**

Let `G` be a finite tree, mark `w in V(G)`, and let `T` be formed by
adjoining an edge `wv` and then adjoining `t>=1` new leaves at `v`.  Let
`Q=G disjoint_union t K1`.  Whenever the ratios are defined,

```text
q3(T) >= q3(Q).
```

Equivalently,

```text
s3(T)i3(Q)-s3(Q)i3(T) >= 0.
```

Here `i_r` counts independent `r`-sets, `s_r` counts `(r+1)`-sets inducing
exactly one edge, and `q_r=s_r/(r i_r)`.

## Infinite proof (`|G|>=15`)

Put `n=|G|`, `d=deg_G(w)`, `x_u=deg_G(u)-1`,

```text
B2=sum_u C(x_u,2),
B3=sum_u C(x_u,3),
X=sum_(ab in E(G)) x_a x_b-(n-3),
R=sum_(u in N_G(w)) x_u.
```

The exact rank-three motif formula expresses the cross as an affine function
of `B3+X` and `R`.  Its slopes are

```text
d/d(B3+X) = -3(2d+n^2-5n+4)/2 < 0,

d/dR = [6B2+n^3+3n^2t-9n^2+3nt^2-12nt+26n
         +t^3-3t^2+8t-24]/2 >= 0.
```

The pinned Zagreb theorem and the elementary bound
`3B3<=(n-4)B2` give

```text
B3+X <= (n-4)B2/3.
```

Also, since `x_w=d-1` and the other excess degrees sum to `n-d-1`,

```text
C(d-1,2) <= B2 <= C(d-1,2)+C(n-d-1,2).
```

After the worst substitutions `B3+X=(n-4)B2/3` and `R=0`, the cross is a
concave quadratic in `B2`, with leading coefficient `-2`.  It is therefore
enough to check the two displayed endpoints.

Writing `t=1+s`, all five coefficients in `s` are nonnegative at both
endpoints.  The high endpoint is certified in the Bernstein basis on
`1<=d<=n-1`; its constant coefficient uses degree elevation from four to
six.  The low endpoint uses the same Bernstein certificate for powers
`s^1,...,s^4`.  For its constant coefficient, put `c=2d-n`.  The exact
identity is

```text
192 E_low(t=1)=3c^2(c+4)^2+A(n)c^2+B(n)c+C(n),
A(n)=2(8n^3-57n^2+148n-186)>0.
```

The discriminant of the remaining quadratic is

```text
-8(696n^7-12839n^6+99924n^5-433370n^4+1150848n^3
   -1888544n^2+1767168n-728352),
```

and its negative has strictly positive coefficients after `n=15+r`.
Thus the quadratic is positive for every real `c`, completing the infinite
argument.

## Exact finite base

For every unlabeled tree of orders 1 through 14 and every marked vertex, the
producer expands the cross in `s=t-1`.  All five exact coefficients are
nonnegative.  The finite base contains

```text
5,447 unlabeled trees,
72,145 marked trees,
360,725 exact shifted coefficients,
ordered coefficient SHA-256
5F699DFFB9146ED7E75E173C124B3BE38C416B02C926914CAF20E0DE006A98E4.
```

The independent auditor reproduced this stream exactly and also replayed
2,996 literal subset-count crosses on orders 1 through 9 and bundle sizes
1 through 4.

## Replayable evidence

Producer:

- `prove_terminal_q3_anchor_ordering_root.py`
- SHA-256
  `F37CCF78EAD0BEE367010FBD76A448FA7D3450226BE6FF6EC001F722A6B35D6B`
- report `terminal_q3_anchor_ordering_exact_root_20260828.json`
- report SHA-256
  `AF84F93A2CCCCF9E733D6096E51DEDB0F07B3AE6A6D303327CAF77D558CE4023`
- status `PASS_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING`

Independent audit:

- `audit_terminal_q3_anchor_ordering_independent_agent.py`
- SHA-256
  `C76F68266C3CE74B37096B37BBEF93C5F0AC5ED3005B70724DC15EB6C2FD531C`
- report `terminal_q3_anchor_ordering_independent_audit_20260828.json`
- report SHA-256
  `E3011F623E97E289D6C21D20B2577ECB38AE3019C3A42481A28807F47AAA396C`
- status
  `PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING_AUDIT`

Pinned all-order input:

- `verify_tree_rank45_path_ratio.py`, SHA-256
  `AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C`
- `TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md`, SHA-256
  `7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528`

## Scope boundary

This closes the anchor-ordering prerequisite in the terminal two-block
mixture.  It does **not** prove the remaining target-rank product payment,
the full `q_r<=q3` envelope, unimodality, or Erdos Problem 993.
