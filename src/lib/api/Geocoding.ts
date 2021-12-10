import "reflect-metadata";
import { Geocoder, MapQuestProvider, Location } from "@goparrot/geocoder";

import axiosLib, { AxiosInstance } from "axios";

const axios: AxiosInstance = axiosLib.create();

const provider: MapQuestProvider = new MapQuestProvider(
  axios,
  process.env.MAPQUEST_CONSUMER_KEY || ""
);

const geocoder: Geocoder = new Geocoder(provider);

export const Geocoding = {
  geocode: async (address: string) => {
    try {
      const result: Location[] = await geocoder.geocode({ address });

      const city = result[0] ? result[0].city : null;
      const admin = result[0] ? result[0].state : null;
      const country = result[0] ? result[0].country : null;

      return { city, admin, country };
    } catch (error) {
      console.error("Failed to geocode");
      return {};
    }
  },
};
