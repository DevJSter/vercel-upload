const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../index");
const Coupon = require("../models/Coupon");

// Mock data
const ADMIN_KEY = "YourSecretAdminKeyHere";
const creatorUser = {
  twitterId: "123456789",
  username: "creator_test",
  followers: 5000,
  role: "creator",
};
const anotherCreator = {
  twitterId: "987654321",
  username: "another_creator",
  followers: 8000,
  role: "creator",
};
const regularUser = {
  twitterId: "555666777",
  username: "regular_user",
  followers: 1500,
  role: "user",
};
const lowFollowerUser = {
  twitterId: "111222333",
  username: "low_follower",
  followers: 900, // Below threshold
};

let creatorCouponCode;
let regularUserCouponCode;

// Clear database before tests
beforeAll(async () => {
  // Connect to a test database
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://localhost/coupon_test",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  );

  // Clean the database
  await Coupon.deleteMany({});
});

afterAll(async () => {
  // Disconnect from test database
  await mongoose.connection.close();
});

describe("Coupon API Endpoints", () => {
  // Test coupon generation
  describe("POST /api/coupon", () => {
    it("should create a new coupon for a creator", async () => {
      const res = await request(app).post("/api/coupon").send(creatorUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toEqual("success");
      expect(res.body.data).toHaveProperty("code");

      creatorCouponCode = res.body.data.code;
    });

    it("should create a coupon for a regular user", async () => {
      const res = await request(app).post("/api/coupon").send(regularUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toEqual("success");
      expect(res.body.data).toHaveProperty("code");

      regularUserCouponCode = res.body.data.code;
    });

    it("should reject users with too few followers", async () => {
      const res = await request(app).post("/api/coupon").send(lowFollowerUser);

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual("error");
    });

    it("should prevent duplicate coupons for the same user", async () => {
      const res = await request(app).post("/api/coupon").send(creatorUser);

      expect(res.statusCode).toEqual(409);
      expect(res.body.status).toEqual("error");
      expect(res.body.message).toContain("already has a coupon");
    });

    it("should reject invalid input data", async () => {
      const res = await request(app)
        .post("/api/coupon")
        .send({ username: "missing_data" });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual("error");
    });
  });

  // Test getting coupon information
  describe("GET /api/coupon", () => {
    it("should retrieve creator coupon information", async () => {
      const res = await request(app)
        .get("/api/coupon")
        .query({ twitterId: creatorUser.twitterId });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual("success");
      expect(res.body.data).toHaveProperty("couponCode", creatorCouponCode);
      expect(res.body.data).toHaveProperty("role", "creator");
    });

    it("should retrieve regular user coupon information", async () => {
      const res = await request(app)
        .get("/api/coupon")
        .query({ twitterId: regularUser.twitterId });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual("success");
      expect(res.body.data).toHaveProperty("couponCode", regularUserCouponCode);
      expect(res.body.data).toHaveProperty("role", "user");
    });

    it("should return 404 for non-existent coupons", async () => {
      const res = await request(app)
        .get("/api/coupon")
        .query({ twitterId: "nonexistent-id" });

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toEqual("error");
    });

    it("should reject requests without twitterId", async () => {
      const res = await request(app).get("/api/coupon");

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual("error");
    });
  });

  // Test coupon redemption
  describe("POST /api/redeem", () => {
    // Create another creator for redemption tests
    beforeAll(async () => {
      const res = await request(app).post("/api/coupon").send(anotherCreator);

      expect(res.statusCode).toEqual(201);
    });

    it("should allow redemption between users of the same role", async () => {
      const res = await request(app).post("/api/redeem").send({
        redeemerTwitterId: anotherCreator.twitterId,
        couponCode: creatorCouponCode,
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual("success");
      expect(res.body.data).toHaveProperty("creatorPoints");
      expect(res.body.data).toHaveProperty("redeemerPoints");
    });

    it("should prevent redemption between users of different roles", async () => {
      const res = await request(app).post("/api/redeem").send({
        redeemerTwitterId: regularUser.twitterId,
        couponCode: creatorCouponCode,
      });

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toEqual("error");
      expect(res.body.message).toContain("same role");
    });

    it("should prevent self-redemption", async () => {
      const res = await request(app).post("/api/redeem").send({
        redeemerTwitterId: creatorUser.twitterId,
        couponCode: creatorCouponCode,
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual("error");
      expect(res.body.message).toContain("own coupon");
    });

    it("should handle invalid coupon codes", async () => {
      const res = await request(app).post("/api/redeem").send({
        redeemerTwitterId: anotherCreator.twitterId,
        couponCode: "INVALID",
      });

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toEqual("error");
    });
  });

  // Test admin endpoints
  describe("Admin Endpoints", () => {
    describe("GET /admin/coupons", () => {
      it("should return all coupons when authenticated", async () => {
        const res = await request(app)
          .get("/admin/coupons")
          .set("x-admin-key", ADMIN_KEY);

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual("success");
        expect(res.body.data).toHaveProperty("coupons");
        expect(Array.isArray(res.body.data.coupons)).toBe(true);
        expect(res.body.data.coupons.length).toBeGreaterThanOrEqual(3);
      });

      it("should support pagination", async () => {
        const res = await request(app)
          .get("/admin/coupons")
          .query({ page: 1, limit: 2 })
          .set("x-admin-key", ADMIN_KEY);

        expect(res.statusCode).toEqual(200);
        expect(res.body.data.coupons.length).toBeLessThanOrEqual(2);
        expect(res.body.data.pagination).toHaveProperty("pages");
      });

      it("should support filtering by role", async () => {
        const res = await request(app)
          .get("/admin/coupons")
          .query({ role: "creator" })
          .set("x-admin-key", ADMIN_KEY);

        expect(res.statusCode).toEqual(200);
        expect(
          res.body.data.coupons.every((coupon) => coupon.role === "creator")
        ).toBe(true);
      });

      it("should reject unauthenticated requests", async () => {
        const res = await request(app).get("/admin/coupons");

        expect(res.statusCode).toEqual(401);
        expect(res.body.status).toEqual("error");
      });
    });

    describe("GET /admin/stats", () => {
      it("should return system statistics", async () => {
        const res = await request(app)
          .get("/admin/stats")
          .set("x-admin-key", ADMIN_KEY);

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual("success");
        expect(res.body.data).toHaveProperty("totalCoupons");
        expect(res.body.data).toHaveProperty("roleDistribution");
        expect(res.body.data).toHaveProperty("totalRedeemed");
      });

      it("should reject unauthenticated requests", async () => {
        const res = await request(app).get("/admin/stats");

        expect(res.statusCode).toEqual(401);
        expect(res.body.status).toEqual("error");
      });
    });

    describe("DELETE /admin/coupon/:couponId", () => {
      let couponIdToDelete;

      beforeAll(async () => {
        // Get a coupon ID to delete
        const res = await request(app)
          .get("/admin/coupons")
          .set("x-admin-key", ADMIN_KEY);

        couponIdToDelete = res.body.data.coupons[0]._id;
      });

      it("should delete a coupon when authenticated", async () => {
        const res = await request(app)
          .delete(`/admin/coupon/${couponIdToDelete}`)
          .set("x-admin-key", ADMIN_KEY);

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual("success");
        expect(res.body.message).toContain("deleted successfully");
      });

      it("should confirm the coupon was deleted", async () => {
        const res = await request(app)
          .delete(`/admin/coupon/${couponIdToDelete}`)
          .set("x-admin-key", ADMIN_KEY);

        expect(res.statusCode).toEqual(404);
        expect(res.body.status).toEqual("error");
      });

      it("should reject unauthenticated deletion requests", async () => {
        const res = await request(app).delete(
          `/admin/coupon/${couponIdToDelete}`
        );

        expect(res.statusCode).toEqual(401);
        expect(res.body.status).toEqual("error");
      });
    });
  });
});
