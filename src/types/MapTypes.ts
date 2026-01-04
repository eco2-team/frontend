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

export const WasteType = {
  clear_pet: '투명 페트병',
  colored_pet: '유색 페트병',
  can: '캔류',
  paper: '종이류',
  plastic: '플라스틱류',
  glass: '유리류',
  textile: '의류·섬유류',
  electronics: '전자제품/건전지',
  general: '기타',
} as const;

export type WasteTypeKey = keyof typeof WasteType;

export const WasteCategoryMap: Record<string, WasteTypeKey> = {
  종이: 'paper',
  종이팩: 'paper',
  무색페트병: 'clear_pet',
  비닐류: 'general',
  유리병: 'glass',
  의류및원단: 'textile',
  플라스틱류: 'plastic',
  금속류: 'general',
  전지: 'electronics',
  조명제품: 'general',
  전기전자제품: 'electronics',
  발포합성수지: 'general',
};
