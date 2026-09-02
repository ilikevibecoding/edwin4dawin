# Rank-eight exceptional first-crossing terminal-alpha-five complete package

Date: 2026-08-20

Status: **exact no-gap PASS for every terminal-alpha-five first-crossing cell,
with independent bidirectional database audits.  This stops before terminal
alpha six.**

## Exact no-gap coverage

At threshold 14, a terminal-alpha-five first crossing has source alpha

```text
14-5 <= source alpha <= 13,
```

so the exact finite source set is `9..13`, with crossing totals `14..18`.
The sealed pilot covers source nine; the remaining database covers sources
10 through 13.  These partitions are disjoint and exhaustive.

```text
source total raw multisets canonical keys products multiset->key key->product
   9    14      107,784          89,865     74,384      17,919       15,481
  10    15      225,208         180,725    145,976      44,483       34,749
  11    16      444,416         339,587    267,050     104,829       72,537
  12    17      890,360         664,641    517,716     225,719      146,925
  13    18    1,773,184       1,273,768    975,902     499,416      297,866
total        3,440,952       2,548,586  1,981,028     892,366      567,558
```

Every cell's independent exponent enumeration reconstructed its exact
canonical key and product tables.  Bidirectional relational comparisons found
no missing or extra key in any cell.  Collision counts are equivalence
compression of identical retained jets, not omissions.

## Exact signs

```text
source minimum Q8       maximum Q8
   9      9,324,000          645,593,485,824
  10     36,793,980        2,753,834,927,616
  11    137,591,412       10,290,032,194,464
  12    469,686,491       34,447,332,254,720
  13  1,431,102,816      105,099,639,472,256
```

All 2,548,586 canonical checks are strictly positive: negative count zero and
zero count zero.

## Partial-state closure

Both recurrence runs independently produced the same complete 72-type state
closure:

```text
alpha   0  1  2  3  4   5   6   7    8    9   10    11    12    13
states  1  2  5 13 38 117 222 500 1131 2591 5677 10545 21607 43731
```

There are 86,180 distinct partial jets, versus an exact raw-multiset upper
bound of 121,152.

## Resources

All runs used one worker.  The recurrence shards together took
47.93144719989505 seconds; their maximum private-memory peak was 91,578,368
bytes (87.3359375 MiB).  Their maximum conservative projection was 258,517,458
bytes (246.54146003723145 MiB).

The independent audits together took 187.328980299877 seconds.  The largest
source-13 audit peaked at 498,745,344 bytes (475.640625 MiB), which is
4,571,136 bytes below the 480 MiB abort threshold and 38,125,568 bytes below
the 512 MiB hard cap.  This was a tight but valid gate pass.  No resource
checkpoint or sign obstruction was produced.

## Scope

This completes the terminal-alpha-five band only.  Terminal-alpha bands six
through nine, the full/full cones, connected `Q8`, lower all-forest gaps, and
the remaining forest/PGC integration dependencies are not proved here.

## Principal exact hashes

```text
rank8_exceptional_first_crossing_alpha5_s9_exact_20260820.json
50E77D5AE729305D2C143DE41D4DED44B93360DF144F14F9CD5374795A7B1602

rank8_exceptional_first_crossing_alpha5_s9_keys_exact_20260820.sqlite3
7EC06FD049800337E4BAE0F541E64DF3BB621CFECE2B82B439B3E97038CE4D29

rank8_exceptional_first_crossing_alpha5_s9_audit_exact_20260820.json
10FE563C52BF947E9DEAC75F6446296141A4C7CBE4C1F8F086D8646DFC26B1CF

probe_rank8_exceptional_first_crossing_alpha5_s10_13_exact.py
2A68A7AA5C9C01F7C5BFC7EC189A1E47AFF842A1A200F879D627F25C63956B80

rank8_exceptional_first_crossing_alpha5_s10_13_exact_20260820.json
958CE23EE1D82E5F3707528C5D01FFC476F79CC7574F3395E3C537126D1032DA

rank8_exceptional_first_crossing_alpha5_s10_13_keys_exact_20260820.sqlite3
40422283E868BC3C772BFA3514D3B151603AE5D171231AABEB33BF2787B15D84

audit_rank8_exceptional_first_crossing_alpha5_s10_13.py
558F5E43C7B15D4D3DB392006B09C8F845410239911CD7F8CF4A3129F4207FCF

rank8_exceptional_first_crossing_alpha5_s10_13_audit_exact_20260820.json
74AA0DB2CD5E756C62AB52E1CD5DD8CB4A100C38C1132398FA5A5AC46156BF87

assemble_rank8_exceptional_first_crossing_alpha5.py
EC95DCD8769394A19860DD1ECA327B8D09F3F341190A34219BCA4544EC69163E

rank8_exceptional_first_crossing_alpha5_complete_assembly_exact_20260820.json
067E8986AC825027D65F22B9E4595A63BC1C5A5D4DC3795C17CCBCD9A39C775F

audit_rank8_exceptional_first_crossing_alpha5_assembly.py
62DBA6FE59B2AFBCCB2EFDF49917EE138031EF0C090796270B159BF3596C5318

rank8_exceptional_first_crossing_alpha5_complete_assembly_audit_exact_20260820.json
E48B9770ABF4BE1500E1FDC34B653BBBE518F96BEF883A9C3764A512AC251316
```
