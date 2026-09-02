# Rank-eight terminal `Delta^4` all-order theorem

Date: 2026-08-20

Status: **exact unconditional proof that `Delta^4 R_1>=0` for every rooted
tree core and every order.  The former analytic dependency on the rank-seven
`Q7(alpha>=12)` reserve is discharged by the final, independently audited
rank-seven theorem.  This is one terminal Newton coefficient, not the complete
rank-eight `Q8` theorem.**

## 1. Finite range

The existing exact WROM census checks every root of every free tree through
order 22.  It covers 9,114,285 free trees and 194,813,361 rooted cores and
proves `Delta^1` through `Delta^4` nonnegative everywhere.  Its report is

```text
rank8_terminal_delta04_finite_n1_n22_exact_20260820.json
SHA-256 4C8FD019F03D42208F56751BFB896021B1F4A02C699D5F26CE2636C80B59C4AB
```

The known negative `Delta^0` rows at orders 11--14 are irrelevant to this
coefficient and remain exact shortcut controls outside the proposed
`alpha>=14` target.

## 2. Analytic reduction from order 23

The audited reduction uses the two-sided root-capacity polygon, concavity in
`h7`, monotonicity in `c8`, the repaired rank-seven endpoint

```text
c8=c7(14c7-c6)/(16c6),
```

and concavity across the rank-six defect interval.  It leaves eight honest
boxes:

```text
k in {1,7} crossed with
  lower-zero,
  lower-cross with live Z,
  upper-capacity,
  full-root.
```

The full interior `D5` link remains parametrized by `V`; it is never replaced
by an invalid independent endpoint.  The `Q7` endpoint has the correct
direction because `Delta^4` is nonincreasing in `c8`.  For `n>=23`, a tree is
bipartite and `alpha(A)>=ceil(n/2)>=12`, exactly the now-proved rank-seven
guard.

## 3. Two enlarged boxes

For the full-root boxes, it is enough to use

```text
0<w<=33/190,
4/3<=x/w<=760/471,
0<=U,V<=1.
```

The cleared numerator has degree `(12,11,10,7)`.  For each `k`, all 13,728
Bernstein coefficients are nonnegative in one unsplit leaf.

For the upper-capacity boxes, put

```text
t=1/n,  y=nw,  r=x/w.
```

The broader compact box

```text
0<t<=1/23,
3<=y<=759/190,
4/3<=r<=760/471,
0<=U,V,Z<=1
```

is sufficient.  After multiplication by the positive factor `t`, each
cleared numerator has degree `(14,13,12,11,8,2)` and all 884,520 Bernstein
coefficients are nonnegative.

These four certificates close full-root and upper-capacity for both `k`.

## 4. Coupled lower box

The rectangular scaled box is too loose for the lower pieces: it drops the
order-size coupling and has negative Bernstein coefficients at the shared
lower-zero/lower-cross junction.  Those coefficients are enclosure failures,
not negative values or tree counterexamples.

The exact cone is contained in the tighter affine-chord box

```text
0<t<=1/23,
3+9t <= y <= 3+(4347/190)t,
4/3+2t/3 <= r <= 4/3+23(760/471-4/3)t.
```

The lower bounds follow from

```text
y>=3/(1-3t)>=3+9t,
r>=8/(6-w)>=4/3+2w/9>=4/3+2t/3.
```

The upper endpoints are valid chords.  Their exact margins over the cone are

```text
9t(23t-1)(252t-103) / (190(3t-1)(4t-1)) >= 0,
12t(23t-1)(55t-32) / (157(15t^2-10t+1)) >= 0
```

on `0<=t<=1/23`.

### Shared junction

`lower-zero Z=1` is exactly `lower-cross Z=0`.  On the coupled box, each `k`
has 786,240 nonnegative Bernstein coefficients of degree
`(39,13,12,11,8)`, proving the junction value nonnegative.

### Lower-zero paths

At `Z=0`, `Delta^4=0` identically.  The exact coupled certificates prove

```text
-d^2 Delta4/dZ^2 >= 0
```

for both `k`.  Each uses 376,992 strictly positive Bernstein coefficients of
degree `(33,11,11,10,6)`.  Concavity between the zero endpoint and the proved
junction closes both lower-zero boxes.

### Lower-cross paths

The curvature is genuinely mixed, so curvature endpoint collapse must not be
used.  Instead, the exact coupled certificates prove directly

```text
d Delta4/dZ >= 0
```

throughout both live paths.  Each uses 1,572,480 nonnegative Bernstein
coefficients of degree `(39,13,12,11,8,1)`.  Thus the shared junction is the
minimum and both lower-cross boxes close.

In total the new analytic package checks 7,267,920 exact tensor Bernstein
coefficients without subdivision.

## 5. Scope and dependency integration

The final rank-seven dependency is pinned and independently audited as follows:

