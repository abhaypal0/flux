
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        // Google profile details
        const googleUser = {
          googleId: profile.id,
          fullname: profile.displayName,
          email: profile.emails?.[0]?.value,
          profileImage: profile.photos?.[0]?.value || "",
        };

        return done(null, googleUser);

      } catch (error) {
        return done(error, null);
      }
    }
  )
);

export default passport;
