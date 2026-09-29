import Resend from "@auth/core/providers/resend";
import { ConvexError } from "convex/values";
import { alphabet, generateRandomString } from "oslo/crypto";
import { Resend as ResendAPI } from "resend";
import { authErrors } from "./lib/error_messages";

const apiKey = process.env.AUTH_RESEND_KEY!;

/** How long a password reset code stays valid, in seconds. The provider
 *  defaults to 24 hours, which is far too long for a reset credential. */
const RESET_CODE_MAX_AGE_SECONDS = 15 * 60;

export const ResendOTPPasswordReset = Resend({
  apiKey,
  id: "resend-otp",
  maxAge: RESET_CODE_MAX_AGE_SECONDS,
  async generateVerificationToken() {
    return generateRandomString(6, alphabet("a-z", "0-9"));
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: "Harmony Build <harmony@n3xus.cloud>",
      to: [email],
      subject: `Restablecimiento de contraseña`,
      html: `
        <p>¡Hola!</p>
          <p>
            Hemos recibido una solicitud para restablecer tu contraseña. Para
            continuar, introduce el siguiente código de verificación: <strong>${token}</strong>
          </p>
          <p>
            El código caduca en 15 minutos.
          </p>
          <p>
            Si no has solicitado este cambio, ignora este mensaje y consulta con
            el administrador.
          </p>
          <p>
            Atentamente,
            <br />
            Equipo de Harmony Build
        </p>
      `,
    });

    if (error) {
      throw new ConvexError(authErrors.verificationCodeSendFailed);
    }
  },
});
