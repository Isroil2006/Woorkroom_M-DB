require("dotenv").config();
const nodemailer = require("nodemailer");

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "*** (" + process.env.EMAIL_PASS.length + " belgi)" : "YO'Q!");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.sendMail({
  from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
  to: process.env.EMAIL_USER === "resend" ? "6167402isroil@gmail.com" : process.env.EMAIL_USER, // resend uchun test emailingizni kiritdim
  subject: "Test xat - Woorkroom",
  text: "Bu test xat. Agar siz buni ko'ryapsiz demak Nodemailer ishlayapti!"
}, (error, info) => {
  if (error) {
    console.error("XATO:", error.message);
    console.error("To'liq xato:", error);
  } else {
    console.log("MUVAFFAQIYAT! Email yuborildi:", info.response);
  }
});
