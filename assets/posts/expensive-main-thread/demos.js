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
        inputPreparing: "Input focused · Starting in a moment. Keep typing.",
        inputReadout: (events, maxGap) => `${events} input events · max gap ${maxGap ? formatMs(maxGap) : "—"}`,
        chunkSync: "Running one long task… Keep typing.",
        chunked: "Running in 5ms slices… Keep typing.",
        chunkCompareSync: "1/2 · Running one long task… Keep typing.",
        chunkCompareChunked: "2/2 · Running in 5ms slices… Keep typing.",
        chunkCompareDone: (sync, chunked, input) => `Comparison done · One task ${formatMs(sync)} / Frame slices ${formatMs(chunked)} · ${input}`,
        chunkDone: (mode, duration, input) => `Done · ${mode} finished in ${formatMs(duration)} · ${input}`,
        oneTask: "One task",
        frameSlices: "Frame slices",
        workerMain: "Calculating on the main thread… Keep typing.",
        worker: "Calculating in a Worker… Keep typing.",
        workerCompareMain: "1/2 · Calculating on the main thread… Keep typing.",
        workerCompareWorker: "2/2 · Calculating in a Worker… Keep typing.",
        workerCompareDone: (main, worker, input) => `Comparison done · Main thread ${formatMs(main)} / Worker ${formatMs(worker)} · ${input}`,
        workerDone: (mode, duration, input) => `Done · ${mode} finished in ${formatMs(duration)} · ${input}`,
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
        inputPreparing: "입력창에 포커스를 맞췄습니다 · 잠시 후 시작하니 계속 입력해보세요.",
        inputReadout: (events, maxGap) => `입력 이벤트 ${events}회 · 최대 공백 ${maxGap ? formatMs(maxGap) : "—"}`,
        chunkSync: "한 번에 긴 작업을 실행 중… 계속 입력해보세요.",
        chunked: "5ms씩 나눠 실행 중… 계속 입력해보세요.",
        chunkCompareSync: "1/2 · 한 번에 처리 중… 계속 입력해보세요.",
        chunkCompareChunked: "2/2 · 프레임당 5ms씩 처리 중… 계속 입력해보세요.",
        chunkCompareDone: (sync, chunked, input) => `비교 완료 · 한 번에 처리 ${formatMs(sync)} / 프레임 분할 ${formatMs(chunked)} · ${input}`,
        chunkDone: (mode, duration, input) => `완료 · ${mode} 작업이 ${formatMs(duration)}에 끝났습니다 · ${input}`,
        oneTask: "한 번에 처리",
        frameSlices: "프레임 분할",
        workerMain: "메인 스레드에서 계산 중… 계속 입력해보세요.",
        worker: "Worker에서 계산 중… 계속 입력해보세요.",
        workerCompareMain: "1/2 · 메인 스레드에서 계산 중… 계속 입력해보세요.",
        workerCompareWorker: "2/2 · Worker에서 계산 중… 계속 입력해보세요.",
        workerCompareDone: (main, worker, input) => `비교 완료 · 메인 스레드 ${formatMs(main)} / Worker ${formatMs(worker)} · ${input}`,
        workerDone: (mode, duration, input) => `완료 · ${mode} 계산이 ${formatMs(duration)}에 끝났습니다 · ${input}`,
        mainThread: "메인 스레드",
        workerThread: "Worker",
        workerError: "이 환경에서는 Worker를 시작할 수 없습니다. 배포된 사이트나 로컬 서버에서 다시 시도하세요.",
      };

  function setButtonsDisabled(root, disabled) {
    root.querySelectorAll("button").forEach((button) => {
      button.disabled = disabled;
    });
  }

  function focusDemoInput(root) {
    const input = root.querySelector("[data-demo-input]");
    if (!input) return;

    input.focus({ preventScroll: true });
    const end = input.value.length;
    input.setSelectionRange?.(end, end);
  }

  function createInputTelemetry(root, copy) {
    const input = root.querySelector("[data-demo-input]");
    const readout = root.querySelector("[data-demo-input-readout]");
    if (!input || !readout) return null;

    let inputEvents = 0;
    let maxGap = 0;
    let lastInputAt = 0;

    const render = () => {
      readout.textContent = copy.inputReadout(inputEvents, maxGap);
    };

    const handleInput = () => {
      const now = performance.now();
      inputEvents += 1;
      if (lastInputAt > 0) maxGap = Math.max(maxGap, now - lastInputAt);
      lastInputAt = now;
      render();
    };

    input.addEventListener("input", handleInput);
    render();

    return {
      reset() {
        inputEvents = 0;
        maxGap = 0;
        lastInputAt = 0;
        render();
      },
      summary() {
        return copy.inputReadout(inputEvents, maxGap);
      },
      destroy() {
        input.removeEventListener("input", handleInput);
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

    const setObservation = (isBlocking) => {
      jsState.textContent = isBlocking ? copy.blockingJsPaused : copy.blockingReady;
      cssState.textContent = isBlocking ? copy.blockingCssRunning : copy.blockingReady;
    };

    setObservation(false);

    const animate = (now) => {
      const progress = ((now - startedAt) % 2400) / 2400;
      jsRunner.style.transform = `translateX(${progress * 100}%)`;
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

    buttons.forEach((button) => button.addEventListener("click", blockMainThread));
    animationFrame = requestAnimationFrame(animate);

    return () => {
      buttons.forEach((button) => button.removeEventListener("click", blockMainThread));
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
    const telemetry = createInputTelemetry(root, copy);
    let animationFrame = 0;
    let preparationTimeout = 0;
    let runToken = 0;

    const updateProgress = (done) => {
      progress.style.width = `${(done / total) * 100}%`;
      readout.textContent = `${formatNumber(done)} / ${formatNumber(total)} units`;
    };

    const waitForInput = (token, message, delay = 900) => new Promise((resolve) => {
      focusDemoInput(root);
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

    const runMode = (mode, token) => new Promise((resolve) => {
      if (token !== runToken) {
        resolve(null);
        return;
      }

      const startedAt = performance.now();
      let checksum = 0;
      let index = 0;
      updateProgress(0);

      if (mode === "sync") {
        for (index = 0; index < total; index += 1) {
          checksum ^= doChunkWork(index);
        }
        void checksum;
        updateProgress(total);
        resolve(performance.now() - startedAt);
        return;
      }

      const processFrame = () => {
        if (token !== runToken) {
          resolve(null);
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
          resolve(performance.now() - startedAt);
        }
      };

      animationFrame = requestAnimationFrame(processFrame);
    });

    const run = async (mode) => {
      const token = ++runToken;
      setButtonsDisabled(root, true);
      telemetry?.reset();

      const ready = await waitForInput(token, copy.inputPreparing);
      if (!ready || token !== runToken) return;

      status.textContent = mode === "sync" ? copy.chunkSync : copy.chunked;
      const duration = await runMode(mode, token);
      if (duration === null || token !== runToken) return;

      status.textContent = copy.chunkDone(
        mode === "sync" ? copy.oneTask : copy.frameSlices,
        duration,
        telemetry?.summary() ?? "",
      );
      setButtonsDisabled(root, false);
    };

    const compare = async () => {
      const token = ++runToken;
      setButtonsDisabled(root, true);
      telemetry?.reset();

      const ready = await waitForInput(token, copy.inputPreparing);
      if (!ready || token !== runToken) return;

      status.textContent = copy.chunkCompareSync;
      const syncDuration = await runMode("sync", token);
      if (syncDuration === null || token !== runToken) return;

      const canContinue = await pauseBetweenRuns(token);
      if (!canContinue || token !== runToken) return;

      status.textContent = copy.chunkCompareChunked;
      const chunkedDuration = await runMode("chunked", token);
      if (chunkedDuration === null || token !== runToken) return;

      status.textContent = copy.chunkCompareDone(
        syncDuration,
        chunkedDuration,
        telemetry?.summary() ?? "",
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
      telemetry?.destroy();
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
    const telemetry = createInputTelemetry(root, copy);
    let preparationTimeout = 0;
    let worker;
    let runToken = 0;

    const updateProgress = (done) => {
      progress.style.width = `${(done / iterations) * 100}%`;
      readout.textContent = `${formatNumber(done)} / ${formatNumber(iterations)} iterations`;
    };

    const waitForInput = (token, message, delay = 900) => new Promise((resolve) => {
      focusDemoInput(root);
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

    const runMode = (mode, token) => new Promise((resolve) => {
      if (token !== runToken) {
        resolve(null);
        return;
      }

      const startedAt = performance.now();
      updateProgress(0);

      if (mode === "main") {
        window.setTimeout(() => {
          if (token !== runToken) {
            resolve(null);
            return;
          }

          void calculateIterations(iterations);
          updateProgress(iterations);
          resolve(performance.now() - startedAt);
        }, 0);
        return;
      }

      let settled = false;
      worker?.terminate();
      worker = new Worker("assets/posts/expensive-main-thread/worker.js");

      const finish = (duration) => {
        if (settled) return;
        settled = true;
        worker?.terminate();
        worker = undefined;
        updateProgress(iterations);
        resolve(duration);
      };

      worker.addEventListener("message", (messageEvent) => {
        if (token !== runToken) {
          finish(null);
          return;
        }

        const message = messageEvent.data;
        if (message.type === "progress") {
          updateProgress(message.done);
        } else if (message.type === "done") {
          finish(performance.now() - startedAt);
        }
      });
      worker.addEventListener("error", () => {
        if (settled) return;
        settled = true;
        worker?.terminate();
        worker = undefined;
        status.textContent = copy.workerError;
        resolve(null);
      }, { once: true });
      worker.postMessage({ iterations });
    });

    const run = async (mode) => {
      const token = ++runToken;
      setButtonsDisabled(root, true);
      telemetry?.reset();

      const ready = await waitForInput(token, copy.inputPreparing);
      if (!ready || token !== runToken) return;

      status.textContent = mode === "main" ? copy.workerMain : copy.worker;
      const duration = await runMode(mode, token);
      if (duration === null || token !== runToken) {
        if (token === runToken) setButtonsDisabled(root, false);
        return;
      }

      status.textContent = copy.workerDone(
        mode === "main" ? copy.mainThread : copy.workerThread,
        duration,
        telemetry?.summary() ?? "",
      );
      setButtonsDisabled(root, false);
    };

    const compare = async () => {
      const token = ++runToken;
      setButtonsDisabled(root, true);
      telemetry?.reset();

      const ready = await waitForInput(token, copy.inputPreparing);
      if (!ready || token !== runToken) return;

      status.textContent = copy.workerCompareMain;
      const mainDuration = await runMode("main", token);
      if (mainDuration === null || token !== runToken) return;

      const canContinue = await pauseBetweenRuns(token);
      if (!canContinue || token !== runToken) return;

      status.textContent = copy.workerCompareWorker;
      const workerDuration = await runMode("worker", token);
      if (workerDuration === null || token !== runToken) return;

      status.textContent = copy.workerCompareDone(
        mainDuration,
        workerDuration,
        telemetry?.summary() ?? "",
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
      telemetry?.destroy();
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
