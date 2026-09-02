# Rank-eight terminal-alpha-six source-eleven complete theorem

Date: 2026-08-20

Status: **exact seven-shard no-gap PASS with independent bidirectional audits.**

## Scoped theorem

For every terminal exceptional alpha-six jet type with sorted index
`73 <= t <= 247`, and every exceptional source product of alpha eleven using
component types at most `t`, adjoining terminal type `t` gives total alpha 17
and

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

This theorem covers exactly source alpha 11 and does not cover source alpha 12.

## Exact coverage and result

```text
shards       73--115, 116--149, 150--177, 178--202,
             203--225, 226--246, 247--247
exact union                                      73--247
overlaps                                               0
gaps                                                   0
terminal types                                       175

raw source multisets                           4,441,150
canonical terminal/source checks               3,414,804
distinct shard-product counts sum              3,279,910
multiset-to-key collisions                     1,026,346
key-to-product collisions in shards              134,894
negative Q8                                            0
zero Q8                                                0
minimum Q8                                  430,703,190
maximum Q8                         32,598,866,127,960
```

The product figure is the sum of sealed shard counts, not cross-shard global
deduplication.  Collision counts are exact equivalence compression.

A source of alpha eleven has zero or one alpha-six source component.  The
independent exponent audit used 14,554 lower-type alpha-eleven multisets and
123 lower-type alpha-five multisets, giving exactly `14,554 + 123*L` raw
checks at relative terminal index `L`.  The seven exact sums total 4,441,150.

Each independent audit matched its recurrence key and product tables in both
SQLite `EXCEPT` directions.  The assembly audit rehashed every artifact,
queried every database for exact counts, type coverage, extrema, and
nonpositive rows, then reconstructed exactly `range(73,248)`.

## Per-shard resources

```text
range       recurrence seconds / peak MiB        audit seconds / peak MiB
73--115     8.1662317001028 / 80.46484375         12.3837786000222 / 149.36328125
116--149    8.42046890000347 / 94.56640625        13.5198947000317 / 155.7734375
150--177    9.15510709991213 / 103.12890625       13.2011372999987 / 130.3828125
178--202    9.03088769991882 / 111.16796875       13.4011237999657 / 154.69921875
203--225    9.31865210004617 / 117.13671875       13.9368162999162 / 155.50390625
226--246    9.12597509997431 / 124.18359375       13.6725961000193 / 156.11328125
247         1.90942599996924 / 113.421875         0.940726800006814 / 37.9453125

workers per process                              1
operating abort gate                           448 MiB
hard cap                                       512 MiB
```

No resource checkpoint or sign obstruction was produced.

## Exact hashes

