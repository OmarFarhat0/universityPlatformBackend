const bcrypt = require("bcryptjs");
const { User } = require("../models/User");
const { Department } = require("../models/Department");
const { Course } = require("../models/Course");

// Auto-enroll user in matching courses
const autoEnrollUser = async (user) => {
  if (user.role === "student" && user.department && user.year) {
    const matchingCourses = await Course.find({
      department: user.department,
      year: user.year,
    });

    for (const course of matchingCourses) {
      if (!course.students.includes(user._id)) {
        course.students.push(user._id);
        await course.save();
      }
    }
  }
};

// User Management
const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate("department", "name")
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, username, role, department, year } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        username,
        role,
        department,
        year: role === "student" ? year : undefined,
      },
      { new: true }
    )
      .populate("department", "name")
      .select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await autoEnrollUser(user);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    await User.findByIdAndDelete(userId);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Department Management
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json(departments);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;

    const department = new Department({
      name,
    });

    await department.save();

    const populatedDepartment = await Department.findById(department._id);

    res.status(201).json(populatedDepartment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { name } = req.body;

    const department = await Department.findByIdAndUpdate(
      departmentId,
      { name },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    // Delete all courses in this department
    await Course.deleteMany({ department: departmentId });

    // Delete all users in this department
    await User.deleteMany({ department: departmentId });

    // Delete the department itself
    await Department.findByIdAndDelete(departmentId);

    res.json({
      message: "Department and related records deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Course Management
const getCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("professor", "firstName lastName")
      .populate("department", "name")
      .populate("students", "firstName lastName username")
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createCourse = async (req, res) => {
  try {
    const { name, professor, department, year } = req.body;

    const course = new Course({
      name,
      professor,
      department,
      year,
    });

    await course.save();

    // Auto-enroll matching students
    const matchingStudents = await User.find({
      role: "student",
      department: department,
      year: year,
    });

    for (const student of matchingStudents) {
      if (!course.students.includes(student._id)) {
        course.students.push(student._id);
      }
    }
    await course.save();

    const populatedCourse = await Course.findById(course._id)
      .populate("professor", "firstName lastName")
      .populate("department", "name")
      .populate("students", "firstName lastName username");

    res.status(201).json(populatedCourse);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { name, professor, department, year } = req.body;

    const course = await Course.findByIdAndUpdate(
      courseId,
      { name, professor, department, year },
      { new: true }
    )
      .populate("professor", "firstName lastName")
      .populate("department", "name")
      .populate("students", "firstName lastName username");

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    await Course.findByIdAndDelete(courseId);

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUsers,
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
};
