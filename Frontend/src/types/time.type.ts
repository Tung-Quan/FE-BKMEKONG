export type TimeType = 'prev6' | 'prev3' | 'now' | 'next3' | 'next6';
export interface TimeSlot {
  id: TimeType;
  label: string;
  date: Date;
}
