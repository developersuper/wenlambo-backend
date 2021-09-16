const { sendMailTemplate } = require("./index");

module.exports = {
  submitContactForm: async ({ customerName, email, description }) => {
    await sendMailTemplate({
      to: "info@wen-lambo.com",
      templateId: "d-0b087c3f09434887b0655ec1d23c55be",
      subject: "Test Email",
      data: {
        customerName,
        email,
        description,
      },
    });
  },
};
