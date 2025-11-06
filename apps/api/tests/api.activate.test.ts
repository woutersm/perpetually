import express from "express";
import request from "supertest";
import api from "../server/api";
import { eq } from "drizzle-orm";
import { factory } from "@perpetually/db/factory";
import { apiErrorsEnum, openapiErrors } from "@perpetually/db/types";
import { licenseSchema } from "@perpetually/db/schema";
import { createActivation } from "@perpetually/db/models";
import { disableLicense } from "@perpetually/db/models";
import { db } from "@perpetually/db/config";

const app = express();
app.use("/api", api);

test("activate", async () => {
  // TODO: figure out if name is required
  const { license, team } = await factory();

  const res = await request(app)
    .post("/api/v1/activate")
    .send({ licenseId: license.id })
    .set("Authorization", `Bearer ${team.apiKey}`);

  const activatedLicense = await db.query.licenseSchema.findFirst({
    where: eq(licenseSchema.id, license.id),
    with: { activations: true },
  });

  expect(res.status).toBe(200);
  expect(res.body.activated).toBe(true);
  expect(res.body.error).toBe(null);

  expect(activatedLicense?.activations).toHaveLength(1);
  expect(activatedLicense?.activations[0].licenseId).toBe(license.id);
});

test("with no activations left", async () => {
  const { license, team } = await factory();
  await createActivation({ licenseId: license.id, name: "name" });
  const res = await request(app)
    .post("/api/v1/activate")
    .send({ licenseId: license.id })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(400);

  expect(res.body.activated).toBe(false);
  expect(res.body.error).toBe(apiErrorsEnum.activationLimitReached);
});

test("missing licenseId", async () => {
  const { team } = await factory();

  const res = await request(app)
    .post("/api/v1/activate")
    .send({})
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
test("with no license found", async () => {
  const { license, team } = await factory();

  const res = await request(app)
    .post("/api/v1/activate")
    .send({ licenseId: license.id + 1 })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(404);

  expect(res.body.activated).toBe(false);
  expect(res.body.error).toBe(apiErrorsEnum.noLicenseFound);
});

// TODO: figure out which states are all invalid
test("with license in invalid state", async () => {
  const { team, license } = await factory();
  await disableLicense(license.id);

  const res = await request(app)
    .post("/api/v1/activate")
    .send({ licenseId: license.id })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(400);
  expect(res.body.activated).toBe(false);
  expect(res.body.error).toBe(apiErrorsEnum.licenseDisabled);
});

test("401 without auth", async () => {
  const { license } = await factory();

  const res = await request(app)
    .post("/api/v1/activate")
    .send({ licenseId: license.id });

  expect(res.status).toBe(401);
  expect(res.body.type).toBe(openapiErrors.unauthorized);
  expect(res.body.errors).toStrictEqual([
    { path: "/api/v1/activate", message: "Authorization header required" },
  ]);
});

test("403 invalid auth", async () => {
  const { license } = await factory();

  const res = await request(app)
    .post("/api/v1/activate")
    .send({ licenseId: license.id })
    .set("Authorization", `Bearer invalid`);

  expect(res.status).toBe(403);
  expect(res.body.type).toBe(openapiErrors.unauthorized);
  expect(res.body.errors).toStrictEqual([
    { path: "/api/v1/activate", message: apiErrorsEnum.apiKeyInvalid },
  ]);
});

test("404 license of other team", async () => {
  const { team } = await factory();
  const { license: license2 } = await factory();
  const res = await request(app)
    .post("/api/v1/activate")
    .send({ licenseId: license2.id })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(404);
  expect(res.body.activated).toBe(false);
  expect(res.body.error).toBe(apiErrorsEnum.noLicenseFound);
});
