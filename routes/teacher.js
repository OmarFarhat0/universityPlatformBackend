const express = require("express");
const { requireRole, authenticate } = require("../middleware/auth");
const {
  getCourses,
  addLecture,
  updateLecture,
  deleteLecture,
  createExam,
  getExams,
  getExamDetails,
  gradeExamAttempt,
  deleteExam,
  getExamGrades,
  createAssignment,
  getAssignments,
  getAssignmentSubmissions,
  deleteAssignment,
  gradeAssignment,
} = require("../controllers/teacherController");

const upload = require("../middleware/upload");

const router = express.Router();

// Apply authentication middleware
router.use(authenticate);
router.use(requireRole(["professor"]));

// Course routes
router.get("/courses", getCourses);
router.post("/courses/:courseId/lectures", addLecture);
router.put("/courses/:courseId/lectures/:lectureId", updateLecture);
router.delete("/courses/:courseId/lectures/:lectureId", deleteLecture);

// Exam routes
router.get("/exams", getExams);
router.post("/exams", createExam);
router.get("/exams/:examId", getExamDetails);
router.get("/exams/:examId/grades", getExamGrades);
router.put("/exam-attempts/:attemptId/grade", gradeExamAttempt);
router.delete("/exams/:examId", deleteExam);

// Assignment routes
router.get("/assignments", getAssignments);
router.post("/assignments", upload.single("pdf"), createAssignment);
router.delete("/assignments/:assignmentId", deleteAssignment);
router.get("/assignments/:assignmentId/submissions", getAssignmentSubmissions);
router.post(
  "/assignments/submissions/:submissionId/repair",
  authenticate,
  requireRole(["professor"]),
  gradeAssignment
);

module.exports = router;
