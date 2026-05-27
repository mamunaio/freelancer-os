import "server-only";

import mongoose, { type Mongoose } from "mongoose";
import { MongoClient } from "mongodb";
import { serverEnv } from "@/lib/env";

/**
 * MongoDB connection pool — Mongoose for app code, raw MongoClient for the
 * Auth.js adapter (which can't speak Mongoose).
 *
 * Both connections are cached on `globalThis` so Next.js HMR and serverless
 * function invocations share a single pool instead of spinning up new ones.
 */

interface MongoCache {
  mongoose: { conn: Mongoose | null; promise: Promise<Mongoose> | null };
  client: { conn: MongoClient | null; promise: Promise<MongoClient> | null };
}

const cache: MongoCache = (globalThis as unknown as { __mongo?: MongoCache })
  .__mongo ?? {
  mongoose: { conn: null, promise: null },
  client: { conn: null, promise: null },
};

if (process.env.NODE_ENV !== "production") {
  (globalThis as unknown as { __mongo?: MongoCache }).__mongo = cache;
}

/** Returns a connected Mongoose instance. */
export async function connectMongoose(): Promise<Mongoose> {
  if (cache.mongoose.conn) return cache.mongoose.conn;

  if (!cache.mongoose.promise) {
    const uri = serverEnv.mongoUri;
    cache.mongoose.promise = mongoose
      .connect(uri, {
        dbName: serverEnv.mongoDb,
        serverSelectionTimeoutMS: 10_000,
        // Avoid Mongoose emitting noisy deprecation warnings in dev.
        autoIndex: process.env.NODE_ENV !== "production",
      })
      .then((m) => m);
  }

  cache.mongoose.conn = await cache.mongoose.promise;
  return cache.mongoose.conn;
}

/**
 * Raw MongoClient promise factory — Auth.js MongoDB adapter wants this exact
 * shape. Lazy: the connection is only opened the first time the promise is
 * awaited. Calling code reads `mongoClientPromise` (a getter) so build-time
 * static-analysis doesn't accidentally open a real socket.
 */
function getMongoClientPromise(): Promise<MongoClient> {
  if (cache.client.promise) return cache.client.promise;

  const uri = serverEnv.mongoUri;
  const client = new MongoClient(uri, {
    appName: "Injaazh-OS",
  });

  cache.client.promise = client.connect().then((c) => {
    cache.client.conn = c;
    return c;
  });

  return cache.client.promise;
}

// Promise-shaped adapter expected by `@auth/mongodb-adapter`.
// We wrap getMongoClientPromise() in a thenable that defers connection until
// the adapter actually awaits it.
export const mongoClientPromise: Promise<MongoClient> = {
  then(onFulfilled, onRejected) {
    return getMongoClientPromise().then(onFulfilled, onRejected);
  },
  catch(onRejected) {
    return getMongoClientPromise().catch(onRejected);
  },
  finally(onFinally) {
    return getMongoClientPromise().finally(onFinally);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [Symbol.toStringTag]: "Promise" as any,
} as Promise<MongoClient>;
