// Apple OAuth strategy - currently disabled
// Uncomment and configure when Apple Sign In is needed

/*
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { AuthService } from '../auth.service';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      authorizationURL: 'https://appleid.apple.com/auth/authorize',
      tokenURL: 'https://appleid.apple.com/auth/token',
      clientID: configService.get<string>('APPLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('APPLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('APPLE_CALLBACK_URL') || 'http://localhost:3000/api/auth/apple/callback',
      scope: ['name', 'email'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    // Apple provides user info in the request body during first sign-in
    const { user: userInfo } = req.body || {};
    const decodedToken = idToken || {};

    const email = decodedToken.email || userInfo?.email;
    const sub = decodedToken.sub;

    if (!email || !sub) {
      return done(new Error('No email or sub found in Apple response'), null);
    }

    const name = userInfo?.name
      ? `${userInfo.name.firstName || ''} ${userInfo.name.lastName || ''}`.trim()
      : email.split('@')[0];

    const result = await this.authService.validateOAuthUser({
      email,
      name,
      provider: 'apple',
      providerId: sub,
    });

    done(null, result);
  }
}
*/

// Placeholder export - Apple OAuth is currently disabled
export const AppleStrategyDisabled = true;
