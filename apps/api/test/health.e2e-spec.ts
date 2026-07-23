import type { INestApplication } from "@nestjs/common";
import request from "supertest";

import { createTestApp } from "./utils/create-test-app";

describe("Health (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns { status: 'ok' } with a timestamp", async () => {
    const response = await request(app.getHttpServer()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(typeof response.body.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });
});
