// Web Worker: bakes the Coruscant base fields and detail tile off the main thread and transfers the
// buffers back (no copy). Message in: { baseW, baseH, detailSize, seedBase, seedDetail }.
import { bakeBaseFields, bakeDetail, channelMean } from "./envCityBake.js";

self.onmessage = (e) => {
  const { baseW, baseH, detailSize, seedBase, seedDetail } = e.data;
  const t0 = performance.now();
  const base = bakeBaseFields(baseW, baseH, seedBase);
  const detail = bakeDetail(detailSize, seedDetail);
  const pinMean = channelMean(detail, 1) + 0.9 * channelMean(detail, 3);
  self.postMessage(
    {
      base,
      detail,
      baseW,
      baseH,
      detailSize,
      pinMean,
      ms: performance.now() - t0,
    },
    [base.buffer, detail.buffer],
  );
};
