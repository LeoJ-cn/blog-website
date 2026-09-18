/* eslint-disable */
// image-renderer-no-rxjs.ts
import Bowser from "bowser";
import get from "lodash/get";
import {
  UserBlockingPriority,
  ImmediatePriority,
  unstable_scheduleCallback as runWithPriority,
  unstable_cancelCallback as cancelCallback,
} from "scheduler";

export { drawImageToCanvas, drawImageToHTMLNode, flushAllCache };

const browser = Bowser.getParser(window.navigator.userAgent);
const EMPTY_SRC = "";
const LOADED_ATTR = Symbol("loaded");

const browserName = `${browser.getBrowser().name}`;
// 在 Edge 同时使用新 API 进行图片渲染会导致黑屏
const CROP_PARALLEL_CURRENCY = browserName.indexOf("Edge") > -1 ? 1 : 40;
// 普通渲染模式中，图片解码会占据较多时间，限制请求并发数可以缓解 decoder 时间
// 使用 fetch 方案可以减缓该问题
const FETCHING_CURRENCY = browserName === "Internet Explorer" ? 15 : 40;
// 使用 Blob 对象来缓存 canvas 结果
const SUPPORT_BLOB_OBJECT =
  typeof get(window, "URL.createObjectURL") === "function" &&
  typeof document.createElement("canvas").toBlob === "function";
// 在实际使用中，该方法会有部分不兼容的情况
let SUPPORT_FASTER_RENDER = typeof window.createImageBitmap === "function";

type ImageSize = {
  width?: number;
  height?: number;
  origin?: boolean;
};

type ImageLoaderOptions = {
  uuid: number;
  url: string;
};

type WrapperGettter = HTMLElement | (() => HTMLElement);

type DrawOptions = {
  url: string;
  cacheKey: string;
  canvas: HTMLCanvasElement;
  box: { [index: number]: number; length: 4 };
  size: ImageSize;
  originSize: ImageSize;
  uuid: number;
};

type CropOptions = {
  cvsWidth: number;
  cvsHeight: number;
  targetX: number;
  targetY: number;
  x1: number;
  y1: number;
  width: number;
  height: number;
  oriWidth: number;
  oriHeight: number;
};

type RenderOptions = {
  drawOptions: DrawOptions;
  buffer: HTMLImageElement | Blob;
};

class MemoizeCache {
  private cachedKeys: string[] = [];
  private cachedStorage: { [key: string]: string } = {};

  constructor(private maxKeySize: number = 800) {}

  set(key: string, value: string) {
    if (this.get(key)) return;
    this.cachedKeys.push(key);
    this.cachedStorage[key] = value;
    if (this.cachedKeys.length > this.maxKeySize) {
      const pendingDeleteKey = this.cachedKeys.shift();
      if (pendingDeleteKey) {
        this.deleteItem(pendingDeleteKey);
      }
    }
  }

  get(key: string): string {
    return this.cachedStorage[key];
  }

  deleteItem(key: string) {
    const item = this.get(key);
    if (!item) return;
    if (SUPPORT_BLOB_OBJECT && item.startsWith("blob:")) {
      URL.revokeObjectURL(item);
    }
    delete this.cachedStorage[key];
  }

  clear() {
    for (let i = 0; i < this.cachedKeys.length; i += 1) {
      this.deleteItem(this.cachedKeys[i]);
    }
    this.cachedKeys.length = 0;
  }
}

function toInt(n: number | string) {
  return 2 * Math.round(+n / 2);
}

/**
 * 使用 scheduler + Promise 模拟原来的 createScheduleObservaber
 */
