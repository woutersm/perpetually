import express from "express";
import request from "supertest";
import api from "../server/api";
import { factory } from "@perpetually/db/factory";
import { apiErrorsEnum, licenseStatusEnum, openapiErrors } from "@perpetually/db/types";
import { db } from "@perpetually/db/config";
import { licenseSchema } from "@perpetually/db/schema";
import { eq } from "drizzle-orm";
import { toSQLiteTimestamp } from "@perpetually/db/utils";
import { disableLicense } from "@perpetually/db/models";

const app = express();
app.use("/api", api);

test("with valid key", async () => {
  const { license, team } = await factory();

  const res = await request(app)
    .post("/api/v1/validate")
    .send({ licenseId: license.id, key: license.key })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(200);
  expect(res.body.valid).toBe(true);
  expect(res.body.error).toBe(null);
});

test("with invalid key", async () => {
  const { license, team } = await factory();

  const res = await request(app)
    .post("/api/v1/validate")
    .send({ licenseId: license.id, key: license.key + 1 })
    .set("Authorization", `Bearer ${team.apiKey}`)
    .set("Content-Type", "application/json");

  expect(res.status).toBe(400);

  expect(res.body.valid).toBe(false);
  expect(res.body.error).toBe(apiErrorsEnum.keyInvalid);
});

test("with expired license (status)", async () => {
  const { license, team } = await factory();

  await db
    .update(licenseSchema)
    .set({ status: licenseStatusEnum.disabled })
    .where(eq(licenseSchema.id, license.id));

  const res = await request(app)
    .post("/api/v1/validate")
    .send({ licenseId: license.id, key: license.key })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(400);
  expect(res.body.valid).toBe(false);
  // TODO: change to license not active
  expect(res.body.error).toBe(apiErrorsEnum.licenseDisabled);
});
//
test("with expired license (expires_at)", async () => {
  const { license, team } = await factory();

  await db
    .update(licenseSchema)
    .set({ expiresAt: toSQLiteTimestamp(new Date()) })
    .where(eq(licenseSchema.id, license.id));

  const res = await request(app)
    .post("/api/v1/validate")
    .send({ licenseId: license.id, key: license.key })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(400);

  expect(res.body.valid).toBe(false);
  expect(res.body.error).toBe(apiErrorsEnum.licenseExpired);
});
test("with disabled license", async () => {
  const { license, team } = await factory();

  await disableLicense(license.id);
  const res = await request(app)
    .post("/api/v1/validate")
    .send({ licenseId: license.id, key: license.key })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(400);
  expect(res.body.valid).toBe(false);
  expect(res.body.error).toBe(apiErrorsEnum.licenseDisabled);
});
//
test("with non-existing licenseId", async () => {
  const { license, team } = await factory();

  const res = await request(app)
    .post("/api/v1/validate")
    .send({ licenseId: license.id + 1, key: license.key })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(404);
  expect(res.body.valid).toBe(false);
  expect(res.body.error).toBe(apiErrorsEnum.noLicenseFound);
});

test("with no licenseId", async () => {
  const { license, team } = await factory();

  const res = await request(app)
    .post("/api/v1/validate")
    .send({ key: license.key })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(400);
  expect(res.body.type).toBe(openapiErrors.badRequest);
  expect(res.body.errors).toStrictEqual([
    {
      path: "/body/licenseId",
      message: "'licenseId' is required",
    },
  ]);
});

test("with no key", async () => {
  const { license, team } = await factory();

  const res = await request(app)
    .post("/api/v1/validate")
    .send({ licenseId: license.id })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(400);
  expect(res.body.type).toBe(openapiErrors.badRequest);
  expect(res.body.errors).toStrictEqual([
    {
      path: "/body/key",
      message: "'key' is required",
    },
  ]);
});
test("401 without auth", async () => {
  const { license } = await factory();

  const res = await request(app)
    .post("/api/v1/validate")
    .send({ licenseId: license.id, key: license.key });

  expect(res.status).toBe(401);
  expect(res.body.type).toBe(openapiErrors.unauthorized);
  expect(res.body.errors).toStrictEqual([
    { path: "/api/v1/validate", message: "Authorization header required" },
  ]);
});
//
test("403 invalid auth", async () => {
  const { license } = await factory();

  const res = await request(app)
    .post("/api/v1/validate")
    .send({ licenseId: license.id, key: license.key })
    .set("Authorization", `Bearer invalid`)
    .set("Content-Type", "application/json");

  expect(res.status).toBe(403);
  expect(res.body.type).toBe(openapiErrors.unauthorized);
  expect(res.body.errors).toStrictEqual([
    { path: "/api/v1/validate", message: apiErrorsEnum.apiKeyInvalid },
  ]);
});

test("404 license of other team", async () => {
  const { team } = await factory();
  const { license: license2 } = await factory();

  const res = await request(app)
    .post("/api/v1/validate")
    .send({ licenseId: license2.id, key: "key" })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(404);
  expect(res.body.error).toBe(apiErrorsEnum.noLicenseFound);
  expect(res.body.valid).toBe(false);
});
