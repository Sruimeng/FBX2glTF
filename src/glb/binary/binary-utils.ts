/**
 * FBX 二进制解析工具函数
 * 包含解析过程中使用的常量和辅助函数
 */

/**
 * FBX 二进制文件魔数长度
 */
export const FBX_MAGIC_LENGTH = 23;

/**
 * FBX 二进制文件最小支持版本
 */
export const FBX_MIN_SUPPORTED_VERSION = 6400;

/**
 * FBX 7500+ 版本分界点
 */
export const FBX_VERSION_7500 = 7500;

/**
 * FBX 文件页脚大小（包含对齐）
 */
export const FBX_FOOTER_SIZE = 160 + 16;

/**
 * 检查版本是否支持
 * @param version FBX 版本号
 * @returns 是否支持该版本
 */
export function isVersionSupported (version: number): boolean {
  return version >= FBX_MIN_SUPPORTED_VERSION;
}

/**
 * 获取版本错误消息
 * @param version FBX 版本号
 * @returns 错误消息
 */
export function getVersionErrorMessage (version: number): string {
  return `THREE.FBXLoader: FBX version not supported, FileVersion: ${version}`;
}