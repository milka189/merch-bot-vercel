export type TT = {
  id: number;
  tt_code: string | null;
  network: string | null;
  address: string;
};

export type WeeklyTarget = {
  route_code: string;
  tt_id: number;
  week: number;
  target: number;
};

export type Progress = {
  telegram_id: number;
  tt_id: number;
  week: number;
  done: number;
};