```text
RANK7_PGC_ALL_ORDER_THEOREM_2026-08-20.md
SHA-256 2C408B88932157B7F1BFDF0F548335D218F7683517D2F67B4B0DC2CFF1A677B6
rank7_integration_readonly_20260820.json
SHA-256 E5E09C141040746F6FDBC69EA89A9E4507CE63C9DDEDD73DF0E1C47E67191C59
rank7_final_integration_independent_audit_exact_20260820.json
SHA-256 3052B52A9AB79C2B961C37C0D150DC9E440BBF0D81FCA6F4A657C262554205EE
audit_rank7_final_integration.py
SHA-256 B97444AFC5CA30266ACEDE843B74273A50F6416E91A5B9F57E7B399D0C28AFA4
```

The integration report has no pending inputs, and the independent audit
confirms the terminal-broom, connected-`Q7`, forest-lift, and final PGC chain.
Consequently, combining the unconditional finite range with the analytic
range proves `Delta^4 R_1>=0` unconditionally for every rooted tree core.
The package audit also replays the completed `Delta^5` scope, whose former
rank-seven dependency is now discharged as well.

This does not close `Delta^0` through `Delta^3`, the exceptional shifted
orders 21--26, connected `Q8`, the forest lift, or the final rank-eight
boundary.  No such claim is made here.

## 6. Replay and hashes

Run

```powershell
python .\certify_rank8_delta4_full_branch_box.py --k 1 --no-split
python .\certify_rank8_delta4_full_branch_box.py --k 7 --no-split
python .\certify_rank8_delta4_scaled_n_branch_box.py --k 1 --piece ucap
python .\certify_rank8_delta4_scaled_n_branch_box.py --k 7 --piece ucap
python .\certify_rank8_delta4_junction_coupled_box.py --k 1
python .\certify_rank8_delta4_junction_coupled_box.py --k 7
python .\certify_rank8_delta4_lower_zero_curvature_coupled_box.py --k 1
python .\certify_rank8_delta4_lower_zero_curvature_coupled_box.py --k 7
python .\certify_rank8_delta4_lower_cross_derivative_coupled_box.py --k 1
python .\certify_rank8_delta4_lower_cross_derivative_coupled_box.py --k 7
python .\audit_rank8_delta5_delta4_full_branch_package.py
```

Current SHA-256 values:

```text
certify_rank8_delta4_full_branch_box.py
3BDE91905ADF15B5260290B7F74292CA19C4A9969818743AF4B13586B7C27E2D
rank8_delta4_full_branch_k1_exact_20260820.json
863E1964FB0D29C9EE9554CED773D457DCD08456DD0AB120B38C3B060E0ECA02
rank8_delta4_full_branch_k7_exact_20260820.json
EDFD94CC2F3F824BF35F7F3F647AF5C10A6BF7D143D07C5D051D317733DEB578

certify_rank8_delta4_scaled_n_branch_box.py
207E511A080A79FD4AED8E8C533D9D469A36875E503D767D8595EE679E1DB6D3
rank8_delta4_scaled_n_k1_ucap_exact_20260820.json
955179AF39CC5CEDC5BD4A08978ED9C402E07935A06482B21FDC920A2E730761
rank8_delta4_scaled_n_k7_ucap_exact_20260820.json
B23F74417F6772C7D109E003CD6C89DD0D2F4D93E64084C4B2275DA63DB04FFA

certify_rank8_delta4_junction_coupled_box.py
E0B57F44FD5C7A58C48A1841D1352228C2367DDA2C37148DDCE6CE2D59E1C5CF
rank8_delta4_junction_coupled_k1_exact_20260820.json
1F2BB0160742FFE72EA438D83BAFA92EF105EB81C4D0EB604AE764CCBC482A61
rank8_delta4_junction_coupled_k7_exact_20260820.json
1BBB8B021D4DD0A2990CDCAA718BEA3B414981257592D2D5307BE2A2FA76F4B3

certify_rank8_delta4_lower_zero_curvature_coupled_box.py
CD117C672187A2DF5BCCD7581C2A8D74EC7FB0FBB537154545D6390633C4C45C
rank8_delta4_lower_zero_curvature_coupled_k1_exact_20260820.json
B9E4DCE22BBBBEABC593E7C22CA30920EC6EA44C1AFD8F23B73B39B6773DD833
rank8_delta4_lower_zero_curvature_coupled_k7_exact_20260820.json
30CCB14F7618DF563C4980D312F3481A846E2AEAD0DBB71C6F9CA99868440460

certify_rank8_delta4_lower_cross_derivative_coupled_box.py
88225117B49010E74133B36EB91312E4C07EEA9525F01017DFE512AF0496EE80
rank8_delta4_lower_cross_derivative_coupled_k1_exact_20260820.json
C2D9F51D1A14D8DF793CB88527F58FACDC48D54E814CE94174B639711B97EB61
rank8_delta4_lower_cross_derivative_coupled_k7_exact_20260820.json
496AEBF3944C1EF214852460F9C8717B58FC1BD83F4073828EFEB08A72592D0F

audit_rank8_delta5_delta4_full_branch_package.py
38B4AB2F3680B50369482A027CF4AD51434700B165616D0406A1A71BC9C8DAC7
rank8_delta5_delta4_full_branch_independent_audit_20260820.json
55B91CF39CE16808C04BA64C6093CEEFEBF6DD244B9842ADE189D53EDE50D32D
```