function runWithScheduler<T>(
  task: (resolve: (value: T) => void, reject: (reason?: any) => void) => void,
  priority = UserBlockingPriority
): { promise: Promise<T>; cancel: () => void } {
  let rejectFn: (reason?: any) => void = () => {};
  let resolved = false;
  let rejected = false;

  const promise = new Promise<T>((resolve, reject) => {
    rejectFn = reject;
    const scheduler = runWithPriority(priority, () => {
      try {
        task(
          (value) => {
            if (resolved || rejected) return;
            resolved = true;
            resolve(value);
          },
          (error) => {
            if (resolved || rejected) return;
            rejected = true;
            reject(error);
          }
        );
      } catch (e) {
        if (resolved || rejected) return;
        rejected = true;
        reject(e);
      }
    });

    // 将 scheduler 句柄挂到 rejectFn 上，取消时可调用
    (rejectFn as any).__scheduler = scheduler;
  });

  const cancel = () => {
    if (!rejected && !resolved) {
      rejected = true;
      try {
        const scheduler = (rejectFn as any).__scheduler;
        if (scheduler) {
          cancelCallback(scheduler);
        }
      } catch (e) {
        // ignore
      }
      rejectFn(new Error("canceled"));
    }
  };

  return { promise, cancel };
}

/**
 * 简单的带并发控制的任务队列
 */
class TaskQueue<TInput, TOutput> {
  private concurrency: number;
  private running = 0;
  private queue: {
    input: TInput;
    resolve: (v: TOutput) => void;
    reject: (e: any) => void;
    key?: number | string;
  }[] = [];
  private worker: (input: TInput, signal: AbortSignal) => Promise<TOutput>;

  constructor(
    concurrency: number,
    worker: (input: TInput, signal: AbortSignal) => Promise<TOutput>
  ) {
    this.concurrency = concurrency;
    this.worker = worker;
  }

  add(
    input: TInput,
    key?: number | string
  ): { promise: Promise<TOutput>; cancel: () => void } {
    const controller = new AbortController();
    const { signal } = controller;

    const promise = new Promise<TOutput>((resolve, reject) => {
      this.queue.push({ input, resolve, reject, key });
      this.runNext(signal, controller);
    });

    const cancel = () => {
      controller.abort();
    };

    return { promise, cancel };
  }

  abortByKey(key: number | string) {
    // 只针对队列中还未跑的任务起作用
    this.queue = this.queue.filter((task) => task.key !== key);
  }

  private runNext(signal: AbortSignal, controller: AbortController) {
    if (this.running >= this.concurrency) return;
    const task = this.queue.shift();
    if (!task) return;

    this.running += 1;

    if (signal.aborted) {
      this.running -= 1;
      task.reject(new Error("aborted"));
      this.runNext(signal, controller);
      return;
    }

    this.worker(task.input, signal)
      .then((result) => {
        this.running -= 1;
        if (!signal.aborted) {
          task.resolve(result);
        } else {
          task.reject(new Error("aborted"));
        }
        this.runNext(signal, controller);
      })
      .catch((err) => {
        this.running -= 1;
        if (!signal.aborted) {
          task.reject(err);
        } else {
          task.reject(new Error("aborted"));
        }
        this.runNext(signal, controller);
      });
  }
}

/**
 * 加载图片（<img> 标签）
 */
function loadImageByTag(
  imageUrl: string,
  signal?: AbortSignal
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageUrl;

    const onLoad = () => {
      image[LOADED_ATTR] = true;
      cleanup();
      resolve(image);
    };

    const onError = (err: any) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    };

    const onAbort = () => {
      cleanup();
      if (image[LOADED_ATTR]) return;
      image.onerror = () => null;
      image.src = EMPTY_SRC;
      reject(new Error("aborted"));
    };

    image.onload = onLoad;
    image.onerror = onError;

    if (signal) {
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener("abort", onAbort);
      }
    }
  });
}

/**
 * fetch 图片，带一次重试
 */
function fetchImage(imageUrl: string, signal?: AbortSignal): Promise<Response> {
  const doFetch = () =>
    fetch(imageUrl, {
      cache: "force-cache",
      signal,
    });

  return doFetch().catch((err) => {
    // retry once
    return doFetch().catch(() => {
      throw err;
    });
  });
}

/**
 * 原来的 createImageLoaderStream：返回 { error, buffer }
 */
async function createImageLoader(
  options: ImageLoaderOptions,
  signal?: AbortSignal
): Promise<{ error?: any; buffer?: HTMLImageElement | Blob }> {
  const { url } = options;

  const useFetch = typeof window.fetch === "function";

  try {
    if (useFetch) {
      try {
        const response = await fetchImage(url, signal);
        const blob = await response.blob();
        return { error: null, buffer: blob };
      } catch (e) {
        // fetch 出错，降级为 img 标签，并关闭快速渲染
        SUPPORT_FASTER_RENDER = false;
        const img = await loadImageByTag(url, signal);
        return { error: null, buffer: img };
      }
    } else {
      const img = await loadImageByTag(url, signal);
      return { error: null, buffer: img };
    }
  } catch (err) {
    return { error: err };
  }
}

