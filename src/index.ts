import "dotenv/config";

import { typeDefs, resolvers } from "./grapqhl";

import { ApolloServer, CorsOptions } from "apollo-server-express";

import express, { Application, CookieOptions } from "express";
import { connectDatabase } from "./database";
import bodyParser from "body-parser";
import multer from "multer";
import compression from "compression";
import cors from "cors";
import session, { Session } from "express-session";

export type SessionViewer = Session & { viewer: string };

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "none",
  secure: process.env.NODE_ENV === "production",
  maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year,
  domain: ".herokuapp.com",
};

const corsOptions: CorsOptions = {
  credentials: true,
  origin:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://tinyhouse-client.vercel.app",
  allowedHeaders: ["Content-Type", "Authorization", "Set-Cookie"],
};

const mount = async (app: Application) => {
  const db = await connectDatabase();
  const upload = multer();

  if (process.env.NODE_ENV === "production") {
    app.use(compression());
    app.set("trust proxy", 1);

    // app.use(express.static(`${__dirname}/client`));
    // app.get("/*", (_req, res) =>
    //   res.sendFile(`${__dirname}/client/index.html`)
    // );
  }

  app.use(cors(corsOptions));
  app.use(bodyParser.json({ limit: "2mb" }));

  // not work on client
  // app.use(cookieParser(process.env.SECRET));
  app.use(
    session({
      secret: `${process.env.SECRET}`,
      cookie: {
        ...cookieOptions,
      },
    })
  );

  app.post("/statusDone", upload.single("image"), (_req, res) =>
    res.send({ status: "done" })
  );

  const apolloServer = new ApolloServer({
    introspection: true,
    playground: true,
    typeDefs,
    resolvers,
    context: ({ res, req }) => ({ db, res, req }),
  });

  apolloServer.applyMiddleware({ app, path: "/api", cors: corsOptions });

  app.listen(process.env.PORT);

  console.log(`Server listen on http://localhost:${process.env.PORT}`);
};

mount(express());
