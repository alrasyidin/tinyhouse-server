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
  location?: string;
  filter: ListingsFilter;
  limit: number;
  page: number;
}

export interface ListingsData {
  region?: string;
  total: number;
  result: Listing[];
}

export interface ListingsQuery {
  city?: string;
  admin?: string;
  country?: string;
}
