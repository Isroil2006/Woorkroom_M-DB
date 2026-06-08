const app = require("./app");
const dbConnect = require("./db");

// Boshlang'ich ulanishni ishga tushirish (Local uchun foydali, Serverless da middleware o'zi eplaydi)
dbConnect().catch(console.error);

// Start Server
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server ${PORT}-portda ishga tushdi`);
  });
}

module.exports = app;
