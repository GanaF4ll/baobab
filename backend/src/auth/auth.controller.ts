import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { ApiConflictResponse, ApiOperation, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { RegisterAndLoginResponseDto } from './dto/output/register-and-login-response.dto';
import { LoginDto } from './dto/input/login.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthGuard } from './guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
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
  @Public()
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

  @Get('test')
  @UseGuards(AuthGuard)
  async test(@CurrentUser('email') email: string): Promise<string> {
    return email;
  }
}
