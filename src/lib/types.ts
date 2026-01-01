/**
 * Shared application TypeScript types
 * - 放置與表單/編輯鎖定相關的嚴謹型別定義
 */

/**
 * 單一表單欄位的狀態
 * - `locked_by` 存放操作該欄位的使用者識別（例如 nickname 或 user id），若無則為 null
 * - `locked_at` 為 ISO 8601 字串時間戳（例如 `2026-01-01T12:00:00.000Z`），若無則為 null
 * - `version` 為整數，用於樂觀併發控制（每次修改需遞增）
 */
export interface FormField {
  id: string;
  value: string;
  locked_by: string | null;
  locked_at: string | null; // ISO timestamp or null
  version: number; // optimistic concurrency control
}

/**
 * 一個表單的完整狀態容器，使用欄位 id 做為 key
 */
export type FormState = Record<string, FormField>;

/**
 * 建立一個新的空白 FormField 工具（可視需要匯入使用）
 */
export function createEmptyField(id: string, initialValue = ''): FormField {
  return {
    id,
    value: initialValue,
    locked_by: null,
    locked_at: null,
    version: 1
  };
}
