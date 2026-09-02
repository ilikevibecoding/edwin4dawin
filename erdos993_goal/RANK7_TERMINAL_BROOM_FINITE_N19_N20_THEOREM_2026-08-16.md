# Rank-seven terminal-broom finite theorem at orders 19 through 22

Date: 2026-08-16

Status: **PROVED EXACT FINITE THEOREM.** This closes the first four orders of
the previously open core-order 19--38 terminal-broom bridge. It does not
claim the remaining orders are closed.

## Theorem

For every root of every free tree core `A` of order 19 through 22, all fourteen
Newton coefficients of the exact terminal-broom residual are nonnegative:

```text
Delta^j R_1(A,q) >= 0  (0<=j<=13).
```

Therefore `R_t(A,q)>=0` for every integer `t>=1`.

## Exact census

| order | free trees | rooted cores | minimum `Delta^0 R_1` |
|---:|---:|---:|---:|
| 19 | 317,955 | 6,041,145 | 2,790,481,013,732,412 |
| 20 | 823,065 | 16,461,300 | 18,786,230,160,681,984 |
| 21 | 2,144,505 | 45,034,605 | 108,820,576,437,885,312 |
| 22 | 5,623,756 | 123,722,632 | 554,732,574,726,500,352 |

Every one of the fourteen global minima is strictly positive at orders 19--21.
At order 22 the dedicated scan checks the seven still-needed coefficients
`Delta^0` through `Delta^6`; all are strictly positive, and the separately
proved all-core high-Newton theorem supplies `Delta^7` through `Delta^13`.
The WROM generator checks its free-tree count against the canonical sequence,
and the report retains every Newton minimum. Integer `i128` arithmetic is
used throughout. The low minima at all four orders agree with an endpoint-rooted
path, but that extremal observation is not used as an all-order theorem.

## Replay

Run:

```powershell
python .\replay_rank7_terminal_broom_finite_midband.py --first 19 --last 20
python .\replay_rank7_terminal_broom_finite_midband.py --first 21 --last 21
.\verify_rank7_terminal_broom_finite_n22_low.exe
```

Expected marker:

```text
PASS_EXACT_RANK7_TERMINAL_BROOM_ALL_ROOTED_CORES_N19_THROUGH_N20
PASS_EXACT_RANK7_TERMINAL_BROOM_ALL_ROOTED_CORES_N21_THROUGH_N21
PASS_EXACT_RANK7_TERMINAL_BROOM_LOW_NEWTON_ALL_ROOTED_CORES_N22
```

Artifacts and SHA-256:

```text
verify_rank7_terminal_broom_finite_n19_n22.rs
C780DC4ABF11198C6EE24CFC69F1CF4A6E7F9537B5CEA18D38DD31B017FF4374

verify_rank7_terminal_broom_finite_n19_n22.exe
7D83C02DAA8BDC32791F3283A374D37133D723700DA5E880AE098DCA9B7AAD30

replay_rank7_terminal_broom_finite_midband.py
65F35E9D1617655B06DBBA6B335A375A7222907C269A19156583DA7881645BDA

rank7_terminal_broom_finite_n19_n20_exact_20260816.json
83B772FBCD05E210B340DAB3AF9D8D26240D7480894D205186179C45B7B2BBF1

rank7_terminal_broom_finite_n21_exact_20260816.json
0D0C1299EDF7FA7420CC325A5808D2CB51BA21B849F99AF60D4B745923EDEE86

verify_rank7_terminal_broom_finite_n22_low.rs
1D8A7F8C33899E340A7C5EDD3E84DA0418967685C5F9E89AFD66E7622E245170

verify_rank7_terminal_broom_finite_n22_low.exe
607D2DB4538B00D213668A32101DD4D9BB18068AD2AB81E62C4095C8DD9FA27E

rank7_terminal_broom_finite_n22_low_exact_20260816.json
70A84EBF3BCD15F8AFA3106893D101AE2803E000C08B4DC42CE841C7968AA4ED
```
