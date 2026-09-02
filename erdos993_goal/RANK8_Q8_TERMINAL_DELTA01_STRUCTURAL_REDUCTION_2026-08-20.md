# Rank-eight terminal Delta0/Delta1 structural reduction

Date: 2026-08-20

## Scope

This note records exact reductions for the two lowest Newton coefficients of
the rank-eight terminal residual.  It is **not** a sign theorem for either
coefficient and therefore is not a connected-`Q8` theorem.

The exact finite census already covers every rooted core through order 22.
For `n>=23`, the final rank-seven theorem supplies

```text
0 <= c8 <= c7(14c7-c6)/(16c6).
```

## Exact endpoint reductions

For `Delta0`,

```text
d2/dh7^2 = -4c7(63c6+63c7-h6),
d2/dc8^2 = -256h6(c6+h6).
```

For `Delta1`,

```text
d2/dh7^2 = -252c7(c5+c6),
d2/dc8^2 = -256h6(c5+c6).
```

Thus both coefficients are concave in `h7` and `c8`.  The exact two-sided
root-capacity polygon is reduced to its four boundary paths, and `c8` is
reduced to the endpoints `0` and the rank-seven `Q7` ceiling.

At both `c8` endpoints, the lower-zero and full-root paths are concave.  Their
endpoints are already endpoints of the lower-cross and upper-capacity paths.
Consequently each coefficient has exactly four remaining analytic tensors:

```text
c8 endpoint {0,Q7} x root path {lower-cross,upper-capacity}.
```

The complete linked rank-six and rank-five parameters `K,V` remain live.  In
the normalization used by the certificate,

```text
1<=K<=7,
q=q_low+15V/(7a),
c6=c5(30/x5-18+15V)/36.
```

The cancellation of `K` from `c6` and its retention in `q,c7` are checked
symbolically.

## Why the rank-six interval cannot be collapsed

The exact interior point

```text
n=23, K=256/57, V=22/95,
q=11/28, E=0, S=1/2<1-q=17/28
```

has the literal `P23` coefficient jet through `c7` and strict root-capacity
slack.  At `c8=0`, the fixed-parameter `c7` curvatures are positive:

```text
Delta0: 125836296768,
Delta1: 256716952128.
```

This is only a method obstruction to a concavity shortcut; it is not a
negative coefficient and not a graph counterexample.

## Independent verification

Two independent auditors rebuilt the curvatures, endpoint topology, linked
`K,V` parameterization, `Delta0` selected-degree payment, and the strict
interior witness.  Both report no defect.

Artifacts and SHA-256 hashes:

```text
verify_rank8_q8_terminal_delta0_reduction.py
7546765F0FCA4F5955019A8170893371B95AE4B532A8036B1659D6A478B91052

rank8_q8_terminal_delta0_reduction_exact_20260820.json
B3D1373A0DF158E55FABDD87A3C9033A745E5079D7AB813604CEBE1D5CC5B51C

verify_rank8_q8_terminal_delta1_reduction.py
9AFCB8440917BFE4B01D28987DE9055B09CA6B7A67E3D2DB3A2186BAB5AAEA70

rank8_q8_terminal_delta1_reduction_exact_20260820.json
8E7F4EB6AEA056B42A3570996287C8B5BD453C5F9E604368FB09E0F78D9530FF

rank8_delta0_delta1_structural_reductions_independent_audit_exact_20260820.json
9AE03AA2F3AF793CD47E6B3679ACB25EBB200BDE5DEAD5692FF7C4A2097EA293

rank8_delta01_structural_reduction_independent_audit_20260820.json
7D3DA968E6161A5F8162685C0F0BC0CC9676112381625EC1A6524452CD42343F
```

The eight combined tensors remain unsigned.  No claim beyond this exact
structural reduction is made.
