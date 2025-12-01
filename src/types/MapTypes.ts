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
