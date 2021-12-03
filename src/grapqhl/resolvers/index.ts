import merge from "lodash.merge";
import { viewerResolvers } from "./Viewer";
import { userResolver } from "./User";
import { listingResolver } from "./Listing";
import { bookingResolver } from "./Booking";

export const resolvers = merge(
  listingResolver,
  bookingResolver,
  viewerResolvers,
  userResolver
);
