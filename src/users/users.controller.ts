import {
  Body,
  Controller,
  Get,
  Patch,
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
import { EditUserDto, UpdatePremiumDto, UpdatePwdDto } from './dto';

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
    return user;
  }

  @Patch('me')
  @ResponseMessage(resMessage('PATCH', 'user'))
  updateMyProfile(
    @GetUser('id') id: string,
    @Body() updateUserDto: EditUserDto,
  ) {
    return this.userService.updateMyProfile(id, updateUserDto);
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
