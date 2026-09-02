# The full-even-block endpoint tridiagonal certificate fails in higher layer

Date: 2026-08-13

## Exact no-go theorem

Retain the forest endpoint pencil `F+cG` and the discriminant-block Gram
construction of
`ENDPOINT_DISCRIMINANT_TRIDIAGONAL_SONC_REDUCTION_2026-08-13.md`.
At the exact positive parameter point

```text
s=27,       q=10724,       N=2s+5+q=10783,       u=1,
```

the degree-thirteen core discriminant has degree 24 in `c`.  Its full
evaluated odd blocks are negative at

```text
c^11,c^13,c^15,c^17,c^19,c^21,c^23.
```

Let `B_e=[c^e] Disc_t(F+cG)` after this specialization.  Form the scalar
tridiagonal matrix `Q_tilde` with diagonal

```text
B_10,B_12,B_14,B_16,B_18,B_20,B_22,B_24
```

and off-diagonal magnitudes

```text
-B_11/2,-B_13/2,...,-B_23/2.
```

All these diagonal and off-diagonal magnitudes are strictly positive.  The
signs of the eight exact leading continuants are

```text
+,+,+,+,+,+,+,-.                                  (1)
```

The final determinant is a negative integer with 13,762 decimal digits and
SHA-256

```text
AE5821799259D0CD51DFA4CB54F317C764BAEE069C43B614BD2D2E69AECA0434.
```

The exact final Schur complement is also negative; its canonical rational
string has SHA-256

```text
61A59254865FCED32D84B61EC5555F323934273974722EA255389E0F3AEC4144.
```

## Why this refutes the coefficientwise-negative-part Gram matrix

Write each odd discriminant block before specialization as

```text
P_j(q,u)-N_j(q,u),
```

where `P_j,N_j` are its coefficientwise positive and negative parts.  At
the displayed point, the full block is negative, hence

```text
N_j(q,u) >= N_j(q,u)-P_j(q,u) = -B_(2j+1).         (2)
```

The first seven signs in (1) make the penultimate leading block of
`Q_tilde` positive definite.  It is an irreducible Stieltjes matrix, so its
inverse is entrywise positive.  The negative final Schur complement
therefore has a strictly positive Schur witness vector.

The Gram matrix proposed in the reduction has the same evaluated diagonal
but off-diagonal entries `-N_j(q,u)/2`.  By (2), its off-diagonal magnitudes
are at least those of `Q_tilde`.  On the positive witness vector this only
decreases the quadratic form.  Consequently the proposed full-even-block
Gram matrix is not positive semidefinite at this point.  In particular, its
leading continuants cannot all be coefficientwise nonnegative for arbitrary
`s`.

Thus the successful fixed-layer pattern through `s=16` does not admit the
suggested all-order continuation with the same full-even allocation.

## Precise scope

This is a counterexample to one sufficient certificate, not to the endpoint
theorem.  It does **not** show that `Disc_t(F+cG)` is negative, that `F+cG`
has nonreal roots, or that another Gram/SONC allocation is impossible.  It
does not test or implicate the distinct pencil `E+cF`.

The layer `s=27` is the first failure found by the increasing-layer exact
search used here.  No minimality over the continuous `(q,u)` cone is
claimed.  In particular, this note should be cited as a concrete all-order
no-go, not as a proof that every lower layer satisfies the certificate.

The homotopy use of the endpoint rays depends on their rootedness.  The
Section 75 mixed-slice stability-preserver proof of the adjacent unsigned
rays is separate from the questionable same-half-plane polar argument in
Section 59.4; this no-go itself uses neither polar preservation nor endpoint
rootedness.

## Exact replay

Run

```text
python verify_endpoint_fg_full_even_tridiagonal_counterexample.py
```

It constructs the rays directly in exact FLINT arithmetic, specializes
`q,u`, computes the exact discriminant and all scalar continuants, asserts
(1), and writes
`endpoint_fg_full_even_tridiagonal_counterexample_exact_20260813.json`.

SHA-256 hashes:

```text
replay  D40005DA0E0795C3AD455B2B3857C75BE9C301E3AA08CB433A40B703B8EC9665
report  F68C327345289F0F0713FFC185039135CB75680743EC8EB2EA903CE4415F2348
```
