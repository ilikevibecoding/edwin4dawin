#!/usr/bin/env python3
"""Check stochastic ordering of normalized t=3 residual weight rows."""

from probe_t3_weight_unimodality import weight_matrix


def main():
    for q in range(3, 51):
        matrix = weight_matrix(q)
        signs = []
        for p in range(q - 1):
            first = matrix[p][: q - p]
            second = matrix[p + 1][: q - p - 1]
            first_total = sum(first)
            second_total = sum(second)
            cumulative = 0
            local = []
            for b in range(q - p - 1):
                cumulative += first[b] / first_total - second[b] / second_total
                local.append(cumulative)
            # The final b=r term restores cumulative sum to zero.
            if all(value > 0 for value in local):
                signs.append("+")
            elif all(value < 0 for value in local):
                signs.append("-")
            else:
                print(f"q={q} p={p} FAIL cumulative={local}")
                return
        print(f"q={q} PASS signs={''.join(signs)}", flush=True)


if __name__ == "__main__":
    main()
