# Rank-8 exceptional fixed/full cones: alpha = 6

## Result

`PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA6_BOTH_FULL_CONES`

All 175 distinct exceptional connected-tree jets with alpha = 6 preserve `Q8` after convolution with either abstract full-factor cone (high or low).  The exact coefficient scans found zero negative coefficients and minimum coefficient 1 in every case.

This closes precisely database indices 73--247.  The independently parsed jet table has alpha = 5 at index 72 and alpha = 7 at index 248, so the alpha = 6 interval is complete and has no gap.  All alpha = 6 jets have degree exactly 6 and fixed `Q8 = 0`.

## Exact scan totals

| Mode | Jets | Terms | Negative | Minimum | Elapsed | Peak private memory |
|---|---:|---:|---:|---:|---:|---:|
| high | 175 | 155,111,250 | 0 | 1 | 511.623147 s | 158,527,488 bytes (0.147640 GiB) |
| low | 175 | 226,336,600 | 0 | 1 | 986.634801 s | 210,100,224 bytes (0.195671 GiB) |
| combined | 350 | 381,447,850 | 0 | 1 | 1,498.257948 s sequential | 210,100,224-byte maximum |

The first 247 of 1,215 exceptional jets are therefore closed in both fixed/full modes (all alpha = 1 through 6).  The remaining fixed/full obligation contains 968 jets.

## Stop point and alpha = 7 projection

Alpha = 7 was not launched.  It contains exactly 700 jets, indices 248--947, hence four times the alpha = 6 case count.  At the observed alpha = 6 rates, the empirical sequential projection is:

- high: 2,046.492588 seconds (34.108210 minutes);
- low: 3,946.539203 seconds (65.775653 minutes);
- both: 5,993.031791 seconds (99.883863 minutes).

If the already observed per-jet symbolic-support counts continue unchanged, the corresponding work tally would be 620,445,000 high terms plus 905,346,400 low terms, or 1,525,791,400 terms total.  This is a linear workload projection only; it is not a coefficient certificate and it does not assert unmeasured alpha = 7 memory.

The best next bounded subdivision is fourteen contiguous 50-jet shards, run sequentially by mode and assembled with an independent no-gap audit:

`248--297, 298--347, 348--397, 398--447, 448--497, 498--547, 548--597, 598--647, 648--697, 698--747, 748--797, 798--847, 848--897, 898--947`.

At the measured alpha = 6 rate, each 50-jet shard projects to 146.178042 seconds high plus 281.895657 seconds low (428.073699 seconds, or 7.134562 minutes, sequential).  Starting a fresh process for each mode/shard bounds retained report rows and preserves stop-at-first-obstruction behavior.  The measured alpha = 6 peaks leave 915,214,336 bytes of high-mode and 863,641,600 bytes of low-mode headroom below 1 GiB, but the first alpha = 7 shard must still measure and enforce the cap rather than assume it.

## Scope

This certificate closes only the alpha = 6 exceptional fixed/full high and low cones.  It does not close alpha >= 7 fixed/full, any full/full cone, connected `Q8`, the complete forest lift, exceptional first crossing, or any Delta4 obligation.  No full/full or Delta4 computation was run.

## SHA-256

- `rank8_exceptional_tree_jets_exact_20260820.tsv`: `B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A`
- `rank8_exceptional_tree_jets_exact_20260820.json`: `BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4`
- `verify_rank8_exceptional_fixed_full.py`: `6777296E01B957F426284B6F2C488ED8005030F1C8C14837DE028B35D1AF48BE`
- `rank8_exceptional_fixed_high_exact_20260820_range_73_247.json`: `F452BA75463E13AAFCDA6F64FEDF92631A8282FC4E1EBA1CBBC92721E14A4553`
- `rank8_exceptional_fixed_low_exact_20260820_range_73_247.json`: `E93C14BC147B318D5543B0CD0CCD0DBE92E7712908A2CAEDC5E3178D7D48E6E5`
- `audit_rank8_exceptional_fixed_alpha6.py`: `6BCCA4846F6576EBD2A289D740CC2EFDA81BEE50DC12BBBFB762BBDAA6067067`
- `rank8_exceptional_fixed_alpha6_independent_audit_exact_20260820.json`: `0F95340AA487BA20AA2D6905953328B7BEE43025CCA05607D3652D9B4B7670A6`
