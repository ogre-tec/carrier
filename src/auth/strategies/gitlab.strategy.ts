import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { AuthService } from '../auth.service';

@Injectable()
export class GitLabStrategy extends PassportStrategy(Strategy, 'gitlab') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      authorizationURL: configService.get<string>('GITLAB_URL')
        ? `${configService.get<string>('GITLAB_URL')}/oauth/authorize`
        : 'https://gitlab.com/oauth/authorize',
      tokenURL: configService.get<string>('GITLAB_URL')
        ? `${configService.get<string>('GITLAB_URL')}/oauth/token`
        : 'https://gitlab.com/oauth/token',
      clientID: configService.get<string>('GITLAB_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GITLAB_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GITLAB_CALLBACK_URL') || 'http://localhost:3000/api/auth/gitlab/callback',
      scope: ['read_user'],
    });
  }

  async userProfile(accessToken: string, done: (error: any, profile?: any) => void) {
    const gitlabUrl = this.configService.get<string>('GITLAB_URL') || 'https://gitlab.com';
    try {
      const response = await fetch(`${gitlabUrl}/api/v4/user`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await response.json();
      done(null, profile);
    } catch (error) {
      done(error);
    }
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    const { id, email, name, username } = profile;

    if (!email) {
      return done(new Error('No email found in GitLab profile'), null);
    }

    const result = await this.authService.validateOAuthUser({
      email,
      name: name || username || email.split('@')[0],
      provider: 'gitlab',
      providerId: String(id),
    });

    done(null, result);
  }
}
