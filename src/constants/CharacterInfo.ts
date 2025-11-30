import EcoCharacter from '@/assets/images/mainCharacter/main_2.png';
import Eco from '@/assets/images/mainCharacter/main_1.png';
import PaperCharacter from '@/assets/images/subCharacter/sub_paper.png';
import BatteryCharacter from '@/assets/images/subCharacter/sub_battery.png';
import ClothesCharacter from '@/assets/images/subCharacter/sub_clothes.png';
import GlassCharacter from '@/assets/images/subCharacter/sub_glass.png';
import LightingCharacter from '@/assets/images/subCharacter/sub_lighting.png';
import MetalCharacter from '@/assets/images/subCharacter/sub_metal.png';
import MonitorCharacter from '@/assets/images/subCharacter/sub_monitor.png';
import PaperProductsCharacter from '@/assets/images/subCharacter/sub_paper_products.png';
import PetCharacter from '@/assets/images/subCharacter/sub_pet.png';
import PlasticCharacter from '@/assets/images/subCharacter/sub_plastic.png';
import StyrofoamCharacter from '@/assets/images/subCharacter/sub_styrofoam.png';
import VinylCharacter from '@/assets/images/subCharacter/sub_vinyl.png';
import Paper from '@/assets/icons/icon_paper.svg';
import Battery from '@/assets/icons/icon_battery.svg';
import Clothes from '@/assets/icons/icon_clothes.svg';
import Glass from '@/assets/icons/icon_glass.svg';
import Lighting from '@/assets/icons/icon_lighting.svg';
import Metal from '@/assets/icons/icon_metal.svg';
import Monitor from '@/assets/icons/icon_monitor.svg';
import PaperProducts from '@/assets/icons/icon_paper_products.svg';
import Pet from '@/assets/icons/icon_pet.svg';
import Plastic from '@/assets/icons/icon_plastic.svg';
import Styrofoam from '@/assets/icons/icon_styrofoam.svg';
import Vinyl from '@/assets/icons/icon_vinyl.svg';

import type { CharacterDataMap } from '@/types/CharacterInfoTypes';

// TODO: subDescription 수정 필요
export const CHARACTER_DATA: CharacterDataMap = {
  eco: {
    id: 'eco',
    characterType: 'main',
    wasteName: '이코',
    characterName: '이코',
    wasteImage: Eco,
    characterImage: EcoCharacter,
    description: '환경을 사랑하는 AI 분리배출 도우미',
    subDescription: '찰칵! 분리수거하고 이코의 친구를 얻어보세요!',
  },
  paper: {
    id: 'paper',
    characterType: 'sub',
    wasteName: '종이',
    characterName: '페이피',
    wasteImage: Paper,
    characterImage: PaperCharacter,
    description: '골판지류ㆍ신문지ㆍ과자상자ㆍ백판지ㆍ책자',
    subDescription: '테이프와 스테이플은 떼고 깨끗하게 접어요!',
  },
  paperProduct: {
    id: 'paperProduct',
    characterType: 'sub',
    wasteName: '종이팩',
    characterName: '팩토리',
    wasteImage: PaperProducts,
    characterImage: PaperProductsCharacter,
    description: '일반팩ㆍ주스팩ㆍ소주팩ㆍ두유팩',
    subDescription: '물로 헹구고 라벨을 제거하는 멋진 팩토리!',
  },
  pet: {
    id: 'pet',
    characterType: 'sub',
    wasteName: '무색페트병',
    characterName: '페티',
    wasteImage: Pet,
    characterImage: PetCharacter,
    description: '먹는샘물 페트병ㆍ음료 페트병',
    subDescription: '라벨과 뚜껑을 분리하고 투명하게 헹궈줘요!',
  },

  vinyl: {
    id: 'vinyl',
    characterType: 'sub',
    wasteName: '비닐류',
    characterName: '비니',
    wasteImage: Vinyl,
    characterImage: VinylCharacter,
    description: '이물질과 내용물을 제거하고 모아서 배출해!',
    subDescription: '이물질과 내용물을 제거하고 모아서 배출해!',
  },
  glass: {
    id: 'glass',
    characterType: 'sub',
    wasteName: '유리병',
    characterName: '글래시',
    wasteImage: Glass,
    characterImage: GlassCharacter,
    description: '라벨과 뚜껑을 제거하고 색 별로 구분해 배출해요!',
    subDescription: '라벨과 뚜껑을 제거하고 색 별로 구분해 배출해요!',
  },
  clothes: {
    id: 'clothes',
    characterType: 'sub',
    wasteName: '의류·원단',
    characterName: '코튼',
    wasteImage: Clothes,
    characterImage: ClothesCharacter,
    description: '젖지 않게 모아서 수거함에 넣어봐요!',
    subDescription: '젖지 않게 모아서 수거함에 넣어봐요!',
  },
  plastic: {
    id: 'plastic',
    characterType: 'sub',
    wasteName: '플라스틱류',
    characterName: '폴리',
    wasteImage: Plastic,
    characterImage: PlasticCharacter,
    description: '세척 후 잘 말리고 압착해서 버려요!',
    subDescription: '세척 후 잘 말리고 압착해서 버려요!',
  },
  metal: {
    id: 'metal',
    characterType: 'sub',
    wasteName: '금속류',
    characterName: '메탈린',
    wasteImage: Metal,
    characterImage: MetalCharacter,
    description: '음식물을 깨끗히 제거 후 분리배출해봐!',
    subDescription: '음식물을 깨끗히 제거 후 분리배출해봐!',
  },
  battery: {
    id: 'battery',
    characterType: 'sub',
    wasteName: '전지',
    characterName: '배터리',
    wasteImage: Battery,
    characterImage: BatteryCharacter,
    description: '본체와 분리해서 전용 수거함에 버려요!',
    subDescription: '본체와 분리해서 전용 수거함에 버려요!',
  },
  lighting: {
    id: 'lighting',
    characterType: 'sub',
    wasteName: '조명제품',
    characterName: '라이터',
    wasteImage: Lighting,
    characterImage: LightingCharacter,
    description: '형광등은 깨지지 않게 포장해서 전용수거함으로!',
    subDescription: '형광등은 깨지지 않게 포장해서 전용수거함으로!',
  },
  monitor: {
    id: 'monitor',
    characterType: 'sub',
    wasteName: '전기전자',
    characterName: '웰리',
    wasteImage: Monitor,
    characterImage: MonitorCharacter,
    description: '그냥은 안돼! 전자제품은 가까운 수거센터로!',
    subDescription: '그냥은 안돼! 전자제품은 가까운 수거센터로!',
  },
  styrofoam: {
    id: 'styrofoam',
    characterType: 'sub',
    wasteName: '발포합성수지',
    characterName: '푸키',
    wasteImage: Styrofoam,
    characterImage: StyrofoamCharacter,
    description: '거품은 제거 후, 오염된 건 일반쓰레기!',
    subDescription: '거품은 제거 후, 오염된 건 일반쓰레기!',
  },
} as const;

export const CHARACTER_LIST = Object.values(CHARACTER_DATA);
