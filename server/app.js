const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const dbConnect = require("./db");

const app = express();

// X-Powered-By headerni o'chirish (server ma'lumotini yashirish)
app.disable("x-powered-by");

app.use(async (req, res, next) => {
  try {
    await dbConnect();
    next();
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).json({ message: "Database connection failed", error: error.message });
  }
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Woorkroom M-DB API",
      version: "1.0.0",
      description: "Woorkroom loyihasining barcha API yo'llari uchun dokumentatsiya",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          required: ["username", "email", "password"],
          properties: {
            userId: { type: "string", description: "Mongoose ObjectId" },
            username: { type: "string", minLength: 3, maxLength: 50, example: "ali_valiyev" },
            email: { type: "string", format: "email", example: "ali@example.com" },
            password: { type: "string", minLength: 6, example: "secret123" },
            tel: { type: "string", pattern: "^\\+?\\d{9,15}$", example: "+998901234567" },
            position: { type: "string", example: "Developer" },
            role: { type: "string", enum: ["user", "admin"], default: "user" }
          },
        },
        Project: {
          type: "object",
          required: ["name"],
          properties: {
            _id: { type: "string", description: "Loyiha ID" },
            name: { type: "string", minLength: 3, maxLength: 100, example: "Yangi loyiha" },
            description: { type: "string", example: "Loyiha haqida ma'lumot" },
            createdBy: { type: "string", description: "Yaratuvchi foydalanuvchi ID" },
            members: { type: "array", items: { type: "string" }, description: "A'zolar ID lari ro'yxati" },
            createdAt: { type: "string", format: "date-time" }
          },
        },
        Task: {
          type: "object",
          required: ["title", "projectId"],
          properties: {
            _id: { type: "string", description: "Vazifa ID" },
            title: { type: "string", minLength: 3, maxLength: 200, example: "Fayl yuklash API sini qilish" },
            description: { type: "string", example: "Barcha fayllar S3 ga yuklanishi kerak" },
            status: { type: "string", enum: ["todo", "progress", "done"], default: "todo" },
            projectId: { type: "string", description: "Tegishli loyiha ID" },
            assignees: { type: "array", items: { type: "string" }, description: "Biriktirilgan foydalanuvchilar" },
            estimatedTime: { type: "number", minimum: 0, example: 5 },
            createdAt: { type: "string", format: "date-time" }
          },
        },
        Permission: {
          type: "object",
          required: ["module", "apis"],
          properties: {
            module: { type: "string", example: "Tasks" },
            apis: { type: "array", items: { type: "number" }, example: [101, 102, 103] }
          }
        },
        File: {
          type: "object",
          required: ["userId", "fileData"],
          properties: {
            userId: { type: "string", description: "Rasm tegishli bo'lgan foydalanuvchi" },
            fileData: { type: "string", description: "Base64 string yoki rasm URL'i" }
          }
        }
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"], // routes papkasidagi barcha js fayllarni qidiradi
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? ["https://woorkroom.uz", "https://www.woorkroom.uz"]
    : ["http://localhost:5173", "http://localhost:5000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Global XSS Sanitization Middleware (HTML Escaping)
const sanitizeInput = (val, key) => {
  if (typeof val === "string") {
    if (key === "description" || key === "password") {
      return val;
    }
    return val
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeInput(item, key));
  }
  if (typeof val === "object" && val !== null) {
    const clean = {};
    for (const k in val) {
      clean[k] = sanitizeInput(val[k], k);
    }
    return clean;
  }
  return val;
};

app.use((req, res, next) => {
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query);
  if (req.params) req.params = sanitizeInput(req.params);
  next();
});

// Xavfsizlik Headerlari (ZAP tavsiyalari bo'yicha)
app.use((req, res, next) => {
  // Clickjacking himoyasi
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Content Security Policy (CSP) — to'liq
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://res.cloudinary.com; connect-src 'self' https://*.pusher.com wss://*.pusher.com; frame-ancestors 'self'"
  );

  // MIME-type sniffing himoyasi
  res.setHeader("X-Content-Type-Options", "nosniff");

  // HTTPS majburlash (production uchun)
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // XSS himoyasi (eski brauzerlar uchun)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer-Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Server header ni yashirish
  res.removeHeader("Server");

  // API javoblar uchun kesh boshqaruvi
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  next();
});

app.use(express.static(path.join(__dirname, "../client")));

// Routes
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/user-photos", require("./routes/file.routes"));
app.use("/api/permissions", require("./routes/permission.routes"));
app.use("/api/tasks", require("./routes/task.routes"));
app.use("/api/super-settings", require("./routes/super-setting.routes"));
app.use("/api/tests", require("./routes/test.routes"));
app.use("/api/test-photos", require("./routes/testPhoto.routes"));
app.use("/api/messenger", require("./routes/messenger.routes"));
app.use("/api/project-files", require("./routes/projectFile.routes"));
app.use("/api/task-chat", require("./routes/projectTaskChat.routes"));
app.use("/api/payments", require("./routes/payment.routes"));
app.use("/api/vacations", require("./routes/vacation.routes"));

// Sahifalar uchun backend himoyasi (Manual URL terilganda ishlaydi)
const auth = require("./middleware/auth.middleware");
const checkPermission = require("./middleware/permission.middleware");

// Har qanday frontend sahifa yo'li kelganda auth va ruxsatni tekshiramiz
app.get(["/employees", "/tasks", "/calendar", "/messenger", "/payments", "/vacations", "/tests"], auth, checkPermission(), (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Auth himoyasi bilan, lekin permission tekshirmasdan
const jwt = require("jsonwebtoken");
app.get(["/", "/profile", "/super-settings", "/index.html"], (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect("/login.html");
  }
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.redirect("/login.html");
    }
    jwt.verify(token, secret);
    res.sendFile(path.join(__dirname, "../client/index.html"));
  } catch (e) {
    return res.redirect("/login.html");
  }
});

module.exports = app;
