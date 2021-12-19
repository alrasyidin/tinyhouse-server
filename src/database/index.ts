import { createConnection } from "typeorm";
import { Database } from "../lib/types";
import { BookingEntity, ListingEntity, UserEntity } from "./entity";

export const connectDatabase = async (): Promise<Database> => {
  const connection = await createConnection();

  return {
    listings: connection.getRepository(ListingEntity),
    users: connection.getRepository(UserEntity),
    bookings: connection.getRepository(BookingEntity),
  };
};
