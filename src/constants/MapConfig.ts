import type { Position } from '@/types/MapTypes';

// 기본 지도 중심 좌표 (동대문 디자인 플라자 DDP)
export const DEFAULT_CENTER: Position = {
  lat: 37.567976,
  lng: 127.009341,
} as const;

export const TOGGLE_TRANSITION_MAP = {
  all: {
    zerowaste: 'keco',
    keco: 'zerowaste',
  },
  keco: {
    zerowaste: 'all',
    keco: 'none',
  },
  zerowaste: {
    zerowaste: 'none',
    keco: 'all',
  },
  none: {
    zerowaste: 'zerowaste',
    keco: 'keco',
  },
} as const;
