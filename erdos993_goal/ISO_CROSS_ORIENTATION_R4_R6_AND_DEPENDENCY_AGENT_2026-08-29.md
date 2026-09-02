# Cross-orientation coupling at ranks four through six

Date: 2026-08-29

Status: **proved at ranks 4, 5, and 6.**  This closes one paired lower
`Q/D` branch in the leaf recurrence.  It does **not** close the independent
`N/FML` chain, and therefore is not a proof of the full conjecture.

## 1. The coupling theorem

Let `B` be a forest with distinct marked vertices `u,v`, and write

```text
U=I(B-u),       V=I(B-v),       W=I(B-{u,v}),
P=U+xW.
```

For the ISO leaf remainder operator `D_k`, define

```text
C_k(B;u,v)=Q_k(P)+D_k(V,W).
```

Then

```text
C_k(B;u,v) >= 0                 for k=4,5,6.        (1)
```

Here `P` is itself a forest independence polynomial: start from `B-u`
and add one new leaf adjacent to `v`.

## 2. Exact reserve split

Deleting `v` from `U` and deleting `u` from `V` gives

```text
U=W+xX,       V=W+xY.
```

Put

```text
S_k(P)=2k p_k^2-p_(k-1)p_k-2(k+1)p_(k-1)p_(k+1).
```

Direct expansion gives

```text
2C_k=S_k(P)+T_k,
T_k=2p_(k-1)^2+p_(k-1)p_k+2D_k(V,W).               (2)
```

Set

```text
a=w_(k-2), b=w_(k-1), c=w_k, d=w_(k+1),
e=y_(k-2), f=y_(k-1), g=y_k.
```

Every term involving `X` in `T_k` is nonnegative.  After dropping those
terms, the exact remainder is

```text
T0 = 2a^2+9ab-ac-2(k+1)ad
     +4ae-2(k+1)ag
     +5b^2+(2k-1)bc+4kbf-2(k+1)ce.                 (3)
```

Let

```text
A=S_(k-1)(W)=2(k-1)b^2-ab-2kac,
B=S_k(W)=2kc^2-bc-2(k+1)bd.
```

For `b>0`, normalize

```text
r=a/b, s=c/b, t=e/b, q=f/b, h=g/b.
```

Then

```text
b T0 = aB+cA+b^3 R,                                (4)
```

where

```text
R=2r^2+9r+5+s+rs
  +t(4r-2(k+1)s)+4kq-2(k+1)rh.                    (5)
```

The induced-subforest relation gives `0<=t<=r`, `0<=q<=1`, and
`0<=h<=s`.  If `S_(k-1)(Y)>=0`, then

```text
2(k-1)q^2-tq-2kth >= 0.                            (6)
```

For fixed `t,q`, minimize by taking the largest allowed `h`.  The resulting
function of `q` is concave until it reaches `h=s` and increasing afterward.
Its only relevant endpoints are:

1. `q=h=0`;
2. the transition where `h=s`.

The apparent endpoint at `q=1` before the transition cannot occur, because

```text
t<=r,       r(1+2ks)<=2(k-1)
```

imply that the transition is reached by `q=1`.

After minimizing in `t` and then in `s`, the two endpoint payments reduce to

```text
P_A,k(r)=12kr^3+(20k+1)r^2+(-4k^2+12k+1)r+2k-2,
P_B,k(r)= 4kr^3+(20k+1)r^2+(-4k^2+12k+1)r+2k-2.   (7)
```

For `k=4,5`, the quadratic tail of each cubic has negative discriminant and
positive leading coefficient.  For `k=6`, the complete cubics are

```text
72r^3+121r^2-71r+10,     discriminant -19314951,
24r^3+121r^2-71r+10,     discriminant  -1366023.
```

Each has exactly one real root; its positive constant and leading
coefficient force that root to be negative.  Thus both are positive on
`r>=0`.  The case `b=0` follows directly from downward support closure.

## 3. Finite reserve exceptions

