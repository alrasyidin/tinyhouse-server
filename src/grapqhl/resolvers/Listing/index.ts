import { Listing } from "../../../lib/types";

export const listingResolver = {
  Listing: {
    id: (listing: Listing): string => {
      return listing._id.toString();
    },
  },
};
