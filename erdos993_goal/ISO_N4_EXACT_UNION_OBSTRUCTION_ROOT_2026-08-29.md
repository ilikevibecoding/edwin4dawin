# Smallest exact-union obstruction for `N_4`

Date: 2026-08-29

Status: **exact route obstruction, not an `N_4` counterexample.**

## Statement

Expand the closed formula for `N_4(B;u,v)` over ordered pairs `(I,J)` of
independent sets, and group all terms having the same exact union `I union J`.
It is false that every such group is nonnegative, even after allowing either
orientation of every commutative product.

The smallest support order is five.  Take the marked forest

```text
V(B)={0,1,2,3,4},
E(B)={01,12},
u=1, v=3.
```

For the full union `{0,1,2,3,4}`, the only active terms are

```text
-5 E_3 W_3   (one ordered pair),
-5 U_4 V_2   (one ordered pair),
```

so the complete exact-union charge is

```text
-10.
```

Nevertheless the sum over every union is

```text
N_4(B;u,v)=106>0.
```

Thus the witness forces payment between different unions; it does not refute
the desired all-forest theorem.

## Minimality and orientation robustness

The verifier exhausts every marked forest through order four:

```text
11 forest types,
47 marked pairs,
137 nonzero exact-union cells,
0 negatives.
```

Reversing the two factors in a commutative coefficient product sends `(I,J)`
to `(J,I)` and preserves `I union J`.  Therefore the union total `-10` cannot
be repaired by orienting products differently.  Any surviving switching or
shadow proof must transfer reserve between distinct unions.

## Replay and integrity

```text
python verify_iso_n4_exact_union_counterexample_root.py
```

Marker:

```text
PASS_EXACT_ISO_N4_EXACT_UNION_COUNTEREXAMPLE
```

SHA-256:

```text
verify_iso_n4_exact_union_counterexample_root.py
B5AB2B966C7B409B2FEA63E5C4509AF566C9BFA354112FD3D917241E7BE9E5B0

iso_n4_exact_union_counterexample_root_20260829.json
3886E03B5F5D4812B80F9A37AF45B88DFFD206F6362193CC6D12D6FC8299B1E0
```

Scope: this rules out only termwise exact-union positivity and any
decomposition that never compensates different union supports.  It does not
rule out complete cross-union Bencs transport, a global invariant proof,
all-order `N_4`, forest ISO, or Erdos Problem 993.
