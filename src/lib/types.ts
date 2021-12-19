import { Repository } from "typeorm";
import { BookingEntity, ListingEntity, UserEntity } from "../database/entitry";

export enum ListingType {
  Apartment = "APARTMENT",
  House = "HOUSE",
}

export enum ListingsFilter {
  PRICE_LOW_TO_HIGH = "PRICE_LOW_TO_HIGH",
  PRICE_HIGH_TO_LOW = "PRICE_HIGH_TO_LOW",
}

export interface Viewer {
  id?: string;
  token?: string;
  avatar?: string;
  walletId?: string;
  didRequest: boolean;
}

export interface BookingsIndexMonth {
  [key: string]: boolean;
}

export interface BookingsIndexYear {
  [key: string]: BookingsIndexMonth;
}

export interface BookingsIndex {
  [key: string]: BookingsIndexYear;
}

export interface Booking {
  id: string;
  listing: string;
  tenant: string;
  checkIn: string;
  checkOut: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  image: string;
  host: string;
  type: ListingType;
  address: string;
  country: string;
  admin: string;
  city: string;
  bookings: string[];
  bookingsIndex: BookingsIndex;
  price: number;
  numOfGuests: number;
  authorized?: boolean;
}

export interface User {
  id: string;
  name: string;
  token: string;
  avatar: string;
  contact: string;
  walletId?: string;
  income: number;
  bookings: string[];
  listings: string[];
  authorized?: boolean;
}

export interface Database {
  listings: Repository<ListingEntity>;
  users: Repository<UserEntity>;
  bookings: Repository<BookingEntity>;
}
