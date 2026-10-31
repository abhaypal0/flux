
import transporter from "../config/email.config.js";

const sendVerificationEmail = async (email, token) => {

    const verificationLink =
        `${process.env.BACKEND_URL}/api/auth/verify-email/${token}`;

  const mailOptions = {
    from: `"Subscription Management System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Subscription Management System Account",

    text: `Welcome! Please verify your email address to activate your account: ${verificationLink}`,

    html: `
        <div style="font-family: Arial, sans-serif; padding: 30px; text-align: center; background-color: #f8fafc;">
            <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 10px;">

                <h2 style="color: #2563eb;">
                    Welcome to Subscription Management System!
                </h2>

                <p style="color: #334155;">
                    Thank you for creating your account.
                </p>

                <p style="color: #475569;">
                    Please verify your email address to activate your account
                    and start managing your subscriptions, plans, and invoices.
                </p>

                <a href="${verificationLink}"
                   style="
                     background: #2563eb;
                     color: #ffffff;
                     padding: 14px 25px;
                     text-decoration: none;
                     border-radius: 6px;
                     display: inline-block;
                     margin: 20px 0;
                     font-weight: bold;
                   ">
                   Verify Email Address
                </a>

                <p style="color: #64748b; font-size: 14px;">
                    This verification link expires in 15 minutes.
                </p>

                <p style="color: #64748b; font-size: 13px;">
                    If you did not create this account, you can safely ignore this email.
                </p>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">

                <p style="color: #94a3b8; font-size: 12px;">
                    © 2026 Subscription Management System. All rights reserved.
                </p>

            </div>
        </div>
    `
};

    try {
        const info = await transporter.sendMail(mailOptions);

        console.log("Verification email sent:", info.messageId);

        return info;

 } catch (error) {
    console.log("EMAIL ERROR MESSAGE:", error.message);
    console.log("EMAIL ERROR CODE:", error.code);
    console.log("EMAIL ERROR RESPONSE:", error.response);

    throw error;
}
};

export default sendVerificationEmail;
