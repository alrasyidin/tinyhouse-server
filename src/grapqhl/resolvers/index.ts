import merge from "lodash.merge";
import { viewerResolvers } from "./Viewer";
import { userResolver } from "./User";
import { bookingResolver } from "./Booking";
import { listingResolver } from "./Listing";

export const resolvers = merge(
  listingResolver,
  bookingResolver,
  viewerResolvers,
  userResolver
);
