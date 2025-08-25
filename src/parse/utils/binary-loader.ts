/**
 * 简单实用的二进制文件加载工具
 * 支持从 URL、File、Blob 加载二进制数据
 */

/**
 * 二进制加载结果
 */
export interface BinaryLoadResult {
  /** 文件数据 */
  data: ArrayBuffer,
  /** 文件大小（字节） */
  size: number,
  /** 文件类型 */
  mimeType?: string,
  /** 文件名 */
  fileName?: string,
  /** 加载耗时（毫秒） */
  loadTime: number,
}

/**
 * 加载选项
 */
export interface BinaryLoadOptions {
  /** 是否支持进度回调 */
  enableProgress?: boolean,
  /** 超时时间（毫秒），默认 30 秒 */
  timeout?: number,
  /** 最大文件大小（字节），默认 100MB */
  maxFileSize?: number,
  /** 支持的文件类型 */
  acceptedTypes?: string[],
  /** 是否启用缓存 */
  enableCache?: boolean,
}

/**
 * 加载进度信息
 */
export interface LoadProgress {
  /** 已加载字节数 */
  loaded: number,
  /** 总字节数 */
  total: number,
  /** 完成百分比（0-100） */
  percentage: number,
  /** 当前状态 */
  status: 'loading' | 'completed' | 'error',
}

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (progress: LoadProgress) => void;

/**
 * 二进制文件加载错误类型
 */
export enum BinaryLoaderErrorType {
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 超时错误 */
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  /** 文件过大错误 */
  FILE_TOO_LARGE_ERROR = 'FILE_TOO_LARGE_ERROR',
  /** 文件类型不支持错误 */
  UNSUPPORTED_FILE_TYPE_ERROR = 'UNSUPPORTED_FILE_TYPE_ERROR',
  /** 权限错误 */
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  /** 文件不存在错误 */
  FILE_NOT_FOUND_ERROR = 'FILE_NOT_FOUND_ERROR',
  /** 读取错误 */
  READ_ERROR = 'READ_ERROR',
  /** 未知错误 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 二进制文件加载错误
 */
export class BinaryLoaderError extends Error {
  public readonly type: BinaryLoaderErrorType;
  public readonly originalError?: Error | DOMException;