The scalar argument uses `S_k(P)`, `S_(k-1)(W)`, `S_k(W)`, and
`S_(k-1)(Y)`.  The proved forest reserve theorems and their exact finite
classifications leave only finite exceptions:

- two negative `S_4` polynomials, both on order 7;
- seven negative `S_5` polynomials, on orders 8 and 9;
- twenty-eight negative `S_6` polynomials through order 12; the rank-six
  crossing proof makes every forest of order at least 13 `S_6`-good.

Every bad `Y` row needed at ranks five or six has `g=y_k=0`.  With `g=0`,
the term `4kq` is nonnegative and the minimization is exactly endpoint
`P_A,k`; hence no reserve on `Y` is needed in these cases.

All remaining exceptions were checked structurally, not merely by
polynomial row:

| rank | directly marked small forests | bad-`W` admissible root sets | minimum bad-`W` `T0` |
|---:|---:|---:|---:|
| 4 | 1,554 | 16 | 3,495 |
| 5 | 17,720 | 110 | 4,756 |
| 6 | 336,762 | 287 | 37,730 |

The direct rank-six census contains every ordered pair of marks on every
unlabeled forest through order 12.  The exact unlabeled-forest counts at
orders `0,...,12` are

```text
1,1,2,3,6,10,20,37,76,153,329,710,1601.
```

This proves (1).

## 4. The scalar route stops at rank seven

The failure from rank seven onward is exact, not a numerical artifact.  At
`k=7`, the relaxed coefficient cone admits

```text
a=1/3, b=1, c=5/2, d=85/16,
e=1/3, f=0, g=0.
```

Both `W` reserves and the `Y` reserve are zero, but

```text
T0=-4/3.
```

This row is **not asserted to be forest-realizable**.  It proves only that
the `S`-reserve and coefficientwise-containment relaxation cannot establish
a uniform all-rank theorem.  Additional forest constraints such as the
inductive ISO and weak-ratio inequalities must be used for rank seven and
above.

## 5. Exact recurrence consequence

Let `a~u` and `b~v` be nonsibling leaves of `F`, and put `B=F-{a,b}`.
Combining the ordinary leaf identity with the two-leaf `D` identity gives

```text
Q_r(F)
 =Q_r(F-a)+D_r(F-b,a)+N_r(B;u,v)+C_(r-1)(B;u,v).   (8)
```

Therefore `C_4,C_5,C_6` make the paired lower `Q/D` branch a nonnegative
terminal at target ranks `r=5,6,7`.

This does not remove the independent recurrence

```text
N_r(B)=N_r(B-z)+N_(r-1)(B-{z,s})+G_r(B,z).          (9)
```

For example, a rank-seven target still has the auxiliary chain

```text
N7 -> N6 -> N5 -> N4,
```

and therefore still uses FML gaps at ranks `7,6,5,4` under the current
termwise proof.  The cross-orientation theorem removes selected `Q/D` cells;
it does not by itself raise the FML floor.  Doing that requires a new
lower-`N` coupling or direct `N_4,N_5,N_6` theorems.

## 6. Replay and hashes

Run

```text
python prove_iso_cross_orientation_r4_r6_agent.py
python audit_iso_cross_orientation_dependency_consequence_agent.py
```

The markers are

```text
PASS_EXACT_CROSS_ORIENTATION_COUPLING_R4_R6
PASS_EXACT_C456_TRUNCATES_QD_BRANCH_NOT_N_FML_CHAIN
```

The first replay report hash is

```text
7163AD216FA48388D916363BE8DD5FE4FDE0C4FA3C8EE6F9C7A6C9E941C9904D
```

The source hashes are

```text
prove_iso_cross_orientation_r4_r6_agent.py
AAC60D487EBD3272BCA764BAE76A37B642F530DC219E08E3AEBD853B348006B4

audit_iso_cross_orientation_dependency_consequence_agent.py
C2C1A50EDBDD335AA3E30BF061A755DD03D64FC2E817DD8B167D42E84A7A2BCA
```
