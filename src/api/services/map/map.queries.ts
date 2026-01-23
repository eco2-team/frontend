import { queryOptions } from '@tanstack/react-query';
import type { LocationListRequest } from './map.type';
import { MapService } from './map.service';

export class MapQueries {
  static readonly keys = {
    root: ['locations'],
    search: ['locations', 'search'],
    suggest: ['locations', 'suggest'],
    detail: ['locations', 'detail'],
  };

  static getLocations(request: LocationListRequest) {
    return queryOptions({
      queryKey: [...this.keys.root],
      queryFn: async () => {
        const data = await MapService.getLocations(request);
        return data;
      },
    });
  }

  static searchLocations(query: string, radius?: number) {
    return queryOptions({
      queryKey: [...this.keys.search, query],
      queryFn: async () => {
        const data = await MapService.searchLocations({ q: query, radius });
        return data;
      },
      enabled: false,
    });
  }

  static getLocationDetail(centerId: number) {
    return queryOptions({
      queryKey: [...this.keys.detail, centerId],
      queryFn: async () => {
        const data = await MapService.getLocationDetail(centerId);
        return data;
      },
    });
  }
}
