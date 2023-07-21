import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignInDto, SignUpDto } from './dto';
import { ResponseMessage } from 'src/app.decorator';
import { TransformationInterceptor } from 'src/app.interceptor';

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
}
