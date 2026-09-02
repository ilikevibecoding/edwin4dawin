# Forest terminal `m=1`, `j=3`: obstruction to the obsolete `A`-only wedge relaxation

Date: 2026-08-29

Status: **exact relaxation obstruction, not a graph or theorem
counterexample.**

Take

```text
N=1681, h=1, d=1341, R=0,
S=N-d=340,
L=N-2h-d-R=338,
W=C(d,2)+R=898470.
```

The fixed-edge and root-class quantities are

```text
U3=6435689,
B=783324141,
y=U3/(U3+B)=6435689/789759830.
```

Here `B>0`, so this is the genuine root-class cap, not the conservative
`B<0` extension.  The required positive rows are

```text
a=1411701,
p1=1413723,
b=789702539,
A1=1120325273118333.
```

Direct exact substitution into the retained coupled and tangent branches
gives, respectively,

```text
-400533540735423582269175901622706161590889178
------------------------------------------------
 2522477146387530583948599526135

-416041876859959445497906030936302243699612
---------------------------------------------
 69150148232316094673203562695
```

Both are negative.  Thus the enlarged parameter relaxation using only

```text
W >= A=C(d,2)+R
```

cannot support an all-order two-branch proof.

However, this cell violates the exact marked-forest wedge floor

```text
W >= C(d,2)+R+L=898808.
```

It therefore need not be realizable by a forest in the stated structural
class and is not evidence against the actual payment or conjecture.  Its
role is solely to identify the missing `+L` correlation.

Replay with

```powershell
$env:PYTHONHASHSEED='0'
python verify_terminal_q3_m1_forest_j3_enlarged_w_obstruction_independent_agent.py
```

The verifier reconstructs every row using integer and rational arithmetic,
checks both exact negative fractions, and checks exclusion by the corrected
wedge floor.
