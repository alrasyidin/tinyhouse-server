import merge from "lodash.merge";
import { viewerResolvers } from "./Viewer";
import { userResolver } from "./User";

export const resolvers = merge(viewerResolvers, userResolver);
