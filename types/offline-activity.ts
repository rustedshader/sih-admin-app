export interface OfflineActivity {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  state: string;
  duration: number;
  altitude: number;
  nearest_town: string;
  best_season: string;
  permits_required: string;
  equipment_needed: string;
  safety_tips: string;
  minimum_age: number;
  maximum_age: number;
  guide_required: boolean;
  minimum_people: number;
  maximum_people: number;
  cost_per_person: number;
  difficulty_level: "easy" | "moderate" | "difficult";
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface OfflineActivitiesResponse {
  items: OfflineActivity[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
