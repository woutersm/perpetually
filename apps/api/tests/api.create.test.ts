import express from "express";
import request from "supertest";
import api from "../server/api";
import { factory } from "@perpetually/db/factory";
import { apiErrorsEnum, openapiErrors } from "@perpetually/db/types";

const app = express();
app.use("/api", api);

test("creates license successfully", async () => {
  const { team, product } = await factory();

  const res = await request(app)
    .post("/api/v1/licenses")
    .send({
      productId: product.id,
      name: "Test Customer",
      email: "test@example.com",
    })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(200);
  expect(res.body.created).toBe(true);
  expect(res.body.error).toBe(null);
  expect(res.body.license).toBeDefined();
  expect(res.body.license?.productId).toBe(product.id);
});

test("fails with non-existent product", async () => {
  const { team } = await factory();

  const res = await request(app)
    .post("/api/v1/licenses")
    .send({
      productId: "non-existent-id",
      name: "Test Customer",
      email: "test@example.com",
    })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(404);
  expect(res.body.created).toBe(false);
  expect(res.body.error).toBe(apiErrorsEnum.noProductFound);
});

test("fails with product from other team", async () => {
  const { team } = await factory();
  const { product: otherProduct } = await factory();

  const res = await request(app)
    .post("/api/v1/licenses")
    .send({
      productId: otherProduct.id,
      name: "Test Customer",
      email: "test@example.com",
    })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(404);
  expect(res.body.created).toBe(false);
  expect(res.body.error).toBe(apiErrorsEnum.noProductFound);
});

test("fails with missing productId", async () => {
  const { team } = await factory();

  const res = await request(app)
    .post("/api/v1/licenses")
    .send({
      name: "Test Customer",
      email: "test@example.com",
    })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(400);
  expect(res.body.type).toBe(openapiErrors.badRequest);
  expect(res.body.errors).toStrictEqual([
    {
      path: "/body/productId",
      message: "'productId' is required",
    },
  ]);
});

test("fails with missing name", async () => {
  const { team, product } = await factory();

  const res = await request(app)
    .post("/api/v1/licenses")
    .send({
      productId: product.id,
      email: "test@example.com",
    })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(400);
  expect(res.body.type).toBe(openapiErrors.badRequest);
  expect(res.body.errors).toStrictEqual([
    {
      path: "/body/name",
      message: "'name' is required",
    },
  ]);
});

test("fails with missing email", async () => {
  const { team, product } = await factory();

  const res = await request(app)
    .post("/api/v1/licenses")
    .send({
      productId: product.id,
      name: "Test Customer",
    })
    .set("Authorization", `Bearer ${team.apiKey}`);

  expect(res.status).toBe(400);
  expect(res.body.type).toBe(openapiErrors.badRequest);
  expect(res.body.errors).toStrictEqual([
    {
      path: "/body/email",
      message: "'email' is required",
    },
  ]);
});

test("401 without auth", async () => {
  const { product } = await factory();

  const res = await request(app).post("/api/v1/licenses").send({
    productId: product.id,
    name: "Test Customer",
    email: "test@example.com",
  });

  expect(res.status).toBe(401);
  expect(res.body.type).toBe(openapiErrors.unauthorized);
  expect(res.body.errors).toStrictEqual([
    { path: "/api/v1/licenses", message: "Authorization header required" },
  ]);
});

test("403 invalid auth", async () => {
  const { product } = await factory();

  const res = await request(app)
    .post("/api/v1/licenses")
    .send({
      productId: product.id,
      name: "Test Customer",
      email: "test@example.com",
    })
    .set("Authorization", `Bearer invalid`);

  expect(res.status).toBe(403);
  expect(res.body.type).toBe(openapiErrors.unauthorized);
  expect(res.body.errors).toStrictEqual([
    { path: "/api/v1/licenses", message: apiErrorsEnum.apiKeyInvalid },
  ]);
});
