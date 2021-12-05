import { IResolvers } from "apollo-server-express";
import { Request } from "express";
import { ObjectId } from "mongodb";
import { Database, Listing, ListingsFilter, User } from "../../../lib/types";
import { authorize } from "../../../lib/utils";
import {
  ListBookingsArgs,
  ListBookingsData,
  ListingArgs,
  ListingsArgs,
  ListingsData,
} from "./types";

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

        if (viewer && viewer._id === data.host) {
          listing.authorized = true;
        }

        return data;
      } catch (error) {
        throw new Error(`Failed to query listing: ${error}`);
      }
    },
    listings: async (
      _args: undefined,
      { filter, limit, page }: ListingsArgs,
      { db }: { db: Database }
    ): Promise<ListingsData> => {
      try {
        const data: ListingsData = {
          total: 0,
          result: [],
        };

        let listings = await db.listings.find();

        switch (filter) {
          case ListingsFilter.PRICE_LOW_TO_HIGH:
            listings = listings.sort({ price: 1 });
            break;

          case ListingsFilter.PRICE_HIGH_TO_LOW:
            listings = listings.sort({ price: -1 });
            break;

          default:
            throw new Error(
              "The specified filter listing not match any filters"
            );
        }

        listings = listings
          .skip(page > 0 ? (page - 1) * limit : 0)
          .limit(limit);

        data.total = await listings.count();
        data.result = await listings.toArray();

        return data;
      } catch (error) {
        throw new Error(`We can't query listings: ${error}`);
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
      console.log("host", data);
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
