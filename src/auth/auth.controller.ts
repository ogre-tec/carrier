import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GitHubAuthGuard } from './guards/github-auth.guard';
import { GitLabAuthGuard } from './guards/gitlab-auth.guard';
import { AppleAuthGuard } from './guards/apple-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() _loginDto: LoginDto, @CurrentUser() user: User) {
    return this.authService.login(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  //*
  // Google OAuth
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Guard redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const { access_token } = req.user as { access_token: string };
    res.redirect(`/?token=${access_token}`);
  }

  // GitHub OAuth
  @Public()
  @Get('github')
  @UseGuards(GitHubAuthGuard)
  githubAuth() {
    // Guard redirects to GitHub
  }

  @Public()
  @Get('github/callback')
  @UseGuards(GitHubAuthGuard)
  githubAuthCallback(@Req() req: Request, @Res() res: Response) {
    const { access_token } = req.user as { access_token: string };
    res.redirect(`/?token=${access_token}`);
  }

  // GitLab OAuth
  @Public()
  @Get('gitlab')
  @UseGuards(GitLabAuthGuard)
  gitlabAuth() {
    // Guard redirects to GitLab
  }

  @Public()
  @Get('gitlab/callback')
  @UseGuards(GitLabAuthGuard)
  gitlabAuthCallback(@Req() req: Request, @Res() res: Response) {
    const { access_token } = req.user as { access_token: string };
    res.redirect(`/?token=${access_token}`);
  }

  // Apple OAuth
  @Public()
  @Get('apple')
  @UseGuards(AppleAuthGuard)
  appleAuth() {
    // Guard redirects to Apple
  }

  @Public()
  @Post('apple/callback')
  @UseGuards(AppleAuthGuard)
  appleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const { access_token } = req.user as { access_token: string };
    res.redirect(`/?token=${access_token}`);
  }
  // */
}
