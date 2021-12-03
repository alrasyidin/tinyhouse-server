import { Booking } from "../../../lib/types";

export interface ListingArgs {
  id: string;
}

export interface ListBookingsArgs {
  limit: number;
  page: number;
}

export interface ListBookingsData {
  total: number;
  result: Booking[];
}
