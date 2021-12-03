import { IResolvers } from "apollo-server-express";
import { Request } from "express";
import { ObjectId } from "mongodb";
import { Database, Listing, User } from "../../../lib/types";
import { authorize } from "../../../lib/utils";
import { ListBookingsArgs, ListBookingsData, ListingArgs } from "./types";

export const listingResolver: IResolvers = {
  Query: {
    listing: async (
      listing: Listing,
      { id }: ListingArgs,
      { db, req }: { db: Database; req: Request }
    ): Promise<Listing | null> => {
      try {
        const data = await db.listings.findOne({ _id: new ObjectId(id) });

        if (!data) {
          throw new Error("Can't return listing data");
        }

        const viewer = await authorize(db, req);

        if (viewer && viewer._id === listing.host) {
          listing.authorized = true;
        }
        return data;
      } catch (error) {
        throw new Error(`Failed to query listing: ${error}`);
      }
    },
  },
  Listing: {
    id: (listing: Listing): string => {
      return listing._id.toString();
    },
    host: async (
      listing: Listing,
      _args: undefined,
      { db }: { db: Database }
    ): Promise<User> => {
      const data = await db.users.findOne({ _id: listing.host });
      if (!data) {
        throw new Error("Host can't be found");
      }
      return data;
    },
    bookingsIndex: (listing: Listing): string => {
      return JSON.stringify(listing.bookingsIndex);
    },
    bookings: async (
      listing: Listing,
      { limit, page }: ListBookingsArgs,
      { db }: { db: Database }
    ): Promise<ListBookingsData | null> => {
      try {
        if (!listing.authorized) {
          return null;
        }

        const data: ListBookingsData = {
          total: 0,
          result: [],
        };

        const bookings = await db.bookings
          .find({
            _id: { $in: listing.bookings },
          })
          .skip(page > 0 ? (page - 1) * limit : 0)
          .limit(limit);

        data.total = await bookings.count();
        data.result = await bookings.toArray();

        return data;
      } catch (error) {
        throw new Error(`We can't query listing bookings: ${error}`);
      }
    },
  },
};
