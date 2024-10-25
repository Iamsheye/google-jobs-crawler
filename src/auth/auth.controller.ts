import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleDto, RefreshTokenDto, SignInDto, SignUpDto } from './dto';
import { ResponseMessage } from 'src/app.decorator';
import { TransformationInterceptor } from 'src/app.interceptor';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@ApiTags('Auth')
@Controller('auth')
@UseInterceptors(TransformationInterceptor)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @ResponseMessage('Signed up successfully')
  signup(@Body() dto: SignUpDto) {
    return this.authService.signup(dto);
  }

  @Post('signin')
  @ResponseMessage('Logged in successfully')
  signin(@Body() dto: SignInDto) {
    return this.authService.signin(dto);
  }

  @Post('refresh-token')
  @ResponseMessage('Token refreshed successfully')
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('google')
  @ResponseMessage('Logged in successfully')
  googleLogin(@Body() dto: GoogleDto) {
    return this.authService.googleLogin(dto);
  }

  @Post('forgot-password')
  @ResponseMessage('Password reset link sent successfully')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ResponseMessage('Password reset successfully')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('verify-email')
  @ResponseMessage('Email verified successfully')
  verifyEmail(@Body('id') id: string) {
    return this.authService.verifyEmail(id);
  }
}
