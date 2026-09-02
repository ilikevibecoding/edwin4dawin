# Rank-seven forest three-halves reduction

Date: 2026-08-13

Status: **RIGOROUS PARTIAL REDUCTION, NOT AN ALL-ORDER THEOREM.**

This note records the exact part of the rank-seven forest reserve proof that
has been completed.  It must not be cited as proving Erdős Problem 993 or as
proving the rank-seven reserve for every forest.

## 1. Target and required range

For a forest `F`, write `i_j=i_j(F)` and

```text
Q_7(I(F))=14 i_7^2-i_6 i_7-16 i_6 i_8.              (1)
```

The prefix cutoff is

```text
L(F)=floor((2 alpha(F)+1)/3).
```

Rank seven is required when `7<L(F)`, which is equivalent to
`alpha(F)>=12`.  With factorially scaled coefficients

```text
q_j=2^j j! i_j,
```

(1) is equivalent to

```text
q_7^2-q_6q_8-q_6q_7 >= 0.                            (2)
```

## 2. Exact finite evidence

The exhaustive forest-polynomial census through order 20 checks 2,256,058
rows with `alpha>=12`.  There is no negative value.  The exact minimum is

```text
Q_7=609848
```

at order 15, alpha 12, for

```text
(1,15,91,301,634,940,1024,834,505,221,66,12,1).
```

This is a finite certificate only.  It does not imply an all-order result.
The report is `rank7_forest_residual_n20_exact_20260813.json`.

A separate deterministic exact stress test checked 20,000 random labelled
trees and 19,999 random products through order 300 without finding a
required-range failure.  Its report is
`rank7_reserve_random_stress_seed993007_exact_20260813.json`.  This is also
finite evidence only.

## 3. Convolution cones

The proved lower-rank forest inequalities lead to the same exhaustive
high/low cone split used at rank six.  After a common homogenizing scale
`h`, the gaps satisfy

```text
delta_0 >= 2h,
delta_1 >= 0,
delta_1+delta_2 >= 2h,
delta_3,delta_4,delta_5,delta_6 >= h.                 (3)
```

If `delta_1>=h`, the factor is high.  Otherwise write `delta_1=r<h` and
`delta_2=2h-r+d_2`; the factor is low.  Thus there are three product cases.

### 3.1 Full high/high cone: proved

The complete exact expansion of (2) for two high factors has

```text
108603332 monomials,
0 negative coefficients,
minimum coefficient 1,
maximum coefficient 41613599136000.
```

Therefore the full high/high cone preserves the rank-seven reserve.  The
replay is `verify_rank7_high_high_convolution.py`; its report is
`rank7_high_high_convolution_exact_20260813.json`.

### 3.2 Low/high hard face: proved

On the boundary obtained by setting the unused slack variables to zero, the
exact low/high margin has 81,335 terms and factors as

```text
(8b+ta+a3+a4+a5+a6) R_LH.                            (4)
```

`R_LH` has 55,536 terms and 100 negative coefficients.  Every negative
monomial is the midpoint of two positive monomials.  The exact replay
allocates 100 AM-GM blocks

```text
A x^u+B x^v-C x^m >= 0,
u+v=2m,                  4AB>=C^2,                   (5)
```

and checks exact coverage and non-overuse of every positive coefficient.
Thus the complete low/high hard face is nonnegative.

### 3.3 Low/low hard face: proved

The analogous low/low hard margin has 240,082 terms and factors as

```text
(8b+8c+ta+a3+a4+a5+a6) R_LL.                         (6)
```

`R_LL` has 156,302 terms and 230 negative coefficients.  All 230 are paid
by exact AM-GM blocks of the form (5).  Its `c=0` slice is exactly `R_LH`.
Thus the complete low/low hard face is nonnegative.

Both hard-face calculations are reconstructed by
`verify_rank7_three_halves_hard_faces.py`; the report is
`rank7_three_halves_hard_faces_exact_20260813.json`.  The JSON rows are
output certificates, not trusted inputs.

## 4. Exact remaining obligations

The convolution theorem is not yet closed.  Two precise coefficient checks
remain:

1. expand the full low/high cone and prove that every negative coefficient
   is confined to the hard face certified in Section 3.2;
2. expand the full low/low cone and prove that every negative coefficient
   is confined to the hard face certified in Section 3.3.

No negative on either hard face remains unpaid.  The missing statements are
only the off-face coefficientwise-nonnegativity claims.  The rank-six
analogues were true, but that precedent is not proof at rank seven.

Even after these two checks, an all-forest theorem additionally needs a
connected-tree rank-seven theorem and the small-component/first-crossing
lift.  At present the exhaustive order-20 census supplies a finite base but
not an all-order connected-tree proof.

## 5. Replay

Run

```powershell
python .\verify_rank7_high_high_convolution.py
python .\verify_rank7_three_halves_hard_faces.py
```

The first command is large: its exact 108-million-term expansion took about
18 minutes and used about 10 GB of private memory on the certification run.
The second command takes about one minute.

