import { gql } from "apollo-server-express";

export const typeDefs = gql`
  input LogInInput {
    code: String
  }

  type Viewer {
    id: ID
    avatar: String
    token: String
    hasWallet: Boolean
    didRequest: Boolean!
  }

  type Query {
    authUrl: String!
  }

  type Mutation {
    logIn(input: LogInInput): Viewer!
    logOut: Viewer!
  }
`;
