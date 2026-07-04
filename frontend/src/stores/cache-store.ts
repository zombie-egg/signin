import { create } from "zustand";
import type { Contract, Seal } from "../types/domain";

interface CacheState {
  seals: Seal[];
  contracts: Contract[];
  setSeals: (seals: Seal[]) => void;
  setContracts: (contracts: Contract[]) => void;
}

export const useCacheStore = create<CacheState>((set) => ({
  seals: [],
  contracts: [],
  setSeals: (seals) => set({ seals }),
  setContracts: (contracts) => set({ contracts }),
}));
