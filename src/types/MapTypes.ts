export interface Position {
  lat: number;
  lng: number;
}
export interface MapCardType {
  id: number;
  name: string;
  type: 'superBin' | 'zeroWaste';
  distance: string;
  description: string;
  hours: string;
  phone: string;
}

export const MapTemplateData: MapCardType[] = [
  {
    id: 1,
    name: '수퍼빈 강남역점',
    type: 'superBin' as const,
    distance: '120m',
    description: 'AI 재활용 수거함',
    hours: '24시간',
    phone: '1588-1234',
  },
  {
    id: 2,
    name: '알맹상점',
    type: 'zeroWaste' as const,
    distance: '350m',
    description: '제로웨이스트 가게',
    hours: '10:00 - 20:00',
    phone: '02-2345-6789',
  },
  {
    id: 3,
    name: '수퍼빈 역삼역점',
    type: 'superBin' as const,
    distance: '480m',
    description: 'AI 재활용 수거함',
    hours: '24시간',
    phone: '1588-1234',
  },
  {
    id: 4,
    name: '더피커',
    type: 'zeroWaste' as const,
    distance: '560m',
    description: '제로웨이스트 가게',
    hours: '11:00 - 19:00',
    phone: '02-4567-8901',
  },
];
