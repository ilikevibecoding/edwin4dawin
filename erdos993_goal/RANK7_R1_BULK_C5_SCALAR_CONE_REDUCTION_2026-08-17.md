# Rank-7 r=1 bulk-c5 scalar-cone reduction (2026-08-17)

## Status

Reduction and exact no-go, not a positivity theorem.

The exact weighted-positive-core table for `n=23`, root degree `r=1`, and
`B2>=30` was independently replayed byte-for-byte.  It contains 520 excess
partitions, 4,569,336 shape-assignment pairs, 656 `(B2,x)` profiles, and
31,029 attainable integer `c4` rows.  A stored-witness audit passes every row.

The table was injected into the root-conditioned scalar cone so that an
unlisted integer `c4` is discarded as impossible and each listed row uses its
exact minimum `c5`.  A deterministic boundary scout over all 798 feasible
`n=23,r=1` profiles, both `b` endpoints, both `c4` endpoints, all `U,V,Z`
corners, eleven `A` grid points, and Newton ranks `Delta0..Delta6` made
1,965,040 evaluations.  `Delta1..Delta6` were positive throughout.  The scout
still found a negative `Delta0` point.

## Exact remaining obstruction

The surviving point is

```
n=23, r=1, B2=35, x=4,
c4=5331, c5=14568,
U=0, V=0, Z=1, A=0,
a=3078, b=52326/5.
```

The exact bulk row is witnessed by excess partition
`(8,4,2,1,1,1,1,1,1,1)` and has `B3=60`, `E=104`, and connected-four motif
`V=622`.  With the independent scalar V6-lower and V7-upper endpoints,

```
c6 = 555001952/23101,
c7 = 120454016149392/3735593407,
Delta0 =
-38428323014023417199786183895810816
 / 1423944704328762005 < 0.
```

Every retained scalar interval is checked exactly by the replay.  This is not
a tree counterexample: `c6` and `c7` were relaxed independently of the same
weighted core that forces the exact `c5` row.  The next exact layer is therefore
the direct independence-polynomial DP census on each feasible weighted core,
including the rooted `H=A-q` data, rather than another free scalar ratio box.

## Artifacts and SHA-256

- Bulk enumerator: `enumerate_rank7_r1_high_correlation_bulk.py`
  `BDEDCA8E5ED7A685123810BED86F4C468AC49490FADE243432F22EB12BB7ABD3`
- Primary bulk JSON and independent replay JSON (byte-identical):
  `6DDFD4F96D3040BD22F4387EC172FD2B9111D40BB427E0582E82E46519E5ADC3`
- Bulk stored-witness verifier: `verify_rank7_r1_high_correlation_bulk.py`
  `7F661436A8E00AC15D88972E9B5D6110B607E666E5CE79924BB91D9CE02D3239`
- Bulk-aware cone implementation: `probe_rank7_root_conditioned_joint_cone.py`
  `2E1551769100CC0E40265961BB5A00B80703EB8FB295763C2A717A8574EF674F`
- All-rank boundary scout: `scan_rank7_root_conditioned_r1_corners.py`
  `DAFAAB6C5F50EC5FA606AC1D56D6B542274D3155612F3A8295EC7D53C6ABD59E`
- Exact obstruction replay: `verify_rank7_r1_bulk_c5_scalar_cone_obstruction.py`
  `E5A480900A6C708739C4AF13A65747B6FA800AEF39E9837AE0BAAC8EFB8542A2`
- Exact obstruction JSON:
  `F512FE9F61A3CFFF3C8EC5F29E3A9994CD7A433272C044D165705CE833AED169`

The exact obstruction replay was freshly run successfully.  No claim in this
note depends on the numerical scout for exact negativity; the scout only
locates the point that the exact replay then certifies.
