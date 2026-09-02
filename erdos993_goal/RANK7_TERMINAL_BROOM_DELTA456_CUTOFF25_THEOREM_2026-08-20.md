# Rank-seven terminal-broom `Delta4`--`Delta6` theorem from order 25

Date: 2026-08-20

Status: **PROVED EXACTLY FOR EVERY ROOTED TREE CORE OF ORDER `n>=25`.**

## Theorem

For the exact rank-seven terminal-broom residual `R_t(A,q)`, every rooted
tree core `A` of order at least 25 satisfies

```text
Delta^j R_1(A,q)>=0,  j=4,5,6.
```

## Endpoint reduction

The existing exact defect/retention reduction is rerun at the lower map
`n=25/T`. Separate coefficientwise concavity in `h5`, `h6`, and `c7`
holds for all low ranks at this cutoff. For ranks 4--6, the exact `D5`
concavity theorem reduces the remaining coordinate to its two endpoints;
the complete `D4` interval is retained.

The resulting inventory contains 16 branches per Newton rank. Of the 48
exact rational Bernstein boxes, 47 pass coefficientwise. The only loose-box
failure is

```text
rank 4, (D5,D6,s,d)=(lower,lower,1,1/2).
```

This is not a tree obstruction: `s=1` means `i4(A-N[q])=0`, which forces
`i5(A-N[q])=0` and hence `d=1`. Quantitatively, ordinary extension counting
gives the valid root-capacity edge

```text
5 i5(A-N[q]) <= (n-6)i4(A-N[q]).
```

The exact capacity-edge certificate replaces only that impossible corner.
Its cleared numerator has degrees `(44,20,9,8,2)`, 255,150 exact Bernstein
coefficients, and minimum zero. Therefore the repaired rank-4 inventory and
the complete rank-5/rank-6 inventories are nonnegative.

## Replay

Run

```powershell
python .\verify_rank7_terminal_broom_delta456_cutoff25.py
```

Expected marker:

```text
PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA456_N_AT_LEAST_25
```

The assembled report is
`rank7_terminal_broom_delta456_cutoff25_exact_20260820.json`, SHA-256
`D0F848B231AC1A993A057811756AA8FABE9302ECBFB704DAB0BFD9054ADBA7EA`.
The assembler has SHA-256
`088B403E2C793A9316410E5E91341EAE89DCD02960BC247B4547F230B7AB36C3`.
Every source, branch log, concavity replay, and capacity-repair log is hashed
inside the report.

## Scope

This theorem closes only `Delta^4`, `Delta^5`, and `Delta^6` from order 25.
It does not by itself close `Delta^0` through `Delta^3` or the complete
rank-seven terminal residual.
