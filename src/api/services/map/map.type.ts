export type LocationListRequest = {
  lat: number;
  lon: number;
  radius?: number;
  zoom?: number;
  store_category?: string;
  pickup_category?: string;
};

export type LocationListItemResponse = {
  id: number;
  name: string;
  source: 'keco' | 'zerowaste';
  road_address?: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
  distance_text?: string;
  is_open?: boolean;
  start_time?: string;
  end_time?: string;
  phone?: string;
  pickup_categories?: string[];
};

export type LocationListResponse = LocationListItemResponse[];
