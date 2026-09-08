function calculateIterations(iterations) {
  let value = 0;
  for (let i = 0; i < iterations; i += 1) {
    value += Math.sin(i * 0.001) * Math.cos(i * 0.0003);
    if (i > 0 && i % 100_000 === 0) {
      self.postMessage({ type: "progress", done: i, total: iterations });
    }
  }
  return value;
}

self.addEventListener("message", (event) => {
  const { iterations } = event.data;
  calculateIterations(iterations);
  self.postMessage({ type: "done", done: iterations, total: iterations });
});
