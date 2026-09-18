/* eslint-disable */

import Bowser from 'bowser';
import { fromFetch } from 'rxjs/fetch';
import get from 'lodash/get';
import { Observable, Subject, ReplaySubject, from, empty, iif } from 'rxjs';
import { catchError, first, mergeMap, map, retry, share, takeUntil, filter } from 'rxjs/operators';
import {
    UserBlockingPriority,
    ImmediatePriority,
    unstable_scheduleCallback as runWithPriority,
    unstable_cancelCallback as cancelCallback
} from 'scheduler';

const browser = Bowser.getParser(window.navigator.userAgent);
const EMPTY_SRC = '';
const LOADED_ATTR = Symbol('loaded');

const browserName = `${browser.getBrowser().name}`;
// 在 Edge 同时使用新 API 进行图片渲染会导致黑屏
const CROP_PARALLEL_CURRENCY = browserName.indexOf('Edge') > -1 ? 1 : 40;
// 普通渲染模式中，图片解码会占据较多时间，限制请求并发数可以缓解 decoder 时间
// 使用 fetch 方案可以减缓该问题
const FETCHING_CURRENCY = browserName === 'Internet Explorer' ? 15 : 40;
// 使用 Blob 对象来缓存 canvas 结果
const SUPPORT_BLOB_OBJECT =
    typeof get(window, 'URL.createObjectURL') === 'function' &&
    typeof document.createElement('canvas').toBlob === 'function';
