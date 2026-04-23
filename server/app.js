const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true })); // CORS ni kuki bilan ishlashga moslash
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(path.join(__dirname, "../client")));



// Routes
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/user-photos", require("./routes/file.routes"));
app.use("/api/permissions", require("./routes/permission.routes"));
app.use("/api/tasks", require("./routes/task.routes"));

// Sahifalar uchun backend himoyasi (Manual URL terilganda ishlaydi)
const auth = require("./middleware/auth.middleware");
const checkPermission = require("./middleware/permission.middleware");

// Har qanday frontend sahifa yo'li kelganda auth va ruxsatni tekshiramiz
app.get(["/employees", "/tasks", "/calendar", "/messenger", "/payments", "/vacations"], auth, checkPermission(), (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});


module.exports = app;
