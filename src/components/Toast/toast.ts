type ToastType = 'success' | 'error';

interface ToastProps {
  type: ToastType;
  message: string;
}

let showToastFn: ((props: ToastProps) => void) | null = null;

export const setToastFn = (fn: (props: ToastProps) => void) => {
  showToastFn = fn;
};

export const toast = {
  success: (message: string) => showToastFn?.({ message, type: 'success' }),
  error: (message: string) => showToastFn?.({ message, type: 'error' }),
};

export type { ToastType, ToastProps };
