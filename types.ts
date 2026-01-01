
export interface ShowreelItem {
  id: string;
  url: string;
  title: string;
  category: string;
}

export interface HandData {
  present: boolean;
  distance: number; // For pinch zoom
  position: { x: number; y: number }; // For rotation
}
