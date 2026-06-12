export type ResolveImportFn = (
  source: string,
  from: string,
) => EvalModuleBindings | null;

export type ImportMap = Map<string, {
  source: string;
  name: string;
}>;

export type EvalModuleBindings = Map<string, EvalResult>;

export type EvalSlotRef = {
  ok: false;
  reason: 'slot-ref';
  filePath: string;
  slotId: string;
};

export type EvalOk = { ok: true; value: unknown; };
export type EvalFail = { ok: false; reason: string; };
export type EvalResult = EvalOk | EvalFail | EvalSlotRef;
