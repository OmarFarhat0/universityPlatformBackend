const express = require("express");
const { requireRole } = require("../middleware/auth");
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/adminController");

const router = express.Router();

// User Management
router.get("/users", requireRole(["admin"]), getUsers);
router.put("/users/:userId", requireRole(["admin"]), updateUser);
router.delete("/users/:userId", requireRole(["admin"]), deleteUser);

// Department Management
router.get("/departments", requireRole(["admin"]), getDepartments);
router.post("/departments", requireRole(["admin"]), createDepartment);
router.put(
  "/departments/:departmentId",
  requireRole(["admin"]),
  updateDepartment
);
router.delete(
  "/departments/:departmentId",
  requireRole(["admin"]),
  deleteDepartment
);

// Course Management
router.get("/courses", requireRole(["admin"]), getCourses);
router.post("/courses", requireRole(["admin"]), createCourse);
router.put("/courses/:courseId", requireRole(["admin"]), updateCourse);
router.delete("/courses/:courseId", requireRole(["admin"]), deleteCourse);

module.exports = router;
