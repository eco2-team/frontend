import { queryOptions } from '@tanstack/react-query';
import type { LocationListRequest } from './map.type';
import { MapService } from './map.service';

export class MapQueries {
  static readonly keys = {
    root: ['locations'],
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
}
