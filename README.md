# Tinyhouse Server Node.js Application
This server application is API built on top Node.js, typescript and Graphql server. Using best practice and latest technology in the industry. This only hold on server-side if you wonder the client-side located here: https://github.com/alrasyidin/tinyhouse-client. You can also visit the final application that has been deployed on the heroku platform here: https://tinyhouse-app-v2.herokuapp.com.
 
## Technology

- Node.JS
- Typescript
- Mongo (default)/PostgresSQL DB 
- Express JS
- Apollo Server
- GraphQL
- Google OAuth
- Cloudinary Image Solution API
- Stripe API

## Features

- Integration sign-in / sign-up with Google OAuth.
- Upload and integrate Image with Cloudinary API.
- Browse listing base on geolocation search request.
- Filter and sort listing on certain condition
- Create listing
- Integraton online payment with Stripe API

## Usage

### Env Variable

create .env variable at the top of root project like this:

```
PORT=5000
PUBLIC_URL=http://localhost:3000
DB_USER=
DB_USER_PASSWORD=
DB_CLUSTER=
G_CLIENT_ID=
G_CLIENT_SECRET=
G_GEOCODE_KEY=
SECRET=38a1b3c2b3861155dd4250eb62df93a192c659ca096fb1ca28bc5bf5f9f6356743481b993a5501f70d259cac6464712b19ca05a084d5fd9ce1fc613d1325746d
NODE_ENV=development
MAPQUEST_CONSUMER_KEY=
MAPQUEST_CONSUMER_SECRET=
S_SECRET_KEY=
S_CLIENT_ID=
CLOUDINARY_NAME=
CLOUDINARY_KEY=
CLOUDINARY_SECRET=
```
G_* for google key config, S_* for stripe API config. Here I use mapquest service for geocoding, if you want use google you can provide gecoding api key at G_GEOCODE_KEY. In the app please change code at `src\grapqhl\resolvers\Listing\index.ts` in line 87 to use ```Google.geocode(string location)``` function.

### Server

```
npm install
npm run seed
npm start
```

### PostgreSQL Integration
This app can be integrated with postgres database. You just change the branch to `db-postgres` and provide configuration on `ormconfig.json`. Here I use TypeORM library for orm solution.
 
Codegen only can be running with after you start the development server. you can start development server base on this guide [here](https://github.com/alrasyidin/tinyhouse-server).

## Screenshot

![landing page](https://i.postimg.cc/05yKq0NQ/1.png)
![listings page](https://i.postimg.cc/BvJQBJL6/2.png)
![user profile page](https://i.postimg.cc/yYSdVQCV/3.png)
![listing detail page](https://i.postimg.cc/HkwkMrLR/4.png)
![create listing page](https://i.postimg.cc/mgfrhYT7/5.png)
