# Rank-eight exceptional first-crossing alpha-five/source-nine pilot

Date: 2026-08-20

Status: **resource-gated exact PASS for the single cell `source=9`,
`terminal=5`, `total=14`, with an independent bidirectional no-gap audit.
Sources 10 through 13 were not run, and this stops before alpha six.**

## Exact partial-state closure

The sorted-type recurrence was closed once through all 72 component types of
alpha at most five, retaining the exact key `(alpha,i1,...,i9)` through partial
alpha 13.

```text
alpha   0  1  2  3  4   5   6   7    8    9   10    11    12    13
states  1  2  5 13 38 117 222 500 1131 2591 5677 10545 21607 43731
```

The total is 86,180 distinct partial states.  The exact raw-multiset upper
bound before jet-equivalence compression is 121,152:

```text
alpha      0 1 2  3  4   5   6   7    8    9   10    11    12    13
raw upper  1 2 5 13 39 123 256 575 1334 3162 7222 14554 30260 63606
```

## Certified single cell

```text
source alpha                         9
terminal alpha                       5
total alpha                         14
canonical checks                89,865
distinct product jets           74,384
key-to-product collisions       15,481
negative Q8                          0
zero Q8                              0
minimum Q8                   9,324,000
maximum Q8             645,593,485,824
```

Every canonical value is strictly positive.

## Independent bidirectional audit

The audit independently enumerated every total-alpha-14 exponent vector of
the 72 alpha-at-most-five component types containing an alpha-five component.
It selected the unique largest alpha-five type, removed one copy by exact
triangular deconvolution, and reconstructed the canonical key.

```text
raw multisets                   107,784
canonical keys                   89,865
distinct products                74,384
multiset-to-key collisions       17,919
key-to-product collisions        15,481
max multisets per key                 5
max keys per product                  6
max multisets per product            14
```

The independent and recurrence key tables, and their product tables, matched
in both directions by exact relational `EXCEPT`.  The sealed recurrence
database hash was unchanged before and after the audit.  Collisions are exact
equivalence compression of identical retained jets, not omitted cases.

## Resource gate

The run aborted automatically if either actual private memory or its
projection reached 480 MiB.  The projection was

```text
baseline private bytes
+ 1.25 * observed dynamic bytes per distinct state
       * exact raw-multiset state upper bound.
```

Pilot resources:

```text
workers                           1
elapsed                            2.222342499997467 seconds
peak private bytes               69,566,464
peak private MiB                 66.34375
maximum projected private bytes 112,105,379
maximum projected private MiB   106.91202068328857
abort gate                       480 MiB
hard cap                         512 MiB
```

Audit resources:

```text
workers              1
elapsed               6.129612799966708 seconds
peak private bytes   55,160,832
peak private MiB     52.60546875
abort gate          480 MiB
hard cap            512 MiB
```

No resource checkpoint was needed.  This package does not certify alpha-five
sources 10 through 13, any terminal-alpha-six cell, a full/full cone, or any
connected `Delta0..3` case.

## Exact hashes

```text
probe_rank8_exceptional_first_crossing_alpha5_s9_exact.py
A1A0B7AC8C97A00D438A78728C96A405C6BB138B0F822DA08D0F44570C1DFFD7

rank8_exceptional_first_crossing_alpha5_s9_exact_20260820.json
50E77D5AE729305D2C143DE41D4DED44B93360DF144F14F9CD5374795A7B1602

rank8_exceptional_first_crossing_alpha5_s9_keys_exact_20260820.sqlite3
7EC06FD049800337E4BAE0F541E64DF3BB621CFECE2B82B439B3E97038CE4D29

audit_rank8_exceptional_first_crossing_alpha5_s9.py
447CCCC075EAC41865C83B3BE55B0B6D4BCCBB0FEF910416A11A1BBE76A13A96

rank8_exceptional_first_crossing_alpha5_s9_audit_exact_20260820.json
10FE563C52BF947E9DEAC75F6446296141A4C7CBE4C1F8F086D8646DFC26B1CF

audit_rank8_exceptional_first_crossing_alpha4.py
F0B14E675926750FEB5B6FA8C49677D82316B3AF9C73BCAC5B81C0A92E6A60FF

probe_rank8_exceptional_first_crossing_alpha2_exact.py
DEB3979EAD3F997A7399C4485AFCABF7D246B66FC02A2B8D8ABA6F7BFA5D46D3

rank8_exceptional_tree_jets_exact_20260820.tsv
B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A

rank8_exceptional_tree_jets_exact_20260820.json
BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4
```
