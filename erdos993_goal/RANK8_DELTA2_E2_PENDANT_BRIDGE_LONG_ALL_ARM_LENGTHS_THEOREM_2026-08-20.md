# Rank-8 Delta2: pendant roots, bridge long, all arm lengths

## Theorem

For every order `n>=23`, the rank-8 terminal-broom Delta2 coefficient is
strictly positive for every pendant-rooted e=2 double claw in which:

- the selected arm has arbitrary positive length and the root is any vertex
  on it;
- the paired arm has arbitrary positive length;
- both far-branch arms have arbitrary positive lengths;
- the central bridge has length at least 8.

This is an all-order theorem in the stated scope. Central bridges of length at
most 7 and non-pendant root types remain outside it.

## Final paired-arm-long state

The last paired-arm state is parameterized as length `7+B`. When the selected
near segment is also long, the primary polynomial uses the exact coupled
coordinate `X` rather than separating `B` and the near offset. The selected
near/tail positions are split into `0,...,6` or long, and the `n>=23` order
condition is covered by an exact finite union of shifted `X/B/U/G` orthants.

For each of the 21 unordered short-far pairs `1<=f1<=f2<=6`, the one-worker
fail-fast primary run completed all 64 root-position patterns. The 21 reports
contain 1,344 patterns and 1,368 positive shifted symbolic cells, with no
signed cell.

Primary source:

- `run_rank8_delta2_e2_pendant_far_pair_paired_cell.py`
- SHA-256: `FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5`

Independent audit:

- `audit_rank8_delta2_e2_pendant_two_short_far_pairedlong.py`
- source SHA-256: `904566AE18F822E29C5AE68367A9501446EAA1B309ECB531663F765B5E31828E`
- report: `rank8_delta2_e2_pendant_two_short_far_pairedlong_independent_audit_exact_20260820.json`
- report SHA-256: `D58BFD30999EE36F2E3590DE115B9B1E891948488FC09CE30A3938229687C33F`
- status: `PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIREDLONG`

The audit independently regenerates all 21 triangular far-pair keys, all
1,344 near/tail keys, every coupled-coordinate order-cover cell, and all 1,368
constant coefficients from literal double-claw matching polynomials.

Paired-long arbitrary-far assembler:

- `assemble_rank8_delta2_e2_pendant_pairedlong_bridge_long_all_far.py`
- source SHA-256: `BD33A6C6DCC6441B0E795433CC62894D6686EE13BEFF4C0747A303CD121ADFF4`
- report: `rank8_delta2_e2_pendant_pairedlong_bridge_long_all_far_exact_20260820.json`
- report SHA-256: `190FF084CF1C0602C259F10F1E1003A771F749655C884FE1FD4F515B2A78B53E`
- status: `PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_PAIREDLONG_BRIDGE_LONG_ALL_FAR`

It uses the 21 new two-short-far cells when both far arms are at most 6 and
Section 109.91 when at least one far arm is at least 7. These two cases cover
every positive unordered far-arm pair.

## Full paired-arm and far-arm assembly

Every positive paired-arm length lies in exactly one of the seven states
`1,2,3,4,5,6,>=7`. The first six are the sealed Section
109.92/109.94/109.97/109.99/109.100/109.101 packages; the last is the new
parameterized package above. Each state covers every positive far-arm pair.

Pinned paired-state reports:

- paired 1: `4AA5057A376568698835A5D7008BD0113BC1DD04E8029A1ACCC40913DA42C157`
- paired 2: `D0FF4A8FE5ABADD6CEE8086EEC6A062EF35DA02AD85E73687A6D242E7032299A`
- paired 3: `94C19BFD4DECA62500076DE88CAC5AE67F45B6151E0F0AF6D67435D7B70DDCD7`
- paired 4: `A9C03E619E65FBE88E5EA12488C2EF993353A103EF7B4C4B2A86BDA4AA494C3B`
- paired 5: `95FDC12AD3AC40260D825EB7AC692C92C62309F461EF7AE084DCF079DEE609F4`
- paired 6: `260A97A115C400EDAFBA36086A4CFCD04E790B0F18F23254D1BA5D05709F8CA3`
- paired `>=7`: `190FF084CF1C0602C259F10F1E1003A771F749655C884FE1FD4F515B2A78B53E`
- Section 109.91 common far-arm dependency: `383E5F9652595CA14F8596D22E4B7D251F066FDF836DE78CF7DF236724BF5266`

Full fail-closed assembler:

- `assemble_rank8_delta2_e2_pendant_bridge_long_all_arm_lengths.py`
- source SHA-256: `3192F9F2EACC52AFCD861759F0BC105B6C5C9B82B2BB85B4EE80469F057A42B2`
- report: `rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json`
- report SHA-256: `FFD224DEDDA5E15EE586B598F065F522F793464DBA8EC2E6209931BED6EA36A9`
- status: `PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_BRIDGE_LONG_ALL_ARM_LENGTHS`

The assembler pins every source/report dependency and fails closed unless all
seven paired states and the common far-arm union are strictly positive.
