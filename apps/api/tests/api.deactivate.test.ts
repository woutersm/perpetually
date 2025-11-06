import express from "express";
import request from "supertest";
import api from "../server/api";
import { eq } from "drizzle-orm";
import { factory } from "@perpetually/db/factory";
import { apiErrorsEnum, openapiErrors } from "@perpetually/db/types";
import { activationsSchema } from "@perpetually/db/schema";
import { db } from "@perpetually/db/config";
import { createActivation } from "@perpetually/db/models";
import invariant from "tiny-invariant";

const app = express();
app.use("/api", api);

test("deactivate", async () => {
  const { license, team } = await factory();

  const { activation, error } = await createActivation({
    licenseId: license.id,
    name: "test activation",
  });

  invariant(activation);
  expect(error).toBeNull();

  const res = await request(app)
    .post("/api/v1/deactivate")
    .send({ activationId: activation.id })
    .set("Authorization", `Bearer ${team.apiKey}`);

  const deactivatedActivation = await db.query.activationsSchema.findFirst({
    where: eq(activationsSchema.licenseId, license.id),
  });

  expect(deactivatedActivation).toBeUndefined();

  expect(res.status).toBe(200);
  expect(res.body.deactivated).toBe(true);
  expect(res.body.error).toBe(null);
});

test("missing activationId", async () => {
  const { team } = await factory();

  const res = await request(app)
    .post("/api/v1/deactivate")
    .send({})
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(400);

  expect(res.body.type).toBe(openapiErrors.badRequest);
  expect(res.body.errors).toStrictEqual([
    {
      path: "/body/activationId",
      message: "'activationId' is required",
    },
  ]);
});

test("with activation not found", async () => {
  const { team, license } = await factory();

  const { activation, error } = await createActivation({
    licenseId: license.id,
    name: "test activation",
  });

  invariant(activation);
  expect(error).toBeNull();

  const res = await request(app)
    .post("/api/v1/deactivate")
    .send({ activationId: activation.id + 1 })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(404);

  expect(res.body.deactivated).toBe(false);
  expect(res.body.error).toBe(apiErrorsEnum.noActivationFound);
});

test("401 without auth", async () => {
  const { license } = await factory();

  const { activation, error } = await createActivation({
    licenseId: license.id,
    name: "test activation",
  });

  invariant(activation);
  expect(error).toBeNull();

  const res = await request(app)
    .post("/api/v1/deactivate")
    .send({ activationId: activation.id });

  expect(res.status).toBe(401);
  expect(res.body.type).toBe(openapiErrors.unauthorized);
  expect(res.body.errors).toStrictEqual([
    { path: "/api/v1/deactivate", message: "Authorization header required" },
  ]);
});

test("403 invalid auth", async () => {
  const { license } = await factory();

  const { activation, error } = await createActivation({
    licenseId: license.id,
    name: "test activation",
  });

  invariant(activation);
  expect(error).toBeNull();

  const res = await request(app)
    .post("/api/v1/deactivate")
    .send({ activationId: activation.id })
    .set("Authorization", `Bearer invalid`);

  expect(res.status).toBe(403);
  expect(res.body.type).toBe(openapiErrors.unauthorized);
  expect(res.body.errors).toStrictEqual([
    { path: "/api/v1/deactivate", message: apiErrorsEnum.apiKeyInvalid },
  ]);
});

test("403 activation of other team", async () => {
  const { team } = await factory();
  const { license: license2 } = await factory();

  const { activation, error } = await createActivation({
    licenseId: license2.id,
    name: "test activation",
  });

  invariant(activation);
  expect(error).toBeNull();
  const res = await request(app)
    .post("/api/v1/deactivate")
    .send({ activationId: activation.id })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(404);
  expect(res.body.deactivated).toBe(false);
  expect(res.body.error).toBe(apiErrorsEnum.noActivationFound);
});
