# Double-broom tail: h11 freeze and exact recurrence-cone obstruction

Date: 2026-08-29

## Scope and status

This note records two exact, replayable outcomes for the connected
double-broom path-Pascal gap.

1. Newton total `h=i+j=11` is a complete fixed-total theorem for every path
   order and rank.  Together with the previously frozen totals, the finite
   Newton collar now reaches `h<=11`.
2. The corrected all-index generating identity is sound, but the natural
   order-six even/odd recurrence-state cone fails.  Every contiguous
   hard-block enlargement fails, and even an index-dependent but
   rank-independent scalar transfer of the `N2` reserve cannot repair it.

Neither result proves or disproves the all-index connected double-broom
theorem, arbitrary-forest ISO, or Erdős Problem 993.

## Fresh h11 replay

Run

```powershell
python .\verify_double_broom_h11_freeze_double_broom_tail_agent.py
```

It reconstructs the complete canonical h11 report in memory and compares it
field-for-field after JSON normalization.  This is a fresh producer replay,
not an independent derivation.

```text
marker:
PASS_EXACT_FRESH_REPLAY_FREEZE_DOUBLE_BROOM_NEWTON_TOTAL_H_11

canonical marker:
PASS_EXACT_ALL_PATH_ORDER_DOUBLE_BROOM_DIAGONAL_GAP_NEWTON_TOTAL_H_11

unordered Newton pairs:
(0,11), (1,10), (2,9), (3,8), (4,7), (5,6)

universal operator layers: 712
complete n=2,3 terminal cells: 186
complete n=4,5 gap cells: 198
```

Hashes:

```text
fixed-total source:
FA84F3309552009ABB02B3AD3FCF6E5F0A5F484CC694D7BD412B8BF5117E6ED6

canonical h11 report:
001D127338C19A9FB3A57A6D983F7CCBFAEE816EF649600402584385E52795CE

canonical h11 value stream:
4FE8C28C6E8CC7A1FBA28A2954DD650466B9B65374E78AC3682DA11FE6FEF5EB

fresh replay source:
CE95C3DFE1706789213EDA46E6C32ED6437797F62F398383A80A26A793FE49EE

fresh replay report:
3E2DABBD099922B9D72B134DDA05F2A5FC89F3E0A5F980B20DC3B0A6BDF0B2B6
```

## Corrected generating-operator freeze

Run

```powershell
python .\replay_corrected_double_broom_generating_double_broom_tail_agent.py
```

It rederives the eight rational operator coefficients and matches the current
canonical JSON field-for-field.  The corrected common denominator has all six
primitive factors squared:

\[
(1-u\phi)^2(1-v\phi)^2
(1-uz)^2(1-uw)^2(1-vz)^2(1-vw)^2.
\]

```text
marker:
PASS_EXACT_CORRECTED_DOUBLE_BROOM_GENERATING_OPERATOR_FREEZE_REPLAY

corrected source:
E7DE4F3EF8025735E00B4117101E88BEF053447C77ABBF24D14C99651F695E7F

corrected canonical/replay report:
B0874389C087D28490CB2DE4BF28511E8C4F663CF565F4E23DB325B78718DD7C

freeze source:
E81127BBF0623FD7611CCF5E00D82D7A89D967BFBCB6BDBDED17A3B30B8363CC

freeze report:
DB833EEAB01EB95FEC57A9B8DFED6A307933B7298E22ED6231C8169848F2E03E
```

The older hash block in
`ISO_DOUBLE_BROOM_UNIFORM_NEWTON_GENERATING_OPERATORS_AGENT_2026-08-29.md`
predates the squared-factor correction.  It should not be used to identify
the current source or JSON.  This agent note does not edit that root document.

## Exact paired, contiguous-block, and scalar-payment obstructions

On the one-index slice `i=0`, put

\[
D(v)=(1-v\phi)^2(1-vz)^2(1-vw)^2=\sum_{k=0}^6 d_kv^k,
\]

\[
G_j=N_{0,j}(F_6)-N_{0,j}(F_5)-pN_{0,j}(F_4),
\qquad
N_j=\sum_{k=0}^{\min(6,j)}d_kG_{j-k}.
\]

