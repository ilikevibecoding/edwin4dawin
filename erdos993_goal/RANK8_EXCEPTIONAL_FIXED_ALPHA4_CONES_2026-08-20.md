# Rank-eight alpha-four exceptional fixed/full cones

Date: 2026-08-20

Status: **exact, no-gap categorical certificate in both full cones.**

## Theorem

Let `E` be a connected-tree exceptional jet with `alpha(E)=4`, stored
through independence rank nine, and let `F` be an abstract rank-eight full
factor in either the high or low gap cone.  Then

```text
Q8(EF)>=0.
```

The exact exceptional database contains precisely 15 alpha-four jets at
consecutive indices 10 through 24.  Index 9 has alpha three and index 25 has
alpha five, so the certificate is categorical and has no gap.  Every one of
the 15 fixed jets has `Q8=0`.

For each jet, the verifier forms the exact factorial convolution and expands

```text
q8(EF)^2-q7(EF)q9(EF)-h q7(EF)q8(EF)
```

in the nonnegative parameters of each full cone.  Results:

```text
cone     jets       terms   negative   minimum   peak private GiB
high       15  13,295,250         0         1              0.146
low        15  19,400,280         0         1              0.185
```

Thus all `32,695,530` nonzero symbolic coefficients across the 30 fixed-cone
cases are positive.  Both peak-memory measurements are below one GiB.

## Scope

This closes exactly the alpha-four fixed/full class.  Together with alpha
one through three, the first 24 of 1,215 exceptional jets are now closed
against both full cones.  It does not prove an alpha-five-or-higher
fixed/full class, a full/full cone, exceptional first crossing, connected
`Q8`, forest `Q8`, or rank-eight PGC.

## Independent replay and hashes

Run

```powershell
python .\audit_rank8_exceptional_fixed_alpha4.py
```

Expected marker:

```text
PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA4_BOTH_FULL_CONES
```

SHA-256 values:

```text
verify_rank8_exceptional_fixed_full.py
6777296E01B957F426284B6F2C488ED8005030F1C8C14837DE028B35D1AF48BE

rank8_exceptional_fixed_high_exact_20260820_range_10_24.json
E803725EBB208719D20983C6206B6379F027DD376A88949F5D684A22937AAC77

rank8_exceptional_fixed_low_exact_20260820_range_10_24.json
7C6CA26E36C62879EAC94F1F1E2C224ABF32A9CFDCFA66C425838279692111EB

audit_rank8_exceptional_fixed_alpha4.py
1EB2537EED11D72C7C520761A1ACDF91B117A9831B761B3F338383DE41F91656

rank8_exceptional_fixed_alpha4_independent_audit_exact_20260820.json
B01EDC213DD0C50D70BD0F626C9EA32451C883175FBCA18BB016CC019E91BB0E

rank8_exceptional_tree_jets_exact_20260820.tsv
B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A

rank8_exceptional_tree_jets_exact_20260820.json
BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4
```
