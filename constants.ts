
import { ShowreelItem } from './types';

// Increased back to 65 for a denser sphere now that performance is optimized via refs
export const MOCK_ITEMS: ShowreelItem[] = Array.from({ length: 65 }).map((_, i) => ({
  id: `item-${i}`,
  url: `https://picsum.photos/seed/${i + 200}/500/650`,
  title: "",
  category: ""
}));

export const FRAME_RATE = 60;