The cleared numerator has support `N0,...,N5`.  If

\[
D(v)^{-1}=\sum_{r\ge0}K_rv^r,
\]

then the coefficients have the exact positive sum

\[
K_r=\sum_{a+b+c=r}(a+1)(b+1)(c+1)\phi^az^bw^c.
\]

The verifier checks the inverse-series recurrence and literal reconstruction
for `j=0,...,12`.

The natural leading pair is

\[
K_jN_0+K_{j-1}N_1.
\]

At `j=2`, diagonal rank `3`, it equals `-54`.  The omitted state contributes
`[z^3w^3]N_2=70`, so the literal full gap is positive at the same cell:

\[
-54+70=16.
\]

Thus this is an exact counterexample to the paired-state cone, not to the
double-broom gap.

Every nontrivial contiguous two-block cut of `N0,...,N5` also fails exactly:

| cut | failed side | `(i,j)` | rank | value |
|---|---|---:|---:|---:|
| `N0 \| N1...N5` | right | `(0,1)` | 3 | `-259` |
| `N0...N1 \| N2...N5` | left | `(0,2)` | 3 | `-54` |
| `N0...N2 \| N3...N5` | right | `(0,3)` | 4 | `-544` |
| `N0...N3 \| N4...N5` | left | `(0,5)` | 5 | `-960` |
| `N0...N4 \| N5` | right | `(0,5)` | 5 | `-69` |

These five witnesses exhaust all nonempty contiguous cuts.  The verifier also
exhausts all `31` unique nontrivial hard bipartitions after fixing `N0` on the
left.  Every one fails by `j<=5`; the six witness signatures occur with
multiplicities `16, 8, 4, 1, 1, 1`.  Hence no partition of the states into two
or more independently nonnegative hard blocks exists: any larger partition
would coarsen to one of the refuted bipartitions.  This includes every
non-contiguous hard assignment.

The obvious constant-split repair also fails.  Suppose a real constant
`lambda` transfers `lambda K_(j-2)N2` from pair `(N2,N3)` to pair `(N0,N1)`.
At `(i,j)=(0,12)` two exact diagonals require

\[
\lambda\ge\frac{3506}{3880}=\frac{1753}{1940}
\quad\text{(rank 16)},
\]

and

\[
\lambda\le\frac{618640}{1266132}=\frac{154660}{316533}
\quad\text{(rank 8)}.
\]

The lower bound is larger; the cross-product gap is `254841949`.  Hence no
real constant `lambda` repairs both cells.

Allowing `lambda` to depend on the index `j` still does not work if it remains
rank-independent.  Pool all states `N2,...,N5` to fund the tail side.  At the
single index `(i,j)=(0,4)`, rank 8 requires

\[
\lambda_4\ge\frac{498}{600}=\frac{83}{100},
\]

while rank 4 requires

\[
\lambda_4\le\frac{1148}{1540}=\frac{41}{55}.
\]

Here the full rank-4 gap is still positive (`50`).  The two bounds are
incompatible, with cross-product gap `465`.  Therefore no real scalar
sequence `lambda_j` can repair this cone; a surviving cross-payment must be
rank-sensitive/operator-valued or use a non-contiguous higher-dimensional
state.

Run

```powershell
python .\verify_double_broom_even_odd_recurrence_cone_obstruction_double_broom_tail_agent.py
```

```text
marker:
FOUND_EXACT_DOUBLE_BROOM_ALL_HARD_STATE_PARTITIONS_AND_INDEX_SCALAR_RECURRENCE_CONE_OBSTRUCTIONS

source:
3705888C24A4D82A25942E0366C6FC5AE766744CD19E443F99876BD6DD74AAAF

report:
F13AD1D4C872F8F204FF824C220061D51281A56154B8E2D4FB3ED8ED9BC974F4

value stream:
04D0AFFC60F7EBFE4F93BEA234FA97126B39071E46077A490D1EBE72C1CD8C70
```

## Remaining exact obligation

A uniform proof now needs a genuinely fractional rank-sensitive/operator-
valued cross-payment, a cone not induced by hard state grouping, or a
different exact diagonal argument.  No untested Newton total is promoted by
this note.
