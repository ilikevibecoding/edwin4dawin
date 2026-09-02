# The raw two-pair selector is Strongly Rayleigh in every grade

Date: 2026-08-10

## Theorem

Let `V=O union {a_1,a_2,b_1,b_2}`, where `O` is an ordinary coordinate
set of size `M>=4`, and let `Sigma_(M,4)` be the stable degree-four selector
proved in Section 99.  For every `4<=d<=|V|`, define

```text
Sigma_(M,d)
 =d! e_d(V)
  -(d-2)! a_1a_2 e_(d-2)(V\{a_1,a_2})
  -(d-2)! b_1b_2 e_(d-2)(V\{b_1,b_2})
  +(d-4)! a_1a_2b_1b_2 e_(d-4)(O).                 (1)
```

Then

```text
Sigma_(M,d)
 =(d-4)! { e_(d-4)(V) Sigma_(M,4) }_sf,             (2)
```

where `{ }_sf` denotes multiplication in the squarefree algebra.  Therefore
`Sigma_(M,d)` is real stable in every order.

## Proof

Fix a `d`-subset `S` of `V`.  In the squarefree product on the right of (2),
its coefficient is `(d-4)!` times the sum of the coefficients of
`Sigma_(M,4)` over all four-subsets `T` of `S`.  Section 99 gives

```text
[T] Sigma_(M,4)
 =24-2 1[{a_1,a_2} subset T]-2 1[{b_1,b_2} subset T]
    +1[{a_1,a_2,b_1,b_2} subset T].                  (3)
```

There are `binom(d,4)` four-subsets of `S`; if a fixed marked pair is
contained in `S`, exactly `binom(d-2,2)` contain that pair; and if both
pairs are contained in `S`, exactly one contains all four marked variables.
Consequently the coefficient is

```text
(d-4)![24 binom(d,4)
        -2 binom(d-2,2) 1[pair A completed]
        -2 binom(d-2,2) 1[pair B completed]
        +1[both completed]]

=d! -(d-2)! 1[pair A completed]
     -(d-2)! 1[pair B completed]
     +(d-4)! 1[both completed],                       (4)
```

which is exactly (1).

The elementary symmetric polynomial `e_(d-4)(V)` is real stable.
`Sigma_(M,4)` is real stable by the all-order theorem of Section 99.
Sinclair's squarefree-product closure (the same Proposition 3.7 already
used in Section 84) says that the squarefree product of two multiaffine
real-stable polynomials is real stable.  Equation (2) proves the claim.

All coefficients in (4) are positive.  More explicitly, according as `S`
completes zero, one, or two marked pairs, its weight is

```text
d!,
d!-(d-2)!,
d!-2(d-2)!+(d-4)!,
```

and the last is positive already at `d=4` (`21`) and increases thereafter.

## Consequence and limitation

The entire fixed-grade **raw** deletion selector, including the common
grade that encodes the shared homogenizer, is Strongly Rayleigh.  Thus the
raw-selector side of the determinant program is not restricted to the
degree-four statement explicitly displayed in Section 99.

This still does not prove `G_(N,d)`.  The actual normalized spectral
determinant separates the identity directions from the endpoint directions.
Its forced selector is the nonstable polynomial proved in
`COLLAPSED_DETERMINANT_SELECTOR_NOGO_2026-08-10.md`.  The remaining theorem
is precisely a slot-preserving transport of (2) through the path/Laguerre or
ordered-partition normalization; a generic collapsed contraction cannot do
that transport.

## Exact replay

`prove_all_order_raw_two_pair_selector.py` expands both sides of (2) over
every subset for `0<=M<=12` and every `4<=d<=M+4`, checks the coefficient
formula and strict positivity, and writes
`all_order_raw_two_pair_selector_exact_20260810.json`.

The finite expansion is only a transcription replay.  The counting in
(3)--(4) and Sinclair's closure theorem are the all-order proof.
