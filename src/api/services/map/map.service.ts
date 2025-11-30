import api from '@/api/axiosInstance';
import type {
  LocationListRequest,
  LocationListResponse,
} from '@/api/services/map/map.type';

const BASE_URL = '/api/v1/locations';

export class MapService {
  static async getLocations(request: LocationListRequest) {
    return api
      .get<LocationListResponse>(`${BASE_URL}/centers`, { params: request })
      .then((res) => res.data);
  }
}