function getDrawSize(
  size: ImageSize,
  cutWidth: number,
  cutHeight: number,
  pixelRatio?: number
): [number, number] {
  let renderWidth = cutWidth;
  let renderHeight = cutHeight;
  if (size && size.width && size.height && !size.origin) {
    // 解决小图不清晰问题
    const devicePixelRatio = pixelRatio || window.devicePixelRatio || 1;
    const radio = Math.max(
      cutWidth / (size.width * devicePixelRatio),
      cutHeight / (size.height * devicePixelRatio)
    );
    renderWidth = toInt(cutWidth / radio);
    renderHeight = toInt(cutHeight / radio);
  }
  return [renderWidth, renderHeight];
}

function getCropOptions(
  image: HTMLImageElement | Blob,
  options: DrawOptions
): CropOptions {
  const { originSize: origin, box } = options;
  const targetX = 0;
  const targetY = 0;

  const ret = {
    x1: origin.width! * box[0],
    y1: origin.height! * box[1],
    width: origin.width! * (box[2] - box[0]),
    height: origin.height! * (box[3] - box[1]),
    oriWidth: origin.width!,
    oriHeight: origin.height!,
  };
  const [cvsWidth, cvsHeight] = getDrawSize(
    options.size,
    ret.width,
    ret.height
  );
  return { ...ret, cvsWidth, cvsHeight, targetX, targetY };
}

/**
 * 使用 <img> 绘制到 canvas
 */
function cropHTMLElement(
  buffer: HTMLImageElement | Blob,
  options: DrawOptions,
  signal?: AbortSignal
): Promise<HTMLCanvasElement> {
  const drawImageToCanvas = (image: HTMLImageElement) => {
    const { cvsHeight, cvsWidth, x1, y1, width, height, targetX, targetY } =
      getCropOptions(buffer, options);
    const { canvas } = options;

    canvas.width = cvsWidth;
    canvas.height = cvsHeight;

    const context = canvas.getContext("2d")!;

    context.clearRect(0, 0, cvsWidth, cvsHeight);
    context.drawImage(
      image,
      x1,
      y1,
      width,
      height,
      targetX,
      targetY,
      cvsWidth,
      cvsHeight
    );
    return canvas;
  };

  // buffer 是 Blob 时需要重新创建 Image（使用 URL），避免 decode API 问题
  if (!(buffer instanceof HTMLImageElement)) {
    const { promise, cancel } = runWithScheduler<HTMLCanvasElement>(
      (resolve, reject) => {
        const image = new Image();
        image.src = options.url;

        const cleanup = () => {
          image.onload = null;
          image.onerror = null;
          if (signal) {
            signal.removeEventListener("abort", onAbort);
          }
        };

        const onAbort = () => {
          cleanup();
          reject(new Error("aborted"));
        };

        image.onload = () => {
          cleanup();
          try {
            resolve(drawImageToCanvas(image));
          } catch (e) {
            reject(e);
          }
        };
        image.onerror = (err) => {
          cleanup();
          reject(err);
        };

        if (signal) {
          if (signal.aborted) {
            onAbort();
          } else {
            signal.addEventListener("abort", onAbort);
          }
        }
      },
      UserBlockingPriority
    );

    if (signal) {
      signal.addEventListener("abort", () => cancel());
    }

    return promise;
  }

  const { promise, cancel } = runWithScheduler<HTMLCanvasElement>(
    (resolve, reject) => {
      try {
        resolve(drawImageToCanvas(buffer));
      } catch (e) {
        reject(e);
      }
    },
    UserBlockingPriority
  );

  if (signal) {
    signal.addEventListener("abort", () => cancel());
  }

  return promise;
}

