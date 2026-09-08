(() => {
  const cleanups = [];

  const formatMs = (value) => `${Math.round(value)}ms`;
  const formatNumber = (value) => value.toLocaleString("en-US");

  const getDemoCopy = () => document.documentElement.lang === "en"
    ? {
        blockingStart: (duration) => `Blocking the main thread for ${formatMs(duration)}…`,
        blockingDone: (duration) => `Done · The CSS dot kept moving during ${formatMs(duration)} of blocking.`,
        blockingReady: "Ready",
        blockingJsPaused: "Paused → recovered",
        blockingCssRunning: "Kept running",
        framePending: "Not measured yet",
        frameMeasuring: (frames, maxGap, delayed) => `Measuring · ${frames} frames · max gap ${maxGap ? formatMs(maxGap) : "—"} · ${delayed} delayed`,
        frameResult: (frames, maxGap, delayed) => `${frames} frames · max gap ${maxGap ? formatMs(maxGap) : "—"} · ${delayed} delayed`,
        chunkSync: "1/2 · Running one long task… Watching frame gaps.",
        chunked: "Running in 5ms slices… Watching frame gaps.",
        chunkCompareSync: "1/2 · Running one long task… Watching frame gaps.",
        chunkCompareChunked: "2/2 · Running in 5ms slices… Watching frame gaps.",
        chunkCompareDone: (sync, chunked) => `Comparison done · One task ${formatMs(sync)} / Frame slices ${formatMs(chunked)}. Read the frame monitor above.`,
        chunkDone: (mode, duration) => `Done · ${mode} finished in ${formatMs(duration)}. Read the frame monitor above.`,
        oneTask: "One task",
        frameSlices: "Frame slices",
        workerMain: "Calculating on the main thread… Watching frame gaps.",
        worker: "Calculating in a Worker… Watching frame gaps.",
        workerCompareMain: "1/2 · Calculating on the main thread… Watching frame gaps.",
        workerCompareWorker: "2/2 · Calculating in a Worker… Watching frame gaps.",
        workerCompareDone: (main, worker) => `Comparison done · Main thread ${formatMs(main)} / Worker ${formatMs(worker)}. Read the frame monitor above.`,
        workerDone: (mode, duration) => `Done · ${mode} finished in ${formatMs(duration)}. Read the frame monitor above.`,
        mainThread: "Main thread",
        workerThread: "Worker",
        workerError: "The Worker could not start in this context. Try the published site or a local server.",
      }
    : {
        blockingStart: (duration) => `메인 스레드를 ${formatMs(duration)} 동안 막는 중…`,
        blockingDone: (duration) => `완료 · ${formatMs(duration)} 동안 막아도 CSS 점은 계속 움직였습니다.`,
        blockingReady: "실행 준비",
        blockingJsPaused: "멈췄다가 재개",
        blockingCssRunning: "계속 실행",
        framePending: "측정 전",
        frameMeasuring: (frames, maxGap, delayed) => `측정 중 · ${frames}프레임 · 최대 간격 ${maxGap ? formatMs(maxGap) : "—"} · 지연 ${delayed}개`,
        frameResult: (frames, maxGap, delayed) => `${frames}프레임 · 최대 간격 ${maxGap ? formatMs(maxGap) : "—"} · 지연 ${delayed}개`,
        chunkSync: "1/2 · 한 번에 처리 중… 프레임 간격을 측정하고 있습니다.",
        chunked: "5ms씩 나눠 실행 중… 프레임 간격을 측정하고 있습니다.",
        chunkCompareSync: "1/2 · 한 번에 처리 중… 프레임 간격을 측정하고 있습니다.",
        chunkCompareChunked: "2/2 · 프레임당 5ms씩 처리 중… 프레임 간격을 측정하고 있습니다.",
        chunkCompareDone: (sync, chunked) => `비교 완료 · 한 번에 처리 ${formatMs(sync)} / 프레임 분할 ${formatMs(chunked)} · 위 프레임 모니터에서 지연을 확인해보세요.`,
        chunkDone: (mode, duration) => `완료 · ${mode} 작업이 ${formatMs(duration)}에 끝났습니다 · 위 프레임 모니터에서 지연을 확인해보세요.`,
        oneTask: "한 번에 처리",
        frameSlices: "프레임 분할",
        workerMain: "메인 스레드에서 계산 중… 프레임 간격을 측정하고 있습니다.",
        worker: "Worker에서 계산 중… 프레임 간격을 측정하고 있습니다.",
        workerCompareMain: "1/2 · 메인 스레드에서 계산 중… 프레임 간격을 측정하고 있습니다.",
        workerCompareWorker: "2/2 · Worker에서 계산 중… 프레임 간격을 측정하고 있습니다.",
        workerCompareDone: (main, worker) => `비교 완료 · 메인 스레드 ${formatMs(main)} / Worker ${formatMs(worker)} · 위 프레임 모니터에서 지연을 확인해보세요.`,
        workerDone: (mode, duration) => `완료 · ${mode} 계산이 ${formatMs(duration)}에 끝났습니다 · 위 프레임 모니터에서 지연을 확인해보세요.`,
        mainThread: "메인 스레드",
        workerThread: "Worker",
        workerError: "이 환경에서는 Worker를 시작할 수 없습니다. 배포된 사이트나 로컬 서버에서 다시 시도하세요.",
      };

  function setButtonsDisabled(root, disabled) {
    root.querySelectorAll("button").forEach((button) => {
      button.disabled = disabled;
    });
  }

  function createFrameTelemetry(root, copy) {
    const resultNodes = new Map(
      [...root.querySelectorAll("[data-demo-frame-result]")].map((node) => [node.dataset.demoFrameResult, node]),
    );
    let animationFrame = 0;
    let activeKey = "";
    let running = false;
    let stopRequested = false;
    let lastFrameAt = 0;
    let frames = 0;
    let maxGap = 0;
    let delayedFrames = 0;
    let startResolver;
    let stopResolver;

    const snapshot = () => ({ frames, maxGap, delayedFrames });

    const render = (state) => {
      const node = resultNodes.get(activeKey);
      if (!node) return;

      const result = snapshot();
      node.textContent = state === "measuring"
        ? copy.frameMeasuring(result.frames, result.maxGap, result.delayedFrames)
        : copy.frameResult(result.frames, result.maxGap, result.delayedFrames);
    };

    const tick = () => {
      if (!running) return;

      const observedAt = performance.now();
      if (lastFrameAt > 0) {
        const gap = observedAt - lastFrameAt;
        frames += 1;
        maxGap = Math.max(maxGap, gap);
        if (gap > 50) delayedFrames += 1;
      }
      lastFrameAt = observedAt;
      render("measuring");

      if (startResolver) {
        const resolveStart = startResolver;
        startResolver = undefined;
        resolveStart();
      }

      if (stopRequested) {
        running = false;
        animationFrame = 0;
        render("done");
        const resolveStop = stopResolver;
        stopResolver = undefined;
        resolveStop?.(snapshot());
        return;
      }

      animationFrame = requestAnimationFrame(tick);
    };

    return {
      reset() {
        resultNodes.forEach((node) => {
          node.textContent = copy.framePending;
        });
      },
      start(key) {
        activeKey = key;
        running = true;
        stopRequested = false;
        lastFrameAt = 0;
        frames = 0;
        maxGap = 0;
        delayedFrames = 0;
        render("measuring");

        return new Promise((resolve) => {
          startResolver = resolve;
          animationFrame = requestAnimationFrame(tick);
        });
      },
      stop() {
        if (!running) return Promise.resolve(snapshot());

        stopRequested = true;
        return new Promise((resolve) => {
          stopResolver = resolve;
        });
      },
      summary(result) {
        return copy.frameResult(result.frames, result.maxGap, result.delayedFrames);
      },
      destroy() {
        running = false;
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        startResolver?.();
        startResolver = undefined;
        stopResolver?.(snapshot());
        stopResolver = undefined;
      },
    };
  }

  function setupBlockingDemo(root) {
    const copy = getDemoCopy();
    const jsRunner = root.querySelector(".demo-runner-js");
    const status = root.querySelector("[data-demo-status]");
    const jsState = root.querySelector('[data-demo-state="js"]');
    const cssState = root.querySelector('[data-demo-state="css"]');
    const buttons = [...root.querySelectorAll('[data-demo-action="block"]')];
    let animationFrame = 0;
    let startFrame = 0;
    let timeoutId = 0;
    let startedAt = performance.now();
    let jsTravel = 0;

    const updateRunnerTravel = () => {
      root.querySelectorAll(".demo-line").forEach((line) => {
        const runner = line.querySelector(".demo-runner");
        if (!runner) return;

        const travel = Math.max(0, line.clientWidth - runner.offsetWidth);
        line.style.setProperty("--demo-runner-travel", `${travel}px`);
        if (runner === jsRunner) jsTravel = travel;
      });
    };

    const setObservation = (isBlocking) => {
      jsState.textContent = isBlocking ? copy.blockingJsPaused : copy.blockingReady;
      cssState.textContent = isBlocking ? copy.blockingCssRunning : copy.blockingReady;
    };

    setObservation(false);

    const animate = (now) => {
      const cycle = ((now - startedAt) % 4800) / 4800;
      const progress = cycle <= 0.5 ? cycle * 2 : 2 - cycle * 2;
      jsRunner.style.transform = `translate(${progress * jsTravel}px, -50%)`;
      animationFrame = requestAnimationFrame(animate);
    };

    const blockMainThread = (event) => {
      const duration = Number(event.currentTarget.dataset.duration);
      setButtonsDisabled(root, true);
      status.textContent = copy.blockingStart(duration);
      setObservation(true);

      startFrame = requestAnimationFrame(() => {
        timeoutId = window.setTimeout(() => {
          const blockStartedAt = performance.now();
          while (performance.now() - blockStartedAt < duration) {
            // Intentional busy work for the experiment.
          }
          status.textContent = copy.blockingDone(duration);
          setButtonsDisabled(root, false);
        }, 0);
      });
    };

    updateRunnerTravel();
    window.addEventListener("resize", updateRunnerTravel);
    buttons.forEach((button) => button.addEventListener("click", blockMainThread));
    animationFrame = requestAnimationFrame(animate);

    return () => {
      buttons.forEach((button) => button.removeEventListener("click", blockMainThread));
      window.removeEventListener("resize", updateRunnerTravel);
      cancelAnimationFrame(animationFrame);
      cancelAnimationFrame(startFrame);
      window.clearTimeout(timeoutId);
    };
  }

  function doChunkWork(seed) {
    let value = seed | 0;
    for (let i = 0; i < 60; i += 1) {
      value = Math.imul(value ^ i, 1664525) + 1013904223;
    }
    return value;
  }

  function setupChunkingDemo(root) {
    const copy = getDemoCopy();
    const total = 500_000;
    const progress = root.querySelector("[data-demo-progress]");
    const readout = root.querySelector("[data-demo-readout]");
    const status = root.querySelector("[data-demo-status]");
    const buttons = [...root.querySelectorAll('[data-demo-action="process"]')];
    const compareButton = root.querySelector('[data-demo-action="compare"]');
    const frameMonitor = createFrameTelemetry(root, copy);
    let animationFrame = 0;
    let preparationTimeout = 0;
    let runToken = 0;

    const updateProgress = (done) => {
      progress.style.width = `${(done / total) * 100}%`;
      readout.textContent = `${formatNumber(done)} / ${formatNumber(total)} units`;
    };

    const prepareRun = (token, message, delay = 120) => new Promise((resolve) => {
      status.textContent = message;
      preparationTimeout = window.setTimeout(() => {
        preparationTimeout = 0;
        resolve(token === runToken);
      }, delay);
    });

    const pauseBetweenRuns = (token, delay = 300) => new Promise((resolve) => {
      preparationTimeout = window.setTimeout(() => {
        preparationTimeout = 0;
        resolve(token === runToken);
      }, delay);
    });

    const runMode = async (mode, token) => {
      if (token !== runToken) return null;

      await frameMonitor.start(mode === "sync" ? "sync" : "chunked");
      if (token !== runToken) {
        await frameMonitor.stop();
        return null;
      }

      const startedAt = performance.now();
      let checksum = 0;
      let index = 0;
      updateProgress(0);

      let workResult = true;
      if (mode === "sync") {
        for (index = 0; index < total; index += 1) {
          checksum ^= doChunkWork(index);
        }
        void checksum;
        updateProgress(total);
      } else {
        workResult = await new Promise((resolve) => {
          const processFrame = () => {
            if (token !== runToken) {
              resolve(false);
              return;
            }

            const deadline = performance.now() + 5;
            while (index < total && performance.now() < deadline) {
              checksum ^= doChunkWork(index);
              index += 1;
            }
            void checksum;
            updateProgress(index);

            if (index < total) {
              animationFrame = requestAnimationFrame(processFrame);
            } else {
              resolve(true);
            }
          };

          animationFrame = requestAnimationFrame(processFrame);
        });
      }

      if (!workResult || token !== runToken) {
        await frameMonitor.stop();
        return null;
      }

      const frameMetrics = await frameMonitor.stop();
      return {
        duration: performance.now() - startedAt,
        frameMetrics,
      };
    };

    const run = async (mode) => {
      const token = ++runToken;
      setButtonsDisabled(root, true);
      frameMonitor.reset();

      const ready = await prepareRun(token, mode === "sync" ? copy.chunkSync : copy.chunked);
      if (!ready || token !== runToken) return;

      const result = await runMode(mode, token);
      if (result === null || token !== runToken) return;

      status.textContent = copy.chunkDone(
        mode === "sync" ? copy.oneTask : copy.frameSlices,
        result.duration,
      );
      setButtonsDisabled(root, false);
    };

    const compare = async () => {
      const token = ++runToken;
      setButtonsDisabled(root, true);
      frameMonitor.reset();

      const ready = await prepareRun(token, copy.chunkCompareSync);
      if (!ready || token !== runToken) return;

      const syncResult = await runMode("sync", token);
      if (syncResult === null || token !== runToken) return;

      const canContinue = await pauseBetweenRuns(token);
      if (!canContinue || token !== runToken) return;

      status.textContent = copy.chunkCompareChunked;
      const chunkedResult = await runMode("chunked", token);
      if (chunkedResult === null || token !== runToken) return;

      status.textContent = copy.chunkCompareDone(
        syncResult.duration,
        chunkedResult.duration,
      );
      setButtonsDisabled(root, false);
    };

    const processHandlers = new Map();
    buttons.forEach((button) => {
      const handler = () => run(button.dataset.mode);
      processHandlers.set(button, handler);
      button.addEventListener("click", handler);
    });
    compareButton?.addEventListener("click", compare);

    return () => {
      runToken += 1;
      processHandlers.forEach((handler, button) => button.removeEventListener("click", handler));
      compareButton?.removeEventListener("click", compare);
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(preparationTimeout);
      frameMonitor.destroy();
    };
  }

  function calculateIterations(iterations) {
    let value = 0;
    for (let i = 0; i < iterations; i += 1) {
      value += Math.sin(i * 0.001) * Math.cos(i * 0.0003);
    }
    return value;
  }

  function setupWorkerDemo(root) {
    const copy = getDemoCopy();
    const iterations = 8_000_000;
    const progress = root.querySelector("[data-worker-progress]");
    const readout = root.querySelector("[data-worker-readout]");
    const status = root.querySelector("[data-demo-status]");
    const buttons = [...root.querySelectorAll('[data-demo-action="worker"]')];
    const compareButton = root.querySelector('[data-demo-action="compare"]');
    const frameMonitor = createFrameTelemetry(root, copy);
    let preparationTimeout = 0;
    let worker;
    let runToken = 0;

    const updateProgress = (done) => {
      progress.style.width = `${(done / iterations) * 100}%`;
      readout.textContent = `${formatNumber(done)} / ${formatNumber(iterations)} iterations`;
    };

    const prepareRun = (token, message, delay = 120) => new Promise((resolve) => {
      status.textContent = message;
      preparationTimeout = window.setTimeout(() => {
        preparationTimeout = 0;
        resolve(token === runToken);
      }, delay);
    });

    const pauseBetweenRuns = (token, delay = 300) => new Promise((resolve) => {
      preparationTimeout = window.setTimeout(() => {
        preparationTimeout = 0;
        resolve(token === runToken);
      }, delay);
    });

    const runMode = async (mode, token) => {
      if (token !== runToken) return null;

      await frameMonitor.start(mode === "main" ? "main" : "worker");
      if (token !== runToken) {
        await frameMonitor.stop();
        return null;
      }

      const startedAt = performance.now();
      updateProgress(0);

      let workResult = true;
      if (mode === "main") {
        workResult = await new Promise((resolve) => {
          window.setTimeout(() => {
            if (token !== runToken) {
              resolve(false);
              return;
            }

            void calculateIterations(iterations);
            updateProgress(iterations);
            resolve(true);
          }, 0);
        });
      } else {
        workResult = await new Promise((resolve) => {
          let settled = false;
          worker?.terminate();
          worker = new Worker("assets/posts/expensive-main-thread/worker.js");

          const finish = (success) => {
            if (settled) return;
            settled = true;
            worker?.terminate();
            worker = undefined;
            if (success) updateProgress(iterations);
            resolve(success);
          };

          worker.addEventListener("message", (messageEvent) => {
            if (token !== runToken) {
              finish(false);
              return;
            }

            const message = messageEvent.data;
            if (message.type === "progress") {
              updateProgress(message.done);
            } else if (message.type === "done") {
              finish(true);
            }
          });
          worker.addEventListener("error", () => {
            if (settled) return;
            status.textContent = copy.workerError;
            finish(false);
          }, { once: true });
          worker.postMessage({ iterations });
        });
      }

      if (!workResult || token !== runToken) {
        await frameMonitor.stop();
        return null;
      }

      const frameMetrics = await frameMonitor.stop();
      return {
        duration: performance.now() - startedAt,
        frameMetrics,
      };
    };

    const run = async (mode) => {
      const token = ++runToken;
      setButtonsDisabled(root, true);
      frameMonitor.reset();

      const ready = await prepareRun(token, mode === "main" ? copy.workerMain : copy.worker);
      if (!ready || token !== runToken) return;

      const result = await runMode(mode, token);
      if (result === null || token !== runToken) {
        if (token === runToken) setButtonsDisabled(root, false);
        return;
      }

      status.textContent = copy.workerDone(
        mode === "main" ? copy.mainThread : copy.workerThread,
        result.duration,
      );
      setButtonsDisabled(root, false);
    };

    const compare = async () => {
      const token = ++runToken;
      setButtonsDisabled(root, true);
      frameMonitor.reset();

      const ready = await prepareRun(token, copy.workerCompareMain);
      if (!ready || token !== runToken) return;

      const mainResult = await runMode("main", token);
      if (mainResult === null || token !== runToken) return;

      const canContinue = await pauseBetweenRuns(token);
      if (!canContinue || token !== runToken) return;

      status.textContent = copy.workerCompareWorker;
      const workerResult = await runMode("worker", token);
      if (workerResult === null || token !== runToken) return;

      status.textContent = copy.workerCompareDone(
        mainResult.duration,
        workerResult.duration,
      );
      setButtonsDisabled(root, false);
    };

    const workerHandlers = new Map();
    buttons.forEach((button) => {
      const handler = () => run(button.dataset.mode);
      workerHandlers.set(button, handler);
      button.addEventListener("click", handler);
    });
    compareButton?.addEventListener("click", compare);

    return () => {
      runToken += 1;
      worker?.terminate();
      workerHandlers.forEach((handler, button) => button.removeEventListener("click", handler));
      compareButton?.removeEventListener("click", compare);
      window.clearTimeout(preparationTimeout);
      frameMonitor.destroy();
    };
  }

  window.initMainThreadDemos = () => {
    cleanups.splice(0).forEach((cleanup) => cleanup());

    document.querySelectorAll("[data-main-thread-demo]").forEach((root) => {
      const type = root.dataset.mainThreadDemo;
      if (type === "blocking") cleanups.push(setupBlockingDemo(root));
      if (type === "chunking") cleanups.push(setupChunkingDemo(root));
      if (type === "worker") cleanups.push(setupWorkerDemo(root));
    });
  };
})();
