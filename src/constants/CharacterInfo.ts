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

import type {
  CharacterDataMap,
  CharacterKey,
  CharacterNames,
} from '@/types/CharacterInfoTypes';

export const CHARACTER_DATA: CharacterDataMap = {
  eco: {
    characterType: 'main',
    wasteName: '이코',
    middle_category: '이코',
    characterName: '이코',
    wasteImage: Eco,
    characterImage: EcoCharacter,
    description: '환경을 사랑하는 AI 분리배출 도우미',
    subDescription: '찰칵! 분리수거하고 이코의 친구를 얻어보세요!',
  },
  paper: {
    characterType: 'sub',
    wasteName: '종이',
    middle_category: '종이',
    characterName: '페이피',
    wasteImage: Paper,
    characterImage: PaperCharacter,
    description: '골판지류ㆍ신문지ㆍ과자상자ㆍ백판지ㆍ책자',
    subDescription: '테이프와 스테이플은 떼고 깨끗하게 접어요!',
  },
  paperProduct: {
    characterType: 'sub',
    wasteName: '종이팩',
    middle_category: '종이팩',
    characterName: '팩토리',
    wasteImage: PaperProducts,
    characterImage: PaperProductsCharacter,
    description: '일반팩ㆍ주스팩ㆍ소주팩ㆍ두유팩',
    subDescription: '물로 헹구고 말려서 종이와는 따로 배출!',
  },
  pet: {
    characterType: 'sub',
    wasteName: '무색페트병',
    middle_category: '무색페트병',
    characterName: '페티',
    wasteImage: Pet,
    characterImage: PetCharacter,
    description: '먹는샘물 페트병ㆍ음료 페트병',
    subDescription: '라벨과 뚜껑을 분리하고 투명하게 헹궈요!',
  },
  vinyl: {
    characterType: 'sub',
    wasteName: '비닐류',
    middle_category: '비닐류',
    characterName: '비니',
    wasteImage: Vinyl,
    characterImage: VinylCharacter,
    description: '비닐포장재ㆍ1회용 비닐봉투ㆍ필름류',
    subDescription: '오염된 비닐이나, 돗자리, 고무장갑은 일반쓰레기로! ',
  },
  glass: {
    characterType: 'sub',
    wasteName: '유리병',
    middle_category: '유리병',
    characterName: '글래시',
    wasteImage: Glass,
    characterImage: GlassCharacter,
    description: '3색(투명, 녹색, 갈색) 유리병ㆍ이색병ㆍ소주병ㆍ맥주병',
    subDescription: '소주, 맥주, 청량음료 병은 빈용기보증금대상이에요! ',
  },
  clothes: {
    characterType: 'sub',
    wasteName: '의류·원단',
    middle_category: '의류및원단',
    characterName: '코튼',
    wasteImage: Clothes,
    characterImage: ClothesCharacter,
    description: '재킷ㆍ티셔츠ㆍ바지ㆍ신발ㆍ가방',
    subDescription: '이불, 베게, 쿠션, 인형은 일반쓰레기나 대형폐기물로!',
  },
  plastic: {
    characterType: 'sub',
    wasteName: '플라스틱류',
    middle_category: '플라스틱류',
    characterName: '플리',
    wasteImage: Plastic,
    characterImage: PlasticCharacter,
    description: 'PETㆍPPㆍPEㆍPS 용기',
    subDescription: '펌핑 용기의 펌프는 일반쓰레기로 분리해서 버려요! ',
  },
  metal: {
    characterType: 'sub',
    wasteName: '금속류',
    middle_category: '금속류',
    characterName: '메탈리',
    wasteImage: Metal,
    characterImage: MetalCharacter,
    description: '철캔ㆍ알루미늄캔ㆍ기타캔류ㆍ고철',
    subDescription: '가위처럼 날카로운 금속은 안전하게 감싸서 버려요!',
  },
  battery: {
    characterType: 'sub',
    wasteName: '전지',
    middle_category: '전지',
    characterName: '배리',
    wasteImage: Battery,
    characterImage: BatteryCharacter,
    description: '1차전지 (수은, 알칼리망 전지)ㆍ2차전지 (니켈, 리튬이온)',
    subDescription: '리튬전지는 꼭 전용수거함으로! 화재의 원인이 될 수 있어요.',
  },
  lighting: {
    characterType: 'sub',
    wasteName: '조명제품',
    middle_category: '조명제품',
    characterName: '라이티',
    wasteImage: Lighting,
    characterImage: LightingCharacter,
    description: '형광등 (직관형, 환형, 안정기내장형)ㆍLED (전구형, 직관형) ',
    subDescription: '형광등은 깨지지 않게 포장해서 전용수거함으로!',
  },
  monitor: {
    characterType: 'sub',
    wasteName: '전기전자',
    middle_category: '전기전자제품',
    characterName: '일렉',
    wasteImage: Monitor,
    characterImage: MonitorCharacter,
    description: '냉장고ㆍTVㆍ휴대폰ㆍ정수기',
    subDescription:
      '재사용가능한 전자제품은 지역 재활용 센터에 판매할수 있어요!',
  },
  styrofoam: {
    characterType: 'sub',
    wasteName: '발포합성수지',
    middle_category: '발포합성수지',
    characterName: '폼이',
    wasteImage: Styrofoam,
    characterImage: StyrofoamCharacter,
    description: '식품용기ㆍ과일난좌ㆍ전자제품 포장용기ㆍ단열재',
    subDescription: '부착상표, 테이프 등 스티로폼과 다른 재질은 제거해주세요! ',
  },
} as const;

export const CHARACTER_LIST = Object.values(CHARACTER_DATA);

// {"eco": "이코", "paper": "페이피", ...}
export const CHARACTER_KEY_TO_NAME = Object.fromEntries(
  Object.entries(CHARACTER_DATA).map(([key, value]) => [
    value.characterName,
    key,
  ]),
) as Record<CharacterKey, CharacterNames>;
