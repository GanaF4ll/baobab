import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { ApiConflictResponse, ApiOperation, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { RegisterAndLoginResponseDto } from './dto/output/register-and-login-response.dto';
import { LoginDto } from './dto/input/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    description: 'Register a new user',
  })
  @ApiConflictResponse({ description: 'User with email "email" already exists' })
  async register(@Body() dto: CreateUserDto): Promise<RegisterAndLoginResponseDto> {
    const res = await this.authService.register(dto);

    return {
      data: res,
    };
  }

  @Post('login')
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiOperation({
    description: 'Login with existing user',
  })
  async login(@Body() dto: LoginDto): Promise<RegisterAndLoginResponseDto> {
    const res = await this.authService.login(dto);

    return {
      data: res,
    };
  }
}
