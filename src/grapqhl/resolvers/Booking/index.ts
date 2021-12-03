import { Booking, Database, Listing } from "../../../lib/types";

export const bookingResolver = {
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
