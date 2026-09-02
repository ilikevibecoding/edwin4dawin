# Rank-eight alpha-five exceptional fixed/full cones

Date: 2026-08-20

Status: **exact, no-gap categorical certificate in both full cones.**

## Theorem

Let `E` be a connected-tree exceptional jet with `alpha(E)=5`, stored
through independence rank nine, and let `F` be an abstract rank-eight full
factor in either the high or low gap cone.  Then

```text
Q8(EF)>=0.
```

The exact exceptional database contains precisely 48 alpha-five jets at
consecutive indices 25 through 72.  Index 24 has alpha four and index 73 has
alpha six, so the certificate is categorical and has no gap.  Every fixed
alpha-five jet has `Q8=0`.

For each jet, the verifier forms exact factorial convolution and expands

```text
q8(EF)^2-q7(EF)q9(EF)-h q7(EF)q8(EF)
```

in the nonnegative parameters of each full cone.  Results:

```text
cone     jets       terms   negative   minimum   peak private GiB
high       48  42,544,800         0         1              0.146
low        48  62,080,896         0         1              0.192
```

Thus all `104,625,696` nonzero symbolic coefficients across the 96
fixed-cone cases are positive.  Both peak-memory measurements are below one
GiB.

## Scope

This closes exactly the alpha-five fixed/full class.  Together with alpha
one through four, the first 72 of 1,215 exceptional jets are now closed
against both full cones.  It does not prove an alpha-six-or-higher
fixed/full class, a full/full cone, exceptional first crossing, connected
`Q8`, forest `Q8`, or rank-eight PGC.

## Independent replay and hashes

Run

```powershell
python .\audit_rank8_exceptional_fixed_alpha5.py
```

Expected marker:

```text
PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA5_BOTH_FULL_CONES
```

SHA-256 values:

```text
verify_rank8_exceptional_fixed_full.py
6777296E01B957F426284B6F2C488ED8005030F1C8C14837DE028B35D1AF48BE

rank8_exceptional_fixed_high_exact_20260820_range_25_72.json
8C8656BA678757D593047C053D9CD828AA05004A9E4DB460B91362D8B54D1673

rank8_exceptional_fixed_low_exact_20260820_range_25_72.json
A8250A4FE63B9EE96B9135B1152398D2C6392DDB3473C5FDF1BA948DB6787C0B

audit_rank8_exceptional_fixed_alpha5.py
9F22FD4F3FEB0EEA8D3F0917499BA112F764E41F8B867D7C5A314EE773569E95

rank8_exceptional_fixed_alpha5_independent_audit_exact_20260820.json
20B597F72D6934EF218A35D707E405EBAEF1AC16E9048BE93CF135471D318BD3

rank8_exceptional_tree_jets_exact_20260820.tsv
B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A

rank8_exceptional_tree_jets_exact_20260820.json
BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4
```
