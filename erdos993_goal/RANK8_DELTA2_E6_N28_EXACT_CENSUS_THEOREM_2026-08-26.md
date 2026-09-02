# Exact order-28, degree-surplus-six Delta2 census

Date: 2026-08-26

## Theorem

Let `T` be a tree on 28 vertices and put

```text
e(T)=sum_v binom(deg_T(v)-1,2).
```

If `e(T)=6`, then for every root `q` the rank-eight terminal residual
satisfies

```text
Delta^2 R_1(T,q) > 0.
```

This is an exact finite theorem. It closes only this order/surplus layer of
the remaining rank-eight terminal argument; it is not by itself a proof of
Problem 993.

## Exhaustive reduction

Suppress every degree-two vertex of `T`. The resulting tree has no
degree-two vertices and has the same degree surplus. Exact generation gives
ten nonisomorphic suppressed skeletons with surplus six. Conversely, every
order-28 tree with surplus six is obtained from exactly one of these
skeletons by assigning a positive integer length to every skeleton edge,
with the lengths summing to 27.

The ten complete skeleton automorphism groups act on these length vectors.
Burnside counts and a direct orbit marking traversal agree on

```text
raw positive length vectors     51,374,180
automorphism orbits              6,361,943
rooted evaluations             178,134,404
```

The skeleton data generator verifies group closure, computes fixed-point
counts for every edge permutation, and applies Burnside's lemma. A separate
audit rebuilds the graph automorphisms and all fixed-composition counts
without importing the generator.

## Exact residual evaluation

For every canonical subdivision, the primary census constructs its tree,
computes `I(T;x)` and all 28 polynomials `I(T-q;x)` by directed tree
messages, and evaluates the exact `Delta^2 R_1` integer. Every value is
strictly positive. Checked signed-128-bit arithmetic is periodically replayed
through the independently pinned signed-256-bit residual core.

The global minimum is

```text
Delta^2 R_1 = 72,663,413,872,580,734,766,976,
```

on skeleton 1 with edge lengths `[1,3,3,3,17]` and root vertex 1.

The independent census uses a separately written heap-adjacency
representation and memoized directed-edge independence messages. It imports
neither the primary census source nor its dynamic program. It repeats all
178,134,404 rooted evaluations and agrees for each of the ten skeletons on:

- the raw, canonical, and rooted counts;
- the minimum and maximum residual;
- the sum of all residuals;
- the complete minimum witness; and
- a SHA-256 digest of the ordered stream of all rooted residuals.

The final agreement gate pins both executables, both sources, and both JSON
reports, and checks all of those equalities field by field.

## Replay and immutable evidence

```powershell
python generate_rank8_delta2_e6_n28_skeleton_data_root.py
python audit_rank8_delta2_e6_n28_skeleton_data_root.py
rustc -O -C overflow-checks=yes certify_rank8_delta2_e6_n28_census_root.rs
.\certify_rank8_delta2_e6_n28_census_root.exe
rustc -O -C overflow-checks=yes audit_rank8_delta2_e6_n28_census_root.rs
.\audit_rank8_delta2_e6_n28_census_root.exe
python gate_rank8_delta2_e6_n28_census_agreement_root.py
```

Key SHA-256 digests are:

```text
rank8_delta2_e6_n28_skeleton_data_root.rs
3A040EBED79C47BD11E55712A2176C68D047E65E594BC9B0DD8C850F5E8540E5

rank8_delta2_e6_n28_skeleton_data_root_20260826.json
F8B97078683A1ADA815FAED259DB42D13F25E6F0B7068F98D33EFC0A733A231D

certify_rank8_delta2_e6_n28_census_root.rs
5D52CC2BFBDD1D9BD3D781FD6C6E5435569D5EBD7967ECE183415B9CC6CF83BA

certify_rank8_delta2_e6_n28_census_root.exe
B1728E810C2B687E3E41749699C68DFFD0516EEF66D02640A4E6E47BD41E6D6F

rank8_delta2_e6_n28_census_exact_root_20260826.json
0DC9A209EDF14A70BACB3827B9A7A080347E0458AF024233C5095B880652FC0A

audit_rank8_delta2_e6_n28_census_root.rs
3BAF51E46356918EF81126C8A23317831B209FD78927F3F16165A536A5FC201E

audit_rank8_delta2_e6_n28_census_root.exe
81133338E612D38B9171B06624E3FC04D709AA1B5D3A364379EE1E1FBC4A388D

rank8_delta2_e6_n28_census_independent_audit_root_20260826.json
912CEB454A52E717605393A4A57ED5004ED8F9392E668FFAA03EF540ED80ADE6

gate_rank8_delta2_e6_n28_census_agreement_root.py
ED6DC1C2D14AD895A6214C0FFD8E2445CBAD23CC2237C05D928DA9A677855A1E

rank8_delta2_e6_n28_census_agreement_gate_root_20260826.json
0DF11727FAD27698F7B3E3B0A602393F31EA92137C9287F43B99828CE83D4E15
```
