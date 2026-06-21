const express = require("express");
const router = express.Router();
const vacationController = require("../controllers/vacation.controller");
const auth = require("../middleware/auth.middleware");

// Currently, anyone logged in can view vacations, but only admins or specific roles should add/edit.
// To keep things simple and matching the local storage approach, we will use basic auth middleware.
// If you want to add permission checks, you could use `const checkPermission = require("../middleware/permission.middleware")`
// and apply `checkPermission("vac_add_tour")` etc.

/**
 * @swagger
 * tags:
 *   name: Vacations
 *   description: Ta'tillar API lari
 */

router.get("/", auth, vacationController.getAllVacations);
router.get("/my-bookings", auth, vacationController.getMyBookings);
router.post("/", auth, vacationController.createVacation);
router.put("/:id", auth, vacationController.updateVacation);
router.delete("/:id", auth, vacationController.deleteVacation);
router.post("/:vacationId/book", auth, vacationController.bookVacation);

module.exports = router;
