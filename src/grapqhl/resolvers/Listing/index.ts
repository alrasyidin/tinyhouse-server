import { IResolvers } from "apollo-server-express";

import { Cloudinary } from "../../../lib/api/Cloudinary";

import { Request } from "express";
import { ObjectId } from "mongodb";
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
        const data = await db.listings.findOne({ _id: new ObjectId(id) });

        if (!data) {
          throw new Error("Can't return listing data");
        }

        const viewer = await authorize(db, req);

        if (viewer && viewer._id === data.host) {
          data.authorized = true;
        }

        return data;
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
          const { city, admin, country } = await Geocoding.geocode(location); // here use mapquest service, if you want use google geocding api you can change to Google.geocode(location)

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
          console.log(data.region);
        }

        let listings = await db.listings.find(query);

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
        const insertResult = await db.listings.insertOne({
          _id: new ObjectId(),
          ...input,
          image: imageUrl,
          bookings: [],
          bookingsIndex: {},
          country,
          admin,
          city,
          host: viewer._id,
        });

        const insertListing: Listing = insertResult.ops[0];

        db.users.updateOne(
          {
            _id: viewer._id,
          },
          {
            $push: {
              listings: insertListing._id,
            },
          }
        );

        return insertListing;
      } catch (error) {
        throw new Error(`Failed to create a new host listing: ${error}`);
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