// 在实际使用中，该方法会有部分不兼容的情况
let SUPPORT_FASTER_RENDER = typeof window.createImageBitmap === 'function';

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
            this.deleteItem(pendingDeleteKey!);
        }
    }

    get(key: string): string {
        return this.cachedStorage[key];
    }

    deleteItem(key: string) {
        const item = this.get(key);
        if (SUPPORT_BLOB_OBJECT) {
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

function createScheduleObservaber<T>(
    task: (next: (value: T) => void) => void,
    priority = UserBlockingPriority
): Observable<T> {
    return new Observable(subscriber => {
        const scheduler = runWithPriority(priority, () => {
            task(value => {
                subscriber.next(value);
                subscriber.complete();
            });
        });
        return () => cancelCallback(scheduler);
    });
}

const thumbLoaderSubject$: Subject<ImageLoaderOptions> = new Subject();
const thumbRenderSubject$: ReplaySubject<RenderOptions> = new ReplaySubject(100);
const abort$: ReplaySubject<number> = new ReplaySubject(100);

const canvasCache = new MemoizeCache();

const scheduledThumbLoader$ = thumbLoaderSubject$.pipe(
    mergeMap(
        options => createImageLoaderStream(options),
        ({ uuid }, { error, buffer }) => ({
            buffer,
            error,
            uuid
        }),
        FETCHING_CURRENCY
    ),
    share()
);

const scheduledThumbRender$ = thumbRenderSubject$.pipe(
    mergeMap(
        options => createRenderStream(options.buffer, options.drawOptions),
        ({ drawOptions: { uuid } }, { node, error }) => ({
            node,
            error,
            uuid
        }),
        CROP_PARALLEL_CURRENCY
    ),
    share()
);

function loadImageByTag(imageUrl: string): Observable<HTMLImageElement> {
    return new Observable(subscriber => {
        const image = new Image();
        image.src = imageUrl;

        image.onload = () => {
            image[LOADED_ATTR] = true;
            subscriber.next(image);
            subscriber.complete();
        };
        image.onerror = err => {
            subscriber.error(err);
        };
        return () => {
            if (image[LOADED_ATTR]) return;
            // https://stackoverflow.com/questions/5278304/how-to-cancel-an-image-from-loading/5278475
            image.onerror = () => null;
            image.src = EMPTY_SRC;
        };
    });
}

function fetchImage(imageUrl: string) {
    return fromFetch(imageUrl, {
        cache: 'force-cache'
    }).pipe(retry(1));
}

function createImageLoaderStream(
    options: ImageLoaderOptions
): Observable<{ error?: any; buffer?: HTMLImageElement | Blob }> {
    const { url } = options;
    return iif(
        () => typeof window.fetch === 'function',
        fetchImage(url).pipe(
            mergeMap(response => {
                return from(response.blob());
            }),
            catchError(() => {
                SUPPORT_FASTER_RENDER = false;
                return loadImageByTag(url);
            })
        ),
        loadImageByTag(url)
    ).pipe(
        map(buffer => ({ error: null, buffer })),
        catchError(err => from([{ error: err }]))
    );
}

function getDrawSize(size: ImageSize, cutWidth: number, cutHeight: number, pixelRatio?: number): [number, number] {
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

function getCropOptions(image: HTMLImageElement | Blob, options: DrawOptions) {
    const { originSize: origin, box } = options;
    const targetX = 0;
    const targetY = 0;

    const ret = {
        x1: origin.width! * box[0],
        y1: origin.height! * box[1],
        width: origin.width! * (box[2] - box[0]),
        height: origin.height! * (box[3] - box[1]),
        oriWidth: origin.width!,
        oriHeight: origin.height!
    };
    const [cvsWidth, cvsHeight] = getDrawSize(options.size, ret.width, ret.height);
    return { ...ret, cvsWidth, cvsHeight, targetX, targetY };
}

function cropHTMLElement(buffer: HTMLImageElement | Blob, options: DrawOptions): Observable<HTMLCanvasElement> {
    const drawImageToCanvas = (image: HTMLImageElement) => {
        const { cvsHeight, cvsWidth, x1, y1, width, height, targetX, targetY } = getCropOptions(buffer, options);
        const { canvas } = options;

        canvas.width = cvsWidth;
        canvas.height = cvsHeight;

        const context = canvas.getContext('2d')!;

        context.clearRect(0, 0, cvsWidth, cvsHeight);
        context.drawImage(image, x1, y1, width, height, targetX, targetY, cvsWidth, cvsHeight);
        return canvas;
    };

    // 浏览器支持 fetch 进行缓存，但是需要使用 HTMLImageElement 进行绘制
    // 重新根据 url 生成图片，并写入 canvas
    // 该代码分支 https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode 语法优化概率较低
    if (!(buffer instanceof HTMLImageElement)) {
        return createScheduleObservaber(next => {
            const image = new Image();
            image.src = options.url;
            image.onload = () => {
                next(drawImageToCanvas(image));
            };
        });
    }

    return createScheduleObservaber(next => {
        next(drawImageToCanvas(buffer));
    });
}

function createImageBitmapAsStream(blob: Blob, options: CropOptions) {
    const { cvsHeight, cvsWidth, x1, y1, width, height } = options;
    return from(
        window.createImageBitmap(blob, x1, y1, width, height, {
            resizeWidth: cvsWidth,
            resizeHeight: cvsHeight,
            resizeQuality: 'high'
        })
    );
}

function cropWithResponseBlob(buffer: Blob, options: DrawOptions) {
    const cropOptions = getCropOptions(buffer, options);
    const { canvas } = options;

    return from(Promise.resolve(buffer)).pipe(
        mergeMap(blob => createImageBitmapAsStream(blob, cropOptions)),
        map(image => {
            const { cvsHeight, cvsWidth, width, height, targetX, targetY } = cropOptions;

            const supportCreateImageBitmapOption = image.width === cvsWidth && image.height === cvsHeight;

            canvas.width = cvsWidth;
            canvas.height = cvsHeight;

            if (!supportCreateImageBitmapOption) {
                console.warn('CreateImageBitmapOption Unsupported!');
                const context = canvas.getContext('2d')!;
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0, width, height, targetX, targetY, cvsWidth, cvsHeight);
            } else {
                const contextBit = canvas.getContext('bitmaprenderer');
                if (contextBit && contextBit.transferFromImageBitmap) {
                    contextBit.transferFromImageBitmap(image);
                } else {
                    const context = canvas.getContext('2d')!;
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(image, 0, 0);
                }
            }
            return canvas;
        })
    );
}

function createRenderStream(
    buffer: HTMLImageElement | Blob,
    options: DrawOptions
): Observable<{ error?: any; node?: HTMLCanvasElement | HTMLElement }> {
    return iif(
        () => SUPPORT_FASTER_RENDER && !(buffer instanceof HTMLImageElement),
        cropWithResponseBlob(buffer as Blob, options),
        cropHTMLElement(buffer, options)
    ).pipe(
        retry(6),
        takeUntil(abort$.pipe(first(uuid => uuid === options.uuid))),
        map(node => ({ error: null, node })),
        catchError(err => from([{ error: err }]))
    );
}

function createRenderScheduledStream(buffer: HTMLImageElement | Blob, options: DrawOptions) {
    thumbRenderSubject$.next({ buffer, drawOptions: options });
    return scheduledThumbRender$.pipe(first(({ uuid }) => uuid === options.uuid));
}

let uuid = 0;

const createEmptyStream = (method: () => any) => {
    method();
    return empty();
};

function drawImageToCanvas(
    imageUrl: string,
    canvasWrapperGetter: WrapperGettter,
    originSize: ImageSize,
    box: { [index: number]: number; length: 4 },
    size: ImageSize,
    callback: (err?: any, caught?: any, canvas?: HTMLCanvasElement) => void
) {
    const _canvasWrapperGetter = typeof canvasWrapperGetter === 'function' ? canvasWrapperGetter : () => canvasWrapperGetter;
    const cacheKey = JSON.stringify([imageUrl, originSize, box, size]);
    if (canvasCache.get(cacheKey)) {
        const cachedUrl = canvasCache.get(cacheKey);
        return drawImageToHTMLNode(cachedUrl, _canvasWrapperGetter, callback);
    }

    const canvas = document.createElement('canvas');
    canvas.className = 'nail-box__image-canvas';

    uuid += 1;
    const options: DrawOptions = { url: imageUrl, canvas, originSize, box, size, uuid, cacheKey };

    const currentLoaderArrive$ = scheduledThumbLoader$.pipe(filter(({ uuid }) => uuid === options.uuid));
    const subscription = currentLoaderArrive$
        .pipe(
            mergeMap(({ buffer }) => createRenderScheduledStream(buffer!, options)),
            map(() =>
                createEmptyStream(() => {
                    callback();
                    _canvasWrapperGetter().appendChild(canvas);
                    if (SUPPORT_BLOB_OBJECT) {
                        canvas.toBlob(blob => canvasCache.set(options.cacheKey, URL.createObjectURL(blob)));
                    } else {
                        canvasCache.set(options.cacheKey, canvas.toDataURL());
                    }
                })
            ),
            catchError((...args) => createEmptyStream(() => callback(...args, canvas)))
        )
        .subscribe(() => null);

    thumbLoaderSubject$.next({ uuid: options.uuid, url: imageUrl });
    return function abort() {
        subscription.unsubscribe();
        abort$.next(options.uuid);
    };
}

function drawImageToHTMLNode(imageUrl: string, nodeGetter: WrapperGettter, callback: (err?: any, node?: HTMLElement) => void) {
    const _nodeGetter = typeof nodeGetter === 'function' ? nodeGetter : () => nodeGetter;
    const subscription = createScheduleObservaber(done => {
        const image = new Image();
        image.src = imageUrl;
        image.className = 'nail-box__img nail-box__img--offical';
        image.onerror = error => {
            callback(error, _nodeGetter());
        };

        const finish = () => {
            let node = _nodeGetter();
            node.appendChild(image);
            callback();
            done(node);
        };
        if (typeof HTMLImageElement.prototype.decode !== 'function') {
            finish();
            return;
        }
        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode#Syntax
        // The decode() method of the HTMLImageElement interface returns a Promise
        // that resolves when the image is decoded and it is safe to append the image to the DOM. This prevents a decoding delay on the next frame.
        image.decoding = 'async';
        image.decode().then(finish);
    }, ImmediatePriority).subscribe(() => null);

    return function abort() {
        subscription.unsubscribe();
    };
}

// 如果可以控制，建议业务显式控制清空图片缓存
function flushAllCache() {
    canvasCache.clear();
}

export { drawImageToCanvas, drawImageToHTMLNode, flushAllCache };
