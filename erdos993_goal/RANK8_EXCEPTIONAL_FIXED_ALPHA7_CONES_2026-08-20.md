# Rank-8 exceptional fixed/full cones: alpha = 7

Date: 2026-08-20

Status: **exact theorem, complete alpha-seven classification coverage, independent no-gap audit, and read-only forest-lift integration.**

## Theorem

Adjoining any exceptional connected-tree jet with independence number seven to any rank-eight full factor in either exhaustive high or low cone preserves `Q8`.

The exact exceptional-jet classification contains 700 distinct alpha-seven jets and places them consecutively at database indices 248--947.  Every such jet has degree exactly seven, zero coefficients in ranks eight and nine, and fixed `Q8=0`.  Index 247 has alpha six and index 948 has alpha eight.

For each jet, factorially scaled convolution with the abstract high and low full-factor parametrizations was formed through rank nine and the exact rank-eight margin

```text
M8=q8^2-q7*q9-h*q7*q8
```

was expanded.  Every coefficient in every expansion is nonnegative, with minimum coefficient one.  Since `M8` has the same sign as literal `Q8`, this proves the stated preservation theorem for the complete alpha-seven band.

## Exact totals

| Mode | Jets | Terms | Negative | Minimum | Elapsed | Maximum peak private memory |
|---|---:|---:|---:|---:|---:|---:|
| high | 700 | 620,445,000 | 0 | 1 | 1,990.577897 s | 158,867,456 bytes (151.508 MiB) |
| low | 700 | 905,346,400 | 0 | 1 | 3,956.495520 s | 218,820,608 bytes (208.684 MiB) |
| combined | 1,400 | 1,525,791,400 | 0 | 1 | 5,947.073416 s sequential | 218,820,608-byte maximum |

The computation used fourteen contiguous 50-jet shards, one worker, a fresh process for each mode/shard, fail-fast coefficient checks, and a 512 MiB post-run gate.  Every shard passed.  The independent assembler verified that the 28 reports cover each index 248--947 exactly once and that all report hashes, source hashes, row signs, term counts, alpha labels, and fixed `Q8` values agree.

## Shard report SHA-256 values

| Shard | Indices | High report SHA-256 | Low report SHA-256 |
|---:|---:|---|---|
| 1 | 248--297 | `D6D34C16E6A094371A480C71919B60C79B6FF134B032FC39C1F466862487B554` | `B29BE7D846F4AFBE075E2CF53D3FF60FE03C3CD1649B6DB1E51D353F9549445F` |
| 2 | 298--347 | `334BF01B4713406AEE92E65FDDF3829EC4EA51237D5D48AA1C99BA1D87662EA3` | `14900F84E4348E7C03101E79DD96E40B909F3AE143C211C62A8C6D35963E0B18` |
| 3 | 348--397 | `AA0CCF45DEFDB609371CBC6946307BB41AE5AE58AAD3C0C6EF9ED204D77B56F4` | `D6F78F9D6341FA37F0E4A7BC486BF6F7D5093D2C8216561E71DB0F393076FDBB` |
| 4 | 398--447 | `2A1118FA6E42173139DF739E20ED005E2DF44ECD06DE36D761E84F0BA6EE0D23` | `EC15752F102F8C360AE97FF276F3292B095B17D709EB8742D6889410E068FF47` |
| 5 | 448--497 | `2BCFE1D2A956A8755A235B2D47EF4BC71ACD29AE735C2C54BF98F9A0DF6B364E` | `973432B1C44CCB9D4427654F62D14577F84AC5498B657E082AA05CBE1D07D652` |
| 6 | 498--547 | `CE826748C58DA0932423BBE862F6674B3FA39CEE15685FF8DAE9D91936B40083` | `45D817EF40CC676057CCD93EF280F92AC588069DAAA03CAF3AA37DCA5ED541B8` |
| 7 | 548--597 | `A5457E481BB512B73F45BE946EC78C7D604E2C46413F6EE4AF015BD902C41145` | `A64EFE6EC37B0A68953711B07610EA07E2F6060AA468AAA2C2B2E63D321145B1` |
| 8 | 598--647 | `779AA94B19192004BD0B65CC5A54530D548AF4A31670DA9FAD2816C12541679D` | `87D296504F833B7E1624010E98C8ED3F059ACBE528742A8B0C7E2E28BA1E26F9` |
| 9 | 648--697 | `CE266F0380C706BE7FF1BC66013A3AD993BBCD441727DBF465D7B5BA49431EF6` | `B1DA9F98E0AC5CA2E751C5F048A397821727650B9AAB30ABB7A8630A8BC997A7` |
| 10 | 698--747 | `EF94C608D9A5C9C03D1B17BC32AF2BCB79A3BEA6665B68C3FEEA39870D51ED28` | `AC5DD6707472A7E5BA330E1E259ECDF6D72E3C0D3AD335724CA59B39030F3F98` |
| 11 | 748--797 | `A609C1022A93260A1D444615D2F1B67C3EB271D6BDA205866FCC55DF4EB9E737` | `E8448F8D910ADF261AD71323B8E333BF9DDA5D8B2BB1CA883B2D856AE53BE58B` |
| 12 | 798--847 | `FDBB1E77E03FD2831EDFB54B789060567E42E704A8F577C4F7775750D3FD9DED` | `16ECEE685617CE11A011C21CE25566B73EF9CA47F4D4B8F66995A585E356B610` |
| 13 | 848--897 | `95B9F705F3E5602DA034C7CFD149C87371D255D0A6EB96089CE0F5F7B7BB8351` | `D4E5B1730358B7B5514519150F12D009B22BC40AFF0F6AD8C89B1D73C7DA7F7B` |
| 14 | 898--947 | `8509D2C36DC1C08E19A1AEA70E23AF9C478896209E8DB39A08EDD78DEFDE57AC` | `5C5BE2E684DBB04A9F2DBAD4EB1A9E04931E292DFF547BCA63A63BBFD3B36FD1` |

