export type LocationListRequest = {
  lat: number;
  lon: number;
  radius?: number;
  zoom?: number;
  store_category?: string;
  pickup_category?: string;
};

export type SourceType = 'keco' | 'zerowaste';
export type ToggleType = 'all' | SourceType | 'none';

export type LocationListItemResponse = {
  id: number;
  name: string;
  source: 'keco' | 'zerowaste' | 'kakao' | string;
  road_address?: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
  distance_text?: string;
  store_category?: string;
  is_open?: boolean;
  is_holiday?: boolean;
  start_time?: string;
  end_time?: string;
  phone?: string;
  pickup_categories?: string[];
  place_url?: string;
  kakao_place_id?: string;
};

export type LocationListResponse = LocationListItemResponse[];

export type LocationSearchRequest = {
  q: string;
  radius?: number;
};

export type SuggestRequest = {
  q: string;
};

export type SuggestEntry = {
  place_name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  place_url: string | null;
};

export type SuggestResponse = SuggestEntry[];

export type LocationDetailResponse = {
  id: number;
  name: string;
  source: string;
  road_address: string | null;
  lot_address: string | null;
  latitude: number | null;
  longitude: number | null;
  store_category: string;
  pickup_categories: string[];
  phone: string | null;
  place_url: string | null;
  kakao_place_id: string | null;
  collection_items: string | null;
  introduction: string | null;
};

export type StoreCategory = {
  key: string;
  label: string;
};

export const STORE_CATEGORIES: StoreCategory[] = [
  { key: 'refill_zero', label: '제로웨이스트' },
  { key: 'cafe_bakery', label: '카페/베이커리' },
  { key: 'vegan_dining', label: '비건/식당' },
  { key: 'upcycle_recycle', label: '업사이클/재활용' },
  { key: 'book_workshop', label: '도서관/공방' },
  { key: 'market_mart', label: '마트/시장' },
  { key: 'lodging', label: '숙박' },
  { key: 'public_dropbox', label: '무인 수거함' },
  { key: 'general', label: '기타' },
];
