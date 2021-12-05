import { Booking, Listing, ListingsFilter } from "../../../lib/types";

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

export interface ListingsArgs {
  filter: ListingsFilter;
  limit: number;
  page: number;
}

export interface ListingsData {
  total: number;
  result: Listing[];
}
