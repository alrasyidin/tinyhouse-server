import { IResolvers } from ".pnpm/graphql-tools@4.0.8_graphql@14.7.0/node_modules/graphql-tools";
import { Booking, Database, Listing } from "../../../lib/types";

export const bookingResolver: IResolvers = {
  Booking: {
    id: (booking: Booking): string => {
      return booking._id.toString();
    },
    listing: async (
      booking: Booking,
      args: undefined,
      { db }: { db: Database }
    ): Promise<Listing | null> => {
      return await db.listings.findOne({ _id: booking.listing });
    },
  },
};
