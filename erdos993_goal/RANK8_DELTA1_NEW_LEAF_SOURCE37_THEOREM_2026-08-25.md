# Rank-8 Delta1 inserted-new-leaf gate for source order at least 37

Date: 2026-08-25

## Theorem

Let `A` be a tree of order at least 37, let `v` be any vertex of `A`,
and form `A+w` by attaching a new leaf `w` at `v`. The rank-eight Newton
`Delta1` terminal residual at the new root `w` is nonnegative.

Equivalently, with `D=A-v`, the full four-endpoint gate is nonnegative for
every forest `D` of order at least 36.

## New order-36 endpoint

The source-order-38 theorem already covers every `D` of order at least 37.
Masks 0, 1, and 2 are independently certified for every `D` order at least
26. It therefore remains only to certify mask 3 at `|D|=36`.

The independently reconstructed bound chain gives

```text
mu4(D) >= 812/33,
mu5(D) >= 8809/406,
6/31 <= d5/d6 <= 2436/8809,
5/32 <= d4/d5 <= 165/812.
```

It also verifies all 352 rational switch comparisons used by the exact box
partition.

For `F=A-N[v]`, the integer order `M=|F|` is covered without gaps:

- `0<=M<=19`: the small-F certificate;
- `M=20,21,22,23,24`: five exact cap-ratio bridges;
- `25<=M<=35`: six exact-M shards.

The first coarse relaxation failure occurs at `M=20`. Its witness has
`f5=0` but `f4>0`, violating the exact forest constraint
`f4 <= (85/156)f5`; it is therefore an enclosure artifact, not a forest or
tree counterexample.

The complete order-36 partition contains 732 rational regions and 876,600
exact tensor Bernstein coefficients. Every coefficient is strictly positive:

```text
negative = 0, zero = 0, positive = 876600.
```

Every primary box is independently reconstructed from the canonical endpoint
transcript. The ordered partition digest is

```text
A82545E1C83703AFBB2546B7FF1146F20FA839D91A7F51C3E2451237F3F98CC7
```

and the canonical raw endpoint numerator digest is

```text
5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E.
```

## Full gate

The endpoint expression is separately concave in `c8` and `d7`. Thus
successive one-variable endpoint minimization reduces the full rectangle to
the four masks. Masks 0--2 hold by the all-order containment theorem, mask 3
at `|D|=36` is the exact certificate above, and mask 3 for `|D|>=37` is the
previous independently audited theorem. Hence all endpoints, and therefore
the whole rectangle, are nonnegative. Since `|D|=|A|-1`, the source cutoff is
`|A|>=37`.

## Sealed artifacts

```text
assemble_rank8_delta1_new_leaf_mask3_order36_delta1d36.py
162A0F61F6224E61B47F290E07872EBBAB1C788B41AB18A218A7E54954900E7E

rank8_delta1_new_leaf_mask3_order36_delta1d36_20260825.json
343ECCC16637FC8DABEAAD4C6C8188D13DCB9E5D94DA8904B236BA0C1F04823E

audit_rank8_delta1_new_leaf_mask3_order36_assembly_delta1d36.py
3FA9359336954DCB2573256F063256FA417FCCA1EF0B4D12049D9A60FDE5FC6A

rank8_delta1_new_leaf_mask3_order36_assembly_independent_audit_delta1d36_20260825.json
17D4C4EEA3CD10FB85D7935D348337B204CEBE8EF1EC22C98BA99B9C637111CA

assemble_rank8_delta1_new_leaf_gate_source37_delta1d36.py
CB63188EC5C840AD03CE2899FA986D58D4AC2162C61B9233BA58F8789AE5C85F

rank8_delta1_new_leaf_gate_source37_delta1d36_20260825.json
514A04DB8664620AE482F302FAD11C7A7361E0F1987C603545FBF01C83C9398E

audit_rank8_delta1_new_leaf_gate_source37_delta1d36.py
0F3E69EF47249BF8005AEAAD6B177CFF60F7C4A9F7375D654A07722577E3D82E

rank8_delta1_new_leaf_gate_source37_independent_audit_delta1d36_20260825.json
4A08CDF7C9C4411F86C9BECC8EDD6FD4C8EB00B4CCABAD96710E546EC76675BA
```

## Scope

This theorem closes the `Delta1` inserted-new-leaf gate for source order at
least 37. Source orders 27 through 36, remaining old-root and `Delta2/3`
obligations, connected `Q8`, forest `Q8`, rank-eight PGC, and Problem 993
remain separate until their master gates are sealed.
