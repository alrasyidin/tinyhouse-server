import crypto from "crypto";

import { IResolvers } from "apollo-server-express";
import { Google } from "../../../lib/api";
import { Database, User, Viewer } from "../../../lib/types";
import { ConnectStripeArgs, LogInArgs } from "./types";
import { CookieOptions, Request, Response } from "express";
import { authorize } from "../../../lib/utils";
import { Stripe } from "../../../lib/api/Stripe";
import { Session } from "express-session";

declare module "express-session" {
  interface SessionData {
    viewer: string;
  }
}

// const cookiOptions: CookieOptions = {
//   httpOnly: true,
//   sameSite: "none",
//   signed: true,
//   secure: process.env.NODE_ENV === "production",
// };

// if (process.env.NODE_ENV === "production") {
//   cookiOptions.domain = ".vercel.app";
// }

const logInViaGoogle = async (
  code: string,
  token: string,
  db: Database,
  req: Request,
  res: Response
): Promise<User | undefined> => {
  const { user } = await Google.login(code);

  if (!user) {
    throw new Error("Google Login Error");
  }

  // console.log(user);

  // Name, Photo and Email list
  const userNamesList = user.names && user.names.length ? user.names : null;
  const userPhotosList = user.photos && user.photos.length ? user.photos : null;
  const userEmailsList =
    user.emailAddresses && user.emailAddresses.length
      ? user.emailAddresses
      : null;

  const userName = userNamesList ? userNamesList[0].displayName : null;
  const userAvatar = userPhotosList ? userPhotosList[0].url : null;
  const userEmail = userEmailsList ? userEmailsList[0].value : null;
  const userId =
    (userNamesList && userNamesList[0]?.metadata?.source?.id) || null;

  if (!userId || !userName || !userAvatar || !userEmail) {
    throw new Error("Google login error");
  }

  const updateRes = await db.users.findOneAndUpdate(
    {
      _id: userId,
    },
    {
      $set: {
        name: userName,
        avatar: userAvatar,
        contact: userEmail,
        token,
      },
    },
    {
      returnDocument: "after",
    }
  );
  let viewer = updateRes.value;

  if (!viewer) {
    const insertRes = await db.users.insertOne({
      _id: userId,
      name: userName,
      token,
      avatar: userAvatar,
      contact: userEmail,
      income: 0,
      listings: [],
      bookings: [],
    });

    viewer = insertRes.ops[0];
  }

  // res.cookie("viewer", userId, {
  //   ...cookiOptions,
  //   maxAge: 365 * 24 * 60 * 60 * 1000,
  // });

  req.session.viewer = userId;

  return viewer;
};

const logInViaCookie = async (
  token: string,
  db: Database,
  req: Request,
  res: Response
): Promise<User | undefined> => {
  const updateRes = await db.users.findOneAndUpdate(
    {
      _id: req.session.viewer,
    },
    {
      $set: {
        token,
      },
    },
    {
      returnDocument: "after",
    }
  );

  const viewer = updateRes.value;

  if (!viewer) {
    req.session.viewer = "";
    // res.clearCookie("viewer", cookiOptions);
  }

  return viewer;
};

export const viewerResolvers: IResolvers = {
  Query: {
    authUrl: (): string => {
      try {
        return Google.authUrl;
      } catch (error) {
        throw new Error(`Failed to Query Google Auth URL: ${error}`);
      }
    },
  },
  Mutation: {
    logIn: async (
      _root: undefined,
      { input }: LogInArgs,
      { db, req, res }: { db: Database; req: Request; res: Response }
    ): Promise<Viewer> => {
      try {
        const code = input ? input.code : null;
        const token = crypto.randomBytes(16).toString("hex");

        const viewer: User | undefined = code
          ? await logInViaGoogle(code, token, db, req, res)
          : await logInViaCookie(token, db, req, res);

        if (!viewer) {
          return { didRequest: true };
        }

        return {
          _id: viewer._id,
          avatar: viewer.avatar,
          token: viewer.token,
          walletId: viewer.walletId,
          didRequest: true,
        };
      } catch (error) {
        throw new Error(`Failed to login: ${error}`);
      }
    },
    logOut: (
      _root: undefined,
      _args: unknown,
      { req }: { req: Request }
    ): Viewer => {
      try {
        req.session.viewer = "";
        // res.clearCookie("viewer", cookiOptions);
        return { didRequest: true };
      } catch (error) {
        throw new Error(`Failed to logout: ${error}`);
      }
    },
    connectStripe: async (
      _root: undefined,
      { input }: ConnectStripeArgs,
      { db, req }: { db: Database; req: Request }
    ): Promise<Viewer> => {
      try {
        const { code } = input;

        let viewer = await authorize(db, req);

        if (!viewer) {
          throw new Error("viewer cannot be found");
        }

        const wallet = await Stripe.connect(code);

        if (!wallet) {
          throw new Error("Stripe grant error");
        }

        const updateRes = await db.users.findOneAndUpdate(
          {
            _id: viewer._id,
          },
          {
            $set: {
              walletId: wallet.stripe_user_id,
            },
          },
          {
            returnDocument: "after",
          }
        );

        if (!updateRes.value) {
          throw new Error("viewer could not be updated");
        }

        viewer = updateRes.value;

        return {
          _id: viewer._id,
          avatar: viewer.avatar,
          token: viewer.token,
          walletId: viewer.walletId,
          didRequest: true,
        };
      } catch (error) {
        throw new Error(`Failed connect to Stripe: ${error}`);
      }
    },
    disconnectStripe: async (
      _root: undefined,
      _args: undefined,
      { db, req }: { db: Database; req: Request }
    ) => {
      try {
        let viewer = await authorize(db, req);

        if (!viewer || !viewer.walletId) {
          throw new Error("viewer cannot be found");
        }

        const wallet = await Stripe.disconnect(viewer.walletId);
        if (!wallet) {
          throw new Error("stripe grant error");
        }

        const updateRes = await db.users.findOneAndUpdate(
          {
            _id: viewer._id,
          },
          {
            $set: {
              walletId: "",
            },
          },
          {
            returnDocument: "after",
          }
        );

        if (!updateRes.value) {
          throw new Error("viewer could not be updated");
        }

        viewer = updateRes.value;

        return {
          _id: viewer._id,
          avatar: viewer.avatar,
          token: viewer.token,
          walletId: viewer.walletId,
          didRequest: true,
        };
      } catch (error) {
        throw new Error(`Failed disconnect from Stripe: ${error}`);
      }
    },
  },
  Viewer: {
    id: (viewer: Viewer): string | undefined => viewer._id,
    hasWallet: (viewer: Viewer): boolean | undefined =>
      viewer.walletId ? true : undefined,
  },
};
