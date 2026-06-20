import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
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
  @ApiCreatedResponse({ type: RegisterAndLoginResponseDto })
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
  @ApiResponse({ type: RegisterAndLoginResponseDto })
  async login(@Body() dto: LoginDto): Promise<RegisterAndLoginResponseDto> {
    const res = await this.authService.login(dto);

    return {
      data: res,
    };
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  @ApiCreatedResponse({ type: RegisterAndLoginResponseDto })
  async refresh(@Body() dto: RefreshTokenDto): Promise<RegisterAndLoginResponseDto> {
    const res = await this.authService.refresh(dto.refreshToken);

    return {
      data: res,
    };
  }
}
