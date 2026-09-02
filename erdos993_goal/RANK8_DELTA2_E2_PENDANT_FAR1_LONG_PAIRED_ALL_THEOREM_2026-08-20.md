# Rank-8 Delta2: pendant roots with far-arm type (1, long)

## Theorem

The rank-8 terminal-broom Delta2 coefficient is strictly positive for every
order `n>=23` and every rooted e=2 double claw satisfying:

- the root lies anywhere on an arbitrary positive selected pendant arm;
- the other arm incident with the rooted branch has arbitrary positive length;
- the unordered two arms at the far branch have lengths `1` and at least `7`;
- the central bridge has length at least `8`.

This is an exact all-order theorem for the stated far-pair type, not a theorem
for every short-far boundary.

## Exact decomposition

Near-root and root-to-leaf tail gaps are independently split into
`0,1,...,6` and `7+X`, giving 64 ordered root-position patterns.  The paired
arm is split into fixed lengths 1 through 6 and `7+B`, giving 448 patterns.
Far-branch reversal makes `(1,long)` an unordered type.

When a pattern's minimum suppressed length sum is below 22, the order
condition says that its nonnegative offsets sum to at least the deficit.  With
`d` live coordinates, at least one coordinate is at least
`ceil(deficit/d)`.  The primary reports prove positivity on every corresponding
shifted orthant.  This yields 468 exact symbolic cells and no order gap.

## Primary certificates

Source:

- `run_rank8_delta2_e2_pendant_far_pair_paired_cell.py`
- SHA-256: `FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5`

All reports have status
`PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FAR_PAIR_PAIRED_CELL` and contain no
signed cell:

- paired 1: SHA-256 `4C2B8D9E8CA01758AB23BA13DF6986B87DC9D8831838517C55A9D5BF7A137CD7` (74 cells)
- paired 2: SHA-256 `D25028C842B6C7A429D13ED80DEAD231471E61B3B427B03005B5E0CD25837084` (70 cells)
- paired 3: SHA-256 `BB57014D95505B72CF4991BDC09053E7BFFDEB777695516B147B0787B5C2A50C` (67 cells)
- paired 4: SHA-256 `A27CF98D0A820D2CD32D95AB7C851EE79E36A48982FFFFC044555EC7D727EDCB` (65 cells)
- paired 5: SHA-256 `DF02160EF8743C452D0D554B97124374BEC415F1137626DF049960F41C7A4B66` (64 cells)
- paired 6: SHA-256 `1D5BDB49C46D822F98FDF144023D53B3F8F7C39412CD9FBB9E5F3FE9A7A83DF4` (64 cells)
- paired long: SHA-256 `93642B93A5DFE52E7B13EB6F255061C6C183C1CBF3B46ACD6546CDEB6C7862AB` (64 cells)

## Independent audit

- `audit_rank8_delta2_e2_pendant_far1_long_paired_all.py`
- source SHA-256: `56DB8F8013448EDE8A3A55A5E0020167151778363F2E136D6A1A21B2C1D86DB9`
- report: `rank8_delta2_e2_pendant_far1_long_paired_all_independent_audit_exact_20260820.json`
- report SHA-256: `7DFCAA77115B616EFFBEBF366E72C672FE615DB2134A34C38FCF35860231740A`
- status: `PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_FAR1_LONG_PAIRED_ALL`

The audit pins every primary byte hash, regenerates all 448 pattern keys and
all shifted order-cover cells, checks the pigeonhole cover inequality, and
reconstructs all 468 constant coefficients from literal double-claw matching
polynomials.
