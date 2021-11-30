import "dotenv/config";

import { typeDefs, resolvers } from "./grapqhl";

import { ApolloServer } from "apollo-server-express";

import express, { Application } from "express";
import { connectDatabase } from "./database";
import cookieParser from "cookie-parser";

const mount = async (app: Application) => {
  const db = await connectDatabase();

  app.use(cookieParser(process.env.SECRET));

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ res, req }) => ({ db, res, req }),
  });

  apolloServer.applyMiddleware({ app, path: "/api" });

  app.listen(process.env.PORT);

  console.log(`Server listen on http://localhost:${process.env.PORT}`);
};

mount(express());
