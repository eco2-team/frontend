type ToastType = 'success' | 'error' | 'loading';

interface ToastProps {
  type: ToastType;
  message: string;
  /** loading 타입일 때 토스트 ID (dismiss용) */
  id?: string;
}

type ShowToastFn = (props: ToastProps) => void;
type DismissToastFn = (id: string) => void;

let showToastFn: ShowToastFn | null = null;
let dismissToastFn: DismissToastFn | null = null;

export const setToastFn = (fn: ShowToastFn) => {
  showToastFn = fn;
};

export const setDismissToastFn = (fn: DismissToastFn) => {
  dismissToastFn = fn;
};

export const toast = {
  success: (message: string) => showToastFn?.({ message, type: 'success' }),
  error: (message: string) => showToastFn?.({ message, type: 'error' }),
  /**
   * 로딩 토스트 표시
   * @returns dismiss 함수
   */
  loading: (message: string) => {
    const id = `loading-${Date.now()}`;
    showToastFn?.({ message, type: 'loading', id });
    return () => dismissToastFn?.(id);
  },
};

export type { ToastType, ToastProps };
