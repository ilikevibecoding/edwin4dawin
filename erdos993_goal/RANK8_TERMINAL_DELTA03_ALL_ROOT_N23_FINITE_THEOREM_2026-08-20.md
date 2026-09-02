# Rank-eight terminal residual: exact all-root order-23 theorem for `Delta^0` through `Delta^3`

Date: 2026-08-20

Status: **PASS, finite core order 23 only.**

## Theorem

Let `A` be any free tree on 23 vertices and let `q` be any vertex of `A`.
For the rank-eight terminal-broom residual `R_t(A,q)`, all four initial
Newton coefficients are strictly positive:

```text
Delta^j R_1(A,q) > 0,  j=0,1,2,3.
```

The exact WROM census contains

```text
14,828,074 free trees,
341,045,702 rooted tree pairs,
341,045,702 active rooted pairs.
```

The negative counts are exactly `[0,0,0,0]`.  The global minima are

```text
Delta0   5,385,170,960,562,032,640
Delta1  18,726,855,811,658,874,880
Delta2  36,011,987,561,779,733,504
Delta3  55,493,765,701,857,939,456.
```

All four minima occur at an endpoint root of `P_23`.  A generic,
independently written tree-independence-polynomial DP reconstructs these
four values exactly.

## Coverage and arithmetic audit

The order-23 wrapper includes the hash-pinned generator and polynomial
arithmetic from the frozen finite checker verbatim.  The independent audit
does not repeat the large census.  Instead it:

1. translates the WROM successor independently and reproduces the known
   free-tree counts through order 13;
2. matches the generated trees bijectively, up to isomorphism, with every
   tree in the NetworkX graph atlas through order 7;
3. rechecks the frozen order-22 result of 5,623,756 trees and 123,722,632
   rooted cases, including its exact minima;
4. independently evaluates the path-endpoint minima at orders 22 and 23;
5. checks that the order-23 tree count is 14,828,074 and multiplies exactly
   by 23 to 341,045,702 rooted cases; and
6. establishes a conservative absolute bound
   `230,184,559,158,991,376,022,756,288` on every rank-three finite
   difference.  This is an 88-bit number, leaving an integer margin factor
   of at least 739,151,158,019 below signed `i128` maximum.

The empty standard-error log confirms that the fail-closed checker emitted
no first-negative or negative-minimum witness.

## Scope guard

This is an exact finite theorem for core order 23.  It does not by itself
prove the order-24-and-above `Delta^0`--`Delta^3` cells, connected `Q8`, the
forest lift, rank-eight PGC, or Problem 993.  In the read-only integration
chain it removes core order 23 from the remaining four-coefficient gap.

## Replay

```powershell
python .\audit_rank8_terminal_delta03_finite_n23.py
```

The full Rust census is intentionally not part of the audit replay command;
the primary executable and its completed log are pinned below.

## Frozen hashes

```text
verify_rank8_terminal_delta03_finite_n23.rs
  04637D9DAC26F23C0A7839C57D6BC3D7243D2A3D06240D17A5A18B84AE09788E
verify_rank8_terminal_delta03_finite_n23.exe
  4C1EC4BFEA318F2B39910239F46B6A0E144A9AEA69D544E6FBF6745B3A7EEA79
rank8_terminal_delta03_finite_n23_primary_20260820.log
  E092FBD72CE51C4AB55DE6C2A0BBFF69DEFC368D659A66CF9E013E6F176067D6
rank8_terminal_delta03_finite_n23_primary_20260820.err.log
  E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855
verify_rank8_terminal_delta5_finite.rs
  2C76D7E7C9312331F799AB252FC806056D0201BE25AFA18446B218515F2EE2D6
verify_rank8_terminal_delta04_finite.rs
  C7A9A4E943ED8EBB1916BB7297A995FDF1AE0619EFE9FA6AA3E03DCD6F405393
verify_rank8_terminal_delta04_finite.exe
  EC7F2402020486AE5BF06A0703F171109E60F43682FC1F48733F5918A0AC9F89
rank8_terminal_delta04_finite_n22_exact_20260820.log
  2AE118B71081CC6B065329B9B201FD53C8BEA53B1F85192C2ADF10CF93D26CC5
audit_rank8_terminal_delta03_finite_n23.py
  F026F75B38DF3647ECF6DE04F479DE9CB006552925E2772AD7CB32135B4CEFA3
rank8_terminal_delta03_finite_n23_independent_audit_exact_20260820.json
  6161599896A4E9991B9D6E0B131D4075EC3C4230B9DB0A038CAF6108747427F4
```
