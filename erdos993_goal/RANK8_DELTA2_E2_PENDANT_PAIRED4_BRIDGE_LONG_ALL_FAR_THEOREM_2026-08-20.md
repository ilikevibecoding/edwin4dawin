# Rank-8 Delta2: paired arm 4, bridge long, arbitrary far arms

## Theorem

For every order `n>=23`, the rank-8 terminal-broom Delta2 coefficient is
strictly positive for every pendant-rooted e=2 double claw in which:

- the selected arm has arbitrary positive length and the root is any vertex
  on it;
- the paired arm at the rooted branch has length exactly 4;
- both far-branch arms have arbitrary positive lengths;
- the central bridge has length at least 8.

This is an all-order theorem in the stated scope. Paired arms other than 4
and bridges of length at most 7 remain outside it.

## Two-short-far certificate

Far-branch reversal makes the two far arms unordered. When both are short,
the exact triangular split is the 21 pairs `1<=f1<=f2<=6`. The selected-arm
root position is split by ordered near/tail states `0,...,6` or `7+X`.
Low-base patterns use the exact shifted-coordinate cover forced by `n>=23`.

Primary source:

- `run_rank8_delta2_e2_pendant_far_pair_paired_cell.py`
- SHA-256: `FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5`

The 21 immutable primary reports contain 1,344 root-position patterns and
1,344 positive shifted symbolic cells, with no signed cell. Every report hash
is pinned by the independent audit.

Independent audit:

- `audit_rank8_delta2_e2_pendant_two_short_far_paired4.py`
- source SHA-256: `CB730331A7F05FB921565A8D0CFFDC82665E22DFF677E5EE701A4378560B7FF5`
- report: `rank8_delta2_e2_pendant_two_short_far_paired4_independent_audit_exact_20260820.json`
- report SHA-256: `2C0C8F17980A4A07AFD96ABC94134E9DACDDA1E3DDF7264600AAD4A3323327A5`
- status: `PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIRED4`

The audit independently regenerates all 21 triangular far-pair keys, all
1,344 root-position keys, every shifted order-cover cell, and all 1,344
constant coefficients from literal double-claw matching polynomials.

## No-gap far-arm assembly

If both far arms are at most 6, the new triangular package applies. Otherwise
at least one far arm is at least 7, and the previously sealed Section-109.91
at-most-one-short-far theorem applies. These cases cover every unordered
positive far-arm pair.

Dependency:

- `assemble_rank8_delta2_e2_pendant_at_most_one_short_far.py`
- source SHA-256: `64789E74BE68AB6704FC57AE1959038DA25C60FA3285A4E11FBCBED181B07029`
- `rank8_delta2_e2_pendant_at_most_one_short_far_exact_20260820.json`
- report SHA-256: `383E5F9652595CA14F8596D22E4B7D251F066FDF836DE78CF7DF236724BF5266`

Combined assembler:

- `assemble_rank8_delta2_e2_pendant_paired4_bridge_long_all_far.py`
- source SHA-256: `7844A51F76340C8E7A50DD171C4320BA2EEEA28A3B120E0C7778AB3ECD58141D`
- report: `rank8_delta2_e2_pendant_paired4_bridge_long_all_far_exact_20260820.json`
- report SHA-256: `A9C03E619E65FBE88E5EA12488C2EF993353A103EF7B4C4B2A86BDA4AA494C3B`
- status: `PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_PAIRED4_BRIDGE_LONG_ALL_FAR`

The assembler is fail-closed on both audited branches and on the exact far-pair
union. It makes no claim beyond paired-arm length 4 and bridge length at least
8.
