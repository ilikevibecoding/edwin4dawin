# Exact `b0`-factored lift for the mixed cross grades

This note records the algebra used by
`probe_rank8_low_low_a23_mixed_cross_face_grade_outer_factored_agent.py`.
It is a memory decomposition only; it does not replace any sign check.

## 1. Affine support before the quadratic row forms

In the right factor row, `b0` occurs only in right gap zero.  The backward
ratio recursion therefore puts `b0` only in right ratio zero.  Every positive
rank factor-row entry uses right ratio zero exactly once and every later ratio
once, so each right-base entry has `b0` degree at most one.

The right-direction row starts with `h` times right-base rank two and is then
multiplied only by ratios of index at least three.  Those ratios contain no
`b0`.  Hence it also has `b0` degree at most one.  Left factors and the tail
are independent of `b0`; consequently every convolution used below is affine:

`X = X_0 + b0 X_1` for `X` in `{c0,c1,v0,v1}`.

The source computes these two coefficients exactly as

`X_0 = X at b0=0`, `X_1 = (X at b0=1) - X_0`.

This is coefficient extraction, not numerical sampling, because the preceding
factor-row argument proves the affine bound first.

## 2. Outer coefficient identity

Every curvature, cross-curvature, derivative, and cross-derivative expression
is bilinear in its two convolution inputs (with multiplication by `h` and by
the left capacity afterward).  For any such bilinear form `B`,

`[b0^e] B(X,Y) = sum_(i+j=e) B(X_i,Y_j)` for `e=0,1,2`.

The capacity is a left factor and is independent of `b0`, so the same identity
applies to the complete strong rows.  It follows at once that the output
support is exactly contained in `0 <= exponent(b0) <= 2`.

The computation materializes one coefficient `e` at a time.  It restores the
canonical full exponent vector by appending `e` in the original final `b0`
coordinate before computing row and chunk digests.

## 3. Mixed-support filter after extraction

For outer exponent zero, a cross monomial must meet group A and one of
`a4,a5,a6,a7` in group B.  For exponent one or two, the positive `b0`
exponent itself meets group B, so only group-A support remains to be checked.
These cases are disjoint and exhaust the original cross-support condition.

For fixed total ordinary-slack grade `d`, each reduced monomial satisfies

`sum(non-b0 ordinary slack exponents) + e = d`.

This assertion is checked for every emitted term.

## 4. Canonical order and exact replay

`b0` is the final variable in the original degree-reverse-lexicographic
context.  Full terms are therefore ordered first by nondecreasing `b0`
exponent; within a fixed exponent, deleting or restoring the final coordinate
preserves the order.  Streaming `e=0,1,2` and appending the final coordinate
thus reproduces the unfactored canonical row order exactly.

Before any new grade is admitted, the factored source must be run on an
already sealed grade and exact-compared on all of the following for all four
rows: each outer chunk's term count, negative count, minimum, first-negative
witness and ordered digest; the complete ordered digest; and the summed raw
piece lengths.  New grades additionally require an independent formal
two-grading replay whose factor arithmetic carries the `b0` coefficient as a
separate formal index rather than recovering it from the producer's two
specializations.
