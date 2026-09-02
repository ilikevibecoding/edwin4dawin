# Rank-8 exceptional fixed/full cones: alpha = 8

Date: 2026-08-20

Status: **exact theorem, complete alpha-eight coverage, independent no-gap audit, and read-only forest-lift integration.**

## Theorem

Adjoining any exceptional connected-tree jet with independence number eight to any rank-eight full factor in either exhaustive high or low cone preserves `Q8`.

The exact exceptional-jet classification contains 253 distinct alpha-eight jets, consecutively at database indices 948--1200.  Every jet has degree exactly eight and negative fixed `Q8`, ranging from -160 to -1.  Index 947 has alpha seven and index 1201 has alpha nine.

For each jet, factorially scaled convolution with both abstract full-factor cones was formed through rank nine and the exact margin

```text
M8=q8^2-q7*q9-h*q7*q8
```

was expanded.  Every coefficient in every resulting margin polynomial is nonnegative, with minimum coefficient one.  This is a universal cone-preservation statement: the fixed components themselves have negative `Q8`, but adjoining them to a full factor remains inside `Q8>=0` throughout either full-factor cone.

## Exact totals

| Mode | Jets | Terms | Negative coefficients | Minimum | Elapsed | Maximum peak private memory |
|---|---:|---:|---:|---:|---:|---:|
| high | 253 | 224,246,550 | 0 | 1 | 721.891967 s | 159,461,376 bytes (152.074 MiB) |
| low | 253 | 327,218,056 | 0 | 1 | 1,428.936074 s | 221,319,168 bytes (211.066 MiB) |
| combined | 506 | 551,464,606 | 0 | 1 | 2,150.828041 s sequential | 221,319,168-byte maximum |

The run used five 50-jet shards plus a final three-jet remainder, one worker, a fresh process for every mode/shard, fail-fast coefficient assertions, and a 512 MiB post-run cap.  The independent assembler and separate audit verify that every index 948--1200 occurs exactly once, all 253 fixed `Q8` values are negative, all symbolic margin signs are nonnegative, every report hash matches, and no alpha-nine row is present.

## Shard report SHA-256 values

| Shard | Indices | High report SHA-256 | Low report SHA-256 |
|---:|---:|---|---|
| 1 | 948--997 | `154183E99240E6BA556E986A3B4E38D2CA1F47D8FF1D0EEC0F71F297F0F081DD` | `2BAC58700438B447E58294E8ABF666C80031EFCEEEFC9FAE5840951B6E988E36` |
| 2 | 998--1047 | `76164B21AD67E236C07C2619BCB8791B51C99B8BDF78062BC101C1B146A6F392` | `F08A8AA3461549E2269585A3B8B2B6B6A1D280F8215C484DDF49383EE3EA5977` |
| 3 | 1048--1097 | `338C90C72A461E5442DF74A9051230B00DA95AF294DD78F4222B23463BF32867` | `D018AA125E749DF20514B0882138910BAA9B2F752AD42D6C8FF135FAEEEA60A0` |
| 4 | 1098--1147 | `601F86274A20A46D3A7C4DC47883E8F175D124814ABEA86CF48AF6BC185E2185` | `E4A87E55468DFFEEFF28266435A2257B0EBB1F7E8654A46D174DF795B8A6DC49` |
| 5 | 1148--1197 | `BC737E4320B6A4BFB0B2ED58C0C58A0EB562F4D0636841129B2D240762786136` | `B7E099889B3514AB0F377B292CEC6B2528E2884C4CBE485AFB57CE4784F13A50` |
| 6 | 1198--1200 | `206C413BA0C1A4D7C8C0D0B2E9008D0BE32256B2E952FE3ED8A6F75EBA97E4CD` | `74A1D506F4DD2078F409C21B04E7DDE4C7E87278C46AAB0E0F79B45858FAC11A` |

## Read-only forest-lift integration

Fixed/full preservation is now closed for exactly the first 1,200 exceptional jets, all alpha bands one through eight, in 2,400 fixed-cone cases.  The only remaining fixed/full band contains the 15 alpha-nine jets at database indices 1201--1215.  No alpha-nine computation was started.

The complete forest lift still independently requires:

1. connected `Q8` for every tree with alpha at least 14;
2. lower all-forest gaps through rank seven, including forest `Q7`;
3. the high/high, low/high, and low/low rank-eight full/full cones;
4. fixed/full preservation for the 15 alpha-nine jets; and
5. the exceptional-only first-crossing certificate for total alpha 14 through overshoot 22.

This result does not prove any full/full cone, first-crossing certificate, connected theorem, complete forest theorem, PGC conclusion, or Delta4 statement.

## Principal SHA-256 values

- `rank8_exceptional_tree_jets_exact_20260820.tsv`: `B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A`
- `rank8_exceptional_tree_jets_exact_20260820.json`: `BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4`
- `verify_rank8_exceptional_fixed_full.py`: `6777296E01B957F426284B6F2C488ED8005030F1C8C14837DE028B35D1AF48BE`
- `assemble_rank8_exceptional_fixed_alpha8.py`: `3F05CD641F6F343836F6A8380229D713675548290A63A50FE999022147EADE5E`
- `rank8_exceptional_fixed_alpha8_independent_assembly_exact_20260820.json`: `E502D566B4108DE517101B7CFEA5503ECCE033611AA886FE84501D784E294C8C`
- `audit_rank8_exceptional_fixed_alpha8_assembly.py`: `ED41E68D7807C25F9DA80820A572329E53F3F4FC9C9837CBDCDF4569D1438DD6`
- `rank8_exceptional_fixed_alpha8_independent_audit_exact_20260820.json`: `AFB0F167F26CA01EA5A61A6199045E61EABC11607DAB0712AF3010184D8BA22A`
- `audit_rank8_forest_lift_fixed_progress_alpha8.py`: `374E1C9212B83531A89B1CF9DC75BD2E35120690034C9FC5BEAC150F03F4800F`
- `rank8_forest_lift_fixed_progress_through_alpha8_exact_20260820.json`: `EB208F200DF264ACA7ACBCC2F5D0EB998EBE7A07BDC6C6A62D652E41BFA0F57F`