  constructor (type: BinaryLoaderErrorType, message: string, originalError?: Error | DOMException) {
    super(message);
    this.name = 'BinaryLoaderError';
    this.type = type;
    this.originalError = originalError;

    if (originalError) {
      this.stack = originalError.stack;
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserFriendlyMessage (): string {
    switch (this.type) {
      case BinaryLoaderErrorType.NETWORK_ERROR:
        return '网络连接失败，请检查您的网络连接并重试';
      case BinaryLoaderErrorType.TIMEOUT_ERROR:
        return '文件加载超时，请检查网络连接或尝试较小的文件';
      case BinaryLoaderErrorType.FILE_TOO_LARGE_ERROR:
        return '文件过大，请选择较小的文件';
      case BinaryLoaderErrorType.UNSUPPORTED_FILE_TYPE_ERROR:
        return '不支持的文件类型，请选择支持的文件格式';
      case BinaryLoaderErrorType.PERMISSION_ERROR:
        return '没有访问文件的权限，请检查文件权限设置';
      case BinaryLoaderErrorType.FILE_NOT_FOUND_ERROR:
        return '文件不存在，请检查文件路径';
      case BinaryLoaderErrorType.READ_ERROR:
        return '读取文件时发生错误，请重试';
      default:
        return '未知错误，请重试';
    }
  }
}

/**
 * 文件源类型
 */
export type FileSource =
  | { type: 'url', url: string }
  | { type: 'file', file: File }
  | { type: 'blob', blob: Blob };

/**
 * 简单的缓存实现
 */
class SimpleCache {
  private cache = new Map<string, { data: BinaryLoadResult, expires: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5分钟

  set (key: string, data: BinaryLoadResult, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
    });
  }

  get (key: string): BinaryLoadResult | null {
    const item = this.cache.get(key);

    if (!item || item.expires < Date.now()) {
      if (item) {this.cache.delete(key);}

      return null;
    }

    return item.data;
  }

  clear (): void {
    this.cache.clear();
  }
}

const cache = new SimpleCache();

/**
 * 格式化文件大小
 */
export function formatFileSize (bytes: number): string {
  if (bytes === 0) {return '0 Bytes';}

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 验证文件大小
 */
function validateFileSize (size: number, maxSize: number): void {
  if (size > maxSize) {
    throw new BinaryLoaderError(
      BinaryLoaderErrorType.FILE_TOO_LARGE_ERROR,
      `文件大小 (${formatFileSize(size)}) 超过最大限制 (${formatFileSize(maxSize)})`
    );
  }
}

/**
 * 验证文件类型
 */
function validateFileType (mimeType: string, acceptedTypes: string[]): void {
  if (acceptedTypes.length === 0) {return;}

  const isAccepted = acceptedTypes.some(acceptedType => {
    if (acceptedType.includes('*')) {
      const [mainType] = acceptedType.split('/*');

      return mimeType.startsWith(mainType);
    }

    return mimeType === acceptedType;
  });

  if (!isAccepted) {
    throw new BinaryLoaderError(
      BinaryLoaderErrorType.UNSUPPORTED_FILE_TYPE_ERROR,
      `文件类型 '${mimeType}' 不在支持类型列表中: [${acceptedTypes.join(', ')}]`
    );
  }
}

/**
 * 生成缓存键
 */
function getCacheKey (source: FileSource): string {
  switch (source.type) {
    case 'url':
      return `url:${source.url}`;
    case 'file':
      return `file:${source.file.name}:${source.file.size}:${source.file.lastModified}`;
    case 'blob':
      return `blob:${source.blob.size}:${source.blob.type}`;
  }
}

/**
 * 从 URL 加载二进制文件
 */
async function loadFromUrl (
  url: string,
  options: BinaryLoadOptions,
  progressCallback?: ProgressCallback
): Promise<BinaryLoadResult> {
  const startTime = Date.now();
  const timeout = options.timeout ?? 30000;
  const maxFileSize = options.maxFileSize ?? 100 * 1024 * 1024;
  const acceptedTypes = options.acceptedTypes ?? [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Range': 'bytes=0-' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new BinaryLoaderError(
        BinaryLoaderErrorType.NETWORK_ERROR,
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    const mimeType = response.headers.get('Content-Type') || undefined;

    if (total > 0) {
      validateFileSize(total, maxFileSize);
    }

    if (mimeType && acceptedTypes.length > 0) {
      validateFileType(mimeType, acceptedTypes);
    }

    if (!response.body) {
      throw new BinaryLoaderError(
        BinaryLoaderErrorType.READ_ERROR,
        '无法获取响应体数据'
      );
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();

      if (done) {break;}

      if (value) {
        chunks.push(value);
        loaded += value.length;

        if (progressCallback && options.enableProgress) {
          progressCallback({
            loaded,
            total: total || loaded,
            percentage: total > 0 ? Math.min(100, (loaded / total) * 100) : 100,
            status: 'loading',
          });
        }
      }
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const resultArray = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      resultArray.set(chunk, offset);
      offset += chunk.length;
    }

    const fileName = extractFileNameFromUrl(url);

    return {
      data: resultArray.buffer,
      size: totalLength,
      mimeType,
      fileName,
      loadTime: Date.now() - startTime,
    };

  } catch (error) {
    if (error instanceof BinaryLoaderError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new BinaryLoaderError(
        BinaryLoaderErrorType.TIMEOUT_ERROR,
        `请求超时 (${timeout}ms)`
      );
    }

    throw new BinaryLoaderError(
      BinaryLoaderErrorType.NETWORK_ERROR,
      `网络错误: ${error instanceof Error ? error.message : '未知错误'}`,
      error as Error
    );
  }
}

/**
 * 从 File 对象加载二进制文件
 */
async function loadFromFile (
  file: File,
  options: BinaryLoadOptions,
  progressCallback?: ProgressCallback
): Promise<BinaryLoadResult> {
  const startTime = Date.now();
  const maxFileSize = options.maxFileSize ?? 100 * 1024 * 1024;
  const acceptedTypes = options.acceptedTypes ?? [];

  validateFileSize(file.size, maxFileSize);

  if (file.type && acceptedTypes.length > 0) {
    validateFileType(file.type, acceptedTypes);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = event => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;

        resolve({
          data: arrayBuffer,
          size: file.size,
          mimeType: file.type || undefined,
          fileName: file.name,
          loadTime: Date.now() - startTime,
        });
      } catch (error) {
        reject(new BinaryLoaderError(
          BinaryLoaderErrorType.READ_ERROR,
          '读取文件数据失败',
          error as Error
        ));
      }
    };

    reader.onerror = event => {
      reject(new BinaryLoaderError(
        BinaryLoaderErrorType.READ_ERROR,
        '文件读取错误',
        event.target?.error || undefined
      ));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * 从 Blob 对象加载二进制文件
 */
async function loadFromBlob (
  blob: Blob,
  options: BinaryLoadOptions,
  progressCallback?: ProgressCallback
): Promise<BinaryLoadResult> {
  const startTime = Date.now();
  const maxFileSize = options.maxFileSize ?? 100 * 1024 * 1024;
  const acceptedTypes = options.acceptedTypes ?? [];

  validateFileSize(blob.size, maxFileSize);

  if (blob.type && acceptedTypes.length > 0) {
    validateFileType(blob.type, acceptedTypes);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = event => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;

        resolve({
          data: arrayBuffer,
          size: blob.size,
          mimeType: blob.type || undefined,
          loadTime: Date.now() - startTime,
        });
      } catch (error) {
        reject(new BinaryLoaderError(
          BinaryLoaderErrorType.READ_ERROR,
          '读取 Blob 数据失败',
          error as Error
        ));
      }
    };

    reader.onerror = event => {
      reject(new BinaryLoaderError(
        BinaryLoaderErrorType.READ_ERROR,
        'Blob 读取错误',
        event.target?.error || undefined
      ));
    };

    reader.readAsArrayBuffer(blob);
  });
}

/**
 * 从 URL 中提取文件名
 */
function extractFileNameFromUrl (url: string): string | undefined {
  try {
    const urlObject = new URL(url);
    const pathname = urlObject.pathname;
    const fileName = pathname.split('/').pop();

    if (fileName && fileName !== '') {
      return fileName;
    }
  } catch {
    const lastSlashIndex = url.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
      return url.substring(lastSlashIndex + 1);
    }
  }

