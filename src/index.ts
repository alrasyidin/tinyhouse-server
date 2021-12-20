import "dotenv/config";

import { typeDefs, resolvers } from "./grapqhl";

import { ApolloServer } from "apollo-server-express";

import express, { Application } from "express";
import { connectDatabase } from "./database";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import multer from "multer";
import compression from "compression";
import cors from "cors";

const mount = async (app: Application) => {
  const db = await connectDatabase();
  const upload = multer();

  app.use(cors());
  app.use(bodyParser.json({ limit: "2mb" }));
  app.use(cookieParser(process.env.SECRET));
  // if (process.env.NODE_ENV === "production") {
  //   app.use(compression());

  //   app.use(express.static(`${__dirname}/client`));
  //   app.get("/*", (_req, res) =>
  //     res.sendFile(`${__dirname}/client/index.html`)
  //   );
  // }

  app.post("/statusDone", upload.single("image"), (_req, res) =>
    res.send({ status: "done" })
  );

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
