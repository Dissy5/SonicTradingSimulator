export type Sale = {
  id: number;
  character: string;
  skin: string;
  rarity: string;
  star: number;
  price: number;
  createdAt: string;
};

export type SkinCatalog = Record<string, [string, string, string][]>;

export type SkinEntry = {
  name: string;
  rarity: string;
  imagePath: string;
};