```text
probe_rank8_exceptional_first_crossing_alpha6_s11_shard_exact.py
394644B04D86037E3FBFB5EEE2AE8B8D59DF632A5AF07F218DB068B284029DD4

audit_rank8_exceptional_first_crossing_alpha6_s11_shard.py
059FE81ABCF9B17384456CCD57DD6EBAA14516E859CF277C6700CD38A8BFFF35

rank8_exceptional_first_crossing_alpha6_s11_types73_115_exact_20260820.json
51171CD7C7965C0E394780549A6B0769D86CBC862FFD9FF9AA3E6222D6810419
rank8_exceptional_first_crossing_alpha6_s11_types73_115_keys_exact_20260820.sqlite3
ADEE6E1F0CA864BB0CE202829360CBCAA4638682037A9B1B5BE39359DDAF9CF5
rank8_exceptional_first_crossing_alpha6_s11_types73_115_audit_exact_20260820.json
1147641D2C2783200CDAF96928465CBEDB3935F35A5A187109EB2BC7DCDEDC6E

rank8_exceptional_first_crossing_alpha6_s11_types116_149_exact_20260820.json
9797ECE07ACAAF1CCC771A5131CEA29C1B22F7DE976E60A3A0782570C35B0867
rank8_exceptional_first_crossing_alpha6_s11_types116_149_keys_exact_20260820.sqlite3
69F907C383938945D9562DCE8FDD22FB0D86E2E625BFE4A1D628CDB0E84EB409
rank8_exceptional_first_crossing_alpha6_s11_types116_149_audit_exact_20260820.json
1CDDC325D6D12273C7ECAC9D680A453A9A5B794C9406FE8CA3400B74714E1838

rank8_exceptional_first_crossing_alpha6_s11_types150_177_exact_20260820.json
973DB52D3E7149581A849511444F813048AD595787E86CC615B3C5D4D9173C55
rank8_exceptional_first_crossing_alpha6_s11_types150_177_keys_exact_20260820.sqlite3
BE5D96EF6CFB9FFB89B455D50AD2D606B5CF91AA0D7F82EF7E5670E9EC3CA138
rank8_exceptional_first_crossing_alpha6_s11_types150_177_audit_exact_20260820.json
0BE89151B41E4AB210C2D81482362BD82B638BE93C4B753128CFC039C03262D2

rank8_exceptional_first_crossing_alpha6_s11_types178_202_exact_20260820.json
23516A9AC88B7AD8BD012D35FCF114EBFE05A041B9B5D7F8815A8FB54FFE63C7
rank8_exceptional_first_crossing_alpha6_s11_types178_202_keys_exact_20260820.sqlite3
20C64CC16C79B07CEB8E7D5A0BC68A8F8ED5F27E2CFB344A18CC3E21AC640824
rank8_exceptional_first_crossing_alpha6_s11_types178_202_audit_exact_20260820.json
D7F016AD01A4C28175D874113D1CD2E9853A4F43DDF73661F6A0355B263FD01D

rank8_exceptional_first_crossing_alpha6_s11_types203_225_exact_20260820.json
A36395A3F776A92C58F069F9578549BAA8F38E4CD3D8070D643507115EAF5381
rank8_exceptional_first_crossing_alpha6_s11_types203_225_keys_exact_20260820.sqlite3
0D3B7E2EE91F07A2781DEE0664A6E5F4BFEFB86222502233220D56D8FFD9C17A
rank8_exceptional_first_crossing_alpha6_s11_types203_225_audit_exact_20260820.json
4A267DD5D48997DA62F91C5CB68428E09AA47B5EA0C7D9D72DC83A16037C158D

rank8_exceptional_first_crossing_alpha6_s11_types226_246_exact_20260820.json
55AEF6254AA33C6E50AD01CBB08E4AD08997B94A552DF7F042333EE094730D01
rank8_exceptional_first_crossing_alpha6_s11_types226_246_keys_exact_20260820.sqlite3
41559204EEEF6BCAC3412C5DCAEF202D83D8590FC5F1F99F8607712B664FDB3D
rank8_exceptional_first_crossing_alpha6_s11_types226_246_audit_exact_20260820.json
7FF9657A58B963557342735197912131806D3F25818D069A96CD7A3B7736D783

rank8_exceptional_first_crossing_alpha6_s11_type247_exact_20260820.json
444562E60AFBAE382A1F7B430D0DDD2D37145C72D3FA7669243E3434CC793F71
rank8_exceptional_first_crossing_alpha6_s11_type247_keys_exact_20260820.sqlite3
B87A412268DE07F30DD406C41B446063EB22AC2467903BCBF503B7FE05D016FC
rank8_exceptional_first_crossing_alpha6_s11_type247_audit_exact_20260820.json
2D3C8DFB9E401338C4F1711BE8DF1BC29A0F1F1C6DF6A82FFF8B2375C4061F75

assemble_rank8_exceptional_first_crossing_alpha6_s11.py
89A9E19CF9D4B8ED4CEE7990B9D23719D0772F8354F96CEABFDC1FD9F26525EE
rank8_exceptional_first_crossing_alpha6_s11_complete_exact_20260820.json
6E7EA517686D368427F150A7C120E641213E90E421F534EB302D54BA93B5EED6
audit_rank8_exceptional_first_crossing_alpha6_s11_assembly.py
B10B9F02D753FB10EE69BB9FFF47926321964792A36A9878523BF0F7D5FF9382
rank8_exceptional_first_crossing_alpha6_s11_complete_audit_exact_20260820.json
3DD34F9B0E2CB3C2A4D06AAC20D5D180DB0E1D82A5C7B0F3C34256E9E5A03F14
```

## Scope boundary

This closes source alpha 11 for terminal alpha six only.  It does not certify
source alpha 12 or the unsealed source-alpha-13 cells, terminal alpha 7--9,
a full/full cone, connected `Q8`, full forest `Q8`, or PGC.  Computation stops
before source alpha 12.
