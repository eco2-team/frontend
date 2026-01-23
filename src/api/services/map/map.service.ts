import api from '@/api/axiosInstance';
import type {
  LocationDetailResponse,
  LocationListRequest,
  LocationListResponse,
  LocationSearchRequest,
  SuggestResponse,
} from '@/api/services/map/map.type';

const BASE_URL = '/api/v1/locations';

export class MapService {
  static async getLocations(request: LocationListRequest) {
    return api
      .get<LocationListResponse>(`${BASE_URL}/centers`, { params: request })
      .then((res) => res.data);
  }

  static async searchLocations(request: LocationSearchRequest) {
    return api
      .get<LocationListResponse>(`${BASE_URL}/search`, { params: request })
      .then((res) => res.data);
  }

  static async suggestPlaces(query: string) {
    return api
      .get<SuggestResponse>(`${BASE_URL}/suggest`, { params: { q: query } })
      .then((res) => res.data);
  }

  static async getLocationDetail(centerId: number) {
    return api
      .get<LocationDetailResponse>(`${BASE_URL}/centers/${centerId}`)
      .then((res) => res.data);
  }
}
