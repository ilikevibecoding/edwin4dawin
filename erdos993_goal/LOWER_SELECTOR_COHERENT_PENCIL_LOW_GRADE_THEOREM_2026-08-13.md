# Coherent adjacent pencils: an all-order low-grade theorem

Date: 2026-08-13

## Result and scope

This note proves the coherent adjacent-pencil discriminant inequality in all
orders for path grades

```text
2 <= s <= 7,             s <= 2N-6.
```

Put `G_q=G_(N-q,s)`, `W_ij=W(G_i,G_j)`, and

```text
D_(N,s)(t)=W_02(t)^2-4W_01(t)W_12(t).
```

Then, except for harmless zero-discriminant support degeneracies,

```text
D_(N,s)(t)<0
```

for every real nonzero `t`, after the known forced even power is removed.
Equivalently, the core `-D_(N,s)` is strictly Hurwitz stable.  Therefore the
coherent adjacent-pencil lemma of Section 89 holds for every `2<=s<=7`.
Through the conditional moving-root argument already proved there, this gives
the full selector root pattern in those grades.  This is an infinite theorem
in `N`, not a bounded scan.

It does **not** prove the Q-sharp theorem in arbitrary grade, nor the coherent
pencil theorem for `s>=8`, so it does not close all lower artificial rows.

## 1. Path-specific input

Set

```text
R=2N-s-1.
```

The exact Lagrange/continuant formula (74.6) is

```text
[t^h]G_R
 =sum_(k=0)^h (R)_(s-2h+k)/((s-2h)! k!)
                 * binom(2R+h-k,h-k).                 (1)
```

The three adjacent path rows are `G_R,G_(R-2),G_(R-4)`.  Formula (1) is
obtained from the tridiagonal path continuant, so every subsequent
certificate is path-specific; no generic homogeneous-truncation theorem is
used.

Let

```text
P_(R,s)(t)=-(W_02^2-4W_01W_12).                     (2)
```

For fixed `s`, (1)--(2) make every coefficient of `P` a rational polynomial
in the single size exponent `R`.

## 2. Exact strict-interior certificate

The strict interior begins at

```text
R>=s+3,                    equivalently N>=s+2.      (3)
```

Substitute `R=X+s+3`.  For every `s=2,...,7`, exact expansion proves:

1. every coefficient `[t^j]P_(X+s+3,s)` has strictly positive
   coefficients as a polynomial in `X`;
2. every leading Hurwitz determinant of `P_(X+s+3,s)` has strictly positive
   coefficients as a polynomial in `X`.

All denominators cleared in this check are positive constants.  Hence the
coefficients and all leading Hurwitz determinants are positive for every
real `X>=0`, in particular for every parity-admissible path value.  The
Routh--Hurwitz criterion proves that every zero of `P_(R,s)` has negative
real part.  Thus `P_(R,s)` is positive on the entire real axis and (2) is
strictly negative there.

This coefficientwise shifted-Hurwitz certificate is the all-order proof.  It
is stronger than checking finitely many Routh arrays at integer `N`.

## 3. Support boundaries

The coherent range is `s<=2N-6`.  Below (3) there are only finitely many
support-boundary types for each of the six fixed grades.  Exact substitution
at those values gives either

- an identically zero discriminant caused by a collapsed support, or
- an even power `t^e` times a polynomial with positive coefficients and
  positive leading Hurwitz determinants.

The nontrivial lowest examples are

```text
s=4,N=5:  -D=108 t^2(18388t^2+2060t+885),
s=5,N=6:  -D=25600 t^2(7640t^2+420t+51),
s=6,N=6:  -D=57600 t^6(8970t^2+1572t+671),
s=7,N=7:  -D=44800 t^6(2526785t^2+225588t+28692).
```

Every displayed quadratic is strictly Hurwitz stable.  The replay records
all boundary cores and their exact Hurwitz minors.

## 4. Consequence for the coherent pencil

For

```text
F_u=G_0+uG_1,       H_u=G_1+uG_2,
Q_u=F_u+uH_u,
```

the Wronskian orientation is the quadratic

```text
W(F_u,H_u)=W_01+uW_02+u^2W_12.                     (4)
```

The strict negativity of its discriminant `D_(N,s)` gives a constant
orientation in `u`.  Adjacent path compatibility already proves that both
`F_u` and `H_u` are negative-rooted.  Hence they are in proper position and
`Q_u`, after its forced zero, is negative-rooted for every `u>0`.

The exact identity

```text
D_(N,s)=(T')^2-4TS,
T=G_1^2-G_0G_2,
S=(G_1')^2-G_0'G_2',                                (5)
```

also shows that `T` cannot vanish on the positive axis.  Its first nonzero
coefficient is positive, so the positive-axis Turan sign required by the
moving-root argument follows without a second hypothesis.

## 5. Relation to recorded no-gos

The proof does not invoke any of the known invalid shortcuts:

- no independent-grade stable parent is assumed;
- no raw or sequential factorial multiplier is applied;
- finite Hurwitz evidence is not promoted to a theorem: the theorem is the
  symbolic positivity of the entire shifted Hurwitz certificate;
- total positivity of a one-row kernel is not treated as sufficient;
- no positive-semidefinite Christoffel--Darboux polarization is used;
- no generic homogeneous-component closure is claimed.

The price is that the symbolic certificate is presently proved only for the
six fixed grades `2<=s<=7`.  Its shape suggests a path-specific compound
continuant factorization in arbitrary grade, but such a factorization is not
proved here.

## 6. Exact replay and verification status

Run

```text
python prove_lower_selector_coherent_pencil_low_grade.py
```

The script reconstructs (1)--(2), checks every shifted coefficient and every
leading Hurwitz determinant symbolically, treats all support boundaries, and
then performs an independent exact Sturm audit through `N=30`.  The latter
153-cell audit is evidence/replay only and is not used by the all-order
argument.

Verified status:

```text
PASS_ALL_ORDER_COHERENT_SELECTOR_GRADES_2_THROUGH_7
```

Artifact hashes are recorded in the accompanying report and should be
recomputed after any edit.