  return undefined;
}

/**
 * 主加载函数
 */
export async function loadBinaryFile (
  source: FileSource,
  options: BinaryLoadOptions = {},
  progressCallback?: ProgressCallback
): Promise<BinaryLoadResult> {
  const mergedOptions: Required<BinaryLoadOptions> = {
    enableProgress: options.enableProgress ?? true,
    timeout: options.timeout ?? 30000,
    maxFileSize: options.maxFileSize ?? 100 * 1024 * 1024,
    acceptedTypes: options.acceptedTypes ?? [],
    enableCache: options.enableCache ?? true,
  };

  // 检查缓存
  if (mergedOptions.enableCache) {
    const cacheKey = getCacheKey(source);
    const cached = cache.get(cacheKey);

    if (cached) {
      return { ...cached, loadTime: 0 };
    }
  }

  let result: BinaryLoadResult;

  try {
    switch (source.type) {
      case 'url':
        result = await loadFromUrl(source.url, mergedOptions, progressCallback);

        break;
      case 'file':
        result = await loadFromFile(source.file, mergedOptions, progressCallback);

        break;
      case 'blob':
        result = await loadFromBlob(source.blob, mergedOptions, progressCallback);

        break;
      default:
        throw new BinaryLoaderError(
          BinaryLoaderErrorType.UNKNOWN_ERROR,
          '不支持的文件源类型'
        );
    }

    // 缓存结果
    if (mergedOptions.enableCache) {
      const cacheKey = getCacheKey(source);

      cache.set(cacheKey, result);
    }

    // 完成进度通知
    if (progressCallback && mergedOptions.enableProgress) {
      progressCallback({
        loaded: result.size,
        total: result.size,
        percentage: 100,
        status: 'completed',
      });
    }

    return result;

  } catch (error) {
    if (error instanceof BinaryLoaderError) {
      throw error;
    }

    throw new BinaryLoaderError(
      BinaryLoaderErrorType.UNKNOWN_ERROR,
      `加载文件失败: ${error instanceof Error ? error.message : '未知错误'}`,
      error as Error
    );
  }
}

/**
 * 便捷函数：从 URL 加载
 */
export async function loadBinaryFromUrl (
  url: string,
  options: BinaryLoadOptions = {},
  progressCallback?: ProgressCallback
): Promise<BinaryLoadResult> {
  return loadBinaryFile({ type: 'url', url }, options, progressCallback);
}

/**
 * 便捷函数：从 File 加载
 */
export async function loadBinaryFromFile (
  file: File,
  options: BinaryLoadOptions = {},
  progressCallback?: ProgressCallback
): Promise<BinaryLoadResult> {
  return loadBinaryFile({ type: 'file', file }, options, progressCallback);
}

/**
 * 便捷函数：从 Blob 加载
 */
export async function loadBinaryFromBlob (
  blob: Blob,
  options: BinaryLoadOptions = {},
  progressCallback?: ProgressCallback
): Promise<BinaryLoadResult> {
  return loadBinaryFile({ type: 'blob', blob }, options, progressCallback);
}

/**
 * 清除缓存
 */
export function clearBinaryCache (): void {
  cache.clear();
}

/**
 * 使用示例：
 *
 * // 从 URL 加载
 * const result = await loadBinaryFromUrl('https://example.com/file.bin');
 *
 * // 从 File 对象加载
 * const file = input.files[0];
 * const result = await loadBinaryFromFile(file, {
 *   maxFileSize: 50 * 1024 * 1024, // 50MB
 *   acceptedTypes: ['application/octet-stream']
 * });
 *
 * // 带进度回调
 * const result = await loadBinaryFromUrl('large-file.bin', {
 *   enableProgress: true
 * }, (progress) => {
 *   console.log(`加载进度: ${progress.percentage}%`);
 * });
 *
 * // 错误处理
 * try {
 *   const result = await loadBinaryFile(source);
 * } catch (error) {
 *   if (error instanceof BinaryLoaderError) {
 *     console.error(error.getUserFriendlyMessage());
 *   }
 * }
 */