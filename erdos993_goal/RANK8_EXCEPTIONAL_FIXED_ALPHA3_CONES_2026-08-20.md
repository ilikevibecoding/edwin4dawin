# Rank-eight alpha-three exceptional fixed/full cones

Date: 2026-08-20

Status: **exact, no-gap categorical certificate in both full cones.**

## Theorem

Let `E` be a connected-tree exceptional jet with `alpha(E)=3`, stored
through independence rank nine, and let `F` be an abstract rank-eight full
factor in either the high or low gap cone.  Then

```text
Q8(EF)>=0.
```

The exact exceptional database contains precisely five alpha-three jets,
at consecutive indices 5 through 9:

```text
(1,4,3,1,0,0,0,0,0,0)
(1,5,6,1,0,0,0,0,0,0)
(1,5,6,2,0,0,0,0,0,0)
(1,6,10,4,0,0,0,0,0,0)
(1,6,10,5,0,0,0,0,0,0).
```

All five have fixed `Q8=0`.  Index 4 has alpha two and index 10 has alpha
four, proving that 5–9 is the complete alpha-three band with no gap.

For every fixed jet, the verifier forms the exact factorial convolution and
expands

```text
q8(EF)^2-q7(EF)q9(EF)-h q7(EF)q8(EF)
```

in the nonnegative parameters of each full cone.  Results:

```text
cone     jets      terms   negative   minimum   peak private GiB
high        5   4,431,750         0         1              0.146
low         5   6,466,760         0         1              0.182
```

Thus all `10,898,510` nonzero symbolic coefficients across the ten fixed-cone
cases are positive.  Both peak-memory measurements are below one GiB.

## Scope

This closes exactly the alpha-three fixed/full class.  Together with the
alpha-one and alpha-two results, the first nine of 1,215 exceptional jets
are now closed against both full cones.  It does not prove an alpha-four-or-
higher fixed/full class, a full/full cone, exceptional first crossing,
connected `Q8`, forest `Q8`, or rank-eight PGC.

## Independent replay and hashes

Run

```powershell
python .\audit_rank8_exceptional_fixed_alpha3.py
```

Expected marker:

```text
PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA3_BOTH_FULL_CONES
```

SHA-256 values:

```text
verify_rank8_exceptional_fixed_full.py
6777296E01B957F426284B6F2C488ED8005030F1C8C14837DE028B35D1AF48BE

rank8_exceptional_fixed_high_exact_20260820_range_5_9.json
7028CA850809245CC8B3AE917BE4E0FE7131718DBB5572E9A18D1B401ED9759B

rank8_exceptional_fixed_low_exact_20260820_range_5_9.json
6C1BCD0EF3859FC2AC83BE1D2F8680E435E38AC1174DD41D4691C430167AA315

audit_rank8_exceptional_fixed_alpha3.py
D6E520E3A9690CFB69B0D9A7C63A33BA98B93FAF9E27CBD60A4121001AD535A8

rank8_exceptional_fixed_alpha3_independent_audit_exact_20260820.json
47017C5315833BC68754DC4E96DB8C81E58798F6FBE730D5D7E11085B9F2F76F

rank8_exceptional_tree_jets_exact_20260820.tsv
B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A

rank8_exceptional_tree_jets_exact_20260820.json
BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4
```
