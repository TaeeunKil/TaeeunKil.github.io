(() => {
  const cleanups = [];

  const formatMs = (value) => `${Math.round(value)}ms`;
  const formatNumber = (value) => value.toLocaleString("en-US");

  const getDemoCopy = () => document.documentElement.lang === "en"
    ? {
        blockingStart: (duration) => `Blocking the main thread for ${formatMs(duration)}…`,
        blockingDone: (duration) => `Done · The CSS dot kept moving during ${formatMs(duration)} of blocking.`,
        chunkSync: "Running one long task… Try typing now.",
        chunked: "Running in 5ms slices… Try typing now.",
        chunkDone: (mode, duration) => `Done · ${mode} finished in ${formatMs(duration)}.`,
        oneTask: "One task",
        frameSlices: "Frame slices",
        workerMain: "Calculating on the main thread… Try typing now.",
        worker: "Calculating in a Worker… Try typing now.",
        workerDone: (mode, duration) => `Done · ${mode} finished in ${formatMs(duration)}.`,
        mainThread: "Main thread",
        workerThread: "Worker",
        workerError: "The Worker could not start in this context. Try the published site or a local server.",
      }
    : {
        blockingStart: (duration) => `메인 스레드를 ${formatMs(duration)} 동안 막는 중…`,
        blockingDone: (duration) => `완료 · ${formatMs(duration)} 동안 막아도 CSS 점은 계속 움직였습니다.`,
        chunkSync: "한 번에 긴 작업을 실행 중… 지금 입력해보세요.",
        chunked: "5ms씩 나눠 실행 중… 지금 입력해보세요.",
        chunkDone: (mode, duration) => `완료 · ${mode} 작업이 ${formatMs(duration)}에 끝났습니다.`,
        oneTask: "한 번에 처리",
        frameSlices: "프레임 분할",
        workerMain: "메인 스레드에서 계산 중… 지금 입력해보세요.",
        worker: "Worker에서 계산 중… 지금 입력해보세요.",
        workerDone: (mode, duration) => `완료 · ${mode} 계산이 ${formatMs(duration)}에 끝났습니다.`,
        mainThread: "메인 스레드",
        workerThread: "Worker",
        workerError: "이 환경에서는 Worker를 시작할 수 없습니다. 배포된 사이트나 로컬 서버에서 다시 시도하세요.",
      };

  function setButtonsDisabled(root, disabled) {
    root.querySelectorAll("button").forEach((button) => {
      button.disabled = disabled;
    });
  }

  function setupBlockingDemo(root) {
    const copy = getDemoCopy();
    const jsRunner = root.querySelector(".demo-runner-js");
    const status = root.querySelector("[data-demo-status]");
    const buttons = [...root.querySelectorAll('[data-demo-action="block"]')];
    let animationFrame = 0;
    let timeoutId = 0;
    let startedAt = performance.now();

    const animate = (now) => {
      const progress = ((now - startedAt) % 2400) / 2400;
      jsRunner.style.transform = `translateX(${progress * 100}%)`;
      animationFrame = requestAnimationFrame(animate);
    };

    const blockMainThread = (event) => {
      const duration = Number(event.currentTarget.dataset.duration);
      setButtonsDisabled(root, true);
      status.textContent = copy.blockingStart(duration);

      timeoutId = window.setTimeout(() => {
        const blockStartedAt = performance.now();
        while (performance.now() - blockStartedAt < duration) {
          // Intentional busy work for the experiment.
        }
        status.textContent = copy.blockingDone(duration);
        setButtonsDisabled(root, false);
      }, 0);
    };

    buttons.forEach((button) => button.addEventListener("click", blockMainThread));
    animationFrame = requestAnimationFrame(animate);

    return () => {
      buttons.forEach((button) => button.removeEventListener("click", blockMainThread));
      cancelAnimationFrame(animationFrame);
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
    let animationFrame = 0;
    let runToken = 0;

    const updateProgress = (done) => {
      progress.style.width = `${(done / total) * 100}%`;
      readout.textContent = `${formatNumber(done)} / ${formatNumber(total)} units`;
    };

    const finish = (startedAt, mode) => {
      status.textContent = copy.chunkDone(mode, performance.now() - startedAt);
      setButtonsDisabled(root, false);
    };

    const process = (event) => {
      const mode = event.currentTarget.dataset.mode;
      const token = ++runToken;
      const startedAt = performance.now();
      let checksum = 0;
      let index = 0;

      setButtonsDisabled(root, true);
      updateProgress(0);
      status.textContent = mode === "sync"
        ? copy.chunkSync
        : copy.chunked;

      const finishIfCurrent = () => {
        if (token !== runToken) return;
        updateProgress(total);
        finish(startedAt, mode === "sync" ? copy.oneTask : copy.frameSlices);
      };

      if (mode === "sync") {
        for (index = 0; index < total; index += 1) {
          checksum ^= doChunkWork(index);
        }
        void checksum;
        finishIfCurrent();
        return;
      }

      const processFrame = () => {
        if (token !== runToken) return;
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
          finishIfCurrent();
        }
      };

      animationFrame = requestAnimationFrame(processFrame);
    };

    buttons.forEach((button) => button.addEventListener("click", process));

    return () => {
      runToken += 1;
      buttons.forEach((button) => button.removeEventListener("click", process));
      cancelAnimationFrame(animationFrame);
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
    let worker;
    let runToken = 0;

    const updateProgress = (done) => {
      progress.style.width = `${(done / iterations) * 100}%`;
      readout.textContent = `${formatNumber(done)} / ${formatNumber(iterations)} iterations`;
    };

    const finish = (startedAt, mode) => {
      updateProgress(iterations);
      status.textContent = copy.workerDone(mode, performance.now() - startedAt);
      setButtonsDisabled(root, false);
    };

    const run = (event) => {
      const mode = event.currentTarget.dataset.mode;
      const token = ++runToken;
      const startedAt = performance.now();

      worker?.terminate();
      worker = undefined;
      setButtonsDisabled(root, true);
      updateProgress(0);
      status.textContent = mode === "main"
        ? copy.workerMain
        : copy.worker;

      if (mode === "main") {
        window.setTimeout(() => {
          if (token !== runToken) return;
          void calculateIterations(iterations);
          finish(startedAt, copy.mainThread);
        }, 0);
        return;
      }

      worker = new Worker("assets/posts/expensive-main-thread/worker.js");
      worker.addEventListener("message", (messageEvent) => {
        if (token !== runToken) return;
        const message = messageEvent.data;
        if (message.type === "progress") {
          updateProgress(message.done);
        } else if (message.type === "done") {
          worker.terminate();
          worker = undefined;
          finish(startedAt, copy.workerThread);
        }
      });
      worker.addEventListener("error", () => {
        if (token !== runToken) return;
        status.textContent = copy.workerError;
        setButtonsDisabled(root, false);
      }, { once: true });
      worker.postMessage({ iterations });
    };

    buttons.forEach((button) => button.addEventListener("click", run));

    return () => {
      runToken += 1;
      worker?.terminate();
      buttons.forEach((button) => button.removeEventListener("click", run));
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
