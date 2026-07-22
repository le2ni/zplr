export interface WorkspaceAssetMetadata {
  id: string;
  resourceName: string;
  filename: string;
  mimeType: string;
  size: number;
  kind: "image" | "font";
  importedAt: string;
}

interface StoredWorkspaceAsset extends WorkspaceAssetMetadata {
  key: string;
  documentId: string;
  blob: Blob;
}

const databaseName = "zplr-workspace-assets-v1";
const storeName = "assets";
const memoryAssets = new Map<string, StoredWorkspaceAsset>();

function assetKey(documentId: string, assetId: string): string {
  return `${documentId}:${assetId}`;
}

function openDatabase(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === "undefined") return Promise.resolve(undefined);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("The asset database could not be opened."));
  });
}

function transactionResult<T>(request: IDBRequest<T>, transaction: IDBTransaction): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? transaction.error ?? new Error("The asset operation failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("The asset operation was aborted."));
  });
}

export async function putWorkspaceAsset(
  documentId: string,
  metadata: WorkspaceAssetMetadata,
  bytes: Uint8Array,
): Promise<void> {
  const key = assetKey(documentId, metadata.id);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const stored: StoredWorkspaceAsset = {
    ...metadata,
    key,
    documentId,
    blob: new Blob([buffer], { type: metadata.mimeType || "application/octet-stream" }),
  };
  memoryAssets.set(key, stored);
  const database = await openDatabase();
  if (!database) return;
  try {
    const transaction = database.transaction(storeName, "readwrite");
    await transactionResult(transaction.objectStore(storeName).put(stored), transaction);
  } finally {
    database.close();
  }
}

export async function getWorkspaceAsset(documentId: string, assetId: string): Promise<Blob | undefined> {
  const key = assetKey(documentId, assetId);
  const memory = memoryAssets.get(key);
  if (memory) return memory.blob;
  const database = await openDatabase();
  if (!database) return undefined;
  try {
    const transaction = database.transaction(storeName, "readonly");
    const stored = await transactionResult(transaction.objectStore(storeName).get(key), transaction) as StoredWorkspaceAsset | undefined;
    if (stored) memoryAssets.set(key, stored);
    return stored?.blob;
  } finally {
    database.close();
  }
}

export async function deleteWorkspaceAsset(documentId: string, assetId: string): Promise<void> {
  const key = assetKey(documentId, assetId);
  memoryAssets.delete(key);
  const database = await openDatabase();
  if (!database) return;
  try {
    const transaction = database.transaction(storeName, "readwrite");
    await transactionResult(transaction.objectStore(storeName).delete(key), transaction);
  } finally {
    database.close();
  }
}
