import crypto from "crypto";

import { IResolvers } from ".pnpm/graphql-tools@4.0.8_graphql@14.7.0/node_modules/graphql-tools";
import { Google } from "../../../lib/api";
import { Database, User, Viewer } from "../../../lib/types";
import { ConnectStripeArgs, LogInArgs } from "./types";
import { Request, Response } from "express";
import { authorize } from "../../../lib/utils";
import { Stripe } from "../../../lib/api/Stripe";

const cookiOptions = {
  httpOnly: true,
  sameSite: true,
  signed: true,
};

const logInViaGoogle = async (
  code: string,
  token: string,
  db: Database,
  res: Response
): Promise<User | undefined> => {
  const { user } = await Google.login(code);

  if (!user) {
    throw new Error("Google Login Error");
  }

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

  let viewer = await db.users.findOne({ id: userId });

  if (viewer) {
    viewer.name = userName;
    viewer.avatar = userAvatar;
    viewer.contact = userEmail;
    viewer.token = token;

    await viewer.save();
  } else {
    const newUser: User = {
      id: userId,
      name: userName,
      avatar: userAvatar,
      contact: userEmail,
      token,
      income: 0,
      bookings: [],
      listings: [],
    };

    viewer = await db.users.create(newUser).save();
  }

  res.cookie("viewer", userId, {
    ...cookiOptions,
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });

  return viewer as User;
};

const logInViaCookie = async (
  token: string,
  db: Database,
  req: Request,
  res: Response
): Promise<User | undefined> => {
  const viewer = await db.users.findOne({ id: req.signedCookies.viewer });

  if (viewer) {
    viewer.token = token;
    await viewer.save();
  } else {
    res.clearCookie("viewer", cookiOptions);
  }

  return viewer as User;
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
          ? await logInViaGoogle(code, token, db, res)
          : await logInViaCookie(token, db, req, res);

        if (!viewer) {
          return { didRequest: true };
        }

        return {
          id: viewer.id,
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
      { res }: { res: Response }
    ): Viewer => {
      try {
        res.clearCookie("viewer", cookiOptions);
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

        const viewer = await authorize(db, req);

        if (!viewer) {
          throw new Error("viewer cannot be found");
        }

        const wallet = await Stripe.connect(code);

        if (!wallet) {
          throw new Error("Stripe grant error");
        }

        viewer.walletId = wallet.stripe_user_id;
        await viewer.save();

        return {
          id: viewer.id,
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
        const viewer = await authorize(db, req);

        if (!viewer || !viewer.walletId) {
          throw new Error("viewer cannot be found");
        }

        const wallet = await Stripe.disconnect(viewer.walletId);
        if (!wallet) {
          throw new Error("stripe disconnect error");
        }

        viewer.walletId = null;
        await viewer.save();

        return {
          id: viewer.id,
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
    hasWallet: (viewer: Viewer): boolean | undefined =>
      viewer.walletId ? true : undefined,
  },
};
