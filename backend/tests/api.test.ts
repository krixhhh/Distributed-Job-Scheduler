import request from "supertest";
import { app } from "../src/app.js";

describe("API Endpoint Integration Tests", () => {
  it("GET /health should return 200 and status: healthy", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("status", "healthy");
    expect(res.body).toHaveProperty("timestamp");
  });

  it("POST /api/auth/login with invalid arguments should return 400 validation errors", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "invalid-mail", passwordHash: "" });
    
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.message).toContain("Validation failed");
  });
});
