# Rank-8 Delta2: pendant root-side arbitrary, far side and bridge long

## Theorem

For every rooted e=2 double claw whose root lies on a pendant arm, the rank-8
terminal-broom Delta2 coefficient is strictly positive when:

- the selected arm has arbitrary positive length and the root is any vertex
  on it;
- the other pendant arm incident with the same branch vertex has arbitrary
  positive length;
- both pendant arms at the opposite branch vertex have length at least 7;
- the central bridge has length at least 8.

This is an all-order theorem within that scope.  It is not the full e=2
pendant-root theorem: short far arms or a central bridge of length at most 7
remain outside the result.

## No-gap decomposition

For the selected arm, write `near` for the number of vertices strictly between
the root and its branch vertex and `tail` for the number strictly between the
root and the leaf.  Each nonnegative integer is uniquely in one of the cells
`0,1,...,6` or `7+X`, so the 8 x 8 ordered near/tail cells cover every root
position and every selected-arm length `near+tail+1`.

The paired arm is split into fixed lengths 1 through 6 and the long cell
`7+B`.  Thus the six short packages and the earlier long-paired package cover
every positive paired-arm length without overlap or a gap.

## Short-paired exact certificates

Primary source:

- `run_rank8_delta2_e2_pendant_fixed_paired_far_bridge_long_cells.py`
- SHA-256: `2B60A76EB9C727712B40DA3FFA1AA5B311885081D0F5C96F6EFB35FF87594D29`

Each of the six reports has 64 positive symbolic cells and no signed cell:

- paired 1: `rank8_delta2_e2_pendant_paired1_far_bridge_long_cells_exact_20260820.json`, SHA-256 `9BA9A2CF6623156AA13C6903CAACFD4E7CB4A4736F45E9EB0227FB6F4A577FC3`
- paired 2: `rank8_delta2_e2_pendant_paired2_far_bridge_long_cells_exact_20260820.json`, SHA-256 `0AAAE48EF9BD4EB3B2B20851EF0B0CC8A2B78F5DD131296167C1AE279353BE9F`
- paired 3: `rank8_delta2_e2_pendant_paired3_far_bridge_long_cells_exact_20260820.json`, SHA-256 `5C0F2AEE822B84536A6D0115E2EB295561AB23DE336784782AC6781E43EFBD6B`
- paired 4: `rank8_delta2_e2_pendant_paired4_far_bridge_long_cells_exact_20260820.json`, SHA-256 `90E7E9464E92F4966B1C06CFE7952DA21EF85522E76BC7F704690C8477CFAD06`
- paired 5: `rank8_delta2_e2_pendant_paired5_far_bridge_long_cells_exact_20260820.json`, SHA-256 `EAFE7F410C6638E1692B276BC54A669314E56D07AFA62AA6806915C4A80063E4`
- paired 6: `rank8_delta2_e2_pendant_paired6_far_bridge_long_cells_exact_20260820.json`, SHA-256 `1E084D94BDA6AD11C965BB747EEA937F9A70636DEFA8F460D448645C285AE223`

The independent audit regenerates all 384 coverage keys and all 384 constant
coefficients from literal double-claw matching polynomials:

- `audit_rank8_delta2_e2_pendant_short_paired_far_bridge_long.py`
- source SHA-256: `D1559A3BD99553989C8728C0028626C68962FE0EBD761F03B91DC29DB4C4C5C7`
- report: `rank8_delta2_e2_pendant_short_paired_far_bridge_long_independent_audit_exact_20260820.json`
- report SHA-256: `67C6D7FC16821A40373D2BC258603E68F6BC4B93E51752BA569F3D20D0A1C3AB`
- status: `PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_SHORT_PAIRED_FAR_BRIDGE_LONG`

## Long-paired certificate and assembly

The paired-arm cell `7+B`, including every selected-arm/root position, was
already proved by:

- `rank8_delta2_e2_pendant_other_edges_long_root_position_cells_exact_20260820.json`
- SHA-256: `67DCD9E51D238DEDFDB29D51E4136E0542B46AB3D1073B8B2BD0DEE1E676F41D`
- independent audit report SHA-256: `AA143B4263215636C5E1984BC0295C4A6F7CFA385A777C8D0894550E22AB423C`

The fail-closed combined assembler is:

- `assemble_rank8_delta2_e2_pendant_root_side_arbitrary_far_bridge_long.py`
- source SHA-256: `A4F6E1ABD67F748858D2F99FFDD9C2FF1231272018F98BA58F9304C8554CD22D`
- report: `rank8_delta2_e2_pendant_root_side_arbitrary_far_bridge_long_exact_20260820.json`
- report SHA-256: `97FE974A2BF6B160F84A82F729DA7D319095291DA8FB42B5ACA46E16BAC95DF5`
- status: `PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_ROOT_SIDE_ARBITRARY_FAR_BRIDGE_LONG`

The assembler pins every primary and audit report, verifies all PASS statuses
and counts, and explicitly checks the short/long paired-arm union and the
near/tail no-gap union.
