# Rank-8 Delta2: pendant roots with at most one short far arm

## Theorem

For every order `n>=23`, the rank-8 terminal-broom Delta2 coefficient is
strictly positive for every pendant-rooted e=2 double claw in which:

- the selected arm has arbitrary positive length and the root is any vertex
  on it;
- the paired arm at the rooted branch has arbitrary positive length;
- the central bridge has length at least 8;
- at most one of the two far-branch arms has length at most 6.

Equivalently, at least one far-branch arm has length at least 7.  The only
pendant-root configurations not covered by this theorem have both far arms in
`1,...,6` or have central bridge length at most 7.

## No-gap far-pair decomposition

Far-branch reversal makes the two far arms unordered.  If at most one is
short, their unordered lengths are exactly one of:

- `(>=7,>=7)`, covered by the earlier long-long package; or
- `(s,>=7)` for a unique `s` in `1,...,6`, covered by the new boundary
  packages.

Within every `(s,>=7)` type, the paired arm is split into `1,...,6` and
`7+B`, while the near and tail root gaps are independently split into
`0,...,6` and `7+X`.  Low-base patterns use the exact shifted-coordinate
union forced by `n>=23`.

## New one-short/one-long certificates

Primary source:

- `run_rank8_delta2_e2_pendant_far_pair_paired_cell.py`
- SHA-256: `FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5`

The 42 immutable primary reports cover 6 short far lengths times 7 paired-arm
states.  They contain 2,688 root-position/paired patterns and 2,723 positive
shifted symbolic cells, with no signed cell.  Every report hash is pinned in
the independent audit below.

Independent audit:

- `audit_rank8_delta2_e2_pendant_at_most_one_short_far.py`
- source SHA-256: `D615E33F6969FC85D93D7AEC32DEF70B860A3984FB369B11608DF3988B846318`
- report: `rank8_delta2_e2_pendant_one_short_one_long_far_independent_audit_exact_20260820.json`
- report SHA-256: `0CD9F1371ED8024BAF19FF98F6A1C437575F7BAE345CFE031AA90B91A45667F2`
- status: `PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_ONE_SHORT_ONE_LONG_FAR`

The audit pins all 42 report hashes, independently regenerates the 2,688
pattern keys and 2,723 shifted cells, verifies every pigeonhole order-cover
union, checks far-pair symmetry and all short/long splits, and rebuilds all
2,723 constant coefficients from literal double-claw matching polynomials.

## Long-long dependency

The `(>=7,>=7)` far-pair type with arbitrary rooted-side arms was previously
sealed by:

- `assemble_rank8_delta2_e2_pendant_root_side_arbitrary_far_bridge_long.py`
- source SHA-256: `A4F6E1ABD67F748858D2F99FFDD9C2FF1231272018F98BA58F9304C8554CD22D`
- report: `rank8_delta2_e2_pendant_root_side_arbitrary_far_bridge_long_exact_20260820.json`
- report SHA-256: `97FE974A2BF6B160F84A82F729DA7D319095291DA8FB42B5ACA46E16BAC95DF5`

## Combined assembler

- `assemble_rank8_delta2_e2_pendant_at_most_one_short_far.py`
- source SHA-256: `64789E74BE68AB6704FC57AE1959038DA25C60FA3285A4E11FBCBED181B07029`
- report: `rank8_delta2_e2_pendant_at_most_one_short_far_exact_20260820.json`
- report SHA-256: `383E5F9652595CA14F8596D22E4B7D251F066FDF836DE78CF7DF236724BF5266`
- status: `PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_AT_MOST_ONE_SHORT_FAR`

The assembler is fail-closed on every source/report hash and on the exact
short/long far-pair union.  It does not claim the two-short-far boundary.
