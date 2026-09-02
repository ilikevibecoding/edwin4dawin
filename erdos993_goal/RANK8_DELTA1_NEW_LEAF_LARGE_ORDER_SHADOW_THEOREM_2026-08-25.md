# Rank-eight Delta1 inserted-leaf theorem for source order at least 181

Date: 2026-08-25

Status: **proved with an independent exact replay**. This is a range-specific
leaf-gate theorem, not a proof of connected `Q8`, forest `Q8`, or Problem 993.

## Theorem

Let `A` be a tree of order `n>=181`, let `v` be any vertex, and attach a new
leaf `w` at `v`. At the new root `w`, the Newton `Delta1` coefficient of the
rank-eight terminal residual is nonnegative.

Put

```text
D=A-v,            N=|D|=n-1>=180,
F=A-N_A[v].
```

The exact leaf identities are `C'=C+xD`, `H'=C`, and `C=D+xF`.

## 1. Endpoint reduction

The raw `Delta1` gate is quadratic and separately concave in the two top
coefficients `c8` and `d7`. Its two exact second derivatives each have four
negative monomials and no positive monomial. The forest `Q7(C)` and `Q6(D)`
theorems place the actual coefficients in the intervals

```text
0 <= c8 <= Q7(C)_upper,
0 <= d7 <= Q6(D)_upper.
```

Successive one-variable concavity therefore reduces the rectangle minimum to
the four endpoint masks.

Masks 0, 1, and 2 were independently reconstructed on the larger containment
box

```text
d6=1,
d5=(39/74)X,
d4=(39/74)(65/186)XY,
f_i=d_i U_i,       0<=X,Y,U4,U5,U6<=1.
```

Their tensor Bernstein data are:

| mask | degrees | coefficients | negative | minimum |
|---:|---|---:|---:|---:|
| 0 | `(3,1,1,3,3)` | 256 | 0 | 376 |
| 1 | `(4,1,1,4,4)` | 500 | 0 | 752 |
| 2 | `(6,1,1,3,3)` | 448 | 0 | 409536 |

The bounds follow from the proved selected-degree theorem at `N>=26`, and
`f_i<=d_i` follows because `F` is induced in `D`.

## 2. Two shadow inequalities for mask 3

Write `U_i=f_i/d_i`. Two elementary incidence counts retain compatibility that
the independent containment box discarded.

First, count pairs consisting of an independent 5-set contained in an
independent 6-set of `F`:

```text
6 f6 <= (N-5) f5.                                      (1)
```

Second, put `R=V(D)\V(F)`. Every independent 5-set of `D` meeting `R` has at
least four independent 4-subsets meeting `R`, while any such 4-set has at most
`N-4` one-vertex extensions. Hence

```text
4(d5-f5) <= (N-4)(d4-f4).                              (2)
```

The selected-degree bounds

```text
x(N)=d5/d6 <= 6N/(N^2-15N+10),
y(N)=d4/d5 <= 5N/(N^2-12N+8)
```

turn (1)--(2) into

```text
U6 <= k6(N) U5,
U4 <= 1-k4(N)(1-U5),

k6(N)=N(N-5)/(N^2-15N+10),
k4(N)=4(N^2-12N+8)/(5N(N-4)).
```

For real `N>=180`, `x`, `y`, and `k6` are strictly decreasing, while `k4` is
strictly increasing. Thus the fixed box at `N=180` contains every later
feasible tuple. Its exact constants are

```text
x=108/2971,  y=225/7562,
k4=3781/4950,  k6=3150/2971.
```

Split at `U5=1/k6=2971/3150`:

```text
low:  U5=(2971/3150)S,             U6=S V6,
high: U5=2971/3150+(179/3150)S,    U6=V6,
U4=(1-k4(1-U5))V4.
```

With `d5=xX`, `d4=xyXY`, the cleared mask-3 numerator has these exact
Bernstein expansions in `(X,Y,S,V4,V6)`:

| region | degrees | coefficients | zero | positive | negative |
|---|---|---:|---:|---:|---:|
| low `U5` | `(8,1,5,1,4)` | 1080 | 120 | 960 | 0 |
| high `U5` | `(8,1,4,1,4)` | 900 | 100 | 800 | 0 |

The cleared endpoint denominator is

```text
2744 d5^4(d6+f5)>0.
```

Therefore mask 3 is nonnegative for `N>=180`. Together with masks 0--2 and
separate concavity, this proves the theorem.

## 3. Exact evidence

```text
prove_rank8_delta1_new_leaf_mask3_large_order_shadow_box_root.py
  88A36B35F4025046F6F41ABD539C2F1A30EFFF32E2FFF7491E7EBDF6546AFF1C

rank8_delta1_new_leaf_mask3_large_order_shadow_box_root_20260825.json
  3185E1FC1FC723CDD97E9B7B17B94583C5FDD5285D4BC26B0E9CD7CB7D082660

audit_rank8_delta1_new_leaf_mask3_large_order_shadow_box_root.py
  B652F8783F17EA2E9E82A61E356CFC4E26BA3D90F41670893AE9DB0404A5CB09

rank8_delta1_new_leaf_mask3_large_order_shadow_box_independent_audit_root_20260825.json
  B0AA2DEFE60FD5FAA81C0EEDC7B397EB0158A014147C651B9F39CDE857B451ED

assemble_rank8_delta1_new_leaf_large_order_gate_root.py
  935A074C8CD77629622CD0E4B68211380BBC7FEC1E9F48A09073E4B8AA589B18

rank8_delta1_new_leaf_large_order_gate_root_20260825.json
  0FEB949C9E347F20C8E5F1B93F524A390283220E9E116D8A1A7D0B4F661CA4C3

audit_rank8_delta1_new_leaf_large_order_gate_root.py
  906C938A185EBF2AAE5B94682CF80869B570836388D6F67ABD1A2226D8BAB4F6

rank8_delta1_new_leaf_large_order_gate_independent_audit_root_20260825.json
  56A465DDE003A81BD15238A361640DEC45DB35599656C50CB7A21CE3E1FC47A6
```

## Boundary

This theorem does not cover source orders `27..180`, the `Delta2` or `Delta3`
new-leaf gates, either old-root gate family, the remaining connected degree-
surplus cases, the forest low/low block, or the final rank-eight composition.
