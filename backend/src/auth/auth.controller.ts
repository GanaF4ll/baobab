import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { ApiResponse } from 'src/shared/constants';
import { ApiOperation } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    description: 'Register a new user',
  })
  async register(@Body() dto: CreateUserDto): Promise<ApiResponse<string>> {
    const res = await this.authService.register(dto);

    return {
      data: res,
    };
  }
}
