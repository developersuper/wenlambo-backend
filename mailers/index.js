const sgMail = require("@sendgrid/mail");
const dotenv = require("dotenv");

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendMailTemplate = async ({
  to,
  subject,
  templateId,
  data,
  bcc,
  cc,
  from = "support@wen-lambo.com",
  replyTo,
}) => {
  await sgMail.send({
    to,
    from,
    cc: cc || undefined,
    bcc: bcc || undefined,
    replyTo: replyTo || from,
    subject,
    templateId,
    dynamic_template_data: {
      hostUrl: process.env.HOST_URL,
      ...data,
    },
  });
};

module.exports = {
  sendMailTemplate,
  mailer: sgMail,
};
