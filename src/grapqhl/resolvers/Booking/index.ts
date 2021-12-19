import { Request } from "express";
import crypto from "crypto";
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
          id,
        });

        if (!listing) {
          throw new Error("listing can't be found");
        }

        // check if viewer not booking their own listing
        if (listing.host === viewer.id) {
          throw new Error("viewer can't book own listing");
        }

        // check that checkOut NOT prior checkIn
        const MILISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

        const today = new Date();
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        if (
          checkInDate.getTime() >
          today.getTime() * 30 * MILISECONDS_PER_DAY
        ) {
          throw new Error("check in date can't be more than 30 day from today");
        }

        if (
          checkOutDate.getTime() >
          today.getTime() * 30 * MILISECONDS_PER_DAY
        ) {
          throw new Error(
            "check out date can't be more than 30 day from today"
          );
        }

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
          ((checkOutDate.getTime() - checkInDate.getTime()) /
            (1000 * 60 * 60 * 24) +
            1);

        // get user document of host of listing
        const host = await db.users.findOne({
          id: listing.host,
        });

        if (!host || !host.walletId) {
          throw new Error(
            "the host either can't be found or is not connected with Stripe"
          );
        }

        // create stripe charge on behalf of host
        await Stripe.charge(totalPrice, source, host.walletId);

        // insert a new booking document to listings booking
        const newBooking: Booking = {
          id: crypto.randomBytes(16).toString("hex"),
          listing: listing.id,
          tenant: viewer.id,
          checkIn,
          checkOut,
        };
        const insertBooking = await db.bookings.create(newBooking).save();

        // update user of host to increment income
        host.income += totalPrice;
        await host.save();

        // update booking field of tenant
        viewer.bookings.push(insertBooking.id);
        await viewer.save();

        // update bookings field of listing document
        listing.bookingsIndex = bookingsIndex;
        listing.bookings.push(insertBooking.id);
        await listing.save();

        return insertBooking as Booking;
      } catch (error) {
        console.error(error);
        throw new Error(`Failed to create a booking: ${error}`);
      }
    },
  },
  Booking: {
    listing: async (
      booking: Booking,
      args: undefined,
      { db }: { db: Database }
    ): Promise<Listing | null> => {
      return (await db.listings.findOne({ id: booking.listing })) as Listing;
    },
    tenant: async (
      booking: Booking,
      args: undefined,
      { db }: { db: Database }
    ): Promise<User | null> => {
      return (await db.users.findOne({ id: booking.tenant })) as User;
    },
  },
};
