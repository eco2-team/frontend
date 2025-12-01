import type { LocationListResponse } from '@/api/services/map/map.type';
import { BottomSheet } from '@/components/bottomSheet/BottomSheet';
import { useState } from 'react';
import { type WasteTypeKey } from '@/types/MapTypes';
import { FilterChildren, FilterHeader } from './FilterContent';
import { MainChildren, MainHeader } from './MainContent';

export interface MapBottomSheetProps {
  data: LocationListResponse;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  selectedFilter: WasteTypeKey[];
  setSelectedFilter: (filter: WasteTypeKey[]) => void;
}

export const MapBottomSheet = ({
  data,
  selectedId,
  setSelectedId,
  selectedFilter,
  setSelectedFilter,
}: MapBottomSheetProps) => {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <BottomSheet
      isOpen
      isFullScreen
      maxHeight={filterOpen ? 45 : 90}
      header={
        filterOpen ? (
          <FilterHeader onClose={() => setFilterOpen(false)} />
        ) : (
          <MainHeader handleFilter={() => setFilterOpen(true)} />
        )
      }
      onClick={() => setSelectedId(null)}
    >
      {filterOpen ? (
        <FilterChildren
          selectedFilter={selectedFilter}
          setSelectedFilter={setSelectedFilter}
          onClose={() => setFilterOpen(false)}
        />
      ) : (
        <MainChildren
          data={data}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        />
      )}
    </BottomSheet>
  );
};
