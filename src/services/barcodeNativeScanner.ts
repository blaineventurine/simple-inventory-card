import { ExternalBusMessage, Bridge, ConfigGetResult } from '@/types/externalBusMessages';

let active = false;
let configGet: ConfigGetResult | null = null;
export let externalMessageId = 0;
const NATIVE_QR_BRIDGE_KEY = '__TEST_TEST_NATIVE_QR_BRIDGE__';

export function isNativeScannerActive(): boolean {
  return active;
}

export function getBusBridge(): Bridge | null {
  const w = window as Window & {
    [NATIVE_QR_BRIDGE_KEY]?: Bridge;
    externalBus?: (message: string) => unknown;
  };

  const existing: Bridge = w[NATIVE_QR_BRIDGE_KEY] ?? {
    listeners: new Map(),
    typeListeners: new Set(),
    original: null,
    wrapper: null,
  };
  if (existing?.wrapper && w.externalBus === existing.wrapper) {
    if (!(existing.typeListeners instanceof Set)) existing.typeListeners = new Set();
    return existing;
  }

  const current = w.externalBus;
  if (typeof current !== 'function') {
    return null;
  }
  const bridge = existing || {
    listeners: new Map(),
    typeListeners: new Set(),
    original: null,
    wrapper: null,
  };

  if (!(bridge.typeListeners instanceof Set)) {
    bridge.typeListeners = new Set();
  }
  bridge.original = current;
  bridge.wrapper = function inventoryCardExternalBusBridge(message) {
    let parsed = null;
    try {
      parsed = typeof message === 'string' ? JSON.parse(message) : message;
    } catch {}
    let originalResult;
    try {
      originalResult = current.apply(this, arguments as unknown as [message: string]);
    } catch {}
    if (parsed && Number.isInteger(parsed.id)) {
      const listener = bridge.listeners.get(parsed.id);
      if (listener) {
        try {
          listener(parsed);
        } catch {}
      }
    }
    if (parsed && bridge.typeListeners instanceof Set) {
      for (const listener of [...bridge.typeListeners]) {
        try {
          listener(parsed);
        } catch {}
      }
    }
    return originalResult;
  };
  try {
    w.externalBus = bridge.wrapper;
  } catch {
    return null;
  }

  w[NATIVE_QR_BRIDGE_KEY] = bridge;
  return bridge;
}

function nativeExternalBusRequest(
  message: ExternalBusMessage,
  timeoutMs = 1200,
): Promise<ExternalBusMessage | null> {
  const bridge = getBusBridge();
  if (!bridge) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = (value: ExternalBusMessage | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      bridge.listeners.delete(message.id);
      resolve(value);
    };
    bridge.listeners.set(message.id, finish);
    const timer = setTimeout(() => finish(null), timeoutMs);
    if (!nativeExternalBusSend(message)) {
      finish(null);
    }
  });
}

function nativeExternalBusSend(message: ExternalBusMessage): boolean {
  const w = window as Window & {
    externalAppV2?: {
      postMessage: (message: string) => void;
    };
    externalApp?: {
      externalBus: (message: string) => void;
    };
    webkit?: {
      messageHandlers?: {
        externalBus?: {
          postMessage: (message: string) => void;
        };
      };
    };
  };

  const ebusMessage = {
    type: 'externalBus',
    payload: message,
  };
  const serialized = JSON.stringify(ebusMessage);
  try {
    if (w.externalAppV2 && typeof w.externalAppV2.postMessage === 'function') {
      w.externalAppV2.postMessage(serialized);
      return true;
    }
  } catch {}
  try {
    if (w.externalApp && typeof w.externalApp.externalBus === 'function') {
      w.externalApp.externalBus(serialized);
      return true;
    }
  } catch {}
  try {
    if (w.webkit?.messageHandlers?.externalBus?.postMessage) {
      w.webkit.messageHandlers.externalBus.postMessage(serialized);
      return true;
    }
  } catch {}
  return false;
}

export function setNativeScannerConfig(config: ConfigGetResult): void {
  configGet = config;
}

async function _getNativeScannerInfo(): Promise<ConfigGetResult | null> {
  const id = ++externalMessageId;
  const response = await nativeExternalBusRequest({ id, type: 'config/get' }, 1400);
  if (response?.type !== 'result' || response?.success !== true || !response?.result) {
    return null;
  }
  if (response.result && 'hasBarCodeScanner' in response.result) {
    configGet = response.result;
  }
  return configGet;
}

export async function getNativeScannerInfo(): Promise<ConfigGetResult | null> {
  if (configGet) {
    return Promise.resolve(configGet);
  }

  return _getNativeScannerInfo();
}

export function isNativeScannerAvailable(): boolean {
  if (configGet === null) {
    return false;
  }

  return Boolean(configGet?.hasBarCodeScanner);
}

export function startNativeScanner(onDetected: (code: string) => void): Promise<string | null> {
  const id = ++externalMessageId;

  nativeExternalBusSend({
    id,
    type: 'bar_code/scan',
    payload: {
      title: 'Scan barcode',
      description: 'Scan a barcode to process the item',
    },
  });

  const bridge = getBusBridge();
  if (!bridge) {
    return Promise.resolve('not_available');
  }
  bridge.typeListeners.clear();
  bridge.typeListeners.add((message) => {
    if (message?.type === 'command' && message?.id === id) {
      const payload = message?.payload;
      switch (message?.command) {
        case 'bar_code/scan_result':
          if (payload && 'rawValue' in payload && typeof payload.rawValue === 'string') {
            onDetected(payload.rawValue);
          }
          break;
        case 'bar_code/aborted':
          console.warn('Native scanner aborted or error:', message);
          break;
      }
    }
  });

  return new Promise((resolve) => {
    active = true;
    resolve(null);
  });
}

export function stopNativeScanner(): void {
  if (active) {
    const bridge = getBusBridge();
    bridge?.typeListeners.clear();

    nativeExternalBusSend({
      id: ++externalMessageId,
      type: 'bar_code/close',
    });

    active = false;
  }
}
