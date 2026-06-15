import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LibraryItem, PegMaterial, PegDimensions, PegBoxHoleDimensions, StringTension } from '../../shared/types';
import { MATERIAL_DATABASE } from '../../shared/calculationEngine';

export interface PresetPegData {
  material: PegMaterial;
  pegDimensions: PegDimensions;
  holeDimensions: PegBoxHoleDimensions;
  stringTensions: StringTension[];
  sourceLibraryName: string;
}

interface AppContextType {
  presetPegData: PresetPegData | null;
  applyLibraryPreset: (item: LibraryItem) => void;
  clearPreset: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [presetPegData, setPresetPegData] = useState<PresetPegData | null>(null);

  const applyLibraryPreset = (item: LibraryItem) => {
    const material = MATERIAL_DATABASE.find(m => m.id === item.pegSpecifications.material.id) || item.pegSpecifications.material;
    setPresetPegData({
      material,
      pegDimensions: { ...item.pegSpecifications.dimensions },
      holeDimensions: { ...item.pegSpecifications.holeDimensions },
      stringTensions: [...item.stringTensions],
      sourceLibraryName: item.name,
    });
  };

  const clearPreset = () => setPresetPegData(null);

  return (
    <AppContext.Provider value={{ presetPegData, applyLibraryPreset, clearPreset }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};
