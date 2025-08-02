import nodemailer from 'nodemailer';
import env from "dotenv";
env.config();

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_AUTH_EMAIL,
    pass: process.env.NODEMAILER_AUTH_PASSWORD,
  },
});

const sendMail = async () => {
  const info = await transporter.sendMail({
    from: '"DevConnect" <hus.mustan@gmail.com>',
    to: 'hus.mustan2@gmail.com',
    subject: '🎉 Real Email from DevConnect',
    text: 'Hello! This is a real email.',
    html: '<b>Hello there!</b><br>You are connected to <i>DevConnect</i>.',
  });

  console.log('✅ Email sent:', info.messageId);
}

