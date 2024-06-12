import { logger, chalk } from "./logger.js"
import {
  StringOrNull,
  StringOrBuffer,
  getCircularReplacer,
  String,
  Loging,
} from "./common.js"

export function makeError(msg = "", obj = {}) {
  return Object.assign(Error(msg), obj)
}

export function findArrays<T>(array1: Array<T>, array2: Array<T>): T | void {
  return array1.find(i => array2.includes(i))
}

export {
  logger,
  chalk,
  StringOrNull,
  StringOrBuffer,
  getCircularReplacer,
  String,
  Loging,
}