const { User } = require("../models/User");
const { Department } = require("../models/Department");
const bcrypt = require("bcryptjs");

const seedUsers = async () => {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log("Users already exist, skipping seeding.");
    return;
  }

  // Check or create "Computer Engineer" department
  let department = await Department.findOne({ name: "Computer Engineer" });
  if (!department) {
    department = await Department.create({ name: "Computer Engineer" });
    console.log("Created 'Computer Engineer' department.");
  }

  const hashedPassword = await bcrypt.hash("123456789", 12);

  const users = [
    {
      firstName: "Admin",
      lastName: "User",
      password: hashedPassword,
      role: "admin",
    },
    {
      firstName: "John",
      lastName: "Professor",
      password: hashedPassword,
      role: "professor",
      department: department._id,
    },
    {
      firstName: "Jane",
      lastName: "Student",
      password: hashedPassword,
      role: "student",
      department: department._id,
      year: 2,
    },
  ];

  await User.insertMany(users);
  console.log("Seeded default users.");
};

module.exports = seedUsers;
