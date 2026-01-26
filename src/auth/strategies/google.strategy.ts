import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/api/auth/google/callback';
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, displayName } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      return done(new Error('No email found in Google profile'), false);
    }

    const result = await this.authService.validateOAuthUser({
      email,
      name: displayName || email.split('@')[0],
      provider: 'google',
      providerId: id,
    });

    done(null, result);
  }
}
