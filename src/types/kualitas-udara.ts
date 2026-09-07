export type SumberData = "OpenAQ" | "KLHK";

export interface KualitasUdaraItem {
  location_name: string;
  parameter: string;
  value: number;
  unit: string;
  lintang: number;
  bujur: number;
  waktu: string;
  sumber: SumberData;
  ispu_category?: string;
  ispu_val?: number;
}

export interface LocationData {
  location_name: string;
  lintang: number;
  bujur: number;
  items: KualitasUdaraItem[];
}
