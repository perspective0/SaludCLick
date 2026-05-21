"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reviewsController_1 = require("../controllers/reviewsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/reviews - create review (patient only)
router.post('/', auth_1.authMiddleware, reviewsController_1.createReview);
// GET /api/reviews/doctor/:doctorId - get reviews for a doctor
router.get('/doctor/:doctorId', reviewsController_1.getDoctorReviews);
exports.default = router;
//# sourceMappingURL=reviews.js.map