function createImageBitmapFromBlob(
  blob: Blob,
  options: CropOptions,
  signal?: AbortSignal
): Promise<ImageBitmap> {
  const { cvsHeight, cvsWidth, x1, y1, width, height } = options;

  return new Promise((resolve, reject) => {
    if (
      !SUPPORT_FASTER_RENDER ||
      typeof window.createImageBitmap !== "function"
    ) {
      reject(new Error("createImageBitmap not supported"));
      return;
    }

    const params: any = {
      resizeWidth: cvsWidth,
      resizeHeight: cvsHeight,
      resizeQuality: "high",
    };

    let aborted = false;
    const onAbort = () => {
      aborted = true;
      reject(new Error("aborted"));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    window
      .createImageBitmap(blob, x1, y1, width, height, params)
      .then((image) => {
        if (aborted) {
          reject(new Error("aborted"));
          return;
        }
        resolve(image);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function cropWithResponseBlob(
  buffer: Blob,
  options: DrawOptions,
  signal?: AbortSignal
): Promise<HTMLCanvasElement> {
  const cropOptions = getCropOptions(buffer, options);
  const { canvas } = options;

  return createImageBitmapFromBlob(buffer, cropOptions, signal).then(
    (image) => {
      const { cvsHeight, cvsWidth, width, height, targetX, targetY } =
        cropOptions;

      const supportCreateImageBitmapOption =
        image.width === cvsWidth && image.height === cvsHeight;

      canvas.width = cvsWidth;
      canvas.height = cvsHeight;

      if (!supportCreateImageBitmapOption) {
        console.warn("CreateImageBitmapOption Unsupported!");
        const context = canvas.getContext("2d")!;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(
          image,
          0,
          0,
          width,
          height,
          targetX,
          targetY,
          cvsWidth,
          cvsHeight
        );
      } else {
        const contextBit = canvas.getContext("bitmaprenderer") as any;
        if (
          contextBit &&
          typeof contextBit.transferFromImageBitmap === "function"
        ) {
          contextBit.transferFromImageBitmap(image);
        } else {
          const context = canvas.getContext("2d")!;
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0);
        }
      }
      return canvas;
    }
  );
}

/**
 * 原来的 createRenderStream：带重试 + 可取消
 */
async function createRender(
  buffer: HTMLImageElement | Blob,
  options: DrawOptions,
  signal?: AbortSignal
): Promise<{ error?: any; node?: HTMLCanvasElement }> {
  const useFast =
    SUPPORT_FASTER_RENDER && !(buffer instanceof HTMLImageElement);

  const execOnce = () =>
    useFast
      ? cropWithResponseBlob(buffer as Blob, options, signal)
      : cropHTMLElement(buffer, options, signal);

  let lastError: any = null;

  for (let i = 0; i <= 6; i++) {
    if (signal?.aborted) {
      return { error: new Error("aborted") };
    }
    try {
      const node = await execOnce();
      return { error: null, node };
    } catch (err) {
      lastError = err;
      if (i === 6) {
        return { error: lastError };
      }
    }
  }

  return { error: lastError };
}

/**
 * 全局缓存
 */
const canvasCache = new MemoizeCache();

/**
 * 替代 RxJS 的两个队列：加载队列和渲染队列
 */
const loaderQueue = new TaskQueue<
  ImageLoaderOptions,
  { uuid: number; error?: any; buffer?: HTMLImageElement | Blob }
>(FETCHING_CURRENCY, async (input, signal) => {
  const { uuid } = input;
  const result = await createImageLoader(input, signal);
  return { uuid, ...result };
});

const renderQueue = new TaskQueue<
  RenderOptions,
  { uuid: number; error?: any; node?: HTMLCanvasElement }
>(CROP_PARALLEL_CURRENCY, async (input, signal) => {
  const { drawOptions, buffer } = input;
  const result = await createRender(buffer, drawOptions, signal);
  return { uuid: drawOptions.uuid, ...result };
});

let globalUuid = 0;

/**
 * 替代原来的 drawImageToCanvas（不依赖 RxJS）
 */
function drawImageToCanvas(
  imageUrl: string,
  canvasWrapperGetter: WrapperGettter,
  originSize: ImageSize,
  box: { [index: number]: number; length: 4 },
  size: ImageSize,
  callback: (err?: any, caught?: any, canvas?: HTMLCanvasElement) => void
) {
  const _canvasWrapperGetter =
    typeof canvasWrapperGetter === "function"
      ? (canvasWrapperGetter as () => HTMLElement)
      : () => canvasWrapperGetter;

  const cacheKey = JSON.stringify([imageUrl, originSize, box, size]);
  const cachedUrl = canvasCache.get(cacheKey);
  if (cachedUrl) {
    // 直接使用缓存 URL 插入 DOM
    return drawImageToHTMLNode(cachedUrl, _canvasWrapperGetter, callback);
  }

  const canvas = document.createElement("canvas");
  canvas.className = "nail-box__image-canvas";

  globalUuid += 1;
  const uuid = globalUuid;
  const options: DrawOptions = {
    url: imageUrl,
    canvas,
    originSize,
    box,
    size,
    uuid,
    cacheKey,
  };

  const controller = new AbortController();
  const { signal } = controller;

  // 1. 加入加载队列
  const { promise: loadPromise } = loaderQueue.add(
    { uuid, url: imageUrl },
    uuid
  );

  let canceled = false;

  loadPromise
    .then((loadResult) => {
      if (canceled || signal.aborted) throw new Error("aborted");
      const { buffer, error } = loadResult;
      if (error || !buffer) {
        callback(error || new Error("load failed"), null, canvas);
        return;
      }

      // 2. 加入渲染队列
      const { promise: renderPromise } = renderQueue.add(
        { buffer, drawOptions: options },
        uuid
      );

      return renderPromise.then((renderResult) => {
        if (canceled || signal.aborted) return;
        const { error: renderError, node } = renderResult;
        if (renderError || !node) {
          callback(renderError || new Error("render failed"), null, canvas);
          return;
        }

        callback();
        _canvasWrapperGetter().appendChild(canvas);

        if (SUPPORT_BLOB_OBJECT) {
          canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            canvasCache.set(options.cacheKey, url);
          });
        } else {
          const dataUrl = canvas.toDataURL();
          canvasCache.set(options.cacheKey, dataUrl);
        }
      });
    })
    .catch((err) => {
      if (canceled || signal.aborted) return;
      callback(err, null, canvas);
    });

  // 返回 abort 函数
  return function abort() {
    canceled = true;
    controller.abort();
    loaderQueue.abortByKey(uuid);
    renderQueue.abortByKey(uuid);
  };
}

/**
 * 替代原来的 drawImageToHTMLNode（不依赖 RxJS）
 */
function drawImageToHTMLNode(
  imageUrl: string,
  nodeGetter: WrapperGettter,
  callback: (err?: any, node?: HTMLElement) => void
) {
  const _nodeGetter =
    typeof nodeGetter === "function"
      ? (nodeGetter as () => HTMLElement)
      : () => nodeGetter;

  const controller = new AbortController();
  const { signal } = controller;

  const { promise, cancel } = runWithScheduler<HTMLElement>(
    (resolve, reject) => {
      const image = new Image();
      image.src = imageUrl;
      image.className = "nail-box__img nail-box__img--offical";

      const cleanup = () => {
        image.onerror = null;
        if (signal) {
          signal.removeEventListener("abort", onAbort);
        }
      };

      const onAbort = () => {
        cleanup();
        reject(new Error("aborted"));
      };

      image.onerror = (error) => {
        cleanup();
        callback(error, _nodeGetter());
        reject(error);
      };

      const finish = () => {
        const node = _nodeGetter();
        node.appendChild(image);
        callback();
        cleanup();
        resolve(node);
      };

      if (typeof (HTMLImageElement.prototype as any).decode !== "function") {
        image.onload = () => {
          finish();
        };
        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener("abort", onAbort);
        }
        return;
      }

      image.decoding = "async";
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort);
      image
        .decode()
        .then(finish)
        .catch((err) => {
          cleanup();
          callback(err, _nodeGetter());
          reject(err);
        });
    },
    ImmediatePriority
  );

  promise.catch(() => {
    // 错误已在 callback 中处理
  });

  return function abort() {
    controller.abort();
    cancel();
  };
}

// 如果可以控制，建议业务显式控制清空图片缓存
function flushAllCache() {
  canvasCache.clear();
}
