const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/user-photos", require("./routes/file.routes"));
app.use("/api/permissions", require("./routes/permission.routes"));
app.use("/api/tasks", require("./routes/task.routes"));

module.exports = app;
