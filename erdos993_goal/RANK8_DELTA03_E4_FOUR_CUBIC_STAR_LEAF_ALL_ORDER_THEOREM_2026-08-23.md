# Rank-eight terminal Delta0--Delta3: four-cubic-star leaf root

## Theorem

For every subdivision of the four-cubic-star degree-surplus-four skeleton, of
every order `n>=27`, rooted at a terminal leaf,

`Delta^j R_1(A,q)>0` for `j=0,1,2,3`.

## Exact quotient and all-order lift

A distinguished rooted terminal arm has eight states; its sibling arm has
seven states, and its center-to-outer spine has eight states.  The other two
outer modules form an unordered pair.  This gives 11,289,600 exact quotient
keys, partitioned without a gap as:

- 3,198,132 all-short keys, of which 2,939,106 have order at least 27;
- 8,091,467 mixed all-order rays;
- one all-long ray.

The exact transfer/Newton reduction proves degree bounds `28,28,27,26` for
`Delta0,...,Delta3`.  The primary scan checked all 2,939,106 finite cells and
29 points on every rank-ray, totaling 938,610,288 rank-ray samples.  Every
Newton constant and first difference is positive, all higher coefficients
through the exact degree are nonnegative, and every coefficient above the
degree vanishes.

## Independent literal audit

A separately compiled checked-`i256` engine rebuilt every literal tree and
deleted the actual terminal leaf root.  It evaluated 245,683,146 literal
trees, matched the complete primary finite-value and Newton-coefficient
streams, and checked an unseen `S=29` value for each rank and ray (32,365,872
checks).

## Immutable evidence

- reduction source/report:  
  `76F9EF729173B929AD304388731A00E275E640CCA002C7B063C94CA8BA515E9D`  
  `985070390050F9F77AD5C3CF6643F83405EB3B1EBDBAEE5CCFF03136101FB1D1`
- primary source/report:  
  `C6ACB460AF6D0F34B26C720150C789D16242845FE5C7C6F8C34770E053027DB3`  
  `D68473512A37B79953BA452DF84931951E22872C57CEE0F4F983294E909CDC2B`
- literal-audit Rust source/executable/raw result:  
  `3DEF731758AD23D4C143D658F356369349612F0673987E9349A23F2267F3B138`  
  `E1DEF2D4F3DE70783181E514CD581EACA5F3975CFE9F68A0FEC84E538F93D9D7`  
  `6F197A94F983D779C25289593365C05C7EEAD81B7DDE366D34E005970F275AC5`
- sealed independent-audit source/report:  
  `ABF3872DC251080D66141B84A4D1E34AD0C15A5EF50FCD7CC022846C8DD9C8E4`  
  `3FADC1AE6E32BF19FF301416AF2006AE6B123382DD673274757B57AF17E5FEA6`

This theorem credits exactly `four_cubic_star:leaf`; all other root orbits
remain separate.
