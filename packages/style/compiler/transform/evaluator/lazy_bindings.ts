import { evalFail } from './evaluator';
import type { EvalResult } from './types';

/** Map-compatible bindings whose initializers run only when their values are read. */
export class LazyBindings extends Map<string, EvalResult> {
  private initializers = new Map<string, () => EvalResult>();

  setLazy(name: string, initializer: () => EvalResult) {
    this.initializers.set(name, initializer);
    super.set(name, evalFail(`Circular binding: ${name}`));
  }

  /** Capture a declaration environment without forcing pending initializers. */
  fork() {
    const bindings = new LazyBindings();
    for (const [name, value] of super.entries()) bindings.set(name, value);
    for (const [name, initializer] of this.initializers) bindings.setLazy(name, initializer);
    return bindings;
  }

  override set(name: string, value: EvalResult) {
    this.initializers.delete(name);
    return super.set(name, value);
  }

  override delete(name: string) {
    this.initializers.delete(name);
    return super.delete(name);
  }

  override clear() {
    this.initializers.clear();
    super.clear();
  }

  override get(name: string): EvalResult | undefined {
    const initializer = this.initializers.get(name);
    if (initializer) {
      this.initializers.delete(name);
      super.set(name, initializer());
    }
    return super.get(name);
  }

  override forEach(
    callback: (value: EvalResult, key: string, map: Map<string, EvalResult>) => void,
    thisArg?: unknown,
  ) {
    for (const key of this.keys()) callback.call(thisArg, this.get(key)!, key, this);
  }

  override *entries(): MapIterator<[string, EvalResult]> {
    for (const key of this.keys()) yield [key, this.get(key)!];
  }

  override *values(): MapIterator<EvalResult> {
    for (const key of this.keys()) yield this.get(key)!;
  }

  override [Symbol.iterator]() {
    return this.entries();
  }
}
