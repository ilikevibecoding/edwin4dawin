# Rank-eight terminal residual: exact all-root order-27 theorem for `Delta0` through `Delta3`

Date: 2026-08-23

Status: **PASS, finite core order 27 only.**

## Theorem

For every free tree `A` on 27 vertices and every root `q`,

```text
Delta^j R_1(A,q) > 0,  j=0,1,2,3.
```

The exact six-thread WROM census covers all 751,065,460 free trees and all
20,278,767,420 rooted pairs.  Every rooted pair is active and the four
negative counts are exactly `[0,0,0,0]`.

The exact global minima are

```text
Delta0     4,600,232,056,263,953,894,400
Delta1    12,397,272,343,081,258,590,720
Delta2    16,318,477,010,486,344,110,080
Delta3    17,470,621,683,441,358,548,480.
```

All four match the independently predicted endpoint-root values of `P_27`.

## No-gap and independent audit

The six half-open worker ranges are adjacent, disjoint, start at zero, and end
at the exact A000055 count 751,065,460.  Their processed counts sum to that
total and their rooted counts sum to 20,278,767,420.  A separate order-23 run
had already proved byte-level agreement between the threaded engine and the
serial reference lane.

The independent audit additionally

- pins every engine, runner, equivalence, and reference-audit hash;
- replays the WROM generator through order 13 against the known free-tree
  counts and checks uniqueness;
- reconstructs all four reported minimum witnesses with generic tree DP;
- independently reconstructs the path-endpoint minima; and
- proves a conservative signed-`i128` safety bound.

The conservative absolute bound on every computed `Delta3` value is

```text
33,732,520,829,552,675,795,464,800,000.
```

It uses 95 bits and leaves a signed-`i128` margin factor of at least
5,043,832,458.

## Scope guard

This is a finite order-27 theorem only.  It proves no order at least 28, no
remaining all-order rooted-core family, no forest lift, no rank-eight PGC, and
not Problem 993.

## Replay

```powershell
python .\audit_rank8_terminal_delta03_finite_n27_wrom_threaded_root.py
```

The independent audit deliberately does not repeat the 751,065,460-tree
primary census.

## Frozen hashes

```text
verify_rank8_terminal_delta03_finite_wrom_threaded_root.rs
  D72084ED90E55501B881179DDA73148D64FCB29431102ADF5674E018380D2F89
verify_rank8_terminal_delta03_finite_wrom_threaded_root.exe
  DC711B103514AF1DA5B303C8234F89A06FC61C19A5153D717164BF879AB37C47
run_rank8_terminal_delta03_finite_wrom_threaded_n27_root.py
  96991244BFB88BF8F18E2F5B3D5FE7153265C464323C3345DFD99E8551F02939
rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json
  213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787
rank8_terminal_delta03_finite_wrom_threaded_equivalence_root_20260823.json
  C4B6B3134AC23F5D9C1C3E8C2EA16118CC23E30B748274D14BD62718ED8EC29A
audit_rank8_terminal_delta03_finite_n27_wrom_threaded_root.py
  D45E05C7EB63E7469F5D74F2E349C953DFA6D7EAA8D7641DBA14822D92E4AB12
rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json
  BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D
```
