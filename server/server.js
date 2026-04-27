const mongoose = require("mongoose");
require("dotenv").config();
const app = require("./app");

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("MongoDB ga muvaffaqiyatli ulandi");
  })

  .catch((err) => {
    console.error("MongoDB ga ulanishda xatolik!");
    console.error("Error Message:", err.message);
  });

// Start Server
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server ${PORT}-portda ishga tushdi`);
  });
}

module.exports = app;
