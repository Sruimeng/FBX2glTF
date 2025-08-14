// 数学工具函数 - 重构版本
import { getEulerOrder as mathGetEulerOrder, convertFBXTimeToSeconds as mathConvertFBXTimeToSeconds, getData as mathGetData } from '../../math/math';

// 重新导出新的数学工具函数
export { getEulerOrder, convertFBXTimeToSeconds, getData } from '../../math/math';

// 保持向后兼容的别名
export const getEulerOrderLegacy = mathGetEulerOrder;
export const convertFBXTimeToSecondsLegacy = mathConvertFBXTimeToSeconds;
export const getDataLegacy = mathGetData;