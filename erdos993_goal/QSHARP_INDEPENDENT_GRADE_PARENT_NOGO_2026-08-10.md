# Q-sharp: no stable parent with an independent grade extraction

Date: 2026-08-10

## Theorem

Fix one Q-sharp cell and put `P=d+s`.  Let `u_1,...,u_P` be a symmetric
pool of multiaffine allocation slots, and let `v` be an ordinary independent
grade variable.  On the symmetric slot subspace define the valid coupled
binomial contraction

```text
B_P(sum_j a_j e_j(u))=sum_j binom(P,j)a_j e_j(u).       (1)
```

There is no real-stable polynomial `F(v,u)` satisfying all three conditions

1. `F` is symmetric and multiaffine in the `u` variables;
2. the fixed path grade is the standard coefficient `[v^s]` (or any
   coefficient in a block of independent grade variables);
3. the slot diagonal of `[v^s] B_P F` is
   `Qsharp_(N,d,s)(z)`.

This rules out the proposed ordering

```text
stable all-grade parent -> slot-only B_P -> independent fixed-s extraction.
```

It does not rule out a genuinely joint grade/slot contraction.

## Proof

Write

```text
C_s(z)=sum_(j=0)^P C_j z^j,
Qsharp(z)=sum_(j=0)^P binom(P,j)C_j z^j.               (2)
```

The symmetric multiaffine polarization of `C_s` is

```text
Pol_P(C_s)=sum_j C_j/binom(P,j) e_j(u).                (3)
```

Consequently

```text
B_P Pol_P(C_s)=Pol_P(Qsharp).                          (4)
```

The operator `B_P` acts only on the `u` variables, so it commutes with an
independent grade extraction:

```text
[v^s] B_P F=B_P [v^s]F.                               (5)
```

The diagonal determines a symmetric multiaffine polynomial.  Hence
condition 3 and (4)--(5), together with invertibility of `B_P`, force

```text
[v^s]F=Pol_P(C_s).                                    (6)
```

But `[v^s]F=(1/s!)(partial_v^s F)|_(v=0)` is real stable (or zero), because
differentiation and real specialization preserve real stability.
Diagonalization preserves stability, so (6) would make `C_s` real-rooted.
This is false.

Indeed the proved selector theorem gives the gamma representation

```text
C_s(z)=(1+z)^P Gamma_(N,s)(z/(1+z)^2),                (7)
```

where `Gamma_(N,s)` has two roots `rho>=1` (strictly greater than one away
from the boundary convention).  Each such root contributes the quadratic

```text
rho z^2+(2rho-1)z+rho,
```

whose discriminant is

```text
(2rho-1)^2-4rho^2=1-4rho<0.                           (8)
```

Thus `C_s` is not real-rooted, contradicting (6).

The same proof applies when the grade is encoded by several independent
stable variables and extracted by a monomial coefficient: iterated
derivatives followed by real zero-specializations still preserve stability
and still commute with a slot-only `B_P`.

## First exact witness

At `(N,d,s)=(5,5,1)`, `P=6` and

```text
Gamma(t)=4(t-1)(t-2),
C_s(z)=4(z+1)^2(z^2+z+1)(2z^2+3z+2).                 (9)
```

The last two factors have discriminants `-3` and `-7`.  Nevertheless the
single coupled binomial contraction repairs the row:

```text
Qsharp(z)=4(2z^6+54z^5+285z^4+480z^3
              +285z^2+54z+2),                        (10)
```

which has six simple negative roots.  Therefore the contradiction is not a
failure of the Legendre multiplier; it is exactly the impossibility of
placing an independent stability-preserving grade extraction after it.

## Sharp remaining formulation

Any successful ordered-partition/raw-selector parent must violate the
commutation in (5).  Concretely, at least one of the following is necessary:

- the contraction weights depend jointly on the slot allocation size `j`
  and the path grade `s`;
- the grade is represented by a correlated shared-slot allocation rather
  than independent marker variables;
- a stable apolar/squarefree contraction simultaneously consumes grade and
  allocation slots before either marginal is extracted.

Equivalently, proving stability of an all-grade parent followed by a
slot-only `B_P` cannot help if the final `s`-slice is an ordinary commuting
coefficient.  The minimal positive target is now a **joint** stable kernel
whose `(s,j)` action specializes directly to the Q-sharp coefficient
`binom(P,j)C_j`, without ever exposing `Pol_P(C_s)` as a stable slice.

## Replay

`prove_qsharp_independent_grade_parent_nogo.py` verifies (2)--(4) over every
lower cell with `5<=d<=12`, checks the first exact factorization (9), its
negative Rayleigh/root obstruction, and the six negative roots in (10).  It
writes `qsharp_independent_grade_parent_nogo_exact_20260810.json`.

The commutation argument and (8) are all-order.  The finite range is only a
transcription replay.
