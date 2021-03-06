import { MongoClient } from "mongodb";
import { Booking, Database, Listing, User } from "../lib/types";

// mongo atlas
let url = "";

if (process.env.NODE_ENV === "production") {
  url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_USER_PASSWORD}@${process.env.DB_CLUSTER}.sktvo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
} else {
  url = `mongodb://localhost:27017`;
}

// local

export const connectDatabase = async (): Promise<Database> => {
  const client = await MongoClient.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = client.db("main");

  return {
    listings: db.collection<Listing>("listings"),
    users: db.collection<User>("users"),
    bookings: db.collection<Booking>("bookings"),
  };
};
