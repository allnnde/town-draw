export type EditorTool =
  | 'select'
  | 'river'
  | 'road'
  | 'zone-village'
  | 'zone-market'
  | 'zone-forest'
  | 'zone-industrial'
  | 'erase';

export const EDITOR_TOOLS: readonly EditorTool[] = [
  'select',
  'river',
  'road',
  'zone-village',
  'zone-market',
  'zone-forest',
  'zone-industrial',
  'erase',
];
