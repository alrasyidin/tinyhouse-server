import { IResolvers } from "apollo-server-express";
import { Request } from "express";
import { Database, User } from "../../../lib/types";
import { authorize } from "../../../lib/utils";
import {
  UserArgs,
  UserBookingsArgs,
  UserBookingsData,
  UserListingsArgs,
  UserListingsData,
} from "./types";

export const userResolver: IResolvers = {
  Query: {
    user: async (
      _root: undefined,
      { id }: UserArgs,
      { db, req }: { db: Database; req: Request }
    ): Promise<User | null> => {
      try {
        const user = (await db.users.findOne({ id })) as User;
        if (!user) {
          throw new Error("We can't find user");
        }

        const viewer = await authorize(db, req);

        if (viewer && viewer.id === user.id) {
          user.authorized = true;
        }

        return user;
      } catch (error) {
        throw new Error(`Failed to query user: ${error}`);
      }
    },
  },
  User: {
    id: (user: User) => user.id,
    hasWallet: (user: User) => Boolean(user.walletId),
    income: (user: User) => (user.authorized ? user.income : null),
    bookings: async (
      user: User,
      { limit, page }: UserBookingsArgs,
      { db }: { db: Database }
    ): Promise<UserBookingsData | null> => {
      try {
        if (!user.authorized) {
          return null;
        }

        const data: UserBookingsData = {
          total: 0,
          result: [],
        };

        // const bookings = await db.bookings
        //   .find({
        //     id: { $in: user.bookings },
        //   })
        //   .skip(page > 0 ? (page - 1) * limit : 0)
        //   .limit(limit);

        const bookings = await db.bookings.findByIds(user.bookings, {
          skip: page > 0 ? (page - 1) * limit : 0,
          take: limit,
        });

        data.total = user.bookings.length;
        data.result = bookings;

        return data;
      } catch (error) {
        throw new Error(`We can't query user bookings: ${error}`);
      }
    },
    listings: async (
      user: User,
      { limit, page }: UserListingsArgs,
      { db }: { db: Database }
    ): Promise<UserListingsData | null> => {
      try {
        const data: UserListingsData = {
          total: 0,
          result: [],
        };

        // const listings = await db.listings
        //   .find({
        //     id: { $in: user.listings },
        //   })
        //   .skip(page > 0 ? (page - 1) * limit : 0)
        //   .limit(limit);

        const listings = await db.listings.findByIds(user.listings, {
          skip: page > 0 ? (page - 1) * limit : 0,
          take: limit,
        });

        data.total = user.listings.length;
        data.result = listings;

        return data;
      } catch (error) {
        throw new Error(`We can't query user listings: ${error}`);
      }
    },
  },
};
