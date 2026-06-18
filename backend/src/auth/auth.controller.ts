import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import {
  ApiConflictResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RegisterAndLoginResponseDto } from './dto/output/register-and-login-response.dto';
import { LoginDto } from './dto/input/login.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { RefreshTokenDto } from './dto/input/refresh-token.dto';
import { AUTH_SWAGGER_TAG } from 'src/swagger.config';

@Controller('auth')
@ApiTags(AUTH_SWAGGER_TAG)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({
    summary: 'Register a new user',
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
    summary: 'Login with existing user',
  })
  async login(@Body() dto: LoginDto): Promise<RegisterAndLoginResponseDto> {
    const res = await this.authService.login(dto);

    return {
      data: res,
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<RegisterAndLoginResponseDto> {
    const res = await this.authService.refresh(dto.refreshToken);

    return {
      data: res,
    };
  }
}
