const { Course } = require("../models/Course");

const { Exam, ExamAttempt } = require("../models/Exam");
const { Assignment, AssignmentSubmission } = require("../models/Assignment");

const path = require("path");

// Get enrolled courses
const getEnrolledCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      department: req.user.department,
      year: req.user.year,
    })
      .populate("professor", "firstName lastName username")
      .populate("department", "name")
      .sort({ createdAt: -1 });

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get course lectures
const getCourseLectures = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findOne({
      _id: courseId,
    });

    if (!course) {
      return res
        .status(404)
        .json({ error: "Course not found or not enrolled" });
    }

    res.json(course.lectures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get course exams
const getCourseExams = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user._id;

    const course = await Course.findOne({
      _id: courseId,
    });

    if (!course) {
      return res
        .status(404)
        .json({ error: "Course not found or not enrolled" });
    }

    const exams = await Exam.find({ course: courseId });

    // Check which exams the student has attempted
    const examAttempts = await ExamAttempt.find({
      exam: { $in: exams.map((e) => e._id) },
      user: studentId,
    });

    const attemptedExamIds = new Set(
      examAttempts.map((attempt) => attempt.exam.toString())
    );

    // Hide correct answers for students and add attempted flag
    const studentExams = exams.map((exam) => {
      const examObj = exam.toObject();
      examObj.questions = examObj.questions.map((q) => {
        const { correctAnswer, ...questionWithoutAnswer } = q;
        return questionWithoutAnswer;
      });

      return examObj;
    });

    res.json(studentExams);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

// Submit exam attempt
const submitExamAttempt = async (req, res) => {
  try {
    const { examId } = req.params;
    const { answers, courseId } = req.body;
    const userId = req.user._id;

    // Basic validation
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: "Answers must be an array" });
    }

    const exam = await Exam.findById(examId).populate("course");
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Check exam time
    const now = new Date();
    if (now < exam.startDate || now > exam.endDate) {
      return res.status(400).json({ error: "Exam is not currently active" });
    }

    //  Check existing attempt
    if (await ExamAttempt.findOne({ exam: examId, user: userId })) {
      return res.status(400).json({ error: "Exam already submitted" });
    }

    // Validate answer count
    if (answers.length !== exam.questions.length) {
      return res.status(400).json({
        error: `Expected ${exam.questions.length} answers, got ${answers.length}`,
      });
    }

    // Process answers
    let totalScore = 0;
    const gradedAnswers = exam.questions.map((question, i) => {
      const userAnswer = answers[i]?.answer;

      if (userAnswer === undefined || userAnswer === null) {
        throw new Error(`Missing answer for question ${i + 1}`);
      }

      let score = 0;

      if (
        question.type !== "photo-answer" &&
        userAnswer === question.correctAnswer
      ) {
        score = question.points || 1;
      }

      totalScore += score;

      return {
        answer: userAnswer,
        score,
      };
    });

    console.log(req.body);

    // Create exam attempt
    const attempt = await ExamAttempt.create({
      user: userId,
      exam: examId,
      course: courseId,
      answers: gradedAnswers,
      totalScore,
    });

    res.status(201).json(attempt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get exam attempts
const getExamAttempts = async (req, res) => {
  try {
    const attempts = await ExamAttempt.find({ user: req.user._id })
      .populate({
        path: "exam",
        populate: {
          path: "course",
          select: "name code",
        },
      })
      .sort({ submittedAt: -1 });

    res.json(attempts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getExamAttempt = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user._id;

    // Find the attempt and populate exam details
    const attempt = await ExamAttempt.findOne({
      user: userId,
      exam: examId,
    }).populate("exam");

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Exam attempt not found or you are not authorized to view it",
      });
    }

    // Prepare the response data
    const responseData = {
      answers: attempt.answers,
      totalScore: attempt.totalScore,
      exam: attempt.exam,
    };

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching exam attempt:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exam attempt",
      error: error.message,
    });
  }
};

// Get course assignments
const getCourseAssignments = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findOne({
      _id: courseId,
    });

    if (!course) {
      return res
        .status(404)
        .json({ error: "Course not found or not enrolled" });
    }

    const assignments = await Assignment.find({
      course: courseId,
    });

    res.json(assignments);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

// Submit assignment
const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    const assignment = await Assignment.findById(assignmentId).populate(
      "course"
    );
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Check if assignment is still accepting submissions
    if (new Date() > assignment.dueDate) {
      return res.status(400).json({ error: "Assignment deadline has passed" });
    }

    // Check if already submitted
    const existingSubmission = await AssignmentSubmission.findOne({
      assignment: assignmentId,
      student: req.user._id,
    });

    if (existingSubmission) {
      return res.status(400).json({ error: "Assignment already submitted" });
    }

    const submission = new AssignmentSubmission({
      assignment: assignmentId,
      student: req.user._id,
      pdfFilePath: req.file.path, // Store the file path
    });

    await submission.save();
    res.json({
      message: "Assignment submitted successfully",
      submission: {
        ...submission.toObject(),
        pdfFilePathPath: path.join("uploads", req.file.filename), // Include file path in response
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get assignment submissions
const getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const studentId = req.user._id; // Assuming user ID is stored in req.user

    const submission = await AssignmentSubmission.findOne({
      assignment: assignmentId,
      student: studentId,
    }).populate("assignment");

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "No submission found for this assignment",
      });
    }

    res.status(200).json({
      success: true,
      submission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getEnrolledCourses,
  getCourseLectures,
  getCourseExams,
  submitExamAttempt,
  getExamAttempts,
  getExamAttempt,
  getCourseAssignments,
  submitAssignment,
  getAssignmentSubmissions,
};
