import { IResolvers } from "apollo-server-express";
import { ObjectId } from "mongodb";
import { Database, Listing } from "../../../lib/types";

export const ListingResolver: IResolvers = {
  Query: {
    listings: async (
      _root: undefined,
      _args: undefined,
      { db }: { db: Database }
    ): Promise<Listing[]> => {
      return await db.listings.find({}).toArray();
    },
  },
  Mutation: {
    deleteListing: async (
      _root: undefined,
      { id }: { id: string },
      { db }: { db: Database }
    ): Promise<Listing> => {
      const { value: deletedValue } = await db.listings.findOneAndDelete({
        _id: new ObjectId(id),
      });

      if (!deletedValue) {
        throw new Error("Failed to delete listing");
      }

      return deletedValue;
    },
  },
  Listing: {
    id: (listing: Listing): string => listing._id.toString(),
  },
};
