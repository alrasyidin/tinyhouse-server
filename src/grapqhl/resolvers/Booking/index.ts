import { Request } from "express";
import { IResolvers } from "apollo-server-express";
import {
  Booking,
  BookingsIndex,
  Database,
  Listing,
  User,
} from "../../../lib/types";
import { authorize } from "../../../lib/utils";
import { CreateBookingArgs } from "./types";
import { ObjectId } from "bson";
import { Stripe } from "../../../lib/api/Stripe";

const resolveBookingsIndex = (
  bookingsIndex: BookingsIndex,
  checkIn: string,
  checkOut: string
): BookingsIndex => {
  let cursorDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const newBookingsIndex: BookingsIndex = { ...bookingsIndex };

  while (cursorDate <= checkOutDate) {
    const y = cursorDate.getUTCFullYear();
    const m = cursorDate.getUTCMonth();
    const d = cursorDate.getUTCDate();

    if (!newBookingsIndex[y]) {
      newBookingsIndex[y] = {};
    }

    if (!newBookingsIndex[y][m]) {
      newBookingsIndex[y][m] = {};
    }

    if (!newBookingsIndex[y][m][d]) {
      newBookingsIndex[y][m][d] = true;
    }

    cursorDate = new Date(cursorDate.getTime() + 1000 * 60 * 60 * 24);
  }

  return newBookingsIndex;
};

export const bookingResolver: IResolvers = {
  Mutation: {
    async createBooking(
      _root: undefined,
      { input }: CreateBookingArgs,
      { db, req }: { db: Database; req: Request }
    ): Promise<Booking> {
      try {
        const { id, source, checkIn, checkOut } = input;

        // verify if logged in user is making request
        const viewer = await authorize(db, req);
        if (!viewer) {
          throw new Error("viewer can't be found");
        }

        // find listing document that being booked
        const listing = await db.listings.findOne({
          _id: new ObjectId(id),
        });

        if (!listing) {
          throw new Error("listing can't be found");
        }

        // check if viewer not booking their own listing
        if (listing.host === viewer._id) {
          throw new Error("viewer can't book own listing");
        }

        // check that checkOut NOT prior checkIn
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        if (checkOutDate < checkInDate) {
          throw new Error("check out date can't before check in date");
        }

        //create bookingsIndex for listing being booked
        const bookingsIndex = resolveBookingsIndex(
          listing.bookingsIndex,
          checkIn,
          checkOut
        );

        // get total price to charge
        const totalPrice =
          listing.price *
          ((checkOutDate.getTime() - checkInDate.getTime()) *
            (1000 * 60 * 60 * 24) +
            1);

        // get user document of host of listing
        const host = await db.users.findOne({
          _id: viewer._id,
        });

        if (!host || !host.walletId) {
          throw new Error(
            "the host either can't be found or is not connected with Stripe"
          );
        }

        // create stripe charge on behalf of host
        await Stripe.charge(totalPrice, source, host.walletId);

        // insert a new booking document to listings booking
        const insertRes = await db.bookings.insertOne({
          _id: new ObjectId(),
          listing: listing._id,
          tenant: viewer._id,
          checkIn,
          checkOut,
        });
        const insertedBooking: Booking = insertRes.ops[0];

        // update user of host to increment income
        db.users.updateOne({ _id: host._id }, { $inc: { income: totalPrice } });

        // update booking field of tenant
        db.users.updateOne(
          { _id: viewer._id },
          {
            $push: { bookings: insertedBooking._id },
          }
        );

        // update bookings field of listing document
        db.listings.updateOne(
          { _id: listing._id },
          {
            $set: { bookingsIndex },
            $push: { bookings: insertedBooking._id },
          }
        );

        return insertedBooking;
      } catch (error) {
        throw new Error(`Failed to create a booking: ${error}`);
      }
    },
  },
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
    tenant: async (
      booking: Booking,
      args: undefined,
      { db }: { db: Database }
    ): Promise<User | null> => {
      return await db.users.findOne({ _id: booking.tenant });
    },
  },
};
