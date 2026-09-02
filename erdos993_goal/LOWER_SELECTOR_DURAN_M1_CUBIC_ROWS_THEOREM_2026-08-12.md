# Root-free first-margin theorem for the cubic lower rows

Date: 2026-08-12

## Result

For every `d>=5`, every `row_s in {2,3}`, and every lower-diamond
parameter `0<=r<row_s`, the corrected lower-selector Duran polynomial
satisfies

```text
M1=(s_D-1)(s_D+beta-1)-G2>0.                         (1)
```

Together with the central-coefficient theorem proving `M2>0`, this closes
both Duran margins in all orders on the first three lower rows
`row_s=1,2,3`.  The proof below is root-free: it uses one rational
evaluation of the cubic and Vieta, not isolation or a cubic formula.

## 1. A cubic evaluation criterion

Let

```text
q(z)=c z^3+...+q0,       c>0, q0>0,
A=(s_D-1)(s_D+beta-1)>0,
C=q0/c,                  T=C/A.                      (2)
```

The Pochhammer zero-count theorem supplies at least `m-2=1` negative root.
Let `-b` be the most negative root selected for the Duran deflation, and
let `G2` be the product of the two residual roots.  Vieta gives

```text
(-b)G2=-q0/c=-C,
G2=C/b.                                                   (3)
```

Because `q` is a positive-leading cubic, `q(z)` tends to negative infinity
as `z` tends to negative infinity.  Hence

```text
q(-T)>0  implies that q has a root in (-infinity,-T),
          implies b>T,
          implies G2=C/b<C/T=A.                          (4)
```

Thus (1) follows from the single sign in (4).  This remains valid if the
cubic happens to have three negative roots: choosing the most negative one
only increases `b`.

## 2. Exact path calculation

For fixed `s`, start from the path allocation

```text
p_(M,i)=binom(2M-i-1,i),
G_(M,s)=gamma of sum_i p_(M,i)p_(M,s-i)z^i,
Gamma=G_(N,s)-2tG_(N-1,s)+t^2G_(N-2,s),
N=d+r.                                                   (5)
```

For `s=2,3`, (5) has degree exactly three and has no forced zero.  The
correct ambient parameter is therefore `P=d+s`.  Substitute (5) in

```text
q(z)=sum_(h=0)^3 gamma_h (P)_h^fall 4^(-h)
                         (z)_(3-h)^rise.                (6)
```

Split the order by parity:

```text
d=2k+5  (odd),       d=2k+6  (even),       k>=0.        (7)
```

For each `r<s`, exact simplification of (2), (5), and (6) gives positive
rational functions `c`, `q0`, `A`, and `T`.  More importantly,

```text
q(-T)=U_(s,r,epsilon)(k)/V_(s,r,epsilon)(k),             (8)
```

where every coefficient of both `U` and `V` is a strictly positive integer.
There are only ten symbolic families:

| `s` | `r` | `d` | `epsilon=P mod 2` | `deg U` | least coefficient of `U` |
|---:|---:|:---|---:|---:|---:|
| 2 | 0 | `2k+5` | 1 | 14 | 294912 |
| 2 | 0 | `2k+6` | 0 | 14 | 4608 |
| 2 | 1 | `2k+5` | 1 | 14 | 36864 |
| 2 | 1 | `2k+6` | 0 | 14 | 36864 |
| 3 | 0 | `2k+5` | 0 | 17 | 294912 |
| 3 | 0 | `2k+6` | 1 | 17 | 36864 |
| 3 | 1 | `2k+5` | 0 | 17 | 9216 |
| 3 | 1 | `2k+6` | 1 | 17 | 2359296 |
| 3 | 2 | `2k+5` | 0 | 14 | 36864 |
| 3 | 2 | `2k+6` | 1 | 14 | 36864 |

Therefore (8) is strictly positive for every integer `k>=0`.  The criterion
(4) proves (1) in all ten families.

## 3. Replay

`derive_lower_selector_m1_cubic_rows.py` constructs (5)--(8) symbolically,
checks strict coefficient positivity, and records every exact numerator and
denominator in
`lower_selector_duran_m1_cubic_rows_exact_20260812.json`.  It also compares
the symbolic selector and Duran polynomial with the independent integer
implementations at six values of `k` in every family (60 transcription
checks).  It reports

```text
PASS_EXACT_ALL_ORDER_LOWER_DURAN_M1_ROWS_2_AND_3.
```

This is an all-order theorem for the cubic rows, not a finite root audit.
The generic `row_s>=4` first-margin theorem remains open.

## 4. Generic root-free target suggested by the full audit

Let `R=sqrt(A)`.  A numerical probe of all 770 previously exact-audited
cells found the following stronger geometry in every nontrivial cell:

```text
every root of q outside |z|=R is negative real,
and at most m-2 roots lie outside |z|=R.                (9)
```

The isolated terminal cell `(d,r,s)=(5,0,5)` has `G2=-9`, so (1) is already
trivial there.  Statement (9) is not used in the theorem above and is not yet
an all-order proof.  It identifies a clean next certificate: compare the
Schur--Cohn exterior-disk index with the Sturm index on `(-infinity,-R)`.
Equality of those two root-free indices would show that every exceptional
root is inside the target disk and hence imply (1).
