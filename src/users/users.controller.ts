import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { CurrentUser } from 'src/types/user';
import { UsersService } from './users.service';
import { ResponseMessage } from 'src/app.decorator';
import { resMessage } from 'src/app.constants';
import { TransformationInterceptor } from 'src/app.interceptor';
import { UpdatePremiumDto, UpdatePwdDto } from './dto';

@ApiBearerAuth()
@ApiTags('User')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(TransformationInterceptor)
@Controller('user')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('me')
  @ResponseMessage(resMessage('GET', 'user'))
  findMe(@GetUser() user: CurrentUser) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isLoginAllowed, resetToken, resetTokenExpiry, ...rest } = user;

    return rest;
  }

  // @Patch('me')
  // @ResponseMessage(resMessage('PATCH', 'user'))
  // updateMyProfile(
  //   @GetUser('id') id: string,
  //   @Body() updateUserDto: EditUserDto,
  // ) {
  //   return this.userService.updateMyProfile(id, updateUserDto);
  // }

  @Post('send-verification-email')
  @ResponseMessage(resMessage('POST', 'send verification email'))
  sendVerificationEmail(@GetUser('id') id: string) {
    return this.userService.sendVerificationEmail(id);
  }

  @Patch('password')
  @ResponseMessage(resMessage('PATCH', 'password'))
  updateMyPassword(
    @GetUser('id') id: string,
    @Body() updatePwdDto: UpdatePwdDto,
  ) {
    return this.userService.updatePassword(id, updatePwdDto);
  }

  @ApiExcludeEndpoint()
  @Patch('premium')
  @ResponseMessage(resMessage('PATCH', 'premium status'))
  updatePremiumStatus(
    @GetUser('id') id: string,
    @Body() updatePremiumDto: UpdatePremiumDto,
  ) {
    return this.userService.updatePremium(id, updatePremiumDto);
  }
}
