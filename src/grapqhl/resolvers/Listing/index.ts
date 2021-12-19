import crypto from "crypto";
import { IResolvers } from "apollo-server-express";

import { Cloudinary } from "../../../lib/api/Cloudinary";

import { Request } from "express";
// import { Google } from "../../../lib/api";
import { Geocoding } from "../../../lib/api/Geocoding";
import {
  Database,
  Listing,
  ListingsFilter,
  ListingType,
  User,
} from "../../../lib/types";
import { authorize, capitalize } from "../../../lib/utils";
import {
  HostListingArgs,
  HostListingInput,
  ListBookingsArgs,
  ListBookingsData,
  ListingArgs,
  ListingsArgs,
  ListingsData,
  ListingsQuery,
  Order,
} from "./types";

const verifyHostListingInput = (input: HostListingInput) => {
  const { title, description, type, price } = input;

  if (title.length > 100) {
    throw new Error("listing title must be under 100 characters");
  }

  if (description.length > 5000) {
    throw new Error("listing description must be under 5000 characters");
  }

  if (!Object.values(ListingType).includes(type)) {
    throw new Error("listing type must be either apartment or house");
  }

  if (price < 0) {
    throw new Error("Price must be greater than 0");
  }
};

export const listingResolver: IResolvers = {
  Query: {
    listing: async (
      _root: undefined,
      { id }: ListingArgs,
      { db, req }: { db: Database; req: Request }
    ): Promise<Listing | null> => {
      try {
        const listing = (await db.listings.findOne({ id })) as Listing;

        if (!listing) {
          throw new Error("Can't return listing data");
        }

        const viewer = await authorize(db, req);

        if (viewer && viewer.id === listing.host) {
          listing.authorized = true;
        }

        return listing;
      } catch (error) {
        throw new Error(`Failed to query listing: ${error}`);
      }
    },
    listings: async (
      _root: undefined,
      { location, filter, limit, page }: ListingsArgs,
      { db }: { db: Database }
    ): Promise<ListingsData> => {
      try {
        const query: ListingsQuery = {};
        const data: ListingsData = {
          region: "",
          total: 0,
          result: [],
        };

        if (location) {
          const { city, admin, country } = await Geocoding.geocode(location);

          if (city) {
            query.city = capitalize(city);
          }

          if (admin) {
            query.admin = capitalize(admin);
          }

          if (country) {
            query.country = capitalize(country);
          } else {
            throw new Error("No country found");
          }

          const cityText = city ? `${capitalize(city)}, ` : "";
          const adminText = admin ? `${capitalize(admin)}, ` : "";
          const countryText = capitalize(country);
          data.region = `${cityText}${adminText}${countryText}`;
        }

        let order: Order | null = null;

        if (filter && filter === ListingsFilter.PRICE_LOW_TO_HIGH) {
          order = { price: "ASC" };
        }

        if (filter && filter === ListingsFilter.PRICE_HIGH_TO_LOW) {
          order = { price: "DESC" };
        }

        const count = await db.listings.count(query);
        const listings = await db.listings.find({
          where: { ...query },
          order: { ...order },
          skip: page > 0 ? (page - 1) * limit : 0,
          take: limit,
        });

        data.total = count;
        data.result = listings;

        return data;
      } catch (error) {
        throw new Error(`We can't query listings: ${error}`);
      }
    },
  },
  Mutation: {
    hostListing: async (
      _root: undefined,
      { input }: HostListingArgs,
      { db, req }: { db: Database; req: Request }
    ): Promise<Listing | null> => {
      try {
        verifyHostListingInput(input);

        const viewer = await authorize(db, req);

        if (!viewer) {
          throw new Error("viewer cannot be found");
        }

        const { country, admin, city } = await Geocoding.geocode(input.address);

        if (!country || !admin || !city) {
          throw new Error("invalid address input");
        }

        const imageUrl = await Cloudinary.upload(input.image);

        const newListing: Listing = {
          id: crypto.randomBytes(16).toString("hex"),
          ...input,
          image: imageUrl,
          bookings: [],
          bookingsIndex: {},
          country,
          admin,
          city,
          host: viewer.id,
        };
        const result = await db.listings.create(newListing).save();

        viewer.listings.push(result.id);
        await viewer.save();

        return result as Listing;
      } catch (error) {
        throw new Error(`Failed to create a new host listing: ${error}`);
      }
    },
  },
  Listing: {
    host: async (
      listing: Listing,
      _args: undefined,
      { db }: { db: Database }
    ): Promise<User> => {
      const data = await db.users.findOne({ id: listing.host });
      if (!data) {
        throw new Error("Host can't be found");
      }
      return data as User;
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

        const bookings = await db.bookings.findByIds(listing.bookings, {
          skip: page > 0 ? (page - 1) * limit : 0,
          take: limit,
        });

        data.total = listing.bookings.length;
        data.result = bookings;

        return data;
      } catch (error) {
        throw new Error(`We can't query listing bookings: ${error}`);
      }
    },
  },
};
