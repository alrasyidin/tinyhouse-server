import "dotenv/config";

import { typeDefs, resolvers } from "./grapqhl";

import { ApolloServer } from "apollo-server-express";

import express, { Application } from "express";
import { connectDatabase } from "./database";

const mount = async (app: Application) => {
  const db = await connectDatabase();
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context: () => ({ db }),
  });

  apolloServer.applyMiddleware({ app, path: "/api" });

  app.listen(process.env.PORT);

  console.log(`Server listen on http://localhost:${process.env.PORT}`);
};

mount(express());
