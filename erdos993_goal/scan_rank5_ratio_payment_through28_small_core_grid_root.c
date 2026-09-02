#define scan_ratio_payment scan_ratio_payment_diagonal_unused
#include "scan_rank5_ratio_payment_order28_small_cores_root.c"
#undef scan_ratio_payment

/*
 * Complete local-payment grid for induction through total order 28.
 * The included translation unit supplies the exact polynomial DP and signed
 * 128-bit payment arithmetic; this callback changes only the finite coverage.
 */

static u64 grid_trees[MAX_ORDER + 1];
static u64 grid_roots[MAX_ORDER + 1][27];
static u64 grid_negative[MAX_ORDER + 1][27];
static i128 grid_minimum[MAX_ORDER + 1][27];
static unsigned char grid_minimum_set[MAX_ORDER + 1][27];
static u64 grid_witness_tree[MAX_ORDER + 1][27];
static int grid_witness_root[MAX_ORDER + 1][27];
static u64 grid_witness_window[MAX_ORDER + 1][27][5];
static int grid_registered = 0;

static void report_grid(void)
{
    u64 total_tree_rows = 0, total_root_rows = 0, total_negative = 0;
    puts("core_order,siblings,total_order,trees,roots,negative,min_margin,witness_tree,witness_root,a,b,d,e,f");
    for (int order = 1; order <= MAX_ORDER; ++order)
    {
        int low = 10 - order;
        if (low < 0) low = 0;
        int high = 26 - order;
        for (int siblings = low; siblings <= high; ++siblings)
        {
            printf("%d,%d,%d,%llu,%llu,%llu,", order, siblings,
                   order + siblings + 2, grid_trees[order],
                   grid_roots[order][siblings], grid_negative[order][siblings]);
            print_i128(grid_minimum[order][siblings]);
            printf(",%llu,%d,%llu,%llu,%llu,%llu,%llu\n",
                   grid_witness_tree[order][siblings],
                   grid_witness_root[order][siblings],
                   grid_witness_window[order][siblings][0],
                   grid_witness_window[order][siblings][1],
                   grid_witness_window[order][siblings][2],
                   grid_witness_window[order][siblings][3],
                   grid_witness_window[order][siblings][4]);
            total_tree_rows += grid_trees[order];
            total_root_rows += grid_roots[order][siblings];
            total_negative += grid_negative[order][siblings];
        }
    }
    printf("TOTAL_ROWS,%llu,%llu,%llu\n", total_tree_rows, total_root_rows, total_negative);
    puts(total_negative == 0
         ? "PASS_EXACT_RANK5_RATIO_PAYMENT_THROUGH28_SMALL_CORE_GRID"
         : "FAIL_RANK5_RATIO_PAYMENT_THROUGH28_SMALL_CORE_GRID");
}

void scan_ratio_payment_grid(FILE *output, int parent[], int order)
{
    (void)output;
    if (!grid_registered)
    {
        if (atexit(report_grid) != 0) abort();
        grid_registered = 1;
    }
    current_order = order;
    memset(adjacency, 0, sizeof(adjacency));
    memset(done, 0, sizeof(done));
    memset(msg_excluded, 0, sizeof(msg_excluded));
    memset(msg_total, 0, sizeof(msg_total));
    for (int vertex = 2; vertex <= order; ++vertex)
    {
        int ancestor = parent[vertex];
        adjacency[vertex][ancestor] = 1;
        adjacency[ancestor][vertex] = 1;
    }
    message(1, 0);
    u64 core[LIMIT + 1];
    memcpy(core, msg_total[1][0], sizeof(core));

    u64 deleted_by_root[MAX_ORDER + 1][LIMIT + 1];
    memset(deleted_by_root, 0, sizeof(deleted_by_root));
    for (int root = 1; root <= order; ++root)
    {
        deleted_by_root[root][0] = 1;
        u64 temporary[LIMIT + 1];
        for (int neighbor = 1; neighbor <= order; ++neighbor)
        {
            if (!adjacency[root][neighbor]) continue;
            message(neighbor, root);
            poly_mul(deleted_by_root[root], msg_total[neighbor][root], temporary);
            memcpy(deleted_by_root[root], temporary, sizeof(temporary));
        }
    }

    u64 tree_index = grid_trees[order]++;
    int low = 10 - order;
    if (low < 0) low = 0;
    int high = 26 - order;
    for (int siblings = low; siblings <= high; ++siblings)
    {
        u64 d = smoothed(core, siblings, 3);
        u64 e = smoothed(core, siblings, 4);
        u64 f = smoothed(core, siblings, 5);
        for (int root = 1; root <= order; ++root)
        {
            u64 a = e + deleted_by_root[root][3];
            u64 b = f + deleted_by_root[root][4];
            i128 margin = ratio_payment_margin(a, b, d, e, f);
            ++grid_roots[order][siblings];
            if (margin < 0) ++grid_negative[order][siblings];
            if (!grid_minimum_set[order][siblings]
                || margin < grid_minimum[order][siblings])
            {
                grid_minimum_set[order][siblings] = 1;
                grid_minimum[order][siblings] = margin;
                grid_witness_tree[order][siblings] = tree_index;
                grid_witness_root[order][siblings] = root;
                grid_witness_window[order][siblings][0] = a;
                grid_witness_window[order][siblings][1] = b;
                grid_witness_window[order][siblings][2] = d;
                grid_witness_window[order][siblings][3] = e;
                grid_witness_window[order][siblings][4] = f;
            }
        }
    }
}
