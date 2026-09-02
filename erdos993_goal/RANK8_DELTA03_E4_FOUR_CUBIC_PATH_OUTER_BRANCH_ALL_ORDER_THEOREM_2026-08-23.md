# Rank-eight terminal Delta0--Delta3: four-cubic-path outer branch root

## Theorem

For every subdivision of the four-cubic-path degree-surplus-four skeleton, of
every order `n>=27`, rooted at either outer degree-three branch vertex,

`Delta^j R_1(A,q)>0` for `j=0,1,2,3`.

## Exact quotient and all-order lift

The two outer pendant-arm pairs are independently unordered.  Together with
three spine states and two inner pendant-arm states, this gives 19,668,992
exact quotient keys, partitioned without a gap as:

- 5,445,468 all-short keys, of which 4,950,075 have order at least 27;
- 14,223,523 mixed all-order rays;
- one all-long ray.

The exact transfer/Newton reduction proves degree bounds `28,28,27,26` for
`Delta0,...,Delta3`.  The primary scan checked all 4,950,075 finite cells and
29 points on every rank-ray, totaling 1,649,928,784 rank-ray samples.  Every
Newton constant and first difference is positive, all higher coefficients
through the exact degree are nonnegative, and every coefficient above the
degree vanishes.

## Independent literal audit

A separately compiled checked-`i256` engine used independently transcribed
right-to-left edge messages.  It rebuilt 47,620,647 literal trees, matched the
complete primary finite-value and Newton-coefficient streams, and checked an
unseen `S=29` value for each rank and ray (56,894,096 checks).

## Immutable evidence

- reduction source/report:  
  `B3D7369413B6771E4660CD59DEDC2D86266E1829DF4C6CBEEB9A772E833A1367`  
  `1EDEFB7C18566519B30F77AE7473C541A2CC86F75D4A02831610938AB879ACDC`
- primary source/report:  
  `C05C8B15621DB1014E608762484AD48BEB0D3261A263ADC67CAED237263A61FC`  
  `47ED8AC5FB58A5FB32E1FF3F70F534F403AEDF0B14F09422666A64C42D671CA6`
- literal-audit Rust source/executable/raw result:  
  `BB9FBFEB250EAA2237C256F661557D90D17D1B34090709929A367BF926079B5A`  
  `FAD3E65600669466BBEDB6363524AD2A2646A2B1F6E1628349E01200360AEAB4`  
  `1B437C0B8C62A6EBC9F58A1D916DBAE44D904EA822C81CBD2A51A44C05E407B1`
- sealed independent-audit source/report:  
  `A1070DE92E9A9633185A47B941BF31B63D092BFEF809AC2CE75062578B05C268`  
  `2C89285021FA32776AADEE7F0DF66542ED3AA80947678E71FD767A129EDD6D3B`

This theorem credits exactly `four_cubic_path:outer_branch`; all other root
orbits remain separate.
