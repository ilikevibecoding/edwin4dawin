# Rank-eight Delta2: pendant roots, arbitrary bridge, two long far arms

Date: 2026-08-23

Status: **PASS in the stated all-order scope.**

## Theorem

Let `A` be a degree-surplus-two tree, hence a double claw, of order `n>=23`.
Root `A` at any vertex of a selected pendant arm.  If both arms at the far
branch have length at least seven, then

```text
Delta2 R_1(A,q) > 0
```

for every positive central-bridge length, every selected-arm length and root
position, and every positive paired-arm length.

## Exact bridge partition

The positive bridge lengths are partitioned without a gap:

- bridge `1` is the independently audited bridge-one theorem;
- bridges `2,...,7` are the new six-bridge exact package; and
- bridges `>=8` are contained in the existing bridge-long theorem, which in
  fact allows all far-arm lengths.

For each bridge in `2,...,7`, the paired arm is split into `1,...,6,>=7` and
the selected near/tail lengths are independently split into `0,...,6,>=7`.
This gives 448 state patterns per bridge and 2,688 total symbolic cells.  All
2,688 cells have strictly positive constants and zero negative coefficients.

Whenever a base state has order below 23, the admissible offset-sum condition
is covered by shifted orthants: if `k` nonnegative compressed offsets sum to
at least `d`, one is at least `ceil(d/k)`.  The independent audit reconstructs
the complete state/shift universe and all 2,688 literal tree-DP constants.
The global coefficient minimum is

```text
1 / 121927680000.
```

## Scope guard

This theorem covers pendant roots with both far arms at least seven.  For
bridges at most seven, a short far arm remains outside this theorem until its
separate state package is sealed.  Non-pendant roots, the other connected
residual families, the forest lift, rank-eight PGC, and Problem 993 remain
separate.

## Frozen hashes

```text
Bridge-one independent audit report
  rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary_independent_audit_exact_20260821.json
  6664B9D08C7C7BE3DE5EFD3FAD0F6700A44190272AD9813B07CC5FD9972489BE

Bridge-long all-arm-length assembler report
  rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json
  FFD224DEDDA5E15EE586B598F065F522F793464DBA8EC2E6209931BED6EA36A9

Bridges 2..7 primary source
  run_rank8_delta2_e2_pendant_fixed_bridge_far_long_root_side_arbitrary_cells.py
  4926057DC1A4AB503694B9D19457D89E1B3FA125DA0DD656A5286563CF0BE597

Bridge 2 report
  D3D86B63CB0225EB41DB344E2309E1D57DC3639611D8F9BA4B3CD1200C145DC1
Bridge 3 report
  DFF57E8C6C0E3E1B7CA2F6A9A438CB9A7F6D9AF0D15DAF4AF194025582BE1F06
Bridge 4 report
  A520D6C09960C0CA93DE0A70CBBE492B15727DAC90DDBD8F60863DB008657EF3
Bridge 5 report
  C58AF5128BC654FF517C4EFBFCF5F099D60E70E586C4C6B26614D48EA3AE10A4
Bridge 6 report
  2240045AEFD4692028A8C05D810F67D934F4D9D872B97376963B00B1C158974E
Bridge 7 report
  474D246EE8FB740CE5BB0FB87C0CC5B7EF4918AFEE8FC880AB623ED28BCCF52D

Independent aggregate audit source
  audit_rank8_delta2_e2_pendant_bridges2to7_far_long_root_side_arbitrary_root.py
  19B8F91710D471C2D4B9110D3AB89CFEE0A20BC91818178F105692E54667623E
Independent aggregate audit report
  rank8_delta2_e2_pendant_bridges2to7_far_long_root_side_arbitrary_independent_audit_exact_root_20260823.json
  7DCFBB50A91E9780F70CA7DF1D28FB6B884816B07D4F7B3BD9D2A5E06C8D7254
```
