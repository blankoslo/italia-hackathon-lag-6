export interface Place {
  name: string;
  lat: number;
  lon: number;
  municipality?: string;
  county?: string;
  placeType?: string;
}
