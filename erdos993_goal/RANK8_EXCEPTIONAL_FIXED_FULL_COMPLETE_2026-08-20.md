# Rank-8 exceptional fixed/full cones: complete database theorem

Date: 2026-08-20

Status: **complete exact fixed/full theorem, independent no-gap audit, and read-only forest-lift integration.**

## Theorem

Adjoining any classified exceptional connected-tree jet to any rank-eight full factor in either exhaustive high or low cone preserves `Q8`.

The exact classification has 1,215 distinct exceptional jets at database indices 1--1215:

```text
alpha                 1   2   3   4   5    6    7    8   9
distinct jets         2   2   5  15  48  175  700  253  15
```

The first 947 jets, alpha one through seven, have fixed `Q8=0`.  The remaining 268 jets, alpha eight and nine, have negative fixed `Q8`.  Exact factorial convolution with each abstract full-factor cone and expansion of

```text
M8=q8^2-q7*q9-h*q7*q8
```

produced no negative symbolic coefficient for any jet in either mode.  Every expansion has minimum coefficient one.  Therefore every classified exceptional component can be adjoined to a full factor while preserving `Q8>=0`.

## Complete exact totals

| Mode | Jets | Terms | Negative coefficients | Minimum | Elapsed | Maximum peak private memory |
|---|---:|---:|---:|---:|---:|---:|
| high | 1,215 | 1,076,915,250 | 0 | 1 | 3,477.290452 s | 160,014,336 bytes (152.602 MiB) |
| low | 1,215 | 1,571,422,680 | 0 | 1 | 6,875.010364 s | 223,068,160 bytes (212.734 MiB) |
| combined | 2,430 | 2,648,337,930 | 0 | 1 | 10,352.300816 s sequential | 223,068,160-byte maximum |

The database was covered by 27 contiguous report partitions per mode, using fresh sequential processes, one worker, fail-fast coefficient assertions, and a 512 MiB gate.  The complete assembler and a separate audit independently verified:

- exact coverage of every index 1--1215 once in each mode;
- no gaps, duplicates, or alpha-band leakage;
- all 54 raw report hashes and all source hashes;
- the exact classification counts by alpha;
- exactly 268 negative fixed-`Q8` jets;
- 2,430 successful cone cases and 2,648,337,930 symbolic terms; and
- zero negative symbolic coefficients, minimum one.

## Terminal alpha-nine band

The final alpha-nine band contains exactly 15 jets, indices 1201--1215.  Their fixed `Q8` values range from -1548 to -181.  Both terminal reports passed:

| Mode | Cases | Terms | Elapsed | Peak private memory | Report SHA-256 |
|---|---:|---:|---:|---:|---|
| high | 15 | 13,295,250 | 42.919606 s | 160,014,336 bytes | `7A91480D2A2E3BF01DE1F8F39AD4A55A7AAF0FBF366F4D24AAEF9AE1966A25D6` |
| low | 15 | 19,400,280 | 85.140124 s | 223,068,160 bytes | `282D18FC66EEE1F094734BC8E82E90F1BFF6B544E31C0E8B23C6984DA0840FFF` |

There is no exceptional database row after index 1215.

## Read-only forest-lift integration

The fixed-exceptional/full dependency is now complete and removed from the rank-eight forest-lift dependency list.  No master theorem file was modified.

The remaining forest-lift inputs are exactly:

1. connected `Q8` for every tree with alpha at least 14;
2. lower all-forest gaps through rank seven, including forest `Q7`;
3. the rank-eight high/high, low/high, and low/low full/full cones; and
4. the exceptional-only first-crossing certificate for total alpha 14 through overshoot 22.

This result does not prove any full/full cone, first-crossing certificate, connected theorem, complete forest theorem, PGC conclusion, or Delta4 statement.  No full/full or first-crossing computation was started after completing this package.

## Principal SHA-256 values

- `rank8_exceptional_tree_jets_exact_20260820.tsv`: `B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A`
- `rank8_exceptional_tree_jets_exact_20260820.json`: `BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4`
- `verify_rank8_exceptional_fixed_full.py`: `6777296E01B957F426284B6F2C488ED8005030F1C8C14837DE028B35D1AF48BE`
- `assemble_rank8_exceptional_fixed_alpha9.py`: `9ED7E07800CFFE1FCFB6AAC4E3EF1269EC35A61F1975DF575558BCC636B11B94`
- `rank8_exceptional_fixed_alpha9_independent_assembly_exact_20260820.json`: `BB363406FFD84C24F325A388CA80D6077E2A349FAAF280D297465DC8F2C200C9`
- `audit_rank8_exceptional_fixed_alpha9_assembly.py`: `B46DF6E1F233162BAD5767D28CED11CE3624A66C1E3DE273D363A6CC489B458D`
- `rank8_exceptional_fixed_alpha9_independent_audit_exact_20260820.json`: `9E4D2B04061656A61BC6FB5224018DA8FB93AF7574A20DD8FF7EDF348B5A4249`
- `assemble_rank8_exceptional_fixed_complete.py`: `DE38A44E859E742CC33DE7A6D1A486473B2517F8E6B312C111DF060569F1C89C`
- `rank8_exceptional_fixed_complete_independent_assembly_exact_20260820.json`: `8AF12AD943826514C5385E9B3C292CB5F1B8EEBDCB45CDEFE466039C4FCCA1D7`
- `audit_rank8_exceptional_fixed_complete_assembly.py`: `8ED3D2969DBC831B18F8E0AC62674835B7587C10C537E4D7170D698491016437`
- `rank8_exceptional_fixed_complete_independent_audit_exact_20260820.json`: `7D1413892381A9E888884AAFC57FB8A12C68A7CFB0762206EF3C9B0D251703D2`
- `audit_rank8_forest_lift_fixed_complete.py`: `77D7F237792BF82458885CB58F1D738129A6CDDE1A37275E219442DCE2407BCE`
- `rank8_forest_lift_fixed_full_complete_integration_exact_20260820.json`: `591A2793682BF79D0E1241258DB1F0F385B94219577FDFC00C3705DA3FA6E2EF`
