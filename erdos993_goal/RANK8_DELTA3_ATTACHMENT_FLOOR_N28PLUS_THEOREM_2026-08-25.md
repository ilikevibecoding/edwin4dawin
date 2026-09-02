# Rank-eight Delta3 terminal gate for rooted trees of order at least 28

## Theorem

For every rooted tree core of order `n>=28`, the rank-eight terminal `Delta3`
residual is nonnegative throughout the exact rank-six defect interval and the
root-capacity polygon used in the terminal-broom reduction.

This closes the reduced `Delta3` terminal gate in this order range.  It does
not, by itself, close `Delta2`, connected Q8, forest Q8, or Problem 993.

## Reduction and coverage

The structural reduction is concave across the rank-six defect interval, so
only the two endpoints `k=1` and `k=7` remain.  The root polygon leaves two
potentially nonconcave paths: lower-cross and upper-capacity.

For a root `q`, the attachment-incidence theorem gives

`i7(T-q)/i7(T) >= (n-19)/(n-12)`.

At `n=28` this is `9/16`, and it increases to one.  Consequently the `h7=0`
face is impossible.  Lower-cross at ratio one contains the full-root endpoint,
and upper-capacity at ratio one contains the upper junction.

The four exact tensors are therefore the Cartesian product

`{k=1,k=7} x {lower-cross,upper-capacity}`.

Each tensor contains 2,135,484 exact Bernstein coefficients.  Across all four
boxes, all 8,541,936 coefficients are strictly positive.

## Independent audit

The audit reconstructs the compactified attachment-floor map and both path
ratio identities without importing the tensor producer.  It checks that the
four reports exhaust the endpoint/path product, pins their exact hashes, and
verifies that every reported coefficient count is positive with no zero or
negative entries.

## Replay

```powershell
python assemble_rank8_delta3_attachment_floor_n28plus_root.py
python audit_rank8_delta3_attachment_floor_n28plus_root.py
```

The assembled report and independent audit have SHA-256 digests

`0328FF3EB1690F40A68E3CE618C2B6189BD0EBADA6A61E37EB8AC639EA6EFFEF`

and

`B4A3495987E349DD717C9ADA80F2D02F84173E9359B6B826FED03196B1F83300`.

