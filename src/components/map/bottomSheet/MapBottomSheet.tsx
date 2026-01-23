import type { LocationListResponse } from '@/api/services/map/map.type';
import { BottomSheet } from '@/components/bottomSheet/BottomSheet';
import { useState } from 'react';
import { type WasteTypeKey } from '@/types/MapTypes';
import { FilterChildren, FilterHeader } from './FilterContent';
import { StoreCategoryFilterChildren, StoreCategoryFilterHeader } from './StoreCategoryFilter';
import { MainChildren, MainHeader } from './MainContent';

type FilterMode = 'none' | 'pickup' | 'store';

export interface MapBottomSheetProps {
  data: LocationListResponse;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  selectedFilter: WasteTypeKey[];
  setSelectedFilter: (filter: WasteTypeKey[]) => void;
  selectedStoreCategories: string[];
  setSelectedStoreCategories: (categories: string[]) => void;
  onDetailOpen: (id: number) => void;
}

export const MapBottomSheet = ({
  data,
  selectedId,
  setSelectedId,
  selectedFilter,
  setSelectedFilter,
  selectedStoreCategories,
  setSelectedStoreCategories,
  onDetailOpen,
}: MapBottomSheetProps) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('none');

  const renderHeader = () => {
    if (filterMode === 'pickup') {
      return <FilterHeader onClose={() => setFilterMode('none')} />;
    }
    if (filterMode === 'store') {
      return <StoreCategoryFilterHeader onClose={() => setFilterMode('none')} />;
    }
    return (
      <MainHeader
        handlePickupFilter={() => setFilterMode('pickup')}
        handleStoreFilter={() => setFilterMode('store')}
      />
    );
  };

  const renderChildren = () => {
    if (filterMode === 'pickup') {
      return (
        <FilterChildren
          selectedFilter={selectedFilter}
          setSelectedFilter={setSelectedFilter}
          onClose={() => setFilterMode('none')}
        />
      );
    }
    if (filterMode === 'store') {
      return (
        <StoreCategoryFilterChildren
          selectedCategories={selectedStoreCategories}
          setSelectedCategories={setSelectedStoreCategories}
          onClose={() => setFilterMode('none')}
        />
      );
    }
    return (
      <MainChildren
        data={data}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        onDetailOpen={onDetailOpen}
      />
    );
  };

  return (
    <BottomSheet
      isOpen
      isFullScreen
      maxHeight={filterMode !== 'none' ? 45 : 90}
      header={renderHeader()}
      onClick={() => setSelectedId(null)}
    >
      {renderChildren()}
    </BottomSheet>
  );
};