## Read-only forest-lift integration

The integration audit reads, but does not modify, the existing forest-lift reduction and the alpha-one through alpha-six certificates.  Together with this theorem, fixed/full preservation is now closed for exactly the first 947 exceptional jets, all alpha bands one through seven, in 1,894 fixed-cone cases.

The remaining fixed/full obligation has exactly 268 jets: 253 at alpha eight and 15 at alpha nine, database indices 948--1215.  These are exactly the distinct exceptional jets with negative fixed `Q8`.

The complete forest lift still independently requires:

1. connected `Q8` for every tree with alpha at least 14;
2. lower all-forest gaps through rank seven, including forest `Q7`;
3. all three rank-eight full/full cones: high/high, low/high, and low/low;
4. fixed/full preservation for the remaining alpha-eight and alpha-nine jets; and
5. the exceptional-only first-crossing certificate for total alpha 14 through overshoot 22.

No connected theorem, complete forest theorem, PGC conclusion, full/full cone, first-crossing result, or Delta4 result is claimed here.

## Principal SHA-256 values

- `rank8_exceptional_tree_jets_exact_20260820.tsv`: `B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A`
- `rank8_exceptional_tree_jets_exact_20260820.json`: `BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4`
- `verify_rank8_exceptional_fixed_full.py`: `6777296E01B957F426284B6F2C488ED8005030F1C8C14837DE028B35D1AF48BE`
- `assemble_rank8_exceptional_fixed_alpha7.py`: `F7074432828F06C026A26543E9C476AF9500CB4F668CB1639C3F92FD65527A82`
- `rank8_exceptional_fixed_alpha7_independent_assembly_exact_20260820.json`: `00CB17A7F06A7A6AB23C2839F6F19AFF8C812A45252EA02D827230E06CC39867`
- `audit_rank8_exceptional_fixed_alpha7_assembly.py`: `0C2EBFEBA508FC207532A66B125343897091D6C4F208B10C9B5FA17485B28DE2`
- `rank8_exceptional_fixed_alpha7_independent_audit_exact_20260820.json`: `90D30B2CD476B35104797B19A55BDABEC6FD2AC280B4E4F7A78C3C5AA343E5C9`
- `audit_rank8_forest_lift_fixed_progress_alpha7.py`: `7A6345C67DED20FE0700E8831EA6CA9DAA06DFD0999B1AE6FD6042519BEF35AA`
- `rank8_forest_lift_fixed_progress_through_alpha7_exact_20260820.json`: `05D534B625E3DD2F9F71CCF7D146C9E7F981027BEBA012E36019FCE36B07A562`
- `rank8_forest_lift_lane_independent_audit_exact_20260820.json`: `6DC960E80727BF64941C9F0C02AC37E459F5444DB986DD780B8A22829F371FA0`
