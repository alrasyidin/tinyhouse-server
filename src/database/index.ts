import { MongoClient } from "mongodb";
import { createConnection } from "typeorm";
import { Booking, Database, Listing, User } from "../lib/types";
import { BookingEntity, ListingEntity, UserEntity } from "./entitry";

export const connectDatabase = async (): Promise<Database> => {
  const connection = await createConnection();

  return {
    listings: connection.getRepository(ListingEntity),
    users: connection.getRepository(UserEntity),
    bookings: connection.getRepository(BookingEntity),
  };
};
