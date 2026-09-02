# Reversible exact Bernstein address stack

## Purpose

The full tensor-stack traversal of the odd, negative-`B`, `q`-dominant outer
chart exhausted Windows commit memory.  The first address-stack replacement
keeps only one live cell and deferred address strings, but reconstructs each
deferred sibling from the global root atlas.  This note records an exact
reversible alternative that moves from a certified leaf to the next deferred
sibling through their longest common dyadic prefix.

No floating-point arithmetic or sampling is introduced.

## Integer-scaled midpoint restriction

Let `b_0,...,b_n` be the Bernstein controls of a degree-`n` univariate fiber.
The certificate code stores `2^n` times the ordinary controls after restricting
to one half.  For the left child its stored control `c_j` is

```
c_j = 2^(n-j) sum_{k=0}^j binom(j,k) b_k.
```

This is lower triangular.  Therefore, in increasing `j`,

```
b_j = c_j / 2^(n-j) - sum_{k=0}^{j-1} binom(j,k) b_k.
```

For the right child,

```
c_j = 2^j sum_{k=j}^n binom(n-j,k-j) b_k.
```

This is upper triangular.  Therefore, in decreasing `j`,

```
b_j = c_j / 2^j - sum_{k=j+1}^n binom(n-j,k-j) b_k.
```

Every division is checked for zero remainder.  These identities apply fiber by
fiber along any tensor axis and remain valid after arbitrarily many successive
subdivisions because each step is an exact linear map with the same uniform
integer scaling.

## Reversible DFS navigation

Suppose the current leaf has dyadic address `a` and the next LIFO deferred
sibling has address `b`.

1. Find the longest common token prefix of `a` and `b`.
2. Apply the appropriate inverse restriction for the suffix of `a`, in reverse
   order, recovering the tensor at the common prefix.
3. Apply ordinary exact single-side restrictions for the suffix of `b`.

The resulting controls equal direct restriction of the root atlas to `b`, but
only one tensor dictionary and the address-string stack are live.  In a
right-first DFS the next deferred cell is normally near the current leaf, so
this avoids repeated reconstruction along the entire root-to-leaf path.

## Deterministic validation completed

Implementation: `exact_bernstein_navigation.py`.

- 340 exact inverse checks across dimensions 1 through 5, every axis, degrees
  0 through 7, both sides, signed 20-digit integers, and 100 mixed-axis paths
  of 30 consecutive subdivisions: PASS.
- A finite 181-cell synthetic full-tensor DFS was compared cell-for-cell with
  the reversible one-cell DFS: every address and every tensor coefficient
  agreed exactly, and both traversals terminated together: PASS.
- 100 pairs of unrelated random dyadic addresses were compared by reversible
  navigation versus independent reconstruction from the root: every tensor
  coefficient agreed exactly: PASS.

## Required certificate-level validation

Before replacing the running pure address-stack worker, compare the reversible
mode against the already recorded real 100-cell prefix.  The real checkpoint
must reproduce the same processed count, leaf count, leaf-reason histogram,
deepest vector, and current address.  It must also retain the exact zero-remainder
checks during every inverse operation.
