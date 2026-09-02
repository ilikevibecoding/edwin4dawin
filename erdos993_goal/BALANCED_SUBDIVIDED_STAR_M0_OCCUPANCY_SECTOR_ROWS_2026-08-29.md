# Balanced subdivided-star m=0 occupancy-sector rows

Date: 2026-08-29

## Scope

This note proves the exact all-order row bounds that retain the common centre
occupancy motif in the balanced subdivided-star `m=0` endpoint.  It closes the
row-relaxation defect first visible at `(N,j,d,R,T,Y)=(26,4,4,11,11,11)`.
It does **not** by itself prove the remaining all-parameter sign, terminal
Newton `m=0`, the terminal-payment theorem, or Erdős Problem #993.

## Literal occupancy rows

Centre `i` has `r_i` arms.  Let `y_i` be the number of its arms with positive
subdivision length, and let `Y=sum_i y_i`.  For an arm with subdivision length
`ell`, the excluded-centre row is `P_(ell+1)` and the included-centre deep-tail
row is `P_ell`.  Hence

```text
ell=0:  P_(ell+1)=P_1,  P_ell=P_0;
ell>0:  P_(ell+1)>=coeff P_2,  P_ell>=coeff P_1.      (1)
```

Define

```text
H_i^0=P_2^(y_i) P_1^(r_i-y_i),
K_i^0=P_1^(y_i).                                    (2)
```

The nonempty centre sectors in

```text
F-H=sum_(empty != C subset [d])
    x^|C| product_(i in C)K_i product_(i notin C)H_i (3)
```

are separately coefficientwise monotone in every factor.  Equations (1)-(3)
therefore give the simultaneous consecutive-row lower bound

```text
F-H >=coeff E^0,
E^0=product_i(H_i^0+xK_i^0)-product_i H_i^0.         (4)
```

This is one polynomial inequality, so its rank-`j` and rank-`j+1` rows retain
the same occupancy vector.  The shared rank-four motif is also literal:

```text
tau=B3+(d-1)R+T-(N-2)+sum_i(r_i-1)y_i.               (5)
```

For balanced `r_i`, there are only degrees `q` and `q+1`; (5) fixes the total
number of occupied arms in the high-degree class.

## Sign-aware upper row

If a nonempty centre set `C` is selected, exactly
`A_C=sum_(i in C)r_i` mandatory arm vertices are deleted.  The remaining
sector is a forest on `S-A_C` vertices, so

```text
[x^k] x^|C| product_(i in C)K_i product_(i notin C)H_i
 <= C(S-A_C,k-|C|).                                  (6)
```

Summing (6) gives an all-order upper row for `F-H`.  Thus the coefficient of
`F-H` can be paid with (4) when its scalar coefficient is nonnegative and
with (6) when that coefficient is negative.  No inequality direction is
silently reversed.

## H and q=0 endpoints

The pinned path-graft theorems give

```text
Hconc=(1+x)^(R-Y) P_(T-Y+2)P_2^(Y-1)
       <=coeff H <=coeff Hmax,                        (7)
```

and `H` dominates `Hconc` in adjacent likelihood-ratio order.  Therefore a
positive residual `h_j` coefficient is paid at `Hconc_j`, while a negative
one is paid at `Hmax_j`.

When `R<d`, every centre has at most one arm and `F` is a linear forest:

```text
F=(1+x)^(d-R) product_a P_(ell_a+2).                 (8)
```

The same graft theorem gives

```text
Fconc=(1+x)^(d-R)P_(T+2)P_2^(R-1)
       <=coeff F <=coeff Fmax,                        (9)
```

and `F` likelihood-ratio dominates `Fconc`.  Equation (9) is the direct
support-boundary payment needed when `H_j=0` and the scalar coefficient of
`f_j` is negative.

## Former first obstruction

At `(N,j,d,R,T,Y)=(26,4,4,11,11,11)`, the balanced arm vector and occupancy
vector are both forced:

```text
r=(3,3,3,2),  y=(3,3,3,2),  tau=44.
```

The old all-deep-tail floor was `(E_4,E_5)=(1035,2541)`.  The literal row (4)
is exact here and gives

```text
(E_4^0,E_5^0)=(4268,15543).                          (10)
```

In the cleared `m=0` sector certificate this changes the relaxed negative
value to `+226034652522781539360`.

## Replay

Run

```powershell
python .\prove_balanced_subdivided_star_m0_occupancy_sector_rows_adversary.py
```

The required marker is

```text
PASS_EXACT_ALL_ORDER_BALANCED_M0_OCCUPANCY_SECTOR_ROW_LEMMA
```

The bounded atlas reconstructs literal rows and checks (4), (6), (7), (9),
and (10) exactly.  It audits the all-order identities but is not a substitute
for the remaining parameter-sign proof.
