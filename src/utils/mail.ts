import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
export type emailOptions = {
  email: string;
  subject: string;
  message: string;
};
export const sendEmail = (option: emailOptions) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: 25,
    logger: true,
    debug: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
  const mailOptions = {
    from: 'info@mailtrap.club',
    to: option.email,
    subject: option.subject,
    text: option.message,
  };
  transporter.sendMail(mailOptions);
};
