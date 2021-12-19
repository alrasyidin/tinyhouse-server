import "dotenv/config";

import { connectDatabase } from "../src/database";

const clear = async () => {
  try {
    console.log("[clear]: runnning...");

    const db = await connectDatabase();

    await db.bookings.clear();

    await db.listings.clear();

    await db.users.clear();

    console.log("[clear] : success");
  } catch {
    throw new Error("Failed to clear data...");
  }
};

clear();
